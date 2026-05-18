from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_role_in_tenant
from app.core.permissions import TENANT_ADMIN_ROLES
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.services.user_service import create_tenant_user, list_tenant_users


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
