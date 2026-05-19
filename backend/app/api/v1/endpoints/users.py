from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_role_in_tenant
from app.core.permissions import TENANT_ADMIN_ROLES
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserInvitationRead, UserInvite, UserRead, UserStatusUpdate
from app.services.user_service import (
    create_tenant_user,
    invite_tenant_user,
    list_tenant_users,
    update_tenant_user_status,
)


router = APIRouter()


@router.get("", response_model=list[UserRead])
def read_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(TENANT_ADMIN_ROLES)),
) -> list[User]:
    return list_tenant_users(db, current_user)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(TENANT_ADMIN_ROLES)),
) -> User:
    return create_tenant_user(db, current_user, payload)


@router.patch("/{user_id}", response_model=UserRead)
def patch_user_status(
    user_id: UUID,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(TENANT_ADMIN_ROLES)),
) -> User:
    return update_tenant_user_status(db, current_user, user_id, payload)


@router.post("/invite", response_model=UserInvitationRead, status_code=status.HTTP_201_CREATED)
def invite_user(
    payload: UserInvite,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(TENANT_ADMIN_ROLES)),
) -> UserInvitationRead:
    invitation = invite_tenant_user(db, current_user, payload)
    return UserInvitationRead.model_validate(invitation)
