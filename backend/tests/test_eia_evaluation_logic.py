from types import SimpleNamespace
from uuid import uuid4

from app.services.eia_evaluation_service import (
    ADEQUACY_FULLY_ADDRESSED,
    ADEQUACY_MISSING,
    STATUS_COMPLIANT,
    STATUS_MISSING,
    RoutedChunk,
    _classify_result,
    _deterministic_content_evaluation,
    _route_chunks_for_subsection,
)


def make_subsection() -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        subsection_number="4.6.1",
        title="Significance discussed in terms of legal compliance and sensitivity of receptors?",
        content=(
            "The assessment discusses legal compliance thresholds, receptor sensitivity, noise modelling, "
            "traffic data, mitigation controls, baseline monitoring, and residual impact significance. "
            "Predicted receptor impacts remain below threshold values at five monitored locations."
        ),
    )


def make_section() -> SimpleNamespace:
    return SimpleNamespace(
        section_number="4",
        title="DESCRIPTION OF THE LIKELY SIGNIFICANT EFFECTS",
    )


def test_deterministic_evaluation_marks_strong_evidence_as_addressed() -> None:
    subsection = make_subsection()
    routed_chunks = [
        RoutedChunk(
            document_chunk_id=uuid4(),
            document_version_id=uuid4(),
            document_id=uuid4(),
            source_document_filename="sample-eia.pdf",
            chunk_key="chunk-1",
            page_number=12,
            section_number="4.6.1",
            section_title="Significance of Effects",
            content=(
                "Noise impact significance was assessed against legal standards and receptor sensitivity. "
                "Baseline data, traffic forecasts, mitigation, monitoring, and residual risk are discussed."
            ),
            score=3.4,
            content_metadata={},
        )
    ]

    result = _deterministic_content_evaluation(
        subsection=subsection,
        draft_content=subsection.content,
        routed_chunks=routed_chunks,
        source_notes=["4.6.1 - Significance of Effects"],
    )

    assert result.adequacy == ADEQUACY_FULLY_ADDRESSED
    assert _classify_result(result) == STATUS_COMPLIANT


def test_deterministic_evaluation_marks_empty_evidence_as_missing() -> None:
    subsection = make_subsection()
    subsection.content = ""

    result = _deterministic_content_evaluation(
        subsection=subsection,
        draft_content="",
        routed_chunks=[],
        source_notes=[],
    )

    assert result.adequacy == ADEQUACY_MISSING
    assert _classify_result(result) == STATUS_MISSING


def test_chunk_routing_prefers_exact_section_matches() -> None:
    subsection = make_subsection()
    section = make_section()
    exact_chunk = RoutedChunk(
        document_chunk_id=uuid4(),
        document_version_id=uuid4(),
        document_id=uuid4(),
        source_document_filename="sample-eia.pdf",
        chunk_key="exact",
        page_number=9,
        section_number="4.6.1",
        section_title="Significance of Effects",
        content="Legal compliance, receptor sensitivity, significance, mitigation, and monitoring are discussed.",
        score=0.0,
        content_metadata={},
    )
    weak_chunk = RoutedChunk(
        document_chunk_id=uuid4(),
        document_version_id=uuid4(),
        document_id=uuid4(),
        source_document_filename="other.pdf",
        chunk_key="weak",
        page_number=3,
        section_number="2.1",
        section_title="Alternatives",
        content="Project alternatives and route options were compared.",
        score=0.0,
        content_metadata={},
    )

    routed = _route_chunks_for_subsection(
        subsection=subsection,
        section=section,
        candidate_chunks=[weak_chunk, exact_chunk],
        source_mappings=[],
        limit=3,
    )

    assert routed
    assert routed[0].chunk_key == "exact"
