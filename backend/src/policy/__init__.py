"""
Policy module for AI-in-logistics operational liability.

Policies define coverage (incident types, limits), required evidence,
and when to auto-resolve vs send to human review.
"""

from .schema import (
    ExtraInfoRule,
    Policy,
    ResolutionRules,
    CoverageResult,
    INCIDENT_TYPE_DEFINITIONS,
)
from .store import PolicyStore, DEFAULT_DB_PATH
from .service import PolicyService, get_policy_service

__all__ = [
    "Policy",
    "ExtraInfoRule",
    "ResolutionRules",
    "CoverageResult",
    "INCIDENT_TYPE_DEFINITIONS",
    "PolicyStore",
    "PolicyService",
    "get_policy_service",
    "DEFAULT_DB_PATH",
]
