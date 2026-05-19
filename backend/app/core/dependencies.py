from collections.abc import Callable
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User


settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_error
    except (JWTError, ValueError) as exc:
        raise credentials_error from exc

    user = db.get(User, UUID(user_id))
    if user is None or user.status != "active":
        raise credentials_error
    return user


def require_permission(permission: str) -> Callable[..., User]:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if permission not in current_user.permission_keys:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission}",
            )
        return current_user

    return dependency


def get_current_tenant_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no organization",
        )
    return current_user


def require_role_in_tenant(allowed_roles: list[str]) -> Callable[..., User]:
    normalized = {role.lower() for role in allowed_roles}

    def dependency(current_user: User = Depends(get_current_tenant_user)) -> User:
        user_roles = {role.lower() for role in current_user.role_names}
        if user_roles.isdisjoint(normalized):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role for this workspace action",
            )
        return current_user

    return dependency


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    allowed_emails = {email.lower() for email in settings.platform_admin_emails}
    if current_user.email.lower() not in allowed_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform administrator access required",
        )
    return current_user
