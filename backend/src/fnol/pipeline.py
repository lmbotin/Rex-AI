"""
Main extraction pipeline for Track & Trace / AI Operational Liability claims.

Public API: parse_claim(text, image_paths) -> OperationalLiabilityClaim
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional

from .config import ExtractionConfig
from .fusion import ClaimFusion
from .image_analyzer import create_image_analyzer
from .schema import OperationalLiabilityClaim
from .text_extractor import create_text_extractor

logger = logging.getLogger(__name__)


class ExtractionPipeline:
    """
    Multimodal extraction pipeline for operational liability claims.

    Orchestrates text extraction, image analysis, and fusion.
    """

    def __init__(self, config: Optional[ExtractionConfig] = None):
        """
        Initialize extraction pipeline.

        Args:
            config: Extraction configuration (uses default if None)
        """
        self.config = config or ExtractionConfig.from_env()

        # Initialize components
        self.text_extractor = create_text_extractor(self.config)
        self.image_analyzer = create_image_analyzer(use_vision_model=False)
        self.fusion = ClaimFusion()

        logger.info(
            f"Initialized extraction pipeline with "
            f"LLM provider: {self.config.llm_provider}, "
            f"model: {self.config.llm_model}"
        )

    def parse_claim(
        self,
        text: str,
        image_paths: List[str],
        claimant_info: Optional[Dict[str, str]] = None
    ) -> OperationalLiabilityClaim:
        """
        Parse claim from text description and images.

        Args:
            text: Text description of the incident
            image_paths: List of paths to images/logs
            claimant_info: Optional claimant information dict
                          (keys: name, policy_number, contact_phone, contact_email)

        Returns:
            OperationalLiabilityClaim validated against schema with provenance

        Example:
            ```python
            pipeline = ExtractionPipeline()
            claim = pipeline.parse_claim(
                text="Shipment delayed 48 hours due to routing model failure",
                image_paths=["log1.json", "log2.json"],
                claimant_info={"name": "Acme Corp", "policy_number": "POL-TT-123"}
            )
            ```
        """
        start_time = datetime.utcnow()

        logger.info(
            f"Starting claim extraction: {len(text)} chars text, "
            f"{len(image_paths)} images"
        )

        # Step 1: Extract structured info from text
        logger.debug("Step 1: Extracting from text...")
        text_extraction = self.text_extractor.extract(text)
        logger.debug(
            f"Text extraction complete: "
            f"incident_type={text_extraction.get('incident_type')}, "
            f"extraction_time={text_extraction.get('extraction_time_ms', 0):.0f}ms"
        )

        # Step 2: Analyze images/documents
        logger.debug(f"Step 2: Analyzing {len(image_paths)} images/documents...")
        image_results = []
        if image_paths:
            image_results = self.image_analyzer.analyze_batch(image_paths)
            doc_count = sum(1 for r in image_results if r.image_type == 'document')
            logger.debug(
                f"Document analysis complete: "
                f"{doc_count}/{len(image_results)} are documents"
            )
        else:
            logger.debug("No images/documents provided")

        # Step 3: Fuse text + images into final claim
        logger.debug("Step 3: Fusing text and document analysis...")
        claim = self.fusion.fuse(
            text_extraction=text_extraction,
            image_results=image_results,
            claimant_info=claimant_info
        )

        end_time = datetime.utcnow()
        total_time_ms = (end_time - start_time).total_seconds() * 1000

        logger.info(
            f"Claim extraction complete: "
            f"claim_id={claim.claim_id}, "
            f"total_time={total_time_ms:.0f}ms"
        )

        # Log performance metrics
        self._log_metrics(claim, text_extraction, total_time_ms)

        return claim

    def _log_metrics(
        self,
        claim: OperationalLiabilityClaim,
        text_extraction: Dict,
        total_time_ms: float
    ):
        """Log performance and quality metrics."""
        metrics = {
            'total_time_ms': total_time_ms,
            'text_extraction_time_ms': text_extraction.get('extraction_time_ms', 0),
            'incident_type': claim.incident.incident_type.value,
            'asset_type': claim.operational_impact.asset_type.value,
            'has_system_logs': claim.evidence.has_system_logs,
            'system_log_count': claim.evidence.system_log_count,
            'missing_evidence_count': len(claim.evidence.missing_evidence),
            'has_conflicts': claim.consistency.has_conflicts,
            'conflict_count': len(claim.consistency.conflict_details),
        }

        logger.info(f"Extraction metrics: {metrics}")


# Singleton instance for convenience
_default_pipeline: Optional[ExtractionPipeline] = None


def parse_claim(
    text: str,
    image_paths: List[str],
    claimant_info: Optional[Dict[str, str]] = None,
    config: Optional[ExtractionConfig] = None
) -> OperationalLiabilityClaim:
    """
    Parse claim from text and images (convenience function).

    This is the main public API for the extraction pipeline.

    Args:
        text: Text description of the incident
        image_paths: List of paths to images/logs
        claimant_info: Optional claimant information
        config: Optional extraction configuration

    Returns:
        OperationalLiabilityClaim validated against schema

    Example:
        ```python
        from src.fnol.pipeline import parse_claim

        claim = parse_claim(
            text="Package lost at HUB-LAX-03 due to system outage",
            image_paths=["log1.json", "log2.json"],
            claimant_info={"name": "Acme Logistics"}
        )

        print(f"Claim ID: {claim.claim_id}")
        print(f"Incident Type: {claim.incident.incident_type}")
        print(f"Missing Evidence: {claim.evidence.missing_evidence}")
        ```
    """
    global _default_pipeline

    # Create pipeline if needed
    if config is not None:
        # New config provided, create new pipeline
        pipeline = ExtractionPipeline(config)
    else:
        # Use default singleton
        if _default_pipeline is None:
            _default_pipeline = ExtractionPipeline()
        pipeline = _default_pipeline

    return pipeline.parse_claim(text, image_paths, claimant_info)
