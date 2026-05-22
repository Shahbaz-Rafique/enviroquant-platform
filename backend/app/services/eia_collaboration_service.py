from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.eia import EiaAttachment, EiaDocument, EiaSubSection
from app.models.eia_document_member import EiaDocumentMember
from app.models.subsection_comment import SubSectionComment
from app.models.user import User
from app.schemas.eia import (
    EiaDocumentMemberCreate,
    SubSectionCommentCreate,
    SubSectionCommentUpdate,
)
from app.schemas.user import UserInvite
from app.services.audit_service import record_audit_event
from app.services.eia_service import (
    DOCUMENT_COMMENT_ROLES,
    DOCUMENT_MEMBER_MANAGE_ROLES,
    DOCUMENT_READ_ROLES,
    DOCUMENT_REVIEW_ROLES,
    get_eia_document_for_tenant,
    normalize_document_role,
    require_subsection_permission,
)
from app.services.user_service import invite_user_for_tenant


def invite_eia_document_member(
    db: Session,
    current_user: User,
    eia_document_id: UUID,
    payload: EiaDocumentMemberCreate,
) -> dict[str, object]:
    document = get_eia_document_for_tenant(
        db,
        current_user,
        eia_document_id,
        DOCUMENT_MEMBER_MANAGE_ROLES,
        "manage members",
    )
    document_role = normalize_document_role(payload.role)
    email = payload.email.lower()
    target_user = db.scalar(select(User).where(User.tenant_id == current_user.tenant_id, User.email == email))
    invite_url: str | None = None
    email_sent: bool | None = None

    if target_user is None or target_user.status != "active":
        invitation = invite_user_for_tenant(
            db,
            current_user.tenant,
            UserInvite(email=email, full_name=payload.full_name, role="VIEWER"),
            invited_by=current_user,
        )
        target_user = invitation.user
        invite_url = invitation.invite_url
        email_sent = invitation.email_sent

    if target_user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid tenant scope")

    member = db.scalar(
        select(EiaDocumentMember).where(
            EiaDocumentMember.tenant_id == current_user.tenant_id,
            EiaDocumentMember.eia_document_id == document.id,
            EiaDocumentMember.user_id == target_user.id,
        )
    )
    if member is None:
        member = EiaDocumentMember(
            tenant_id=current_user.tenant_id,
            eia_document_id=document.id,
            user_id=target_user.id,
            role=document_role,
        )
        db.add(member)
    else:
        member.role = document_role

    db.flush()
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.member.upserted",
        entity_type="eia_document_member",
        entity_id=member.id,
        summary=f"{target_user.email} assigned {document_role} on EIA document",
        metadata={"eia_document_id": str(document.id), "user_id": str(target_user.id)},
    )
    db.commit()
    return {
        "member": _get_member(db, member.id),
        "invite_url": invite_url,
        "email_sent": email_sent,
    }


def list_eia_document_members(
    db: Session,
    current_user: User,
    eia_document_id: UUID,
) -> list[EiaDocumentMember]:
    document = get_eia_document_for_tenant(db, current_user, eia_document_id, DOCUMENT_READ_ROLES, "view")
    _ensure_creator_member(db, document)
    return list(
        db.scalars(
            select(EiaDocumentMember)
            .options(selectinload(EiaDocumentMember.user))
            .where(
                EiaDocumentMember.tenant_id == current_user.tenant_id,
                EiaDocumentMember.eia_document_id == document.id,
            )
            .order_by(EiaDocumentMember.created_at.asc())
        ).all()
    )


def remove_eia_document_member(
    db: Session,
    current_user: User,
    eia_document_id: UUID,
    user_id: UUID,
) -> None:
    document = get_eia_document_for_tenant(
        db,
        current_user,
        eia_document_id,
        DOCUMENT_MEMBER_MANAGE_ROLES,
        "manage members",
    )
    if document.created_by_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document creator cannot be removed from the EIA document",
        )

    member = db.scalar(
        select(EiaDocumentMember).where(
            EiaDocumentMember.tenant_id == current_user.tenant_id,
            EiaDocumentMember.eia_document_id == document.id,
            EiaDocumentMember.user_id == user_id,
        )
    )
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA document member not found")

    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.member.removed",
        entity_type="eia_document_member",
        entity_id=member.id,
        summary="EIA document member removed",
        metadata={"eia_document_id": str(document.id), "user_id": str(user_id)},
    )
    db.delete(member)
    db.commit()


def list_subsection_comments(
    db: Session,
    current_user: User,
    subsection_id: UUID,
) -> list[dict[str, object]]:
    subsection = _get_subsection_for_commenting(db, current_user, subsection_id, DOCUMENT_READ_ROLES, "view")
    comments = list(
        db.scalars(
            select(SubSectionComment)
            .options(selectinload(SubSectionComment.user))
            .where(
                SubSectionComment.tenant_id == current_user.tenant_id,
                SubSectionComment.subsection_id == subsection.id,
            )
            .order_by(SubSectionComment.created_at.asc())
        ).all()
    )
    return _thread_comments(comments)


def create_subsection_comment(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    payload: SubSectionCommentCreate,
) -> SubSectionComment:
    subsection = _get_subsection_for_commenting(db, current_user, subsection_id, DOCUMENT_COMMENT_ROLES, "comment")

    if payload.parent_comment_id is not None:
        parent = db.get(SubSectionComment, payload.parent_comment_id)
        if parent is None or parent.subsection_id != subsection.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent comment is invalid")

    comment = SubSectionComment(
        tenant_id=current_user.tenant_id,
        subsection_id=subsection.id,
        user_id=current_user.id,
        parent_comment_id=payload.parent_comment_id,
        content=payload.content.strip(),
    )
    db.add(comment)
    db.flush()
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.comment.created",
        entity_type="subsection_comment",
        entity_id=comment.id,
        summary=f"Comment added to subsection {subsection.subsection_number}",
        metadata={"subsection_id": str(subsection.id), "eia_document_id": str(subsection.eia_document_id)},
    )
    db.commit()
    db.refresh(comment)
    return comment


def update_subsection_comment(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    comment_id: UUID,
    payload: SubSectionCommentUpdate,
) -> dict[str, object]:
    subsection = _get_subsection_for_commenting(
        db,
        current_user,
        subsection_id,
        DOCUMENT_REVIEW_ROLES,
        "resolve comments",
    )
    comment = db.get(SubSectionComment, comment_id)
    if comment is None or comment.tenant_id != current_user.tenant_id or comment.subsection_id != subsection.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    comment.is_resolved = payload.is_resolved
    record_audit_event(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        event_type="eia.comment.resolution_updated",
        entity_type="subsection_comment",
        entity_id=comment.id,
        summary="Comment resolution updated",
        metadata={"subsection_id": str(subsection.id), "is_resolved": payload.is_resolved},
    )
    db.commit()
    db.refresh(comment)
    return _serialize_comment(comment, [])


def list_eia_document_activity(
    db: Session,
    current_user: User,
    eia_document_id: UUID,
    limit: int = 30,
) -> list[dict[str, object]]:
    document = get_eia_document_for_tenant(db, current_user, eia_document_id, DOCUMENT_READ_ROLES, "view")
    items: list[dict[str, object]] = []

    comment_rows = list(
        db.execute(
            select(SubSectionComment, EiaSubSection)
            .join(EiaSubSection, SubSectionComment.subsection_id == EiaSubSection.id)
            .options(selectinload(SubSectionComment.user))
            .where(
                SubSectionComment.tenant_id == current_user.tenant_id,
                EiaSubSection.eia_document_id == document.id,
            )
            .order_by(SubSectionComment.created_at.desc())
            .limit(limit)
        ).all()
    )
    for comment, subsection in comment_rows:
        items.append(
            _activity_item(
                item_id=f"comment:{comment.id}",
                item_type="comment",
                title="Comment added",
                description=f"{subsection.subsection_number}: {subsection.title}",
                created_at=comment.created_at,
                actor=comment.user,
                subsection=subsection,
            )
        )
        if comment.is_resolved and comment.updated_at > comment.created_at:
            items.append(
                _activity_item(
                    item_id=f"comment_resolved:{comment.id}",
                    item_type="comment_resolved",
                    title="Comment resolved",
                    description=f"{subsection.subsection_number}: {subsection.title}",
                    created_at=comment.updated_at,
                    actor=comment.user,
                    subsection=subsection,
                )
            )

    edited_subsections = list(
        db.scalars(
            select(EiaSubSection)
            .options(selectinload(EiaSubSection.last_edited_by))
            .where(
                EiaSubSection.eia_document_id == document.id,
                EiaSubSection.last_edited_at.is_not(None),
            )
            .order_by(EiaSubSection.last_edited_at.desc())
            .limit(limit)
        ).all()
    )
    for subsection in edited_subsections:
        items.append(
            _activity_item(
                item_id=f"subsection_updated:{subsection.id}:{subsection.last_edited_at}",
                item_type="subsection_updated",
                title="Subsection updated",
                description=f"{subsection.subsection_number}: {subsection.title}",
                created_at=subsection.last_edited_at or subsection.updated_at,
                actor=subsection.last_edited_by,
                subsection=subsection,
            )
        )

    attachment_rows = list(
        db.execute(
            select(EiaAttachment, EiaSubSection)
            .join(EiaSubSection, EiaAttachment.subsection_id == EiaSubSection.id)
            .options(selectinload(EiaAttachment.uploaded_by))
            .where(EiaAttachment.eia_document_id == document.id)
            .order_by(EiaAttachment.created_at.desc())
            .limit(limit)
        ).all()
    )
    for attachment, subsection in attachment_rows:
        items.append(
            _activity_item(
                item_id=f"attachment:{attachment.id}",
                item_type="attachment_uploaded",
                title="Attachment uploaded",
                description=attachment.original_filename,
                created_at=attachment.created_at,
                actor=attachment.uploaded_by,
                subsection=subsection,
            )
        )

    members = list_eia_document_members(db, current_user, document.id)
    for member in members:
        items.append(
            _activity_item(
                item_id=f"member:{member.id}",
                item_type="member_added",
                title="Member added",
                description=f"{member.user.full_name} joined as {member.role}",
                created_at=member.created_at,
                actor=member.user,
            )
        )

    return sorted(items, key=lambda item: item["created_at"], reverse=True)[:limit]


def _get_member(db: Session, member_id: UUID) -> EiaDocumentMember:
    member = db.scalar(
        select(EiaDocumentMember)
        .options(selectinload(EiaDocumentMember.user))
        .where(EiaDocumentMember.id == member_id)
    )
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA document member not found")
    return member


def _ensure_creator_member(db: Session, document: EiaDocument) -> None:
    existing = db.scalar(
        select(EiaDocumentMember).where(
            EiaDocumentMember.tenant_id == document.tenant_id,
            EiaDocumentMember.eia_document_id == document.id,
            EiaDocumentMember.user_id == document.created_by_id,
        )
    )
    if existing is not None:
        return
    db.add(
        EiaDocumentMember(
            tenant_id=document.tenant_id,
            eia_document_id=document.id,
            user_id=document.created_by_id,
            role="EDITOR",
        )
    )
    db.commit()


def _get_subsection_for_commenting(
    db: Session,
    current_user: User,
    subsection_id: UUID,
    allowed_roles: set[str],
    action: str,
) -> EiaSubSection:
    subsection = db.scalar(
        select(EiaSubSection)
        .options(selectinload(EiaSubSection.document).selectinload(EiaDocument.members))
        .where(EiaSubSection.id == subsection_id, EiaSubSection.tenant_id == current_user.tenant_id)
    )
    if subsection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA subsection not found")
    require_subsection_permission(subsection, current_user, allowed_roles, action)
    return subsection


def _thread_comments(comments: list[SubSectionComment]) -> list[dict[str, object]]:
    children_by_parent: dict[UUID | None, list[SubSectionComment]] = {}
    for comment in comments:
        children_by_parent.setdefault(comment.parent_comment_id, []).append(comment)

    def build(comment: SubSectionComment) -> dict[str, object]:
        return _serialize_comment(comment, [build(reply) for reply in children_by_parent.get(comment.id, [])])

    return [build(comment) for comment in children_by_parent.get(None, [])]


def _serialize_comment(comment: SubSectionComment, replies: list[dict[str, object]]) -> dict[str, object]:
    return {
        "id": comment.id,
        "tenant_id": comment.tenant_id,
        "subsection_id": comment.subsection_id,
        "user_id": comment.user_id,
        "parent_comment_id": comment.parent_comment_id,
        "content": comment.content,
        "is_resolved": comment.is_resolved,
        "user": comment.user,
        "replies": replies,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
    }


def _activity_item(
    item_id: str,
    item_type: str,
    title: str,
    description: str,
    created_at: datetime,
    actor: User | None,
    subsection: EiaSubSection | None = None,
) -> dict[str, object]:
    return {
        "id": item_id,
        "type": item_type,
        "title": title,
        "description": description,
        "created_at": created_at,
        "actor": _actor(actor),
        "subsection_id": subsection.id if subsection else None,
        "subsection_number": subsection.subsection_number if subsection else None,
    }


def _actor(user: User | None) -> dict[str, object] | None:
    if user is None:
        return None
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
    }
