from __future__ import annotations

import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from difflib import SequenceMatcher
from io import BytesIO
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.document import Document, DocumentVersion
from app.models.document_chunk import DocumentChunk
from app.models.eia import EiaDocument, EiaSection, EiaSubSection
from app.models.eia_evaluation import EiaEvaluationFinding, EiaEvaluationRun, EiaEvaluationSectionSummary
from app.models.eia_evaluation_comment import EiaEvaluationFindingComment
from app.models.eia_source_mapping import EiaSourceMapping
from app.models.user import User
from app.schemas.eia import EiaEvaluationFindingCommentCreate, EiaEvaluationRunCreate
from app.services.audit_service import record_audit_event
from app.services.eia_evaluation_prompt_library import PROMPT_VERSION, SYSTEM_PROMPT, build_user_prompt
from app.services.eia_service import (
    DOCUMENT_READ_ROLES,
    DOCUMENT_REVIEW_ROLES,
    get_eia_document_for_tenant,
    require_eia_document_permission,
)

STATUS_COMPLIANT = "COMPLIANT"
STATUS_PARTIALLY_COMPLIANT = "PARTIALLY_COMPLIANT"
STATUS_NEEDS_IMPROVEMENT = "NEEDS_IMPROVEMENT"
STATUS_MISSING = "MISSING"
STATUS_NEEDS_REVIEW = "NEEDS_REVIEW"

ADEQUACY_FULLY_ADDRESSED = "FULLY_ADDRESSED"
ADEQUACY_PARTIALLY_ADDRESSED = "PARTIALLY_ADDRESSED"
ADEQUACY_WEAK = "WEAK"
ADEQUACY_MISSING = "MISSING"
ADEQUACY_NEEDS_REVIEW = "NEEDS_REVIEW"

STATUS_WEIGHTS = {
    STATUS_COMPLIANT: 1.0,
    STATUS_PARTIALLY_COMPLIANT: 0.65,
    STATUS_NEEDS_IMPROVEMENT: 0.3,
    STATUS_MISSING: 0.0,
    STATUS_NEEDS_REVIEW: 0.2,
}


@dataclass
class EvaluationResult:
    adequacy: str
    evidence_summary: str
    ai_analysis: str
    missing_elements: list[str]
    recommendation: str | None
    confidence: float
    engine: str
    metadata: dict[str, Any]


@dataclass
class RoutedChunk:
    document_chunk_id: UUID
    document_version_id: UUID
    document_id: UUID
    source_document_filename: str
    chunk_key: str
    page_number: int | None
    section_number: str | None
    section_title: str | None
    content: str
    score: float
    content_metadata: dict[str, Any]


def list_eia_evaluation_runs(
    db: Session,
    current_user: User,
    document_id: UUID,
) -> list[EiaEvaluationRun]:
    document = get_eia_document_for_tenant(db, current_user, document_id, DOCUMENT_READ_ROLES, "view evaluations")
    statement = (
        select(EiaEvaluationRun)
        .where(
            EiaEvaluationRun.tenant_id == current_user.tenant_id,
            EiaEvaluationRun.eia_document_id == document.id,
        )
        .order_by(EiaEvaluationRun.created_at.desc())
    )
    return list(db.scalars(statement).all())


def get_eia_evaluation_run(
    db: Session,
    current_user: User,
    document_id: UUID,
    run_id: UUID,
) -> EiaEvaluationRun:
    document = get_eia_document_for_tenant(db, current_user, document_id, DOCUMENT_READ_ROLES, "view evaluations")
    run = db.scalar(
        select(EiaEvaluationRun)
        .options(
            selectinload(EiaEvaluationRun.findings),
            selectinload(EiaEvaluationRun.section_summaries),
        )
        .where(
            EiaEvaluationRun.id == run_id,
            EiaEvaluationRun.tenant_id == current_user.tenant_id,
            EiaEvaluationRun.eia_document_id == document.id,
        )
    )
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation run not found")
    return run


def enqueue_eia_evaluation_run(
    db: Session,
    current_user: User,
    document_id: UUID,
    payload: EiaEvaluationRunCreate,
) -> EiaEvaluationRun:
    document = _get_document_for_evaluation(db, current_user, document_id)
    source_document, source_version = _resolve_source_scope(db, current_user, document, payload)
    settings = get_settings()

    run = EiaEvaluationRun(
        tenant_id=current_user.tenant_id,
        project_id=document.project_id,
        eia_document_id=document.id,
        source_document_id=source_document.id if source_document else None,
        source_version_id=source_version.id if source_version else None,
        created_by_id=current_user.id,
        status="PENDING",
        prompt_version=payload.prompt_version or PROMPT_VERSION,
        model_version=settings.openai_evaluation_model if settings.openai_api_key else "deterministic-review-fallback",
        evaluation_scope="project_document_chunks",
        started_at=datetime.now(UTC),
        completed_at=None,
        run_metadata={
            "warnings": [],
            "used_openai": False,
            "fallback_count": 0,
            "queued_at": datetime.now(UTC).isoformat(),
        },
    )
    db.add(run)
    db.flush()
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.evaluation.queued",
        entity_type="eia_evaluation_run",
        entity_id=run.id,
        summary=f"Evaluation run queued for {document.title}",
        metadata={"eia_document_id": str(document.id)},
    )
    db.commit()
    return get_eia_evaluation_run(db, current_user, document.id, run.id)


def process_eia_evaluation_run_background(run_id: UUID) -> None:
    db = SessionLocal()
    try:
        run = db.scalar(
            select(EiaEvaluationRun)
            .options(
                selectinload(EiaEvaluationRun.document)
                .selectinload(EiaDocument.sections)
                .selectinload(EiaSection.subsections),
                selectinload(EiaEvaluationRun.document).selectinload(EiaDocument.source_mappings),
            )
            .where(EiaEvaluationRun.id == run_id)
        )
        if run is None:
            return
        if run.status not in {"PENDING", "FAILED"}:
            return

        run.status = "RUNNING"
        run.started_at = datetime.now(UTC)
        run.completed_at = None
        db.commit()

        _execute_evaluation_run(db, run)
    except Exception as exc:
        failed_db = db
        run = failed_db.get(EiaEvaluationRun, run_id)
        if run is not None:
            run.status = "FAILED"
            run.completed_at = datetime.now(UTC)
            run.run_metadata = {
                **(run.run_metadata or {}),
                "error": str(exc),
                "warnings": list({*(run.run_metadata or {}).get("warnings", []), str(exc)}),
            }
            failed_db.commit()
    finally:
        db.close()


def compare_eia_evaluation_runs(
    db: Session,
    current_user: User,
    document_id: UUID,
    run_id: UUID,
    baseline_run_id: UUID,
) -> dict[str, Any]:
    current_run = get_eia_evaluation_run(db, current_user, document_id, run_id)
    baseline_run = get_eia_evaluation_run(db, current_user, document_id, baseline_run_id)

    current_score = _metadata_number(current_run.run_metadata, "overall_score")
    baseline_score = _metadata_number(baseline_run.run_metadata, "overall_score")

    baseline_sections = {summary.section_number: summary for summary in baseline_run.section_summaries}
    current_sections = {summary.section_number: summary for summary in current_run.section_summaries}
    section_numbers = sorted(set(baseline_sections) | set(current_sections))
    sections = []
    for section_number in section_numbers:
        current_summary = current_sections.get(section_number)
        baseline_summary = baseline_sections.get(section_number)
        sections.append(
            {
                "section_number": section_number,
                "section_title": (
                    current_summary.section_title
                    if current_summary is not None
                    else baseline_summary.section_title if baseline_summary is not None else section_number
                ),
                "current_score": current_summary.score if current_summary is not None else 0.0,
                "baseline_score": baseline_summary.score if baseline_summary is not None else 0.0,
                "delta": round(
                    (current_summary.score if current_summary is not None else 0.0)
                    - (baseline_summary.score if baseline_summary is not None else 0.0),
                    2,
                ),
            }
        )

    baseline_findings = {finding.checklist_section: finding for finding in baseline_run.findings}
    current_findings = {finding.checklist_section: finding for finding in current_run.findings}
    changed_findings = []
    for checklist_section in sorted(set(baseline_findings) | set(current_findings)):
        current_finding = current_findings.get(checklist_section)
        baseline_finding = baseline_findings.get(checklist_section)
        current_status = current_finding.status if current_finding is not None else "NOT_PRESENT"
        baseline_status = baseline_finding.status if baseline_finding is not None else "NOT_PRESENT"
        if current_status != baseline_status:
            changed_findings.append(
                {
                    "checklist_section": checklist_section,
                    "checklist_title": (
                        current_finding.checklist_title
                        if current_finding is not None
                        else baseline_finding.checklist_title if baseline_finding is not None else checklist_section
                    ),
                    "current_status": current_status,
                    "baseline_status": baseline_status,
                    "changed": True,
                }
            )

    return {
        "run_id": current_run.id,
        "baseline_run_id": baseline_run.id,
        "current_overall_score": current_score,
        "baseline_overall_score": baseline_score,
        "delta": round(current_score - baseline_score, 2),
        "sections": sections,
        "changed_findings": changed_findings[:50],
    }


def list_finding_comments(
    db: Session,
    current_user: User,
    document_id: UUID,
    run_id: UUID,
    finding_id: UUID,
) -> list[EiaEvaluationFindingComment]:
    _get_finding_for_commenting(db, current_user, document_id, run_id, finding_id)
    statement = (
        select(EiaEvaluationFindingComment)
        .options(selectinload(EiaEvaluationFindingComment.user))
        .where(
            EiaEvaluationFindingComment.tenant_id == current_user.tenant_id,
            EiaEvaluationFindingComment.evaluation_run_id == run_id,
            EiaEvaluationFindingComment.finding_id == finding_id,
        )
        .order_by(EiaEvaluationFindingComment.created_at.asc())
    )
    return list(db.scalars(statement).all())


def create_finding_comment(
    db: Session,
    current_user: User,
    document_id: UUID,
    run_id: UUID,
    finding_id: UUID,
    payload: EiaEvaluationFindingCommentCreate,
) -> EiaEvaluationFindingComment:
    finding = _get_finding_for_commenting(db, current_user, document_id, run_id, finding_id)
    comment = EiaEvaluationFindingComment(
        tenant_id=current_user.tenant_id,
        evaluation_run_id=run_id,
        finding_id=finding.id,
        user_id=current_user.id,
        content=payload.content.strip(),
    )
    db.add(comment)
    db.flush()
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.evaluation.finding_comment.created",
        entity_type="eia_evaluation_finding_comment",
        entity_id=comment.id,
        summary=f"Comment added to finding {finding.checklist_section}",
        metadata={"eia_document_id": str(document_id), "evaluation_run_id": str(run_id)},
    )
    db.commit()
    created = db.scalar(
        select(EiaEvaluationFindingComment)
        .options(selectinload(EiaEvaluationFindingComment.user))
        .where(EiaEvaluationFindingComment.id == comment.id)
    )
    if created is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding comment not found after creation")
    return created


def _execute_evaluation_run(db: Session, run: EiaEvaluationRun) -> None:
    settings = get_settings()
    document = db.scalar(
        select(EiaDocument)
        .options(
            selectinload(EiaDocument.sections).selectinload(EiaSection.subsections),
            selectinload(EiaDocument.source_mappings).selectinload(EiaSourceMapping.source_document),
        )
        .where(EiaDocument.id == run.eia_document_id)
    )
    if document is None:
        raise RuntimeError("EIA document missing for evaluation run")

    db.query(EiaEvaluationFinding).filter(EiaEvaluationFinding.evaluation_run_id == run.id).delete()
    db.query(EiaEvaluationSectionSummary).filter(EiaEvaluationSectionSummary.evaluation_run_id == run.id).delete()
    db.commit()

    routing_chunks = _load_candidate_chunks(db, run, document.project_id)
    source_mappings_by_subsection = _group_source_mappings(document.source_mappings)

    warnings: list[str] = []
    used_openai = False
    fallback_count = 0
    findings_to_add: list[EiaEvaluationFinding] = []
    section_findings: dict[str, list[EiaEvaluationFinding]] = defaultdict(list)

    for section in document.sections:
        for subsection in section.subsections:
            routed_chunks = _route_chunks_for_subsection(
                subsection=subsection,
                section=section,
                candidate_chunks=routing_chunks,
                source_mappings=source_mappings_by_subsection.get(subsection.id, []),
            )
            result = _evaluate_subsection(
                subsection=subsection,
                section=section,
                source_mappings=source_mappings_by_subsection.get(subsection.id, []),
                routed_chunks=routed_chunks,
                settings=settings,
            )
            if result.engine == "openai":
                used_openai = True
            else:
                fallback_count += 1
                if result.metadata.get("warning"):
                    warnings.append(str(result.metadata["warning"]))

            finding = EiaEvaluationFinding(
                tenant_id=run.tenant_id,
                evaluation_run_id=run.id,
                subsection_id=subsection.id,
                checklist_section=subsection.subsection_number,
                checklist_title=subsection.title,
                subsection_number=subsection.subsection_number,
                subsection_title=subsection.title,
                status=_classify_result(result),
                adequacy=result.adequacy,
                confidence_score=result.confidence,
                evidence_summary=result.evidence_summary,
                ai_analysis=result.ai_analysis,
                recommendation=result.recommendation,
                missing_elements=result.missing_elements,
                evidence_references=_build_evidence_references(
                    subsection=subsection,
                    routed_chunks=routed_chunks,
                    source_mappings=source_mappings_by_subsection.get(subsection.id, []),
                ),
                finding_metadata=result.metadata,
            )
            findings_to_add.append(finding)
            section_findings[section.section_number].append(finding)

    db.add_all(findings_to_add)
    db.flush()
    section_summaries = _build_section_summaries(run, document.sections, section_findings)
    db.add_all(section_summaries)

    run.status = "COMPLETED"
    run.completed_at = datetime.now(UTC)
    run.run_metadata = _build_run_metadata(
        findings=findings_to_add,
        section_summaries=section_summaries,
        warnings=warnings,
        used_openai=used_openai,
        fallback_count=fallback_count,
        routed_chunk_count=len(routing_chunks),
    )
    record_audit_event(
        db,
        tenant_id=run.tenant_id,
        actor_user_id=run.created_by_id,
        event_type="eia.evaluation.completed",
        entity_type="eia_evaluation_run",
        entity_id=run.id,
        summary=f"Evaluation run completed for {document.title}",
        metadata={"eia_document_id": str(document.id), "overall_score": run.run_metadata.get("overall_score")},
    )
    db.commit()


def _get_document_for_evaluation(db: Session, current_user: User, document_id: UUID) -> EiaDocument:
    document = db.scalar(
        select(EiaDocument)
        .options(selectinload(EiaDocument.members))
        .where(EiaDocument.id == document_id, EiaDocument.tenant_id == current_user.tenant_id)
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA document not found")
    require_eia_document_permission(document, current_user, DOCUMENT_REVIEW_ROLES, "run evaluations")
    return document


def _resolve_source_scope(
    db: Session,
    current_user: User,
    document: EiaDocument,
    payload: EiaEvaluationRunCreate,
) -> tuple[Document | None, DocumentVersion | None]:
    if payload.source_document_id is None:
        return None, None

    source_document = db.get(Document, payload.source_document_id)
    if (
        source_document is None
        or source_document.tenant_id != current_user.tenant_id
        or source_document.project_id != document.project_id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source document not found")

    if payload.source_version_id is None:
        return source_document, source_document.current_version

    source_version = db.get(DocumentVersion, payload.source_version_id)
    if (
        source_version is None
        or source_version.tenant_id != current_user.tenant_id
        or source_version.document_id != source_document.id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source document version not found")
    return source_document, source_version


def _load_candidate_chunks(db: Session, run: EiaEvaluationRun, project_id: UUID) -> list[RoutedChunk]:
    if run.source_version_id is not None:
        statement = (
            select(DocumentChunk, Document, DocumentVersion)
            .join(Document, DocumentChunk.document_id == Document.id)
            .join(DocumentVersion, DocumentChunk.document_version_id == DocumentVersion.id)
            .where(DocumentChunk.document_version_id == run.source_version_id)
            .order_by(DocumentChunk.chunk_index.asc())
        )
    else:
        current_version_ids = list(
            db.scalars(
                select(Document.current_version_id)
                .where(Document.tenant_id == run.tenant_id, Document.project_id == project_id)
                .where(Document.current_version_id.is_not(None))
            ).all()
        )
        if not current_version_ids:
            return []
        statement = (
            select(DocumentChunk, Document, DocumentVersion)
            .join(Document, DocumentChunk.document_id == Document.id)
            .join(DocumentVersion, DocumentChunk.document_version_id == DocumentVersion.id)
            .where(DocumentChunk.document_version_id.in_(current_version_ids))
            .order_by(DocumentChunk.document_version_id.asc(), DocumentChunk.chunk_index.asc())
        )

    routed: list[RoutedChunk] = []
    for chunk, document, version in db.execute(statement).all():
        routed.append(
            RoutedChunk(
                document_chunk_id=chunk.id,
                document_version_id=version.id,
                document_id=document.id,
                source_document_filename=document.original_filename,
                chunk_key=chunk.chunk_key,
                page_number=chunk.page_number,
                section_number=chunk.section_number,
                section_title=chunk.section_title,
                content=chunk.content,
                score=0.0,
                content_metadata=chunk.content_metadata,
            )
        )
    return routed


def _group_source_mappings(mappings: list[EiaSourceMapping]) -> dict[UUID, list[EiaSourceMapping]]:
    grouped: dict[UUID, list[EiaSourceMapping]] = defaultdict(list)
    for mapping in mappings:
        if mapping.subsection_id is not None and mapping.status in {"CONFIRMED", "APPLIED"}:
            grouped[mapping.subsection_id].append(mapping)
    return grouped


def _route_chunks_for_subsection(
    *,
    subsection: EiaSubSection,
    section: EiaSection,
    candidate_chunks: list[RoutedChunk],
    source_mappings: list[EiaSourceMapping],
    limit: int = 6,
) -> list[RoutedChunk]:
    subsection_terms = _tokenize(f"{subsection.subsection_number} {subsection.title}")
    section_terms = _tokenize(f"{section.section_number} {section.title}")
    mapping_numbers = {
        mapping.detected_section_number
        for mapping in source_mappings
        if mapping.detected_section_number
    }

    ranked: list[RoutedChunk] = []
    for chunk in candidate_chunks:
        score = 0.0
        if chunk.section_number == subsection.subsection_number:
            score += 3.0
        elif chunk.section_number and chunk.section_number.startswith(section.section_number):
            score += 1.4
        if chunk.section_number and chunk.section_number in mapping_numbers:
            score += 1.6

        title_similarity = SequenceMatcher(
            None,
            _normalize_text(subsection.title),
            _normalize_text(chunk.section_title or ""),
        ).ratio()
        score += title_similarity * 1.2

        chunk_terms = _tokenize(f"{chunk.section_number or ''} {chunk.section_title or ''} {chunk.content[:400]}")
        if subsection_terms:
            score += len(subsection_terms & chunk_terms) / max(len(subsection_terms), 1)
        if section_terms:
            score += (len(section_terms & chunk_terms) / max(len(section_terms), 1)) * 0.5

        if score <= 0.35:
            continue
        ranked.append(
            RoutedChunk(
                document_chunk_id=chunk.document_chunk_id,
                document_version_id=chunk.document_version_id,
                document_id=chunk.document_id,
                source_document_filename=chunk.source_document_filename,
                chunk_key=chunk.chunk_key,
                page_number=chunk.page_number,
                section_number=chunk.section_number,
                section_title=chunk.section_title,
                content=chunk.content,
                score=round(score, 3),
                content_metadata=chunk.content_metadata,
            )
        )

    ranked.sort(key=lambda item: item.score, reverse=True)
    deduped: list[RoutedChunk] = []
    seen: set[UUID] = set()
    for chunk in ranked:
        if chunk.document_chunk_id in seen:
            continue
        seen.add(chunk.document_chunk_id)
        deduped.append(chunk)
        if len(deduped) == limit:
            break
    return deduped


def _evaluate_subsection(
    *,
    subsection: EiaSubSection,
    section: EiaSection,
    source_mappings: list[EiaSourceMapping],
    routed_chunks: list[RoutedChunk],
    settings,
) -> EvaluationResult:
    draft_content = (subsection.content or "").strip()
    source_notes = [
        f"{mapping.detected_section_number or 'Source'} - {mapping.detected_title or mapping.source_document.original_filename}"
        for mapping in source_mappings
    ]
    if not draft_content and not routed_chunks and not source_notes:
        return EvaluationResult(
            adequacy=ADEQUACY_MISSING,
            evidence_summary="No structured draft content or routed source evidence was found for this checklist item.",
            ai_analysis="The evaluation pipeline could not find draft text, confirmed source mappings, or parsed chunks for this subsection.",
            missing_elements=[f"Provide draft content or upload/routable evidence for {subsection.subsection_number}."],
            recommendation="Add draft content and supporting source documents before rerunning the review.",
            confidence=0.98,
            engine="rules",
            metadata={"reason": "no_evidence"},
        )

    if settings.openai_api_key:
        result = _evaluate_with_openai(
            settings=settings,
            section=section,
            subsection=subsection,
            draft_content=draft_content,
            source_notes=source_notes,
            routed_chunks=routed_chunks,
        )
        if result is not None:
            return result

    return _deterministic_content_evaluation(
        subsection=subsection,
        draft_content=draft_content,
        routed_chunks=routed_chunks,
        source_notes=source_notes,
    )


def _evaluate_with_openai(
    *,
    settings,
    section: EiaSection,
    subsection: EiaSubSection,
    draft_content: str,
    source_notes: list[str],
    routed_chunks: list[RoutedChunk],
) -> EvaluationResult | None:
    try:
        from openai import OpenAI
    except ImportError:
        return None

    client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_evaluation_timeout_seconds)
    schema = {
        "name": "eia_item_evaluation",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "adequacy": {
                    "type": "string",
                    "enum": [
                        ADEQUACY_FULLY_ADDRESSED,
                        ADEQUACY_PARTIALLY_ADDRESSED,
                        ADEQUACY_WEAK,
                        ADEQUACY_MISSING,
                        ADEQUACY_NEEDS_REVIEW,
                    ],
                },
                "evidence_summary": {"type": "string"},
                "ai_analysis": {"type": "string"},
                "missing_elements": {"type": "array", "items": {"type": "string"}},
                "recommendation": {"type": ["string", "null"]},
                "confidence": {"type": "number"},
            },
            "required": [
                "adequacy",
                "evidence_summary",
                "ai_analysis",
                "missing_elements",
                "recommendation",
                "confidence",
            ],
        },
    }
    try:
        response = client.chat.completions.create(
            model=settings.openai_evaluation_model,
            temperature=0,
            response_format={"type": "json_schema", "json_schema": schema},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_user_prompt(
                        section_number=section.section_number,
                        section_title=section.title,
                        subsection_number=subsection.subsection_number,
                        subsection_title=subsection.title,
                        draft_content=draft_content[:14000],
                        routed_chunks=[
                            {
                                "chunk_id": chunk.chunk_key,
                                "page_number": chunk.page_number,
                                "section_number": chunk.section_number,
                                "section_title": chunk.section_title,
                                "content": chunk.content[:1600],
                            }
                            for chunk in routed_chunks[:6]
                        ],
                        source_notes=source_notes[:10],
                    ),
                },
            ],
        )
        payload = json.loads(response.choices[0].message.content or "{}")
        confidence = max(0.0, min(1.0, float(payload.get("confidence") or 0.0)))
        return EvaluationResult(
            adequacy=str(payload.get("adequacy") or ADEQUACY_NEEDS_REVIEW),
            evidence_summary=str(payload.get("evidence_summary") or "").strip() or "Evidence summary unavailable.",
            ai_analysis=str(payload.get("ai_analysis") or "").strip() or "AI analysis unavailable.",
            missing_elements=[
                str(item).strip()
                for item in payload.get("missing_elements", [])
                if isinstance(item, str) and item.strip()
            ],
            recommendation=(
                str(payload.get("recommendation")).strip()
                if isinstance(payload.get("recommendation"), str) and str(payload.get("recommendation")).strip()
                else None
            ),
            confidence=confidence,
            engine="openai",
            metadata={
                "provider": "openai",
                "routed_chunk_count": len(routed_chunks),
                "used_subsection_draft": bool(draft_content),
            },
        )
    except Exception as exc:
        return EvaluationResult(
            adequacy=ADEQUACY_NEEDS_REVIEW,
            evidence_summary="OpenAI evaluation was unavailable; a deterministic fallback was used instead.",
            ai_analysis="The configured evaluation model could not complete this checklist item in the current run.",
            missing_elements=[],
            recommendation="Review this subsection manually or rerun the evaluation after the OpenAI configuration is confirmed.",
            confidence=0.25,
            engine="rules",
            metadata={"warning": f"OpenAI fallback used for {subsection.subsection_number}: {exc}"},
        )


def _deterministic_content_evaluation(
    *,
    subsection: EiaSubSection,
    draft_content: str,
    routed_chunks: list[RoutedChunk],
    source_notes: list[str],
) -> EvaluationResult:
    combined_text = " ".join(
        piece for piece in [draft_content, *[chunk.content for chunk in routed_chunks[:4]]] if piece
    ).lower()
    coverage_signals = sum(
        1
        for token in ["impact", "mitigation", "evidence", "monitor", "baseline", "risk", "assessment", "data"]
        if token in combined_text
    )
    has_numeric_support = any(char.isdigit() for char in combined_text)
    has_sources = bool(routed_chunks or source_notes)
    draft_length = len(draft_content)

    if coverage_signals >= 4 and has_numeric_support and has_sources and draft_length >= 160:
        adequacy = ADEQUACY_FULLY_ADDRESSED
        confidence = 0.7
        evidence_summary = "The subsection draft is supported by routed source chunks and includes multiple checklist-relevant signals."
        ai_analysis = "The available draft and routed evidence together suggest that this checklist item is materially covered."
        missing_elements: list[str] = []
        recommendation = "Validate that cited evidence remains current and complete before final submission."
    elif coverage_signals >= 2 and (draft_length >= 80 or has_sources):
        adequacy = ADEQUACY_PARTIALLY_ADDRESSED
        confidence = 0.58
        evidence_summary = "Relevant evidence exists, but coverage is still uneven across the checklist requirements."
        ai_analysis = "The draft and/or routed chunks provide a useful starting point, though several areas still need stronger treatment."
        missing_elements = ["Add clearer quantified support, explicit evidence references, and any omitted environmental assumptions."]
        recommendation = "Expand the subsection and tighten the evidence trail before review sign-off."
    elif has_sources or draft_length > 0:
        adequacy = ADEQUACY_WEAK
        confidence = 0.46
        evidence_summary = "Some evidence is present, but it does not yet demonstrate strong checklist coverage."
        ai_analysis = "The evaluation pipeline found material to inspect, but the current coverage is still weak or fragmented."
        missing_elements = ["Provide fuller environmental detail, stronger reasoning, and more direct source alignment."]
        recommendation = f"Strengthen checklist item {subsection.subsection_number} with evidence-based detail and traceable support."
    else:
        adequacy = ADEQUACY_MISSING
        confidence = 0.95
        evidence_summary = "No usable draft content or routed evidence was available."
        ai_analysis = "The checklist item remains substantively unaddressed."
        missing_elements = [f"Provide content and evidence for {subsection.subsection_number}."]
        recommendation = "Add source-backed content before running compliance review again."

    return EvaluationResult(
        adequacy=adequacy,
        evidence_summary=evidence_summary,
        ai_analysis=ai_analysis,
        missing_elements=missing_elements,
        recommendation=recommendation,
        confidence=confidence,
        engine="rules",
        metadata={
            "reason": "deterministic_fallback",
            "routed_chunk_count": len(routed_chunks),
            "source_note_count": len(source_notes),
            "draft_length": draft_length,
        },
    )


def _classify_result(result: EvaluationResult) -> str:
    if result.adequacy == ADEQUACY_MISSING:
        return STATUS_MISSING
    if result.adequacy == ADEQUACY_WEAK:
        return STATUS_NEEDS_IMPROVEMENT
    if result.adequacy == ADEQUACY_PARTIALLY_ADDRESSED:
        return STATUS_PARTIALLY_COMPLIANT
    if result.adequacy == ADEQUACY_NEEDS_REVIEW or result.confidence < 0.35:
        return STATUS_NEEDS_REVIEW
    return STATUS_COMPLIANT


def _build_evidence_references(
    *,
    subsection: EiaSubSection,
    routed_chunks: list[RoutedChunk],
    source_mappings: list[EiaSourceMapping],
) -> list[dict[str, Any]]:
    refs: list[dict[str, Any]] = []
    if subsection.content:
        refs.append(
            {
                "chunk_id": str(subsection.id),
                "document_chunk_id": None,
                "document_version_id": None,
                "source_type": "subsection_content",
                "subsection_id": str(subsection.id),
                "subsection_number": subsection.subsection_number,
                "excerpt": _excerpt(subsection.content),
                "page_number": None,
                "source_document_id": None,
                "source_document_filename": None,
            }
        )
    for chunk in routed_chunks:
        refs.append(
            {
                "chunk_id": chunk.chunk_key,
                "document_chunk_id": str(chunk.document_chunk_id),
                "document_version_id": str(chunk.document_version_id),
                "source_type": "document_chunk",
                "subsection_id": str(subsection.id),
                "subsection_number": subsection.subsection_number,
                "excerpt": _excerpt(chunk.content),
                "page_number": chunk.page_number,
                "source_document_id": str(chunk.document_id),
                "source_document_filename": chunk.source_document_filename,
            }
        )
    for mapping in source_mappings[:5]:
        refs.append(
            {
                "chunk_id": str(mapping.id),
                "document_chunk_id": None,
                "document_version_id": str(mapping.source_version_id) if mapping.source_version_id else None,
                "source_type": "source_mapping",
                "subsection_id": str(subsection.id),
                "subsection_number": subsection.subsection_number,
                "excerpt": _excerpt(mapping.detected_content),
                "page_number": None,
                "source_document_id": str(mapping.source_document_id),
                "source_document_filename": mapping.source_document.original_filename,
            }
        )
    return refs


def _build_section_summaries(
    run: EiaEvaluationRun,
    sections: list[EiaSection],
    section_findings: dict[str, list[EiaEvaluationFinding]],
) -> list[EiaEvaluationSectionSummary]:
    summaries: list[EiaEvaluationSectionSummary] = []
    for section in sections:
        findings = section_findings.get(section.section_number, [])
        counter = Counter(finding.status for finding in findings)
        score = round(
            (sum(STATUS_WEIGHTS.get(finding.status, 0.0) for finding in findings) / len(findings) * 10),
            2,
        ) if findings else 0.0
        summaries.append(
            EiaEvaluationSectionSummary(
                tenant_id=run.tenant_id,
                evaluation_run_id=run.id,
                section_number=section.section_number,
                section_title=section.title,
                findings_count=len(findings),
                compliant_count=counter.get(STATUS_COMPLIANT, 0),
                partially_compliant_count=counter.get(STATUS_PARTIALLY_COMPLIANT, 0),
                needs_improvement_count=counter.get(STATUS_NEEDS_IMPROVEMENT, 0),
                missing_count=counter.get(STATUS_MISSING, 0),
                needs_review_count=counter.get(STATUS_NEEDS_REVIEW, 0),
                score=score,
                summary_comment=_section_summary_comment(section.title, counter, score),
                summary_metadata={"status_counts": dict(counter)},
            )
        )
    return summaries


def _section_summary_comment(section_title: str, counter: Counter, score: float) -> str:
    if counter.get(STATUS_MISSING):
        return f"{section_title} has missing checklist coverage and requires substantive drafting before review sign-off."
    if counter.get(STATUS_NEEDS_IMPROVEMENT):
        return f"{section_title} is partially developed but still contains weak checklist responses."
    if counter.get(STATUS_NEEDS_REVIEW):
        return f"{section_title} includes low-confidence items that should be reviewed manually."
    if score >= 8:
        return f"{section_title} is broadly ready for reviewer validation."
    return f"{section_title} is progressing but still needs coverage refinement."


def _build_run_metadata(
    *,
    findings: list[EiaEvaluationFinding],
    section_summaries: list[EiaEvaluationSectionSummary],
    warnings: list[str],
    used_openai: bool,
    fallback_count: int,
    routed_chunk_count: int,
) -> dict[str, Any]:
    counter = Counter(finding.status for finding in findings)
    overall_score = round(sum(summary.score for summary in section_summaries) / len(section_summaries), 2) if section_summaries else 0.0
    return {
        "warnings": warnings[:20],
        "used_openai": used_openai,
        "fallback_count": fallback_count,
        "routed_chunk_count": routed_chunk_count,
        "total_findings": len(findings),
        "status_counts": dict(counter),
        "overall_score": overall_score,
        "overall_appraisal": _overall_appraisal(overall_score),
        "review_report": {
            "summary": _overall_summary(counter, overall_score),
            "priority_actions": _priority_actions(findings),
        },
    }


def _overall_appraisal(score: float) -> str:
    if score >= 8.5:
        return "A"
    if score >= 7.0:
        return "B"
    if score >= 5.5:
        return "C"
    if score >= 3.5:
        return "D"
    return "E"


def _overall_summary(counter: Counter, overall_score: float) -> str:
    if counter.get(STATUS_MISSING):
        return f"Overall score {overall_score}/10. Multiple checklist items remain missing, so the document is not yet review-ready."
    if counter.get(STATUS_NEEDS_IMPROVEMENT):
        return f"Overall score {overall_score}/10. The document has a workable base, but several sections still need stronger evidence and clearer treatment."
    return f"Overall score {overall_score}/10. The structured EIA is largely developed and ready for targeted reviewer validation."


def _priority_actions(findings: list[EiaEvaluationFinding]) -> list[str]:
    actions: list[str] = []
    for finding in findings:
        if finding.status in {STATUS_MISSING, STATUS_NEEDS_IMPROVEMENT, STATUS_NEEDS_REVIEW} and finding.recommendation:
            actions.append(f"{finding.checklist_section}: {finding.recommendation}")
        if len(actions) == 5:
            break
    return actions


def _get_finding_for_commenting(
    db: Session,
    current_user: User,
    document_id: UUID,
    run_id: UUID,
    finding_id: UUID,
) -> EiaEvaluationFinding:
    document = get_eia_document_for_tenant(db, current_user, document_id, DOCUMENT_REVIEW_ROLES, "comment on findings")
    finding = db.scalar(
        select(EiaEvaluationFinding)
        .where(
            EiaEvaluationFinding.id == finding_id,
            EiaEvaluationFinding.evaluation_run_id == run_id,
            EiaEvaluationFinding.tenant_id == current_user.tenant_id,
        )
    )
    if finding is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation finding not found")
    run = db.get(EiaEvaluationRun, run_id)
    if run is None or run.eia_document_id != document.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation run not found")
    return finding


def _normalize_text(value: str) -> str:
    return " ".join("".join(char.lower() if char.isalnum() else " " for char in value).split())


def _tokenize(value: str) -> set[str]:
    return {token for token in _normalize_text(value).split() if len(token) > 2}


def _metadata_number(metadata: dict[str, Any] | None, key: str) -> float:
    if not metadata:
        return 0.0
    value = metadata.get(key)
    return float(value) if isinstance(value, (int, float)) else 0.0


def _excerpt(value: str | None, limit: int = 220) -> str | None:
    if not value:
        return None
    compact = " ".join(value.split())
    if len(compact) <= limit:
        return compact
    return compact[: limit - 3].rstrip() + "..."
