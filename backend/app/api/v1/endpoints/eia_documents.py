from datetime import datetime
from uuid import UUID

from io import BytesIO

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.dependencies import require_role_in_tenant
from app.core.permissions import PROJECT_MANAGE_ROLES, READ_ONLY_ROLES
from app.db.session import get_db
from app.models.eia import EiaAttachment, EiaDocument, EiaSubSection
from app.models.eia_document_member import EiaDocumentMember
from app.models.subsection_comment import SubSectionComment
from app.models.user import User
from app.schemas.eia import (
    EiaActivityItemRead,
    EiaAttachmentRead,
    EiaAuthoringAssistRequest,
    EiaAuthoringAssistResponse,
    EiaAutoStructureRequest,
    EiaDocumentCrossComparisonRead,
    EiaDocumentCreate,
    EiaDocumentAssignmentsOverviewRead,
    EiaDocumentMemberCreate,
    EiaDocumentMemberInvitationRead,
    EiaDocumentMemberRead,
    EiaDocumentProgressRead,
    EiaDocumentRead,
    EiaDocumentStructureRead,
    EiaEvaluationComparisonRead,
    EiaEvaluationFindingCommentCreate,
    EiaEvaluationFindingCommentRead,
    EiaEvaluationRunCreate,
    EiaEvaluationRunDetailRead,
    EiaEvaluationRunRead,
    EiaRegulatorOverviewRead,
    EiaReviewApprovalCreate,
    EiaReviewApprovalDecision,
    EiaReviewApprovalRead,
    EiaReviewQueueItemRead,
    EiaSourceDocumentAttachmentCreate,
    EiaSourceMappingConfirmRequest,
    EiaSourceMappingDetectRequest,
    EiaSourceMappingRead,
    EiaSourceMappingRejectRequest,
    EiaAssignmentUpdate,
    EiaSubSectionContentUpdate,
    EiaSubSectionRead,
    EiaSubSectionUpdate,
    EiaSubSectionWorkspaceRead,
    EiaWorkflowTransitionRequest,
    SubSectionRevisionRead,
    SubSectionCommentCreate,
    SubSectionCommentRead,
    SubSectionCommentUpdate,
)
from app.services.authoring_assistant_service import generate_authoring_guidance
from app.services.content_service import (
    get_subsection_workspace,
    link_source_document_attachment,
    save_subsection_content,
    upload_subsection_attachment,
)
from app.services.eia_collaboration_service import (
    create_subsection_comment,
    invite_eia_document_member,
    list_eia_document_activity,
    list_eia_document_members,
    list_subsection_comments,
    remove_eia_document_member,
    update_subsection_comment,
)
from app.services.eia_assignment_service import (
    clear_section_assignment,
    clear_subsection_assignment,
    get_eia_document_assignments_overview,
    update_section_assignment,
    update_subsection_assignment,
)
from app.services.eia_evaluation_service import (
    compare_eia_evaluation_runs,
    create_finding_comment,
    enqueue_eia_evaluation_run,
    get_eia_evaluation_run,
    list_finding_comments,
    list_eia_evaluation_runs,
    process_eia_evaluation_run_background,
)
from app.services.eia_evaluation_report_service import (
    build_report_docx_bytes,
    build_report_json_bytes,
    build_report_pdf_bytes,
)
from app.services.eia_document_export_service import (
    build_compiled_eia_docx_bytes,
    build_compiled_eia_json_bytes,
    build_compiled_eia_pdf_bytes,
)
from app.services.eia_auto_structure_service import auto_structure_eia_document
from app.services.eia_regulator_service import compare_project_eia_documents, get_regulator_overview
from app.services.eia_review_approval_service import (
    create_review_approval_request,
    decide_review_approval,
    list_review_approvals,
)
from app.services.eia_review_workflow_service import (
    approve_eia_section,
    list_eia_review_queue,
    transition_subsection_workflow,
)
from app.services.eia_service import (
    DOCUMENT_EDIT_ROLES,
    create_eia_document,
    get_eia_document_for_tenant,
    get_eia_document_progress,
    get_eia_document_structure,
    get_subsection_for_document,
    list_project_eia_documents,
    update_eia_subsection,
)
from app.services.revision_service import list_subsection_revisions, restore_subsection_revision
from app.services.source_mapping_service import (
    confirm_source_mapping,
    detect_source_mappings,
    list_source_mappings,
    reject_source_mapping,
)


router = APIRouter()


@router.get("/project/{project_id}", response_model=list[EiaDocumentRead])
def read_project_eia_documents(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[EiaDocument]:
    return list_project_eia_documents(db, current_user, project_id)


@router.post(
    "/project/{project_id}",
    response_model=EiaDocumentStructureRead,
    status_code=status.HTTP_201_CREATED,
)
def create_project_eia_document(
    project_id: UUID,
    payload: EiaDocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(PROJECT_MANAGE_ROLES)),
) -> EiaDocument:
    return create_eia_document(db, current_user, project_id, payload)


@router.get("/project/{project_id}/regulator-insights", response_model=EiaRegulatorOverviewRead)
def read_project_regulator_insights(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return get_regulator_overview(db, current_user, project_id)


@router.get("/project/{project_id}/regulator-compare", response_model=EiaDocumentCrossComparisonRead)
def read_project_regulator_comparison(
    project_id: UUID,
    left_document_id: UUID = Query(...),
    right_document_id: UUID = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return compare_project_eia_documents(
        db,
        current_user,
        project_id,
        left_document_id=left_document_id,
        right_document_id=right_document_id,
    )


@router.get("/{document_id}", response_model=EiaDocumentStructureRead)
def read_eia_document_structure(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> EiaDocument:
    return get_eia_document_structure(db, current_user, document_id)


@router.post("/{document_id}/auto-structure", response_model=EiaDocumentStructureRead)
def post_eia_document_auto_structure(
    document_id: UUID,
    payload: EiaAutoStructureRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> EiaDocument:
    get_eia_document_for_tenant(db, current_user, document_id, DOCUMENT_EDIT_ROLES, "auto-structure")
    auto_structure_eia_document(
        db,
        current_user,
        document_id,
        payload.source_document_id,
        source_version_id=payload.source_version_id,
        apply_detected_content=payload.apply_detected_content,
    )
    db.commit()
    return get_eia_document_structure(db, current_user, document_id)


@router.get("/{document_id}/export.json")
def download_compiled_eia_json(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> StreamingResponse:
    report_bytes = build_compiled_eia_json_bytes(db, current_user, document_id)
    return StreamingResponse(
        BytesIO(report_bytes),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="enviroquant-eia-{document_id}.json"'},
    )


@router.get("/{document_id}/export.docx")
def download_compiled_eia_docx(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> StreamingResponse:
    report_bytes = build_compiled_eia_docx_bytes(db, current_user, document_id)
    return StreamingResponse(
        BytesIO(report_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="enviroquant-eia-{document_id}.docx"'},
    )


@router.get("/{document_id}/export.pdf")
def download_compiled_eia_pdf(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> StreamingResponse:
    report_bytes = build_compiled_eia_pdf_bytes(db, current_user, document_id)
    return StreamingResponse(
        BytesIO(report_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="enviroquant-eia-{document_id}.pdf"'},
    )


@router.get("/{document_id}/evaluation-runs", response_model=list[EiaEvaluationRunRead])
def read_eia_evaluation_runs(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[object]:
    return list_eia_evaluation_runs(db, current_user, document_id)


@router.post(
    "/{document_id}/evaluation-runs",
    response_model=EiaEvaluationRunDetailRead,
    status_code=status.HTTP_201_CREATED,
)
def post_eia_evaluation_run(
    document_id: UUID,
    background_tasks: BackgroundTasks,
    payload: EiaEvaluationRunCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> object:
    run = enqueue_eia_evaluation_run(db, current_user, document_id, payload)
    background_tasks.add_task(process_eia_evaluation_run_background, run.id)
    return run


@router.get("/{document_id}/evaluation-runs/{run_id}", response_model=EiaEvaluationRunDetailRead)
def read_eia_evaluation_run(
    document_id: UUID,
    run_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> object:
    return get_eia_evaluation_run(db, current_user, document_id, run_id)


@router.get("/{document_id}/evaluation-runs/{run_id}/report", response_model=EiaEvaluationRunDetailRead)
def read_eia_evaluation_report(
    document_id: UUID,
    run_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> object:
    return get_eia_evaluation_run(db, current_user, document_id, run_id)


@router.get("/{document_id}/review-approvals", response_model=list[EiaReviewApprovalRead])
def read_eia_review_approvals(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[object]:
    return list_review_approvals(db, current_user, document_id)


@router.post(
    "/{document_id}/review-approvals",
    response_model=EiaReviewApprovalRead,
    status_code=status.HTTP_201_CREATED,
)
def post_eia_review_approval(
    document_id: UUID,
    payload: EiaReviewApprovalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> object:
    return create_review_approval_request(db, current_user, document_id, payload)


@router.post(
    "/{document_id}/review-approvals/{approval_id}/decision",
    response_model=EiaReviewApprovalRead,
)
def post_eia_review_approval_decision(
    document_id: UUID,
    approval_id: UUID,
    payload: EiaReviewApprovalDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> object:
    return decide_review_approval(db, current_user, document_id, approval_id, payload)


@router.get(
    "/{document_id}/evaluation-runs/{run_id}/compare/{baseline_run_id}",
    response_model=EiaEvaluationComparisonRead,
)
def read_eia_evaluation_comparison(
    document_id: UUID,
    run_id: UUID,
    baseline_run_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return compare_eia_evaluation_runs(db, current_user, document_id, run_id, baseline_run_id)


@router.get("/{document_id}/evaluation-runs/{run_id}/report.json")
def download_eia_evaluation_report_json(
    document_id: UUID,
    run_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> StreamingResponse:
    report_bytes = build_report_json_bytes(db, current_user, document_id, run_id)
    return StreamingResponse(
        BytesIO(report_bytes),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="enviroquant-review-{run_id}.json"'},
    )


@router.get("/{document_id}/evaluation-runs/{run_id}/report.docx")
def download_eia_evaluation_report_docx(
    document_id: UUID,
    run_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> StreamingResponse:
    report_bytes = build_report_docx_bytes(db, current_user, document_id, run_id)
    return StreamingResponse(
        BytesIO(report_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="enviroquant-review-{run_id}.docx"'},
    )


@router.get("/{document_id}/evaluation-runs/{run_id}/report.pdf")
def download_eia_evaluation_report_pdf(
    document_id: UUID,
    run_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> StreamingResponse:
    report_bytes = build_report_pdf_bytes(db, current_user, document_id, run_id)
    return StreamingResponse(
        BytesIO(report_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="enviroquant-review-{run_id}.pdf"'},
    )


@router.get(
    "/{document_id}/evaluation-runs/{run_id}/findings/{finding_id}/comments",
    response_model=list[EiaEvaluationFindingCommentRead],
)
def read_eia_evaluation_finding_comments(
    document_id: UUID,
    run_id: UUID,
    finding_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[object]:
    return list_finding_comments(db, current_user, document_id, run_id, finding_id)


@router.post(
    "/{document_id}/evaluation-runs/{run_id}/findings/{finding_id}/comments",
    response_model=EiaEvaluationFindingCommentRead,
    status_code=status.HTTP_201_CREATED,
)
def post_eia_evaluation_finding_comment(
    document_id: UUID,
    run_id: UUID,
    finding_id: UUID,
    payload: EiaEvaluationFindingCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> object:
    return create_finding_comment(db, current_user, document_id, run_id, finding_id, payload)


@router.post(
    "/{document_id}/members",
    response_model=EiaDocumentMemberInvitationRead,
    status_code=status.HTTP_201_CREATED,
)
def post_eia_document_member(
    document_id: UUID,
    payload: EiaDocumentMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return invite_eia_document_member(db, current_user, document_id, payload)


@router.get("/{document_id}/members", response_model=list[EiaDocumentMemberRead])
def read_eia_document_members(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[EiaDocumentMember]:
    return list_eia_document_members(db, current_user, document_id)


@router.get("/{document_id}/assignments", response_model=EiaDocumentAssignmentsOverviewRead)
def read_eia_document_assignments(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return get_eia_document_assignments_overview(db, current_user, document_id)


@router.put(
    "/{document_id}/sections/{section_id}/assignments",
    response_model=EiaDocumentAssignmentsOverviewRead,
)
def put_eia_section_assignment(
    document_id: UUID,
    section_id: UUID,
    payload: EiaAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return update_section_assignment(db, current_user, document_id, section_id, payload)


@router.delete(
    "/{document_id}/sections/{section_id}/assignments",
    response_model=EiaDocumentAssignmentsOverviewRead,
)
def delete_eia_section_assignment(
    document_id: UUID,
    section_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return clear_section_assignment(db, current_user, document_id, section_id)


@router.put(
    "/{document_id}/subsections/{subsection_id}/assignments",
    response_model=EiaDocumentAssignmentsOverviewRead,
)
def put_eia_subsection_assignment(
    document_id: UUID,
    subsection_id: UUID,
    payload: EiaAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return update_subsection_assignment(db, current_user, document_id, subsection_id, payload)


@router.delete(
    "/{document_id}/subsections/{subsection_id}/assignments",
    response_model=EiaDocumentAssignmentsOverviewRead,
)
def delete_eia_subsection_assignment(
    document_id: UUID,
    subsection_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return clear_subsection_assignment(db, current_user, document_id, subsection_id)


@router.delete("/{document_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_eia_document_member(
    document_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> None:
    remove_eia_document_member(db, current_user, document_id, user_id)


@router.get("/{document_id}/progress", response_model=EiaDocumentProgressRead)
def read_eia_document_progress(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> EiaDocumentProgressRead:
    return get_eia_document_progress(db, current_user, document_id)


@router.get("/{document_id}/activity", response_model=list[EiaActivityItemRead])
def read_eia_document_activity(
    document_id: UUID,
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[dict[str, object]]:
    return list_eia_document_activity(db, current_user, document_id, limit)


@router.get("/{document_id}/review-queue", response_model=list[EiaReviewQueueItemRead])
def read_eia_review_queue(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[dict[str, object]]:
    return list_eia_review_queue(db, current_user, document_id)


@router.post(
    "/{document_id}/sections/{section_id}/approve",
    response_model=list[EiaReviewQueueItemRead],
)
def post_eia_section_approval(
    document_id: UUID,
    section_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[dict[str, object]]:
    return approve_eia_section(db, current_user, document_id, section_id)


@router.get("/{document_id}/source-mappings", response_model=list[EiaSourceMappingRead])
def read_eia_document_source_mappings(
    document_id: UUID,
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[dict[str, object]]:
    return list_source_mappings(db, current_user, document_id, status_filter)


@router.post(
    "/{document_id}/source-mappings/detect",
    response_model=list[EiaSourceMappingRead],
    status_code=status.HTTP_201_CREATED,
)
def post_eia_document_source_mapping_detection(
    document_id: UUID,
    payload: EiaSourceMappingDetectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[dict[str, object]]:
    return detect_source_mappings(db, current_user, document_id, payload)


@router.post("/{document_id}/source-mappings/{mapping_id}/confirm", response_model=EiaSourceMappingRead)
def post_eia_document_source_mapping_confirmation(
    document_id: UUID,
    mapping_id: UUID,
    payload: EiaSourceMappingConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return confirm_source_mapping(db, current_user, document_id, mapping_id, payload)


@router.post("/{document_id}/source-mappings/{mapping_id}/reject", response_model=EiaSourceMappingRead)
def post_eia_document_source_mapping_rejection(
    document_id: UUID,
    mapping_id: UUID,
    payload: EiaSourceMappingRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return reject_source_mapping(db, current_user, document_id, mapping_id, payload)


@router.get("/subsections/{subsection_id}", response_model=EiaSubSectionWorkspaceRead)
def read_subsection_workspace(
    subsection_id: UUID,
    tenant_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return get_subsection_workspace(db, current_user, subsection_id, tenant_id)


@router.post(
    "/subsections/{subsection_id}/workflow/transition",
    response_model=EiaSubSectionRead,
)
def post_subsection_workflow_transition(
    subsection_id: UUID,
    payload: EiaWorkflowTransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> EiaSubSection:
    return transition_subsection_workflow(db, current_user, subsection_id, payload)


@router.post("/subsections/{subsection_id}/assistant", response_model=EiaAuthoringAssistResponse)
def post_subsection_authoring_assistant(
    subsection_id: UUID,
    payload: EiaAuthoringAssistRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> EiaAuthoringAssistResponse:
    return generate_authoring_guidance(db, current_user, subsection_id, payload)


@router.put("/subsections/{subsection_id}/content", response_model=EiaSubSectionWorkspaceRead)
def put_subsection_content(
    subsection_id: UUID,
    payload: EiaSubSectionContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return save_subsection_content(db, current_user, subsection_id, payload)


@router.post(
    "/subsections/{subsection_id}/comments",
    response_model=SubSectionCommentRead,
    status_code=status.HTTP_201_CREATED,
)
def post_subsection_comment(
    subsection_id: UUID,
    payload: SubSectionCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> SubSectionComment:
    return create_subsection_comment(db, current_user, subsection_id, payload)


@router.get("/subsections/{subsection_id}/comments", response_model=list[SubSectionCommentRead])
def read_subsection_comments(
    subsection_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[dict[str, object]]:
    return list_subsection_comments(db, current_user, subsection_id)


@router.patch(
    "/subsections/{subsection_id}/comments/{comment_id}",
    response_model=SubSectionCommentRead,
)
def patch_subsection_comment(
    subsection_id: UUID,
    comment_id: UUID,
    payload: SubSectionCommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    return update_subsection_comment(db, current_user, subsection_id, comment_id, payload)


@router.post(
    "/subsections/{subsection_id}/attachments",
    response_model=EiaAttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_subsection_attachment(
    subsection_id: UUID,
    file: UploadFile = File(...),
    tenant_id: UUID | None = Form(default=None),
    attachment_type: str = Form("supporting_evidence"),
    checklist_reference: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> EiaAttachment:
    return await upload_subsection_attachment(
        db=db,
        current_user=current_user,
        subsection_id=subsection_id,
        file=file,
        tenant_id=tenant_id,
        attachment_type=attachment_type,
        checklist_reference=checklist_reference,
    )


@router.post(
    "/subsections/{subsection_id}/source-attachments",
    response_model=EiaAttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
def post_subsection_source_document_attachment(
    subsection_id: UUID,
    payload: EiaSourceDocumentAttachmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> EiaAttachment:
    return link_source_document_attachment(db, current_user, subsection_id, payload)


@router.get("/subsections/{subsection_id}/revisions", response_model=list[SubSectionRevisionRead])
def read_subsection_revisions(
    subsection_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> list[object]:
    return list_subsection_revisions(db, current_user, subsection_id)


@router.post(
    "/subsections/{subsection_id}/revisions/{revision_id}/restore",
    response_model=EiaSubSectionWorkspaceRead,
)
def post_subsection_revision_restore(
    subsection_id: UUID,
    revision_id: UUID,
    tenant_id: UUID | None = Query(default=None),
    expected_updated_at: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    restore_subsection_revision(
        db,
        current_user,
        subsection_id,
        revision_id,
        expected_updated_at,
    )
    return get_subsection_workspace(db, current_user, subsection_id, tenant_id)


@router.get("/{document_id}/subsections/{subsection_id}", response_model=EiaSubSectionRead)
def read_eia_subsection(
    document_id: UUID,
    subsection_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> EiaSubSection:
    return get_subsection_for_document(db, current_user, document_id, subsection_id)


@router.patch("/{document_id}/subsections/{subsection_id}", response_model=EiaSubSectionRead)
def patch_eia_subsection(
    document_id: UUID,
    subsection_id: UUID,
    payload: EiaSubSectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> EiaSubSection:
    return update_eia_subsection(db, current_user, document_id, subsection_id, payload)
