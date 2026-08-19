from __future__ import annotations

from copy import deepcopy
from datetime import UTC, date, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import Roles
from app.models.eia import EiaDocument, EiaSection, EiaSubSection
from app.models.eia_document_member import EiaDocumentMember
from app.models.subsection_comment import SubSectionComment
from app.models.user import User
from app.schemas.eia import EiaAssignmentUpdate
from app.services.audit_service import record_audit_event
from app.services.eia_service import (
    DOCUMENT_READ_ROLES,
    get_eia_document_for_tenant,
    is_eia_document_admin,
)


def get_eia_document_assignments_overview(
    db: Session,
    current_user: User,
    document_id: UUID,
) -> dict[str, object]:
    document = _load_document_for_overview(db, current_user, document_id)
    return _build_assignment_overview(db, document, current_user)


def update_section_assignment(
    db: Session,
    current_user: User,
    document_id: UUID,
    section_id: UUID,
    payload: EiaAssignmentUpdate,
) -> dict[str, object]:
    document = _load_document_for_assignment_update(db, current_user, document_id)
    section = next((item for item in document.sections if item.id == section_id), None)
    if section is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA section not found")

    _validate_assignment_targets(document, payload)

    metadata = deepcopy(document.document_metadata or {})
    assignments = _ensure_assignment_container(metadata)
    section_assignments = assignments["sections"]
    section_assignments[str(section.id)] = {
        "author_user_id": str(payload.author_user_id) if payload.author_user_id else None,
        "reviewer_user_id": str(payload.reviewer_user_id) if payload.reviewer_user_id else None,
        "due_date": payload.due_date.isoformat() if payload.due_date else None,
        "is_blocked": payload.is_blocked,
        "blocked_reason": payload.blocked_reason if payload.is_blocked else None,
        "updated_at": datetime.now(UTC).isoformat(),
        "updated_by_id": str(current_user.id),
    }
    document.document_metadata = metadata
    subsection_assignments = assignments["subsections"]
    for subsection in section.subsections:
        if str(subsection.id) in subsection_assignments:
            continue
        if payload.author_user_id or payload.reviewer_user_id:
            _set_assignment_workflow_status(db, current_user, subsection, "ASSIGNED")
        else:
            _set_assignment_workflow_status(db, current_user, subsection, "NOT_STARTED")

    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.section.assignment.updated",
        entity_type="eia_section",
        entity_id=section.id,
        summary=f"Assignments updated for section {section.section_number}",
        metadata={"eia_document_id": str(document.id)},
    )
    db.commit()

    refreshed = _load_document_for_overview(db, current_user, document_id)
    return _build_assignment_overview(db, refreshed, current_user)


def clear_section_assignment(
    db: Session,
    current_user: User,
    document_id: UUID,
    section_id: UUID,
) -> dict[str, object]:
    document = _load_document_for_assignment_update(db, current_user, document_id)
    section = next((item for item in document.sections if item.id == section_id), None)
    if section is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA section not found")

    metadata = deepcopy(document.document_metadata or {})
    assignments = _ensure_assignment_container(metadata)
    section_assignments = assignments["sections"]
    section_assignments.pop(str(section.id), None)
    document.document_metadata = metadata
    subsection_assignments = assignments["subsections"]
    for subsection in section.subsections:
        if str(subsection.id) not in subsection_assignments:
            _set_assignment_workflow_status(db, current_user, subsection, "NOT_STARTED")

    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.section.assignment.cleared",
        entity_type="eia_section",
        entity_id=section.id,
        summary=f"Assignments cleared for section {section.section_number}",
        metadata={"eia_document_id": str(document.id)},
    )
    db.commit()

    refreshed = _load_document_for_overview(db, current_user, document_id)
    return _build_assignment_overview(db, refreshed, current_user)


def update_subsection_assignment(
    db: Session,
    current_user: User,
    document_id: UUID,
    subsection_id: UUID,
    payload: EiaAssignmentUpdate,
) -> dict[str, object]:
    document = _load_document_for_assignment_update(db, current_user, document_id)
    subsection = next(
        (
            item
            for section in document.sections
            for item in section.subsections
            if item.id == subsection_id
        ),
        None,
    )
    if subsection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="EIA subsection not found",
        )

    _validate_assignment_targets(document, payload)

    metadata = deepcopy(document.document_metadata or {})
    assignments = _ensure_assignment_container(metadata)
    subsection_assignments = assignments["subsections"]
    subsection_assignments[str(subsection.id)] = {
        "author_user_id": str(payload.author_user_id) if payload.author_user_id else None,
        "reviewer_user_id": str(payload.reviewer_user_id) if payload.reviewer_user_id else None,
        "due_date": payload.due_date.isoformat() if payload.due_date else None,
        "is_blocked": payload.is_blocked,
        "blocked_reason": payload.blocked_reason if payload.is_blocked else None,
        "updated_at": datetime.now(UTC).isoformat(),
        "updated_by_id": str(current_user.id),
    }
    document.document_metadata = metadata
    subsection.assigned_to_id = payload.author_user_id
    if payload.author_user_id or payload.reviewer_user_id:
        _set_assignment_workflow_status(db, current_user, subsection, "ASSIGNED")
    elif not _section_has_assignment(assignments, subsection.section_id):
        _set_assignment_workflow_status(db, current_user, subsection, "NOT_STARTED")

    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.subsection.assignment.updated",
        entity_type="eia_subsection",
        entity_id=subsection.id,
        summary=f"Assignments updated for subsection {subsection.subsection_number}",
        metadata={"eia_document_id": str(document.id)},
    )
    db.commit()

    refreshed = _load_document_for_overview(db, current_user, document_id)
    return _build_assignment_overview(db, refreshed, current_user)


def clear_subsection_assignment(
    db: Session,
    current_user: User,
    document_id: UUID,
    subsection_id: UUID,
) -> dict[str, object]:
    document = _load_document_for_assignment_update(db, current_user, document_id)
    subsection = next(
        (
            item
            for section in document.sections
            for item in section.subsections
            if item.id == subsection_id
        ),
        None,
    )
    if subsection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="EIA subsection not found",
        )

    metadata = deepcopy(document.document_metadata or {})
    assignments = _ensure_assignment_container(metadata)
    subsection_assignments = assignments["subsections"]
    subsection_assignments.pop(str(subsection.id), None)
    document.document_metadata = metadata
    subsection.assigned_to_id = None
    if _section_has_assignment(assignments, subsection.section_id):
        _set_assignment_workflow_status(db, current_user, subsection, "ASSIGNED")
    else:
        _set_assignment_workflow_status(db, current_user, subsection, "NOT_STARTED")

    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.subsection.assignment.cleared",
        entity_type="eia_subsection",
        entity_id=subsection.id,
        summary=f"Assignments cleared for subsection {subsection.subsection_number}",
        metadata={"eia_document_id": str(document.id)},
    )
    db.commit()

    refreshed = _load_document_for_overview(db, current_user, document_id)
    return _build_assignment_overview(db, refreshed, current_user)


def _load_document_for_overview(
    db: Session,
    current_user: User,
    document_id: UUID,
    *,
    lock_for_update: bool = False,
) -> EiaDocument:
    get_eia_document_for_tenant(db, current_user, document_id, DOCUMENT_READ_ROLES, "view")
    statement = (
        select(EiaDocument)
        .options(
            selectinload(EiaDocument.sections)
            .selectinload(EiaSection.subsections)
            .selectinload(EiaSubSection.last_edited_by),
            selectinload(EiaDocument.members).selectinload(EiaDocumentMember.user),
            selectinload(EiaDocument.created_by),
        )
        .where(EiaDocument.id == document_id, EiaDocument.tenant_id == current_user.tenant_id)
    )
    if lock_for_update:
        statement = statement.with_for_update(of=EiaDocument).execution_options(
            populate_existing=True
        )
    document = db.scalars(statement).unique().one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA document not found")
    return document


def _load_document_for_assignment_update(
    db: Session,
    current_user: User,
    document_id: UUID,
) -> EiaDocument:
    document = _load_document_for_overview(
        db,
        current_user,
        document_id,
        lock_for_update=True,
    )
    if _can_manage_assignments(document, current_user):
        return document
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="EIA assignment management permission required",
    )


def _can_manage_assignments(document: EiaDocument, current_user: User) -> bool:
    if document.created_by_id == current_user.id or is_eia_document_admin(current_user):
        return True
    lowered_roles = {role.lower() for role in current_user.role_names}
    return Roles.PROJECT_MANAGER in lowered_roles


def _validate_assignment_targets(document: EiaDocument, payload: EiaAssignmentUpdate) -> None:
    roles_by_user_id = {member.user_id: member.role.upper() for member in document.members}
    roles_by_user_id[document.created_by_id] = "EDITOR"

    for user_id in (payload.author_user_id, payload.reviewer_user_id):
        if user_id is None:
            continue
        if user_id not in roles_by_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignments must target existing EIA document members",
            )

    if payload.author_user_id and roles_by_user_id[payload.author_user_id] != "EDITOR":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Section authors must have the EIA document Editor role",
        )
    if payload.reviewer_user_id and roles_by_user_id[payload.reviewer_user_id] not in {
        "EDITOR",
        "REVIEWER",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Section reviewers must have the EIA document Editor or Reviewer role",
        )


def _build_assignment_overview(
    db: Session,
    document: EiaDocument,
    current_user: User,
) -> dict[str, object]:
    section_assignments, subsection_assignments = _document_assignment_maps(document)
    unresolved_by_subsection = _unresolved_comment_counts(db, document)
    users_by_id = _member_user_map(document)

    section_items: list[dict[str, object]] = []
    my_work_items: list[dict[str, object]] = []

    for section in document.sections:
        section_item, section_my_work = _build_section_assignment_item(
            section,
            section_assignments,
            subsection_assignments,
            unresolved_by_subsection,
            users_by_id,
            current_user.id,
        )
        if section_item is None:
            continue
        section_items.append(section_item)
        my_work_items.extend(section_my_work)

    my_work_items.sort(
        key=lambda item: item["subsection"].get("last_updated_at")
        or datetime.min.replace(tzinfo=UTC),
        reverse=True,
    )

    return {
        "eia_document_id": document.id,
        "sections": section_items,
        "my_assigned_work": my_work_items,
    }


def _document_assignment_maps(document: EiaDocument) -> tuple[dict[str, object], dict[str, object]]:
    metadata = document.document_metadata if isinstance(document.document_metadata, dict) else {}
    assignment_container = (
        metadata.get("assignments") if isinstance(metadata.get("assignments"), dict) else {}
    )
    section_assignments = (
        assignment_container.get("sections")
        if isinstance(assignment_container.get("sections"), dict)
        else {}
    )
    subsection_assignments = (
        assignment_container.get("subsections")
        if isinstance(assignment_container.get("subsections"), dict)
        else {}
    )
    return section_assignments, subsection_assignments


def _unresolved_comment_counts(db: Session, document: EiaDocument) -> dict[UUID, int]:
    unresolved_rows = db.execute(
        select(SubSectionComment.subsection_id, func.count(SubSectionComment.id))
        .join(EiaSubSection, EiaSubSection.id == SubSectionComment.subsection_id)
        .where(
            SubSectionComment.tenant_id == document.tenant_id,
            EiaSubSection.eia_document_id == document.id,
            SubSectionComment.is_resolved.is_(False),
        )
        .group_by(SubSectionComment.subsection_id)
    ).all()
    return {row[0]: int(row[1]) for row in unresolved_rows}


def _member_user_map(document: EiaDocument) -> dict[UUID, User]:
    users_by_id: dict[UUID, User] = {}
    if document.created_by is not None:
        users_by_id[document.created_by_id] = document.created_by
    for member in document.members:
        if member.user is not None:
            users_by_id[member.user_id] = member.user
    return users_by_id


def _build_section_assignment_item(
    section: EiaSection,
    section_assignments: dict[str, object],
    subsection_assignments: dict[str, object],
    unresolved_by_subsection: dict[UUID, int],
    users_by_id: dict[UUID, User],
    current_user_id: UUID,
) -> tuple[dict[str, object] | None, list[dict[str, object]]]:
    section_assignment = _assignment_values(section_assignments.get(str(section.id)))
    subsection_items: list[dict[str, object]] = []
    my_work_items: list[dict[str, object]] = []

    for subsection in section.subsections:
        subsection_assignment = _assignment_values(subsection_assignments.get(str(subsection.id)))
        subsection_item, current_user_assignment_role = _build_subsection_assignment_item(
            subsection,
            section_assignment,
            subsection_assignment,
            unresolved_by_subsection,
            users_by_id,
            current_user_id,
        )
        subsection_items.append(subsection_item)
        if current_user_assignment_role is not None:
            my_work_items.append(
                {
                    "section_id": section.id,
                    "section_number": section.section_number,
                    "section_title": section.title,
                    "assignment_role": current_user_assignment_role,
                    "subsection": subsection_item,
                }
            )

    if not subsection_items:
        return None, my_work_items

    section_summary = _summarize_section_assignment(
        section,
        subsection_items,
        section_assignment,
        users_by_id,
    )
    return section_summary, my_work_items


def _build_subsection_assignment_item(
    subsection: EiaSubSection,
    section_assignment: dict[str, object] | None,
    subsection_assignment: dict[str, object] | None,
    unresolved_by_subsection: dict[UUID, int],
    users_by_id: dict[UUID, User],
    current_user_id: UUID,
) -> tuple[dict[str, object], str | None]:
    assignment_source = _assignment_source(section_assignment, subsection_assignment)
    effective = subsection_assignment if subsection_assignment is not None else section_assignment
    author_id = effective.get("author_user_id") if effective else None
    reviewer_id = effective.get("reviewer_user_id") if effective else None
    due_date = effective.get("due_date") if effective else None
    is_blocked = bool(effective.get("is_blocked")) if effective else False
    blocked_reason = effective.get("blocked_reason") if effective else None
    author_user = users_by_id.get(author_id) if author_id else None
    reviewer_user = users_by_id.get(reviewer_id) if reviewer_id else None
    unresolved_count = unresolved_by_subsection.get(subsection.id, 0)
    review_status = _subsection_review_status(
        subsection.completion_status,
        subsection.progress_percentage,
        unresolved_count,
    )
    current_role, current_assignee = _current_responsibility(
        subsection.completion_status,
        author_user,
        reviewer_user,
    )

    subsection_item = {
        "subsection_id": subsection.id,
        "subsection_number": subsection.subsection_number,
        "title": subsection.title,
        "completion_status": subsection.completion_status,
        "progress_percentage": subsection.progress_percentage,
        "review_status": review_status,
        "unresolved_comment_count": unresolved_count,
        "last_updated_at": subsection.last_edited_at or subsection.updated_at,
        "last_updated_by_id": subsection.last_edited_by_id,
        "last_updated_by": _assignee(subsection.last_edited_by),
        "due_date": due_date,
        "is_overdue": _is_overdue(due_date, subsection.completion_status),
        "is_blocked": is_blocked,
        "blocked_reason": blocked_reason,
        "assignment_source": assignment_source,
        "author_assignee": _assignee(author_user),
        "reviewer_assignee": _assignee(reviewer_user),
        "current_role": current_role,
        "current_assignee": _assignee(current_assignee),
    }
    current_user_assignment_role = _user_assignment_role(current_user_id, author_id, reviewer_id)
    return subsection_item, current_user_assignment_role


def _user_assignment_role(
    current_user_id: UUID,
    author_id: UUID | None,
    reviewer_id: UUID | None,
) -> str | None:
    if author_id == current_user_id and reviewer_id == current_user_id:
        return "AUTHOR_AND_REVIEWER"
    if author_id == current_user_id:
        return "AUTHOR"
    if reviewer_id == current_user_id:
        return "REVIEWER"
    return None


def _summarize_section_assignment(
    section: EiaSection,
    subsection_items: list[dict[str, object]],
    section_assignment: dict[str, object] | None,
    users_by_id: dict[UUID, User],
) -> dict[str, object]:
    section_completion = _section_completion_status(subsection_items)
    section_progress = round(
        sum(float(item["progress_percentage"]) for item in subsection_items)
        / len(subsection_items),
        2,
    )
    section_unresolved = sum(int(item["unresolved_comment_count"]) for item in subsection_items)
    section_review_status = _section_review_status(subsection_items)
    updated_items = [item for item in subsection_items if item["last_updated_at"] is not None]
    last_updated_item = max(updated_items, key=lambda item: item["last_updated_at"]) if updated_items else None
    last_updated_at = last_updated_item["last_updated_at"] if last_updated_item else None

    author_id = section_assignment.get("author_user_id") if section_assignment else None
    reviewer_id = section_assignment.get("reviewer_user_id") if section_assignment else None
    author_user = users_by_id.get(author_id) if author_id else None
    reviewer_user = users_by_id.get(reviewer_id) if reviewer_id else None
    current_role, current_assignee = _section_responsibility(
        subsection_items,
        author_user,
        reviewer_user,
    )
    due_dates = [item["due_date"] for item in subsection_items if item.get("due_date")]
    due_date = min(due_dates, default=None)
    blocked_items = [item for item in subsection_items if item.get("is_blocked")]

    return {
        "section_id": section.id,
        "section_number": section.section_number,
        "title": section.title,
        "completion_status": section_completion,
        "progress_percentage": section_progress,
        "review_status": section_review_status,
        "unresolved_comment_count": section_unresolved,
        "last_updated_at": last_updated_at,
        "last_updated_by": last_updated_item.get("last_updated_by") if last_updated_item else None,
        "has_assignment": section_assignment is not None,
        "due_date": due_date,
        "is_overdue": any(bool(item.get("is_overdue")) for item in subsection_items),
        "is_blocked": bool(blocked_items),
        "blocked_reason": next(
            (str(item["blocked_reason"]) for item in blocked_items if item.get("blocked_reason")),
            None,
        ),
        "author_assignee": _assignee(author_user),
        "reviewer_assignee": _assignee(reviewer_user),
        "current_role": current_role,
        "current_assignee": _assignee(current_assignee),
        "subsections": subsection_items,
    }


def _assignment_source(
    section_assignment: dict[str, object] | None,
    subsection_assignment: dict[str, object] | None,
) -> str:
    if subsection_assignment is not None:
        return "SUBSECTION"
    if section_assignment is not None:
        return "SECTION"
    return "UNASSIGNED"


def _ensure_assignment_container(metadata: dict[str, object]) -> dict[str, dict[str, object]]:
    assignments = metadata.get("assignments")
    if not isinstance(assignments, dict):
        assignments = {}
        metadata["assignments"] = assignments

    sections = assignments.get("sections")
    if not isinstance(sections, dict):
        sections = {}
        assignments["sections"] = sections

    subsections = assignments.get("subsections")
    if not isinstance(subsections, dict):
        subsections = {}
        assignments["subsections"] = subsections

    return {
        "sections": sections,
        "subsections": subsections,
    }


def _assignment_values(raw: object) -> dict[str, object] | None:
    if not isinstance(raw, dict):
        return None

    author_raw = raw.get("author_user_id")
    reviewer_raw = raw.get("reviewer_user_id")

    author_user_id = _to_uuid(author_raw)
    reviewer_user_id = _to_uuid(reviewer_raw)

    return {
        "author_user_id": author_user_id,
        "reviewer_user_id": reviewer_user_id,
        "due_date": _to_date(raw.get("due_date")),
        "is_blocked": raw.get("is_blocked") is True,
        "blocked_reason": (
            raw.get("blocked_reason")
            if isinstance(raw.get("blocked_reason"), str)
            else None
        ),
    }


def _to_date(value: object) -> date | None:
    if isinstance(value, date):
        return value
    if isinstance(value, str) and value:
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None
    return None


def _is_overdue(due_date: object, completion_status: str, *, today: date | None = None) -> bool:
    return (
        isinstance(due_date, date)
        and completion_status not in {"APPROVED", "COMPLETE"}
        and due_date < (today or datetime.now(UTC).date())
    )


def _to_uuid(value: object) -> UUID | None:
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    if isinstance(value, str) and value:
        try:
            return UUID(value)
        except ValueError:
            return None
    return None


def _subsection_review_status(
    completion_status: str,
    progress_percentage: float,
    unresolved_count: int,
) -> str:
    if unresolved_count > 0:
        return "COMMENTS_OPEN"
    if completion_status == "READY_FOR_REVIEW":
        return "READY_FOR_REVIEW"
    if completion_status == "UNDER_REVIEW":
        return "UNDER_REVIEW"
    if completion_status == "REVISION_REQUIRED":
        return "REVISION_REQUIRED"
    if completion_status in {"APPROVED", "COMPLETE"}:
        return "APPROVED"
    if completion_status in {"ASSIGNED", "IN_PROGRESS"} or progress_percentage > 0:
        return "IN_AUTHORING"
    return "NOT_STARTED"


def _current_responsibility(
    completion_status: str,
    author_user: User | None,
    reviewer_user: User | None,
) -> tuple[str, User | None]:
    if completion_status in {"READY_FOR_REVIEW", "UNDER_REVIEW", "APPROVED", "COMPLETE"} and reviewer_user is not None:
        return "REVIEWER", reviewer_user
    if author_user is not None:
        return "AUTHOR", author_user
    if reviewer_user is not None:
        return "REVIEWER", reviewer_user
    return "UNASSIGNED", None


def _section_completion_status(subsection_items: list[dict[str, object]]) -> str:
    statuses = {str(item["completion_status"]) for item in subsection_items}
    if statuses <= {"APPROVED", "COMPLETE"}:
        return "APPROVED"
    if "REVISION_REQUIRED" in statuses:
        return "REVISION_REQUIRED"
    if "UNDER_REVIEW" in statuses:
        return "UNDER_REVIEW"
    if "READY_FOR_REVIEW" in statuses:
        return "READY_FOR_REVIEW"
    if "IN_PROGRESS" in statuses or any(
        float(item["progress_percentage"]) > 0 for item in subsection_items
    ):
        return "IN_PROGRESS"
    if "ASSIGNED" in statuses:
        return "ASSIGNED"
    return "NOT_STARTED"


def _section_review_status(subsection_items: list[dict[str, object]]) -> str:
    if any(int(item["unresolved_comment_count"]) > 0 for item in subsection_items):
        return "COMMENTS_OPEN"
    if all(str(item["completion_status"]) in {"APPROVED", "COMPLETE"} for item in subsection_items):
        return "APPROVED"
    if any(str(item["completion_status"]) == "REVISION_REQUIRED" for item in subsection_items):
        return "REVISION_REQUIRED"
    if any(str(item["completion_status"]) == "UNDER_REVIEW" for item in subsection_items):
        return "UNDER_REVIEW"
    if any(
        str(item["completion_status"]) in {"READY_FOR_REVIEW", "UNDER_REVIEW", "APPROVED", "COMPLETE"}
        for item in subsection_items
    ):
        return "READY_FOR_REVIEW"
    if any(float(item["progress_percentage"]) > 0 for item in subsection_items):
        return "IN_AUTHORING"
    return "NOT_STARTED"


def _section_responsibility(
    subsection_items: list[dict[str, object]],
    section_author: User | None,
    section_reviewer: User | None,
) -> tuple[str, User | dict[str, object] | None]:
    if any(
        str(item["completion_status"])
        in {"READY_FOR_REVIEW", "UNDER_REVIEW", "APPROVED", "COMPLETE"}
        for item in subsection_items
    ):
        if section_reviewer is not None:
            return "REVIEWER", section_reviewer
    if section_author is not None:
        return "AUTHOR", section_author
    if section_reviewer is not None:
        return "REVIEWER", section_reviewer

    for item in subsection_items:
        current_assignee = item.get("current_assignee")
        current_role = str(item.get("current_role"))
        if isinstance(current_assignee, dict):
            return current_role, current_assignee

    return "UNASSIGNED", None


def _section_has_assignment(
    assignments: dict[str, dict[str, object]],
    section_id: UUID,
) -> bool:
    values = _assignment_values(assignments["sections"].get(str(section_id)))
    return bool(
        values
        and (values.get("author_user_id") or values.get("reviewer_user_id"))
    )


def _set_assignment_workflow_status(
    db: Session,
    current_user: User,
    subsection: EiaSubSection,
    target_status: str,
) -> None:
    if target_status == "ASSIGNED" and subsection.completion_status != "NOT_STARTED":
        return
    if target_status == "NOT_STARTED" and subsection.completion_status != "ASSIGNED":
        return

    previous_status = subsection.completion_status
    subsection.completion_status = target_status
    if target_status == "NOT_STARTED":
        subsection.progress_percentage = 0.0
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.subsection.workflow_status_changed",
        entity_type="eia_subsection",
        entity_id=subsection.id,
        summary=(
            f"Subsection {subsection.subsection_number} moved from "
            f"{previous_status} to {target_status}"
        ),
        metadata={
            "eia_document_id": str(subsection.eia_document_id),
            "subsection_id": str(subsection.id),
            "section_id": str(subsection.section_id),
            "from_status": previous_status,
            "to_status": target_status,
            "trigger": "assignment",
        },
    )


def _assignee(user: User | dict[str, object] | None) -> dict[str, object] | None:
    if user is None:
        return None
    if isinstance(user, dict):
        return {
            "id": user.get("id"),
            "full_name": user.get("full_name"),
            "email": user.get("email"),
            "status": user.get("status"),
        }
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "status": user.status,
    }
