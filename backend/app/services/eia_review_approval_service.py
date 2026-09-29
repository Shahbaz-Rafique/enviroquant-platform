from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session, selectinload

from app.models.eia import EiaDocument
from app.models.eia_evaluation import EiaEvaluationRun
from app.models.eia_review_approval import EiaReviewApproval
from app.models.user import User
from app.schemas.eia import EiaReviewApprovalCreate, EiaReviewApprovalDecision
from app.services.audit_service import record_audit_event
from app.services.eia_service import (
    DOCUMENT_EDIT_ROLES,
    DOCUMENT_ROLE_REVIEWER,
    get_document_member_role,
    get_eia_document_for_tenant,
    is_eia_document_admin,
    require_eia_document_permission,
)

REVIEW_APPROVALS_MIGRATION = "0010_eia_review_approvals"


def list_review_approvals(
    db: Session,
    current_user: User,
    document_id: UUID,
) -> list[EiaReviewApproval]:
    document = get_eia_document_for_tenant(db, current_user, document_id)
    if not review_approval_table_exists(db):
        return []
    statement = (
        select(EiaReviewApproval)
        .where(
            EiaReviewApproval.tenant_id == current_user.tenant_id,
            EiaReviewApproval.eia_document_id == document.id,
        )
        .order_by(EiaReviewApproval.created_at.desc())
    )
    return list(db.scalars(statement).all())


def create_review_approval_request(
    db: Session,
    current_user: User,
    document_id: UUID,
    payload: EiaReviewApprovalCreate,
) -> EiaReviewApproval:
    document = get_eia_document_for_tenant(db, current_user, document_id)
    require_review_approval_schema(db)
    require_eia_document_permission(document, current_user, DOCUMENT_EDIT_ROLES, "submit for review")
    run = _get_completed_run(db, current_user, document, payload.evaluation_run_id)
    active_request = db.scalar(
        select(EiaReviewApproval).where(
            EiaReviewApproval.tenant_id == current_user.tenant_id,
            EiaReviewApproval.eia_document_id == document.id,
            EiaReviewApproval.status == "REQUESTED",
        )
    )
    if active_request is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An active review request already exists")

    approval = EiaReviewApproval(
        tenant_id=current_user.tenant_id,
        project_id=document.project_id,
        eia_document_id=document.id,
        evaluation_run_id=run.id,
        requested_by_id=current_user.id,
        status="REQUESTED",
        request_note=payload.request_note.strip() if payload.request_note else None,
        decision_note=None,
        requested_at=datetime.now(UTC),
        decided_at=None,
        approval_metadata={
            "overall_score": run.run_metadata.get("overall_score"),
            "overall_appraisal": run.run_metadata.get("overall_appraisal"),
        },
    )
    db.add(approval)
    document.status = "IN_REVIEW"
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.review.requested",
        entity_type="eia_review_approval",
        entity_id=approval.id,
        summary=f"Review requested for {document.title}",
        metadata={"evaluation_run_id": str(run.id), "eia_document_id": str(document.id)},
    )
    db.commit()
    return db.get(EiaReviewApproval, approval.id)


def decide_review_approval(
    db: Session,
    current_user: User,
    document_id: UUID,
    approval_id: UUID,
    payload: EiaReviewApprovalDecision,
) -> EiaReviewApproval:
    document = get_eia_document_for_tenant(db, current_user, document_id)
    require_review_approval_schema(db)
    _require_formal_reviewer(document, current_user)
    approval = db.scalar(
        select(EiaReviewApproval).where(
            EiaReviewApproval.id == approval_id,
            EiaReviewApproval.tenant_id == current_user.tenant_id,
            EiaReviewApproval.eia_document_id == document.id,
        )
    )
    if approval is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review approval request not found")
    if approval.status != "REQUESTED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This review request has already been decided")

    approval.status = payload.decision
    approval.decision_note = payload.decision_note.strip() if payload.decision_note else None
    approval.decided_by_id = current_user.id
    approval.decided_at = datetime.now(UTC)
    approval.approval_metadata = {
        **(approval.approval_metadata or {}),
        "decision_role": get_document_member_role(document, current_user),
    }
    document.status = "APPROVED" if payload.decision == "APPROVED" else "CHANGES_REQUESTED"
    metadata = dict(document.document_metadata or {})
    revision_history = list(metadata.get("revision_history") or [])
    revision_history.append({
        "revision": f"{len(revision_history) + 1:02d}",
        "date": approval.decided_at.date().isoformat(),
        "description": "Approved for controlled issue" if payload.decision == "APPROVED" else "Changes requested after professional review",
        "decision": payload.decision,
        "reviewer_user_id": str(current_user.id),
        "evaluation_run_id": str(approval.evaluation_run_id),
    })
    metadata["revision_history"] = revision_history
    metadata["revision"] = revision_history[-1]["revision"]
    metadata["controlled_issue_id"] = f"EQ-{str(document.id)[:8].upper()}-R{revision_history[-1]['revision']}"
    document.document_metadata = metadata
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.review.decided",
        entity_type="eia_review_approval",
        entity_id=approval.id,
        summary=f"Review {payload.decision.lower().replace('_', ' ')} for {document.title}",
        metadata={"evaluation_run_id": str(approval.evaluation_run_id), "eia_document_id": str(document.id)},
    )
    db.commit()
    return db.get(EiaReviewApproval, approval.id)


def _get_completed_run(
    db: Session,
    current_user: User,
    document: EiaDocument,
    run_id: UUID,
) -> EiaEvaluationRun:
    run = db.scalar(
        select(EiaEvaluationRun)
        .options(selectinload(EiaEvaluationRun.findings))
        .where(
            EiaEvaluationRun.id == run_id,
            EiaEvaluationRun.tenant_id == current_user.tenant_id,
            EiaEvaluationRun.eia_document_id == document.id,
        )
    )
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation run not found")
    if run.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only completed evaluation runs can be submitted for formal review",
        )
    return run


def _require_formal_reviewer(document: EiaDocument, current_user: User) -> None:
    if is_eia_document_admin(current_user):
        return
    role = get_document_member_role(document, current_user)
    if role == DOCUMENT_ROLE_REVIEWER:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="A reviewer role is required to approve or reject a formal review request",
    )


def review_approval_table_exists(db: Session) -> bool:
    return inspect(db.get_bind()).has_table(EiaReviewApproval.__tablename__)


def require_review_approval_schema(db: Session) -> None:
    if review_approval_table_exists(db):
        return
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "Formal review approvals are unavailable until database migration "
            f"{REVIEW_APPROVALS_MIGRATION} is applied"
        ),
    )
