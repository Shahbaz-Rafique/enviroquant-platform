from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import DEFAULT_ROLE_PERMISSIONS
from app.core.security import hash_password
from app.models.rbac import Role
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.rbac_service import sync_tenant_roles


def list_tenant_users(db: Session, current_user: User) -> list[User]:
    statement = (
        select(User)
        .where(User.tenant_id == current_user.tenant_id)
        .order_by(User.created_at.desc())
    )
    return list(db.scalars(statement).unique().all())


def create_tenant_user(db: Session, current_user: User, payload: UserCreate) -> User:
    requested_role = payload.role.lower()
    if requested_role not in DEFAULT_ROLE_PERMISSIONS or requested_role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be ADMIN, CONSULTANT, REVIEWER, REGULATOR, or VIEWER",
        )

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

    sync_tenant_roles(db, current_user.tenant)
    role = db.scalar(
        select(Role).where(Role.tenant_id == current_user.tenant_id, Role.name == requested_role)
    )
    if role is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Role not configured")

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
