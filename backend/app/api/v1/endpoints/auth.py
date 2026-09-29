from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AcceptInvitationRequest,
    LoginRequest,
    RegisterTenantRequest,
    TokenResponse,
)
from app.schemas.user import UserRead
from app.services.auth_service import authenticate_user, build_token_response, register_tenant_owner
from app.services.user_service import accept_invitation


router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterTenantRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = register_tenant_owner(db, payload)
    return build_token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, payload)
    return build_token_response(user)


@router.post("/accept-invite", response_model=TokenResponse)
def accept_invite(payload: AcceptInvitationRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = accept_invitation(db, payload)
    return build_token_response(user)


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
