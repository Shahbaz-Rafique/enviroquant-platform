import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.permissions import Roles
from app.core.security import hash_password
from app.models.rbac import Role
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import AcceptInvitationRequest
from app.schemas.user import UserCreate, UserInvite, UserStatusUpdate
from app.services.email_service import send_invitation_email
from app.services.rbac_service import sync_tenant_roles


settings = get_settings()
INVITATION_EXPIRY_DAYS = 7
ASSIGNABLE_ROLES = {
    Roles.ADMIN,
    Roles.PROJECT_MANAGER,
    Roles.CONSULTANT,
    Roles.REVIEWER,
    Roles.REGULATOR,
    Roles.VIEWER,
}


@dataclass(frozen=True)
class InvitationResult:
    user: User
    invite_url: str
    expires_at: datetime
    email_sent: bool


def list_tenant_users(db: Session, current_user: User) -> list[User]:
    statement = (
        select(User)
        .where(User.tenant_id == current_user.tenant_id)
        .order_by(User.created_at.desc())
    )
    return list(db.scalars(statement).unique().all())


def normalize_assignable_role(role: str) -> str:
    requested_role = role.lower()
    if requested_role not in ASSIGNABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Role must be ADMIN, PROJECT_MANAGER, CONSULTANT, REVIEWER, "
                "REGULATOR, or VIEWER"
            ),
        )
    return requested_role


def resolve_tenant_role(db: Session, tenant: Tenant, role_name: str) -> Role:
    sync_tenant_roles(db, tenant)
    role = db.scalar(select(Role).where(Role.tenant_id == tenant.id, Role.name == role_name))
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Role not configured",
        )
    return role


def create_tenant_user(db: Session, current_user: User, payload: UserCreate) -> User:
    requested_role = normalize_assignable_role(payload.role)

    existing_user = db.scalar(
        select(User).where(
            User.tenant_id == current_user.tenant_id,
            User.email == payload.email.lower(),
        )
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists in the organization",
        )

    role = resolve_tenant_role(db, current_user.tenant, requested_role)
    user = User(
        tenant_id=current_user.tenant_id,
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    user.roles = [role]
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_tenant_user_status(
    db: Session,
    current_user: User,
    user_id: UUID,
    payload: UserStatusUpdate,
) -> User:
    target_user = db.get(User, user_id)
    if target_user is None or target_user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own account status",
        )

    if payload.status == "inactive" and is_tenant_admin(target_user):
        active_admins = db.scalars(
            select(User).where(
                User.tenant_id == current_user.tenant_id,
                User.status == "active",
            )
        ).unique().all()
        remaining_admins = [
            user
            for user in active_admins
            if user.id != target_user.id and is_tenant_admin(user)
        ]
        if not remaining_admins:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one active organization admin is required",
            )

    target_user.status = payload.status
    if payload.status == "inactive":
        target_user.invitation_token_hash = None
        target_user.invitation_expires_at = None

    db.commit()
    db.refresh(target_user)
    return target_user


def invite_tenant_user(db: Session, current_user: User, payload: UserInvite) -> InvitationResult:
    return invite_user_for_tenant(db, current_user.tenant, payload, invited_by=current_user)


def invite_user_for_tenant(
    db: Session,
    tenant: Tenant,
    payload: UserInvite,
    invited_by: User | None = None,
) -> InvitationResult:
    requested_role = normalize_assignable_role(payload.role)
    role = resolve_tenant_role(db, tenant, requested_role)
    email = payload.email.lower()
    existing_user = db.scalar(select(User).where(User.tenant_id == tenant.id, User.email == email))

    if existing_user and existing_user.status == "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active user with this email already exists in the organization",
        )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(days=INVITATION_EXPIRY_DAYS)

    user = existing_user or User(
        tenant_id=tenant.id,
        email=email,
        hashed_password=hash_password(secrets.token_urlsafe(32)),
    )
    user.full_name = payload.full_name
    user.status = "pending_invite"
    user.invited_by_id = invited_by.id if invited_by else None
    user.invitation_token_hash = hash_invitation_token(token)
    user.invitation_expires_at = expires_at
    user.activated_at = None
    user.roles = [role]

    invite_url = build_invitation_url(token)

    db.add(user)
    db.commit()
    db.refresh(user)
    email_sent = send_invitation_email(
        recipient_email=user.email,
        recipient_name=user.full_name,
        organization_name=tenant.name,
        invite_url=invite_url,
    )
    return InvitationResult(
        user=user,
        invite_url=invite_url,
        expires_at=expires_at,
        email_sent=email_sent,
    )


def accept_invitation(db: Session, payload: AcceptInvitationRequest) -> User:
    token_hash = hash_invitation_token(payload.token)
    user = db.scalar(select(User).where(User.invitation_token_hash == token_hash))
    if user is None or user.status != "pending_invite":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is invalid or has already been used",
        )

    expires_at = user.invitation_expires_at
    if expires_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation is invalid")
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at <= datetime.now(UTC):
        user.status = "invite_expired"
        user.invitation_token_hash = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired",
        )

    if payload.full_name:
        user.full_name = payload.full_name
    user.hashed_password = hash_password(payload.password)
    user.status = "active"
    user.invitation_token_hash = None
    user.invitation_expires_at = None
    user.activated_at = datetime.now(UTC)

    sync_tenant_roles(db, user.tenant)
    db.commit()
    db.refresh(user)
    return user


def hash_invitation_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def build_invitation_url(token: str) -> str:
    return f"{settings.frontend_app_url.rstrip('/')}/accept-invite?token={token}"


def is_tenant_admin(user: User) -> bool:
    admin_roles = {Roles.OWNER, Roles.ADMIN}
    return any(role.name in admin_roles for role in user.roles)
