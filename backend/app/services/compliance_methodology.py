from __future__ import annotations

from dataclasses import dataclass


CHECKLIST_VERSION = "enviroquant-eia-checklist-2026.1"
METHODOLOGY_VERSION = "evidence-first-mvp-1.0"
RULES_VERSION = "deterministic-classification-1.0"

STATUS_COMPLIANT = "COMPLIANT"
STATUS_PARTIALLY_COMPLIANT = "PARTIALLY_COMPLIANT"
STATUS_NEEDS_IMPROVEMENT = "NEEDS_IMPROVEMENT"
STATUS_MISSING_INFORMATION = "MISSING_INFORMATION"
STATUS_NEEDS_REVIEW = "NEEDS_REVIEW"


@dataclass(frozen=True)
class ComplianceSignals:
    """Evidence signals produced by analysis, before any compliance decision."""

    evidence_present: bool
    source_traceable: bool
    coverage_ratio: float
    critical_gap_count: int
    unresolved_uncertainty: bool
    requires_expert_review: bool
    confidence: float


def classify_compliance(signals: ComplianceSignals) -> str:
    """Apply transparent MVP rules without allowing an LLM to select the status."""

    coverage = max(0.0, min(1.0, signals.coverage_ratio))
    confidence = max(0.0, min(1.0, signals.confidence))

    if not signals.evidence_present or coverage == 0:
        return STATUS_MISSING_INFORMATION
    if signals.requires_expert_review or signals.unresolved_uncertainty or confidence < 0.35:
        return STATUS_NEEDS_REVIEW
    if signals.critical_gap_count > 0 or coverage < 0.45:
        return STATUS_NEEDS_IMPROVEMENT
    if coverage < 0.85 or not signals.source_traceable:
        return STATUS_PARTIALLY_COMPLIANT
    return STATUS_COMPLIANT


def adequacy_from_signals(signals: ComplianceSignals) -> str:
    """Keep the legacy adequacy field as a deterministic, display-only projection."""

    status = classify_compliance(signals)
    return {
        STATUS_COMPLIANT: "FULLY_ADDRESSED",
        STATUS_PARTIALLY_COMPLIANT: "PARTIALLY_ADDRESSED",
        STATUS_NEEDS_IMPROVEMENT: "WEAK",
        STATUS_MISSING_INFORMATION: "MISSING",
        STATUS_NEEDS_REVIEW: "NEEDS_REVIEW",
    }[status]


def methodology_metadata() -> dict[str, str]:
    return {
        "checklist_version": CHECKLIST_VERSION,
        "methodology_version": METHODOLOGY_VERSION,
        "rules_version": RULES_VERSION,
    }
