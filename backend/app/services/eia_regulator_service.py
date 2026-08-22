from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import Permissions, Roles
from app.models.eia import EiaDocument
from app.models.eia_evaluation import EiaEvaluationRun
from app.models.eia_review_approval import EiaReviewApproval
from app.models.project import Project
from app.models.user import User
from app.services.eia_review_approval_service import review_approval_table_exists


def get_regulator_overview(
    db: Session,
    current_user: User,
    project_id: UUID,
) -> dict[str, object]:
    project = _get_project_for_insights(db, current_user, project_id)
    document_query = select(EiaDocument).options(
        selectinload(EiaDocument.evaluation_runs).selectinload(EiaEvaluationRun.section_summaries)
    )
    approvals_available = review_approval_table_exists(db)
    if approvals_available:
        document_query = document_query.options(selectinload(EiaDocument.review_approvals))
    documents = list(
        db.scalars(
            document_query.where(EiaDocument.tenant_id == current_user.tenant_id, EiaDocument.project_id == project.id)
        ).unique().all()
    )
    benchmark_documents = []
    trend_points = []
    recent_decisions: list[EiaReviewApproval] = []

    for document in documents:
        latest_completed = _latest_completed_run(document.evaluation_runs)
        review_approvals = list(document.review_approvals) if approvals_available else []
        latest_decision = next((item for item in review_approvals if item.decided_at is not None), None)
        benchmark_documents.append(
            {
                "eia_document_id": document.id,
                "title": document.title,
                "document_status": document.status,
                "latest_run_id": latest_completed.id if latest_completed else None,
                "latest_score": _run_score(latest_completed),
                "latest_appraisal": _run_appraisal(latest_completed),
                "latest_run_completed_at": latest_completed.completed_at if latest_completed else None,
                "approval_status": latest_decision.status if latest_decision else None,
                "scoring_enabled": _scoring_enabled(latest_completed),
            }
        )
        for run in document.evaluation_runs:
            if run.status != "COMPLETED":
                continue
            trend_points.append(
                {
                    "run_id": run.id,
                    "eia_document_id": document.id,
                    "eia_document_title": document.title,
                    "created_at": run.created_at,
                    "completed_at": run.completed_at,
                    "overall_score": _run_score(run),
                    "overall_appraisal": _run_appraisal(run),
                    "scoring_enabled": _scoring_enabled(run),
                }
            )
        recent_decisions.extend(review_approvals)

    benchmark_documents.sort(
        key=lambda item: (
            item["latest_score"],
            item["latest_run_completed_at"].timestamp() if item["latest_run_completed_at"] else 0.0,
        ),
        reverse=True,
    )
    trend_points.sort(key=lambda item: item["created_at"], reverse=True)
    recent_decisions.sort(key=lambda item: item.decided_at or item.requested_at, reverse=True)
    return {
        "project_id": project.id,
        "benchmark_documents": benchmark_documents,
        "trend_points": trend_points[:20],
        "recent_decisions": recent_decisions[:12],
    }


def compare_project_eia_documents(
    db: Session,
    current_user: User,
    project_id: UUID,
    *,
    left_document_id: UUID,
    right_document_id: UUID,
) -> dict[str, object]:
    project = _get_project_for_insights(db, current_user, project_id)
    documents = list(
        db.scalars(
            select(EiaDocument)
            .options(selectinload(EiaDocument.evaluation_runs).selectinload(EiaEvaluationRun.section_summaries))
            .where(
                EiaDocument.tenant_id == current_user.tenant_id,
                EiaDocument.project_id == project.id,
                EiaDocument.id.in_([left_document_id, right_document_id]),
            )
        ).unique().all()
    )
    by_id = {document.id: document for document in documents}
    left_document = by_id.get(left_document_id)
    right_document = by_id.get(right_document_id)
    if left_document is None or right_document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Both EIA documents must belong to this project")

    left_run = _latest_completed_run(left_document.evaluation_runs)
    right_run = _latest_completed_run(right_document.evaluation_runs)
    if left_run is None or right_run is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both EIA documents need at least one completed evaluation run before they can be compared",
        )

    left_sections = {summary.section_number: summary for summary in left_run.section_summaries}
    right_sections = {summary.section_number: summary for summary in right_run.section_summaries}
    section_numbers = sorted(set(left_sections) | set(right_sections))
    section_deltas = []
    for section_number in section_numbers:
        left_summary = left_sections.get(section_number)
        right_summary = right_sections.get(section_number)
        left_score = left_summary.score if left_summary is not None else 0.0
        right_score = right_summary.score if right_summary is not None else 0.0
        section_deltas.append(
            {
                "section_number": section_number,
                "section_title": (
                    left_summary.section_title
                    if left_summary is not None
                    else right_summary.section_title if right_summary is not None else section_number
                ),
                "current_score": left_score,
                "baseline_score": right_score,
                "delta": round(left_score - right_score, 2),
            }
        )

    return {
        "left_document_id": left_document.id,
        "right_document_id": right_document.id,
        "left_title": left_document.title,
        "right_title": right_document.title,
        "left_score": _run_score(left_run),
        "right_score": _run_score(right_run),
        "delta": round(_run_score(left_run) - _run_score(right_run), 2),
        "left_status_counts": _run_status_counts(left_run),
        "right_status_counts": _run_status_counts(right_run),
        "section_deltas": section_deltas,
        "scoring_enabled": _scoring_enabled(left_run) and _scoring_enabled(right_run),
    }


def _get_project_for_insights(db: Session, current_user: User, project_id: UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    _require_regulator_access(current_user)
    return project


def _require_regulator_access(current_user: User) -> None:
    role_names = {role.lower() for role in current_user.role_names}
    if Roles.REGULATOR in role_names or Roles.REVIEWER in role_names or Roles.ADMIN in role_names or Roles.OWNER in role_names:
        return
    if Permissions.REVIEW_READ in current_user.permission_keys:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Regulator insights access is not available for this user")


def _latest_completed_run(runs: list[EiaEvaluationRun]) -> EiaEvaluationRun | None:
    completed_runs = [run for run in runs if run.status == "COMPLETED"]
    if not completed_runs:
        return None
    completed_runs.sort(key=lambda run: run.completed_at or run.created_at, reverse=True)
    return completed_runs[0]


def _run_score(run: EiaEvaluationRun | None) -> float:
    if run is None or not isinstance(run.run_metadata, dict):
        return 0.0
    value = run.run_metadata.get("overall_score")
    return float(value) if isinstance(value, (int, float)) else 0.0


def _scoring_enabled(run: EiaEvaluationRun | None) -> bool:
    return bool(run and isinstance(run.run_metadata, dict) and run.run_metadata.get("scoring_enabled") is True)


def _run_appraisal(run: EiaEvaluationRun | None) -> str | None:
    if run is None or not isinstance(run.run_metadata, dict):
        return None
    value = run.run_metadata.get("overall_appraisal")
    return value if isinstance(value, str) else None


def _run_status_counts(run: EiaEvaluationRun) -> dict[str, int]:
    raw = run.run_metadata.get("status_counts") if isinstance(run.run_metadata, dict) else {}
    if not isinstance(raw, dict):
        return {}
    return {str(key): int(value) for key, value in raw.items() if isinstance(value, int)}
