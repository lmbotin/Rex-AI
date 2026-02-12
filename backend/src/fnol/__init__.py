"""
First Notice of Loss (FNOL) module.

Operational liability claims (Track & Trace / AI logistics).
Checker, extractor, state_manager, and pipeline are not imported here
so the package loads when schema has only operational types.
Import them directly from .checker, .extractor, .state_manager, .pipeline if needed.
"""

from .config import ExtractionConfig
from .schema import (
    SourceModality,
    IncidentType,
    AssetType,
    ImpactSeverity,
    Provenance,
    ClaimantInfo,
    IncidentInfo,
    OperationalImpactInfo,
    EvidenceChecklist,
    ConsistencyFlags,
    OperationalLiabilityClaim,
)

__all__ = [
    "ExtractionConfig",
    "SourceModality",
    "IncidentType",
    "AssetType",
    "ImpactSeverity",
    "Provenance",
    "ClaimantInfo",
    "IncidentInfo",
    "OperationalImpactInfo",
    "EvidenceChecklist",
    "ConsistencyFlags",
    "OperationalLiabilityClaim",
]
