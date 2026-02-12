"""
SQLite-based policy store for AI logistics operational liability policies.

Static policy database: load from JSON seed and query by policy_number.
"""

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import List, Optional

from .schema import Policy

# Database file location
DEFAULT_DB_PATH = Path(__file__).parent.parent.parent / "data" / "policies.db"


class PolicyStore:
    """
    SQLite storage for policies.

    Usage:
        store = PolicyStore()
        policy = store.get_by_policy_number("POL-TT-123")
        all_policies = store.list_all()
    """

    # Default JSON seed path (so 123456 and other policies are available without running seed script)
    DEFAULT_JSON_SEED = Path(__file__).resolve().parent.parent.parent / "data" / "policies" / "ai_logistics_policies.json"

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DEFAULT_DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        # Load policies from JSON on init so data/policies/ai_logistics_policies.json (incl. 123456) is always used
        if self.DEFAULT_JSON_SEED.exists():
            self.load_from_json(self.DEFAULT_JSON_SEED)

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS policies (
                    policy_number TEXT PRIMARY KEY,
                    named_insured TEXT NOT NULL,
                    effective_from TEXT,
                    effective_to TEXT,
                    covered_incident_types TEXT NOT NULL DEFAULT '[]',
                    limit_amount REAL NOT NULL DEFAULT 50000,
                    deductible REAL NOT NULL DEFAULT 0,
                    per_incident_type_limits TEXT,
                    extra_info_rules TEXT NOT NULL DEFAULT '[]',
                    resolution_rules TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT,
                    updated_at TEXT,
                    coverage_description TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_policies_named_insured ON policies(named_insured)")
            try:
                conn.execute("ALTER TABLE policies ADD COLUMN coverage_description TEXT")
            except sqlite3.OperationalError:
                pass
            conn.commit()

    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def get_by_policy_number(self, policy_number: str) -> Optional[Policy]:
        """Return policy by number or None if not found."""
        if not policy_number or not str(policy_number).strip():
            return None
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM policies WHERE policy_number = ?",
                (str(policy_number).strip(),),
            ).fetchone()
        if not row:
            return None
        return self._row_to_policy(row)

    def list_all(self, limit: int = 500) -> List[Policy]:
        """List all policies."""
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM policies ORDER BY policy_number LIMIT ?",
                (limit,),
            ).fetchall()
        return [self._row_to_policy(r) for r in rows]

    def save(self, policy: Policy) -> None:
        """Insert or replace a policy."""
        from datetime import datetime
        now = datetime.utcnow().isoformat()
        data = policy.model_dump()
        extra_info = json.dumps([r.model_dump() if hasattr(r, "model_dump") else r for r in policy.extra_info_rules])
        resolution = json.dumps(policy.resolution_rules.model_dump())
        per_limits = json.dumps(policy.per_incident_type_limits) if policy.per_incident_type_limits else None
        effective_from = data.get("effective_from")
        effective_to = data.get("effective_to")
        if hasattr(effective_from, "isoformat"):
            effective_from = effective_from.isoformat()
        if hasattr(effective_to, "isoformat"):
            effective_to = effective_to.isoformat()
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO policies (
                    policy_number, named_insured, effective_from, effective_to,
                    covered_incident_types, limit_amount, deductible, per_incident_type_limits,
                    extra_info_rules, resolution_rules, created_at, updated_at, coverage_description
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                policy.policy_number,
                policy.named_insured,
                effective_from,
                effective_to,
                json.dumps(policy.covered_incident_types),
                policy.limit_amount,
                policy.deductible,
                per_limits,
                extra_info,
                resolution,
                now,
                now,
                getattr(policy, "coverage_description", None),
            ))
            conn.commit()

    def _row_to_policy(self, row: sqlite3.Row) -> Policy:
        covered = json.loads(row["covered_incident_types"]) if row["covered_incident_types"] else []
        per_limits = json.loads(row["per_incident_type_limits"]) if row["per_incident_type_limits"] else None
        extra_rules = json.loads(row["extra_info_rules"]) if row["extra_info_rules"] else []
        res_rules = json.loads(row["resolution_rules"]) if row["resolution_rules"] else {}
        from .schema import ExtraInfoRule, ResolutionRules
        extra_info_rules = [ExtraInfoRule(**r) if isinstance(r, dict) else r for r in extra_rules]
        resolution_rules = ResolutionRules(**res_rules) if isinstance(res_rules, dict) else res_rules
        try:
            coverage_description = row["coverage_description"]
        except (KeyError, IndexError):
            coverage_description = None
        return Policy(
            policy_number=row["policy_number"],
            named_insured=row["named_insured"],
            effective_from=row["effective_from"],
            effective_to=row["effective_to"],
            coverage_description=coverage_description,
            covered_incident_types=covered,
            limit_amount=row["limit_amount"],
            deductible=row["deductible"],
            per_incident_type_limits=per_limits,
            extra_info_rules=extra_info_rules,
            resolution_rules=resolution_rules,
        )

    def load_from_json(self, path: Path) -> int:
        """Load policies from a JSON file (array of policy dicts). Returns count loaded."""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            data = [data]
        count = 0
        for item in data:
            policy = Policy.from_dict(item) if isinstance(item, dict) else item
            if isinstance(policy, Policy):
                self.save(policy)
                count += 1
        return count
