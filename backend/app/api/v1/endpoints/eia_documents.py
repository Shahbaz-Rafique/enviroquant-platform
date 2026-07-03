from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
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
    EiaDocumentCreate,
    EiaDocumentMemberCreate,
    EiaDocumentMemberInvitationRead,
    EiaDocumentMemberRead,
    EiaDocumentProgressRead,
    EiaDocumentRead,
    EiaDocumentStructureRead,
    EiaSourceDocumentAttachmentCreate,
    EiaSourceMappingConfirmRequest,
    EiaSourceMappingDetectRequest,
    EiaSourceMappingRead,
    EiaSourceMappingRejectRequest,
    EiaSubSectionContentUpdate,
    EiaSubSectionRead,
    EiaSubSectionUpdate,
    EiaSubSectionWorkspaceRead,
    SubSectionRevisionRead,
    SubSectionCommentCreate,
    SubSectionCommentRead,
    SubSectionCommentUpdate,
)
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
from app.services.eia_service import (
    create_eia_document,
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


@router.get("/{document_id}", response_model=EiaDocumentStructureRead)
def read_eia_document_structure(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> EiaDocument:
    return get_eia_document_structure(db, current_user, document_id)


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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(READ_ONLY_ROLES)),
) -> dict[str, object]:
    restore_subsection_revision(db, current_user, subsection_id, revision_id)
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
