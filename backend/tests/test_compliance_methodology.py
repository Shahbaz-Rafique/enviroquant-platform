from app.services.compliance_methodology import (
    ComplianceSignals,
    STATUS_COMPLIANT,
    STATUS_MISSING_INFORMATION,
    STATUS_NEEDS_IMPROVEMENT,
    STATUS_NEEDS_REVIEW,
    STATUS_PARTIALLY_COMPLIANT,
    classify_compliance,
)


def signals(**overrides) -> ComplianceSignals:
    values = {
        "evidence_present": True,
        "source_traceable": True,
        "coverage_ratio": 0.9,
        "critical_gap_count": 0,
        "unresolved_uncertainty": False,
        "requires_expert_review": False,
        "confidence": 0.9,
    }
    values.update(overrides)
    return ComplianceSignals(**values)


def test_deterministic_classification_covers_all_methodology_statuses() -> None:
    assert classify_compliance(signals()) == STATUS_COMPLIANT
    assert classify_compliance(signals(coverage_ratio=0.7)) == STATUS_PARTIALLY_COMPLIANT
    assert classify_compliance(signals(critical_gap_count=1)) == STATUS_NEEDS_IMPROVEMENT
    assert classify_compliance(signals(evidence_present=False)) == STATUS_MISSING_INFORMATION
    assert classify_compliance(signals(requires_expert_review=True)) == STATUS_NEEDS_REVIEW


def test_missing_information_precedes_low_confidence_review() -> None:
    result = classify_compliance(signals(evidence_present=False, confidence=0.1))
    assert result == STATUS_MISSING_INFORMATION
