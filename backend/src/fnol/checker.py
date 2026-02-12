"""
Evidence Completeness & Consistency Checker for Operational Liability Claims.

Analyzes an OperationalLiabilityClaim to:
- Calculate completeness score based on required evidence
- Detect contradictions and inconsistencies
- Generate targeted follow-up questions
"""

from datetime import datetime, timedelta
from typing import List

from pydantic import BaseModel, Field

from .schema import OperationalLiabilityClaim, IncidentType, AssetType, ImpactSeverity


class CheckReport(BaseModel):
    """
    Report of evidence completeness and consistency checks.

    Provides actionable insights for claim adjusters to identify missing
    information and potential issues.
    """

    completeness_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Overall completeness score from 0 to 1"
    )

    missing_required_evidence: List[str] = Field(
        default_factory=list,
        description="List of missing required evidence items"
    )

    contradictions: List[str] = Field(
        default_factory=list,
        description="List of detected contradictions or inconsistencies"
    )

    recommended_questions: List[str] = Field(
        default_factory=list,
        description="1-3 targeted follow-up questions to improve claim quality"
    )

    class Config:
        schema_extra = {
            "examples": [
                {
                    "completeness_score": 0.75,
                    "missing_required_evidence": ["incident_location", "liability_assessment"],
                    "contradictions": ["High estimated cost ($50000) but no liability assessment provided"],
                    "recommended_questions": [
                        "Can you provide the system node or hub ID where the incident occurred?",
                        "Do you have a written liability assessment from the operations team?"
                    ]
                }
            ]
        }


def check_claim(claim: OperationalLiabilityClaim) -> CheckReport:
    """
    Analyze a claim for completeness and consistency.

    Args:
        claim: The OperationalLiabilityClaim to check

    Returns:
        CheckReport with completeness score, missing evidence, contradictions,
        and recommended follow-up questions
    """

    missing_evidence = []
    contradictions = []

    # ========================================================================
    # Check Required Evidence (3 tiers)
    # ========================================================================

    # Tier 1 (Critical - 60% weight)
    tier1_items = []
    tier1_present = []

    # System logs (≥1)
    tier1_items.append("system_logs")
    if claim.evidence.has_system_logs and claim.evidence.system_log_count >= 1:
        tier1_present.append("system_logs")
    else:
        missing_evidence.append("system_logs")

    # Incident description
    tier1_items.append("incident_description")
    if claim.incident.incident_description and claim.incident.incident_description.strip():
        tier1_present.append("incident_description")
    else:
        missing_evidence.append("incident_description")

    # Incident type (not unknown)
    tier1_items.append("incident_type")
    if claim.incident.incident_type != IncidentType.UNKNOWN:
        tier1_present.append("incident_type")
    else:
        missing_evidence.append("incident_type")

    # Asset type (not unknown)
    tier1_items.append("asset_type")
    if claim.operational_impact.asset_type != AssetType.UNKNOWN:
        tier1_present.append("asset_type")
    else:
        missing_evidence.append("asset_type")

    # Tier 2 (Important - 30% weight)
    tier2_items = []
    tier2_present = []

    # Incident location (system/node)
    tier2_items.append("incident_location")
    if claim.incident.incident_location and claim.incident.incident_location.strip():
        tier2_present.append("incident_location")
    else:
        missing_evidence.append("incident_location")

    # Estimated liability cost
    tier2_items.append("estimated_liability_cost")
    if claim.operational_impact.estimated_liability_cost is not None:
        tier2_present.append("estimated_liability_cost")
    else:
        missing_evidence.append("estimated_liability_cost")

    # Incident date
    tier2_items.append("incident_date")
    if claim.incident.incident_date is not None:
        tier2_present.append("incident_date")
    else:
        missing_evidence.append("incident_date")

    # Tier 3 (Supporting - 10% weight)
    tier3_items = []
    tier3_present = []

    # Liability assessment document
    tier3_items.append("liability_assessment")
    if claim.evidence.has_liability_assessment:
        tier3_present.append("liability_assessment")
    else:
        missing_evidence.append("liability_assessment")

    # System component
    tier3_items.append("system_component")
    if claim.operational_impact.system_component and claim.operational_impact.system_component.strip():
        tier3_present.append("system_component")
    else:
        missing_evidence.append("system_component")

    # Multiple logs (≥2)
    tier3_items.append("multiple_logs")
    if claim.evidence.system_log_count >= 2:
        tier3_present.append("multiple_logs")
    else:
        missing_evidence.append("multiple_logs")

    # Calculate completeness score
    tier1_score = (len(tier1_present) / len(tier1_items)) * 0.6 if tier1_items else 0.0
    tier2_score = (len(tier2_present) / len(tier2_items)) * 0.3 if tier2_items else 0.0
    tier3_score = (len(tier3_present) / len(tier3_items)) * 0.1 if tier3_items else 0.0

    completeness_score = tier1_score + tier2_score + tier3_score

    # ========================================================================
    # Detect Contradictions
    # ========================================================================

    # 1. Low confidence (<0.3) on critical fields
    if claim.incident.incident_type_provenance and claim.incident.incident_type_provenance.confidence < 0.3:
        contradictions.append("Low confidence on incident type classification (confidence < 0.3)")

    if claim.operational_impact.asset_type_provenance and claim.operational_impact.asset_type_provenance.confidence < 0.3:
        contradictions.append("Low confidence on asset type classification (confidence < 0.3)")

    if claim.incident.incident_description_provenance and claim.incident.incident_description_provenance.confidence < 0.3:
        contradictions.append("Low confidence on incident description extraction (confidence < 0.3)")

    # 2. Severity vs cost mismatches
    severity = claim.operational_impact.impact_severity
    cost = claim.operational_impact.estimated_liability_cost

    if severity == ImpactSeverity.CRITICAL and cost is not None and cost < 5000:
        contradictions.append(f"Severity marked as CRITICAL but estimated cost is only ${cost:.2f} (expected >$5000)")

    if severity == ImpactSeverity.SEVERE and cost is not None and cost < 1000:
        contradictions.append(f"Severity marked as SEVERE but estimated cost is only ${cost:.2f} (expected >$1000)")

    if severity == ImpactSeverity.MINOR and cost is not None and cost > 50000:
        contradictions.append(f"Severity marked as MINOR but estimated cost is ${cost:.2f} (expected <$50000)")

    # 3. No logs but claims incident
    if not claim.evidence.has_system_logs and claim.incident.incident_description:
        contradictions.append("Incident description provided but no system logs uploaded")

    # 4. High cost (>$25k) without liability assessment
    if cost is not None and cost > 25000 and not claim.evidence.has_liability_assessment:
        contradictions.append(f"High estimated cost (${cost:.2f}) but no liability assessment provided")

    # 5. Incident date in future or >2 years old
    if claim.incident.incident_date:
        now = datetime.utcnow()
        incident_date = claim.incident.incident_date

        # Handle string dates (convert to datetime if needed)
        if isinstance(incident_date, str):
            try:
                incident_date = datetime.fromisoformat(incident_date.replace('Z', '+00:00').replace('+00:00', ''))
            except ValueError:
                # Can't parse date string, skip this check
                incident_date = None

        if incident_date is not None:
            if incident_date > now:
                contradictions.append(f"Incident date is in the future: {incident_date.isoformat()}")
            elif incident_date < now - timedelta(days=730):  # 2 years
                contradictions.append(f"Incident date is more than 2 years old: {incident_date.isoformat()}")

    # 6. Location provided but confidence <0.3
    if claim.incident.incident_location and claim.incident.incident_location_provenance:
        if claim.incident.incident_location_provenance.confidence < 0.3:
            contradictions.append("Incident location provided but with very low confidence (confidence < 0.3)")

    # ========================================================================
    # Generate Recommended Questions (1-3 targeted follow-ups)
    # ========================================================================

    recommended_questions = []

    # Prioritize critical missing items first
    if "system_logs" in missing_evidence:
        recommended_questions.append("Can you provide system logs or telemetry data from the incident?")

    if "incident_description" in missing_evidence:
        recommended_questions.append("Can you describe what happened and how the operational failure occurred?")

    if "incident_type" in missing_evidence or (
        claim.incident.incident_type == IncidentType.UNKNOWN
        or (claim.incident.incident_type_provenance and claim.incident.incident_type_provenance.confidence < 0.3)
    ):
        recommended_questions.append("Can you clarify the type of incident? (misroute, delay, loss, data error, prediction failure, pricing error, system outage)")

    if "asset_type" in missing_evidence:
        recommended_questions.append("What type of asset was affected? (shipment, package, container, AI model, sensor, route, etc.)")

    # Then important items
    if "incident_location" in missing_evidence:
        recommended_questions.append("Can you provide the system node, hub ID, or facility where the incident occurred?")

    if "incident_date" in missing_evidence:
        recommended_questions.append("When did the incident occur?")

    if "estimated_liability_cost" in missing_evidence:
        recommended_questions.append("Do you have a liability estimate or expected cost range?")

    # If severity is unclear or cost seems off
    if severity == ImpactSeverity.UNKNOWN:
        recommended_questions.append("How would you describe the impact severity? (minor, moderate, severe, or critical)")

    # Limit to 3 most relevant questions
    recommended_questions = recommended_questions[:3]

    return CheckReport(
        completeness_score=completeness_score,
        missing_required_evidence=missing_evidence,
        contradictions=contradictions,
        recommended_questions=recommended_questions
    )
