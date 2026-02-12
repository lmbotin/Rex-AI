"""
Policy service for AI logistics operational liability.

Lookup policy, verify claimant name, compute payout, get required extra info,
and decide whether to auto-resolve or send to human review.
"""

import re
from typing import Any, Dict, List, Optional, Union

from .schema import CoverageResult, ExtraInfoRule, Policy, ResolutionRules
from .store import PolicyStore, DEFAULT_DB_PATH
from .llm_coverage import check_coverage_with_llm


def _normalize_name(name: Optional[str]) -> str:
    if not name:
        return ""
    return " ".join(str(name).strip().lower().split())


def _claim_incident_type(claim: Union[Any, Dict]) -> str:
    """Get incident type as string from claim (model or dict)."""
    if hasattr(claim, "incident") and hasattr(claim.incident, "incident_type"):
        t = claim.incident.incident_type
        return t.value if hasattr(t, "value") else str(t)
    if isinstance(claim, dict):
        inc = claim.get("incident") or {}
        t = inc.get("incident_type", "unknown")
        return t if isinstance(t, str) else (getattr(t, "value", str(t)))
    return "unknown"


def _claim_estimated_cost(claim: Union[Any, Dict]) -> Optional[float]:
    """Get estimated liability cost from claim."""
    if hasattr(claim, "operational_impact") and claim.operational_impact:
        return getattr(claim.operational_impact, "estimated_liability_cost", None)
    if isinstance(claim, dict):
        impact = claim.get("operational_impact") or {}
        c = impact.get("estimated_liability_cost")
        return float(c) if c is not None else None
    return None


def _claim_evidence(claim: Union[Any, Dict]) -> Dict[str, bool]:
    """Get evidence flags from claim."""
    out = {"has_system_logs": False, "has_liability_assessment": False, "has_incident_report": False}
    if hasattr(claim, "evidence") and claim.evidence:
        out["has_system_logs"] = getattr(claim.evidence, "has_system_logs", False)
        out["has_liability_assessment"] = getattr(claim.evidence, "has_liability_assessment", False)
        out["has_incident_report"] = getattr(claim.evidence, "has_incident_report", False)
    if isinstance(claim, dict):
        ev = claim.get("evidence") or {}
        out["has_system_logs"] = ev.get("has_system_logs", False)
        out["has_liability_assessment"] = ev.get("has_liability_assessment", False)
        out["has_incident_report"] = ev.get("has_incident_report", False)
    return out


def _claimant_name(claim: Union[Any, Dict]) -> Optional[str]:
    if hasattr(claim, "claimant") and claim.claimant:
        return getattr(claim.claimant, "name", None)
    if isinstance(claim, dict):
        c = claim.get("claimant") or {}
        return c.get("name")
    return None


def _claimant_policy_number(claim: Union[Any, Dict]) -> Optional[str]:
    if hasattr(claim, "claimant") and claim.claimant:
        return getattr(claim.claimant, "policy_number", None)
    if isinstance(claim, dict):
        c = claim.get("claimant") or {}
        return c.get("policy_number")
    return None


class PolicyService:
    """Service for policy lookup and claim–policy checks."""

    def __init__(self, store: Optional[PolicyStore] = None):
        self.store = store or PolicyStore()

    def get_policy(self, policy_number: str) -> Optional[Policy]:
        """Return policy by number or None. Accepts full ID or digits-only (e.g. 987654)."""
        if not policy_number:
            return None
        p = str(policy_number).strip()
        policy = self.store.get_by_policy_number(p)
        if policy is not None:
            return policy
        # Try digits-only lookup (e.g. user said "POL-TT-987654" or "987654")
        import re
        digits = re.sub(r"\D", "", p)
        return self.store.get_by_policy_number(digits) if digits else None

    def verify_claimant_name(self, policy: Policy, claimant_name: Optional[str]) -> bool:
        """True if claimant name matches policy named_insured (normalized)."""
        if not policy or not policy.named_insured:
            return False
        a = _normalize_name(policy.named_insured)
        b = _normalize_name(claimant_name)
        if not b:
            return False
        # Exact match after normalize; optional: fuzzy for B2B
        return a == b or b in a or a in b

    def compute_payout(
        self,
        claim: Union[Any, Dict],
        policy: Policy,
    ) -> Optional[float]:
        """
        Approved liability amount or None if not covered / over limit.

        Uses claim's estimated_liability_cost, policy limit and deductible,
        and covered_incident_types / per_incident_type_limits.
        """
        incident_type = _claim_incident_type(claim)
        if incident_type not in policy.covered_incident_types:
            return None
        cost = _claim_estimated_cost(claim)
        if cost is None or cost < 0:
            return None
        cap = policy.limit_amount
        if policy.per_incident_type_limits and incident_type in policy.per_incident_type_limits:
            cap = min(cap, policy.per_incident_type_limits[incident_type])
        after_deductible = max(0.0, cost - policy.deductible)
        return min(after_deductible, cap)

    def get_required_extra_info(
        self,
        claim: Union[Any, Dict],
        policy: Policy,
    ) -> List[str]:
        """
        List of required evidence items or question hints still needed,
        based on policy extra_info_rules and current claim state.
        """
        incident_type = _claim_incident_type(claim)
        cost = _claim_estimated_cost(claim) or 0
        evidence = _claim_evidence(claim)
        out: List[str] = []
        for rule in policy.extra_info_rules:
            if not rule.required:
                continue
            # Simple condition check (can be extended with a tiny evaluator)
            cond = rule.condition.lower()
            if "incident_type" in cond and "==" in cond:
                m = re.search(r"incident_type\s*==\s*(\w+)", cond)
                if m and incident_type != m.group(1).lower():
                    continue
            elif "estimated_liability_cost" in cond or "cost" in cond:
                try:
                    m = re.search(r">\s*(\d+)", cond)
                    if m and cost <= int(m.group(1)):
                        continue
                except Exception:
                    pass
            # Check if we already have this evidence
            req = rule.required_evidence.lower()
            if req == "system_logs" and evidence.get("has_system_logs"):
                continue
            if req == "incident_report" and evidence.get("has_incident_report"):
                continue
            if req == "liability_assessment" and evidence.get("has_liability_assessment"):
                continue
            if rule.question_hint:
                out.append(rule.question_hint)
            else:
                out.append(f"Please provide {rule.required_evidence.replace('_', ' ')}.")
        return out

    def check_coverage(
        self,
        claim: Union[Any, Dict],
        policy: Policy,
    ) -> CoverageResult:
        """
        Rule-based coverage check (no LLM): incident type in policy, payout from limits.
        Used only when LLM coverage check is skipped (e.g. fallback).
        """
        incident_type = _claim_incident_type(claim)
        if incident_type not in policy.covered_incident_types:
            return CoverageResult(
                is_covered=False,
                reason=f"Incident type '{incident_type}' is not in policy's covered types: {policy.covered_incident_types}.",
                required_evidence=[],
                suggested_payout_cap=None,
            )
        payout = self.compute_payout(claim, policy)
        required = self.get_required_extra_info(claim, policy)
        return CoverageResult(
            is_covered=True,
            reason="Incident type covered under policy; payout computed from limits and deductible.",
            required_evidence=required,
            suggested_payout_cap=payout,
        )

    def check_coverage_llm(
        self,
        claim: Union[Any, Dict],
        policy: Policy,
        **kwargs: Any,
    ) -> CoverageResult:
        """
        Use an LLM to decide whether the claim is covered under the policy,
        what evidence is required, and a suggested payout cap.
        Name and policy number verification are done separately (rule-based, no LLM).
        """
        return check_coverage_with_llm(policy, claim, **kwargs)

    def can_auto_resolve(
        self,
        claim: Union[Any, Dict],
        policy: Policy,
        *,
        name_verified: bool = True,
        fraud_flagged: bool = False,
    ) -> bool:
        """
        True if policy resolution rules allow auto-resolve (real-time).
        """
        if fraud_flagged:
            return False
        rules = policy.resolution_rules
        if rules.require_name_match and not name_verified:
            return False
        if rules.require_incident_type_covered:
            if _claim_incident_type(claim) not in policy.covered_incident_types:
                return False
        cost = _claim_estimated_cost(claim) or 0
        if cost > rules.auto_resolve_max_amount:
            return False
        if rules.require_evidence_complete:
            extra = self.get_required_extra_info(claim, policy)
            if extra:
                return False
        return True


# Singleton for convenience
_policy_service: Optional[PolicyService] = None


def get_policy_service(store: Optional[PolicyStore] = None) -> PolicyService:
    global _policy_service
    if _policy_service is None:
        _policy_service = PolicyService(store=store)
    return _policy_service
