"""
LLM-based policy coverage check for AI logistics claims.

Sends the policy and claim as JSON to the LLM so it has full structured data
to decide coverage, required evidence, and suggested payout cap.
"""

import json
import logging
from typing import Any, Dict, Optional, Union

from openai import OpenAI

from .schema import CoverageResult, Policy, INCIDENT_TYPE_DEFINITIONS

logger = logging.getLogger(__name__)


def _policy_json_for_llm(policy: Policy) -> str:
    """Serialize policy to JSON for the LLM (full structured data)."""
    data = policy.model_dump(mode="json")  # Pydantic v2: datetimes as ISO strings
    return json.dumps(data, indent=2)


def _claim_json_for_llm(claim: Union[Any, Dict]) -> str:
    """Serialize claim to JSON for the LLM (full structured data)."""
    if isinstance(claim, dict):
        # Prune internal keys if any; keep structure
        data = {k: v for k, v in claim.items() if not k.startswith("_")}
        return json.dumps(data, indent=2, default=str)
    if hasattr(claim, "model_dump"):
        return json.dumps(claim.model_dump(mode="json"), indent=2, default=str)
    return json.dumps({}, indent=2)


def check_coverage_with_llm(
    policy: Policy,
    claim: Union[Any, Dict],
    *,
    client: Optional[OpenAI] = None,
    model: str = "gpt-4o-mini",
) -> CoverageResult:
    """
    Use an LLM to decide whether the claim is covered by the policy,
    what evidence is required, and a suggested payout cap.

    Policy and claim are sent as JSON so the LLM has full structured data.
    """
    client = client or OpenAI()
    policy_json = _policy_json_for_llm(policy)
    claim_json = _claim_json_for_llm(claim)

    definitions_blob = "\n".join(f"- {k}: {v}" for k, v in INCIDENT_TYPE_DEFINITIONS.items())
    prompt = f"""You are an insurance policy analyst. Determine whether the following claim is covered under the given policy. Use the full JSON policy and claim data below.

INCIDENT TYPE DEFINITIONS (for reference):
{definitions_blob}

POLICY (JSON):
{policy_json}

CLAIM (JSON):
{claim_json}

Respond with a single JSON object only, no other text:
{{
  "is_covered": true or false,
  "reason": "Brief explanation for the coverage decision",
  "required_evidence": ["list", "of", "evidence", "items", "e.g. system_logs", "incident_report", "liability_assessment"],
  "suggested_payout_cap": number or null
}}

Rules:
- is_covered: true only if the claim clearly falls under what the policy covers (incident type and circumstances).
- required_evidence: what the policy requires for this type of claim (e.g. system_logs, incident_report, liability_assessment).
- suggested_payout_cap: maximum payout you infer from the policy for this claim, or null if not covered or unclear.
"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        text = response.choices[0].message.content.strip()
        # Strip markdown code block if present
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)
        data = json.loads(text)
        return CoverageResult(
            is_covered=bool(data.get("is_covered", False)),
            reason=str(data.get("reason", "")),
            required_evidence=[str(x) for x in data.get("required_evidence", [])],
            suggested_payout_cap=float(data["suggested_payout_cap"]) if data.get("suggested_payout_cap") is not None else None,
        )
    except Exception as e:
        logger.warning("LLM coverage check failed: %s", e)
        return CoverageResult(
            is_covered=False,
            reason=f"Coverage check failed: {e}",
            required_evidence=[],
            suggested_payout_cap=None,
        )
