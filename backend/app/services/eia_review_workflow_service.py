from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import Roles
from app.models.eia import EiaDocument, EiaSection, EiaSubSection
from app.models.eia_document_member import EiaDocumentMember
from app.models.subsection_comment import SubSectionComment
from app.models.user import User
from app.schemas.eia import EiaWorkflowTransitionRequest
from app.services.audit_service import record_audit_event
from app.services.eia_assignment_service import (
    _assignment_values,
    _document_assignment_maps,
    _member_user_map,
)
from app.services.eia_service import (
    DOCUMENT_READ_ROLES,
    get_eia_document_for_tenant,
    get_document_member_role,
    is_eia_document_admin,
)


WORKFLOW_STATUSES = {
    "NOT_STARTED",
    "ASSIGNED",
    "IN_PROGRESS",
    "READY_FOR_REVIEW",
    "UNDER_REVIEW",
    "REVISION_REQUIRED",
    "APPROVED",
}

AUTHOR_TRANSITIONS = {
    ("ASSIGNED", "IN_PROGRESS"),
    ("IN_PROGRESS", "READY_FOR_REVIEW"),
    ("REVISION_REQUIRED", "IN_PROGRESS"),
}

REVIEWER_TRANSITIONS = {
    ("READY_FOR_REVIEW", "UNDER_REVIEW"),
    ("UNDER_REVIEW", "REVISION_REQUIRED"),
    ("UNDER_REVIEW", "APPROVED"),
}


def transition_subsection_workflow(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    payload: EiaWorkflowTransitionRequest,
) -> EiaSubSection:
    subsection = _load_subsection(db, current_user, subsection_id, lock_for_update=True)
    current_status = _normalize_legacy_status(subsection.completion_status)
    target_status = payload.target_status

    if current_status == target_status:
        return subsection

    document = subsection.document
    is_author, is_reviewer = _workflow_capabilities(document, subsection, current_user)
    _validate_transition(current_status, target_status, is_author, is_reviewer)

    if target_status == "READY_FOR_REVIEW" and not _effective_assignment(document, subsection).get(
        "reviewer_user_id"
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assign a reviewer before submitting this subsection for review",
        )

    if target_status == "REVISION_REQUIRED" and not payload.comment:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A revision request must include a reviewer comment",
        )

    if target_status == "APPROVED" and _unresolved_comment_count(db, subsection.id) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resolve all subsection comments before approval",
        )

    subsection.completion_status = target_status
    _apply_workflow_progress(subsection, target_status)

    if payload.comment:
        review_comment = SubSectionComment(
            tenant_id=current_user.tenant_id,
            subsection_id=subsection.id,
            user_id=current_user.id,
            content=payload.comment,
            is_resolved=target_status == "APPROVED",
        )
        db.add(review_comment)
        db.flush()
        record_audit_event(
            db,
            tenant_id=current_user.tenant_id,
            actor_user_id=current_user.id,
            event_type="eia.comment.created",
            entity_type="subsection_comment",
            entity_id=review_comment.id,
            summary=f"Review comment added to subsection {subsection.subsection_number}",
            metadata={
                "subsection_id": str(subsection.id),
                "eia_document_id": str(subsection.eia_document_id),
                "workflow_status": target_status,
            },
        )

    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.subsection.workflow_status_changed",
        entity_type="eia_subsection",
        entity_id=subsection.id,
        summary=(
            f"Subsection {subsection.subsection_number} moved from "
            f"{current_status} to {target_status}"
        ),
        metadata={
            "eia_document_id": str(subsection.eia_document_id),
            "subsection_id": str(subsection.id),
            "section_id": str(subsection.section_id),
            "from_status": current_status,
            "to_status": target_status,
            "comment_added": bool(payload.comment),
        },
    )
    db.commit()
    db.refresh(subsection)
    return subsection


def list_eia_review_queue(
    db: Session,
    current_user: User,
    document_id: UUID,
) -> list[dict[str, object]]:
    document = _load_document(db, current_user, document_id)
    section_assignments, subsection_assignments = _document_assignment_maps(document)
    users_by_id = _member_user_map(document)

    counts = dict(
        db.execute(
            select(SubSectionComment.subsection_id, func.count(SubSectionComment.id))
            .join(EiaSubSection, EiaSubSection.id == SubSectionComment.subsection_id)
            .where(
                EiaSubSection.eia_document_id == document.id,
                SubSectionComment.is_resolved.is_(False),
            )
            .group_by(SubSectionComment.subsection_id)
        ).all()
    )

    queue: list[dict[str, object]] = []
    for section in document.sections:
        section_assignment = _assignment_values(section_assignments.get(str(section.id)))
        can_approve_section = bool(section.subsections) and all(
            (
                (
                    _normalize_legacy_status(candidate.completion_status) == "APPROVED"
                    and int(counts.get(candidate.id, 0)) == 0
                )
                or (
                    _normalize_legacy_status(candidate.completion_status) == "UNDER_REVIEW"
                    and _workflow_capabilities(document, candidate, current_user)[1]
                    and int(counts.get(candidate.id, 0)) == 0
                )
            )
            for candidate in section.subsections
        )
        for subsection in section.subsections:
            if subsection.completion_status not in {"READY_FOR_REVIEW", "UNDER_REVIEW"}:
                continue
            subsection_assignment = _assignment_values(
                subsection_assignments.get(str(subsection.id))
            )
            effective = subsection_assignment if subsection_assignment is not None else section_assignment
            effective = effective or {}
            author = users_by_id.get(effective.get("author_user_id"))
            reviewer = users_by_id.get(effective.get("reviewer_user_id"))
            if _review_queue_is_personal(current_user) and (
                reviewer is None or reviewer.id != current_user.id
            ):
                continue
            queue.append(
                {
                    "section_id": section.id,
                    "section_number": section.section_number,
                    "section_title": section.title,
                    "subsection_id": subsection.id,
                    "subsection_number": subsection.subsection_number,
                    "subsection_title": subsection.title,
                    "status": subsection.completion_status,
                    "progress_percentage": subsection.progress_percentage,
                    "submitted_at": subsection.updated_at,
                    "unresolved_comment_count": int(counts.get(subsection.id, 0)),
                    "author_assignee": _user_summary(author),
                    "reviewer_assignee": _user_summary(reviewer),
                    "is_assigned_reviewer": (
                        reviewer is not None and reviewer.id == current_user.id
                    ),
                    "can_approve_section": can_approve_section,
                }
            )

    return sorted(queue, key=lambda item: item["submitted_at"])


def approve_eia_section(
    db: Session,
    current_user: User,
    document_id: UUID,
    section_id: UUID,
) -> list[dict[str, object]]:
    document = _load_document(db, current_user, document_id)
    section = next((item for item in document.sections if item.id == section_id), None)
    if section is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA section not found")
    db.execute(
        select(EiaSubSection.id)
        .where(EiaSubSection.section_id == section.id)
        .with_for_update()
    ).all()
    for subsection in section.subsections:
        db.refresh(subsection)
    if not section.subsections:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Section has no subsections to approve",
        )

    for subsection in section.subsections:
        normalized = _normalize_legacy_status(subsection.completion_status)
        if _unresolved_comment_count(db, subsection.id) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Resolve all comments in subsection {subsection.subsection_number} "
                    "before section approval"
                ),
            )
        if normalized == "APPROVED":
            continue
        if normalized != "UNDER_REVIEW":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Every subsection must be under review before section approval",
            )
        _, is_reviewer = _workflow_capabilities(document, subsection, current_user)
        if not is_reviewer:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The assigned reviewer role is required to approve this section",
            )

    for subsection in section.subsections:
        previous_status = _normalize_legacy_status(subsection.completion_status)
        if previous_status == "APPROVED":
            continue
        subsection.completion_status = "APPROVED"
        subsection.progress_percentage = 100.0
        record_audit_event(
            db,
            tenant_id=current_user.tenant_id,
            actor_user_id=current_user.id,
            event_type="eia.subsection.workflow_status_changed",
            entity_type="eia_subsection",
            entity_id=subsection.id,
            summary=(
                f"Subsection {subsection.subsection_number} moved from "
                f"{previous_status} to APPROVED through section approval"
            ),
            metadata={
                "eia_document_id": str(document.id),
                "subsection_id": str(subsection.id),
                "section_id": str(section.id),
                "from_status": previous_status,
                "to_status": "APPROVED",
                "trigger": "section_approval",
            },
        )

    db.commit()
    return list_eia_review_queue(db, current_user, document_id)


def _validate_transition(
    current_status: str,
    target_status: str,
    is_author: bool,
    is_reviewer: bool,
) -> None:
    if target_status not in WORKFLOW_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid EIA subsection workflow status",
        )

    transition = (current_status, target_status)
    if transition in AUTHOR_TRANSITIONS and is_author:
        return
    if transition in REVIEWER_TRANSITIONS and is_reviewer:
        return

    if transition not in AUTHOR_TRANSITIONS | REVIEWER_TRANSITIONS:
        detail = f"Transition from {current_status} to {target_status} is not allowed"
    elif transition in AUTHOR_TRANSITIONS:
        detail = "The assigned author role is required for this transition"
    else:
        detail = "The assigned reviewer role is required for this transition"
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def _workflow_capabilities(
    document: EiaDocument,
    subsection: EiaSubSection,
    current_user: User,
) -> tuple[bool, bool]:
    workflow_manager = _is_workflow_manager(current_user)
    effective = _effective_assignment(document, subsection)
    member_role = get_document_member_role(document, current_user)
    tenant_roles = {role.lower() for role in current_user.role_names}
    is_author = workflow_manager or (
        Roles.CONSULTANT in tenant_roles
        and member_role == "EDITOR"
        and effective.get("author_user_id") == current_user.id
    )
    is_reviewer = workflow_manager or (
        Roles.REVIEWER in tenant_roles
        and member_role == "REVIEWER"
        and effective.get("reviewer_user_id") == current_user.id
    )
    return is_author, is_reviewer


def _is_workflow_manager(current_user: User) -> bool:
    manager_roles = {Roles.OWNER, Roles.ADMIN, Roles.PROJECT_MANAGER}
    return not manager_roles.isdisjoint(
        {role.lower() for role in current_user.role_names}
    )


def _review_queue_is_personal(current_user: User) -> bool:
    """Reviewers see only their work; workflow managers can oversee the full queue."""
    return not _is_workflow_manager(current_user)


def _effective_assignment(document: EiaDocument, subsection: EiaSubSection) -> dict[str, object]:
    section_assignments, subsection_assignments = _document_assignment_maps(document)
    subsection_assignment = _assignment_values(subsection_assignments.get(str(subsection.id)))
    if subsection_assignment is not None:
        return subsection_assignment
    return _assignment_values(section_assignments.get(str(subsection.section_id))) or {}


def _load_subsection(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    *,
    lock_for_update: bool,
) -> EiaSubSection:
    statement = (
        select(EiaSubSection)
        .options(
            selectinload(EiaSubSection.document)
            .selectinload(EiaDocument.members)
            .selectinload(EiaDocumentMember.user),
            selectinload(EiaSubSection.section),
        )
        .where(
            EiaSubSection.id == subsection_id,
            EiaSubSection.tenant_id == current_user.tenant_id,
        )
    )
    if lock_for_update:
        statement = statement.with_for_update(of=EiaSubSection)
    subsection = db.scalars(statement).unique().one_or_none()
    if subsection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA subsection not found")
    get_eia_document_for_tenant(
        db,
        current_user,
        subsection.eia_document_id,
        DOCUMENT_READ_ROLES,
        "use review workflow",
    )
    return subsection


def _load_document(db: Session, current_user: User, document_id: UUID) -> EiaDocument:
    get_eia_document_for_tenant(
        db, current_user, document_id, DOCUMENT_READ_ROLES, "view review queue"
    )
    statement = (
        select(EiaDocument)
        .options(
            selectinload(EiaDocument.sections).selectinload(EiaSection.subsections),
            selectinload(EiaDocument.members).selectinload(EiaDocumentMember.user),
            selectinload(EiaDocument.created_by),
        )
        .where(
            EiaDocument.id == document_id,
            EiaDocument.tenant_id == current_user.tenant_id,
        )
    )
    document = db.scalars(statement).unique().one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA document not found")
    return document


def _unresolved_comment_count(db: Session, subsection_id: UUID) -> int:
    return int(
        db.scalar(
            select(func.count(SubSectionComment.id)).where(
                SubSectionComment.subsection_id == subsection_id,
                SubSectionComment.is_resolved.is_(False),
            )
        )
        or 0
    )


def _apply_workflow_progress(subsection: EiaSubSection, target_status: str) -> None:
    if target_status == "IN_PROGRESS":
        subsection.progress_percentage = max(subsection.progress_percentage, 25.0)
    elif target_status in {"READY_FOR_REVIEW", "UNDER_REVIEW"}:
        subsection.progress_percentage = 100.0
    elif target_status == "REVISION_REQUIRED":
        subsection.progress_percentage = min(subsection.progress_percentage, 99.0)
    elif target_status == "APPROVED":
        subsection.progress_percentage = 100.0


def _normalize_legacy_status(value: str) -> str:
    return "APPROVED" if value == "COMPLETE" else value


def _user_summary(user: User | None) -> dict[str, object] | None:
    if user is None:
        return None
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "status": user.status,
    }
