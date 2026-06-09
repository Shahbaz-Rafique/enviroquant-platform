from uuid import uuid4

from app.models.eia import EiaDocument, EiaSection, EiaSubSection
from app.schemas.eia import EiaSourceDetectedSection
from app.services.authoring_assistant_service import _build_deterministic_content
from app.services.eia_auto_structure_service import _auto_progress_score, _best_subsection_match
from app.models.eia_source_mapping import EiaSourceMapping


def build_document() -> EiaDocument:
    document = EiaDocument(
        id=uuid4(),
        tenant_id=uuid4(),
        project_id=uuid4(),
        title="Sample EIA",
        status="draft",
        created_by_id=uuid4(),
        document_metadata={},
    )
    section = EiaSection(
        id=uuid4(),
        tenant_id=document.tenant_id,
        eia_document_id=document.id,
        section_number="4",
        title="DESCRIPTION OF THE LIKELY SIGNIFICANT EFFECTS",
        display_order=1,
    )
    subsection = EiaSubSection(
        id=uuid4(),
        tenant_id=document.tenant_id,
        eia_document_id=document.id,
        section_id=section.id,
        subsection_number="4.6.1",
        title="Significance discussed in terms of legal compliance and sensitivity of receptors?",
        content="",
        content_html=None,
        content_json=None,
        completion_status="NOT_STARTED",
        progress_percentage=0.0,
        display_order=1,
        content_metadata={},
    )
    section.subsections = [subsection]
    subsection.section = section
    subsection.document = document
    document.sections = [section]
    return document


def test_best_subsection_match_prefers_exact_section_number() -> None:
    document = build_document()
    detected = EiaSourceDetectedSection(
        section_number="4.6.1",
        title="Significance of effects",
        content="Compliance thresholds and receptor sensitivity are discussed.",
        confidence=0.81,
        metadata={},
    )

    subsection, confidence = _best_subsection_match(document, detected)

    assert subsection is not None
    assert subsection.subsection_number == "4.6.1"
    assert confidence >= 0.96


def test_deterministic_authoring_content_builds_outline() -> None:
    document = build_document()
    subsection = document.sections[0].subsections[0]

    generated_html, summary, guidance_points = _build_deterministic_content(
        subsection=subsection,
        action="OUTLINE",
        checklist_titles=[subsection.title],
        evidence_names=["baseline-study.pdf"],
        mapped_titles=["4.6.1 Significance"],
        instructions="Focus on quantified thresholds.",
    )

    assert "Drafting Outline" in generated_html
    assert "quantified thresholds" in generated_html
    assert "Generated an evidence-aware outline" in summary
    assert guidance_points


def test_auto_progress_score_respects_confidence_floor() -> None:
    mappings = [
        EiaSourceMapping(
            id=uuid4(),
            tenant_id=uuid4(),
            eia_document_id=uuid4(),
            source_document_id=uuid4(),
            source_version_id=None,
            subsection_id=uuid4(),
            confidence_score=0.22,
            status="SUGGESTED",
            detection_method="auto",
            mapping_metadata={},
        ),
        EiaSourceMapping(
            id=uuid4(),
            tenant_id=uuid4(),
            eia_document_id=uuid4(),
            source_document_id=uuid4(),
            source_version_id=None,
            subsection_id=uuid4(),
            confidence_score=0.35,
            status="SUGGESTED",
            detection_method="auto",
            mapping_metadata={},
        ),
    ]

    score = _auto_progress_score(mappings)

    assert score >= 40.0
