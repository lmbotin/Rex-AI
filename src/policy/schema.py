"""
Policy schema for AI-in-logistics operational liability coverage.

Policies define covered incident types, liability limits, required evidence,
and when to auto-resolve vs send to human review.
"""

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# Definitions of each covered incident type (cause) for policies and display
INCIDENT_TYPE_DEFINITIONS: Dict[str, str] = {
    "misroute": "Shipment or delivery sent to the wrong destination, or routing decision by an AI/system caused incorrect destination or path.",
    "delay": "Delivery or operation delayed beyond agreed or reasonable time due to AI decision, system failure, or automated process error.",
    "loss": "Physical loss of goods, or loss of data/asset attributable to system or AI error (e.g. wrong handoff, incorrect disposal).",
    "prediction_failure": "AI or ML model prediction error that led to a wrong business decision (e.g. demand forecast, ETA, capacity).",
    "pricing_error": "Negotiated price for the load is lower than its cost (e.g. due to AI or system error in pricing or cost calculation).",
    "system_outage": "Unplanned downtime or failure of an automated system or AI service that caused operational impact.",
    "data_error": "Incorrect, corrupted, or missing data due to system or integration error (e.g. wrong label, bad sync) that caused loss or liability.",
}


class ExtraInfoRule(BaseModel):
    """Policy rule for required extra information (evidence or questions) during FNOL."""
    condition: str = Field(
        description="Condition expression, e.g. 'incident_type == prediction_failure' or 'estimated_liability_cost > 5000'"
    )
    required_evidence: str = Field(
        description="Required evidence key: system_logs, incident_report, liability_assessment"
    )
    question_hint: Optional[str] = Field(
        None,
        description="Suggested question for the agent to ask"
    )
    required: bool = True


class ResolutionRules(BaseModel):
    """When to auto-resolve vs send to human review."""
    auto_resolve_max_amount: float = Field(
        default=2000.0,
        ge=0,
        description="Max estimated liability for auto-resolve (above this = human review)"
    )
    require_name_match: bool = True
    require_evidence_complete: bool = True
    require_incident_type_covered: bool = True


class Policy(BaseModel):
    """
    AI logistics operational liability policy.

    Covers risks from AI agents in logistics: misroute, delay, loss,
    prediction_failure, system_outage, data_error.
    """
    policy_number: str = Field(description="Unique policy identifier")
    named_insured: str = Field(description="Company or contact name (for name verification)")
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None

    # Optional natural-language description for LLM-based coverage checks
    coverage_description: Optional[str] = Field(
        None,
        description="Human-readable description of what the policy covers (used by LLM to decide coverage)"
    )

    # Coverage: which incident types are covered (values match IncidentType enum)
    covered_incident_types: List[str] = Field(
        default_factory=list,
        description="e.g. ['misroute', 'delay', 'loss', 'prediction_failure', 'system_outage', 'data_error']"
    )
    limit_amount: float = Field(default=50000.0, ge=0, description="Max liability payout per claim")
    deductible: float = Field(default=0.0, ge=0, description="Deductible per claim")
    per_incident_type_limits: Optional[Dict[str, float]] = Field(
        None,
        description="Optional per-incident-type caps, e.g. {'delay': 10000, 'loss': 50000}"
    )

    # Policy-driven extra information (what to ask for during FNOL)
    extra_info_rules: List[ExtraInfoRule] = Field(default_factory=list)
    resolution_rules: ResolutionRules = Field(default_factory=ResolutionRules)

    def to_dict(self) -> dict:
        """Serialize for storage (JSON-friendly)."""
        return self.model_dump()

    @classmethod
    def from_dict(cls, data: dict) -> "Policy":
        """Load from dict (e.g. from DB or JSON)."""
        return cls.model_validate(data)


class CoverageResult(BaseModel):
    """Result of LLM-based policy coverage check."""
    is_covered: bool = Field(description="Whether the claim is covered under the policy")
    reason: str = Field(default="", description="Short explanation for the coverage decision")
    required_evidence: List[str] = Field(
        default_factory=list,
        description="Evidence or documents the policy requires for this claim (e.g. system_logs, incident_report)"
    )
    suggested_payout_cap: Optional[float] = Field(
        None,
        ge=0,
        description="Suggested max payout from policy interpretation (if applicable)"
    )
