#!/usr/bin/env python3
"""
Seed the policy store from a JSON file (optional).

Only needed when bootstrapping or re-loading policies from JSON. If policies
are already in data/policies.db (e.g. loaded once or added via code/API),
this script is not required.

Usage:
    python scripts/seed_policies.py
    python scripts/seed_policies.py data/policies/ai_logistics_policies.json
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.policy import PolicyStore, DEFAULT_DB_PATH


def main() -> None:
    default_path = Path(__file__).resolve().parent.parent / "data" / "policies" / "ai_logistics_policies.json"
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_path
    if not path.exists():
        print(f"File not found: {path}")
        sys.exit(1)
    store = PolicyStore()
    count = store.load_from_json(path)
    print(f"Loaded {count} policy(ies) from {path}")
    for p in store.list_all():
        print(f"  - {p.policy_number}: {p.named_insured}")


if __name__ == "__main__":
    main()
