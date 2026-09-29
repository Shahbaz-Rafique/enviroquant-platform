from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_current_tenant_user,
    require_platform_admin,
    require_role_in_tenant,
)
from app.core.permissions import TENANT_ADMIN_ROLES
from app.db.session import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationRead, OrganizationUpdate
from app.schemas.user import UserInvitationRead, UserInvite
from app.services.organization_service import (
    create_organization,
    invite_organization_user,
    list_organizations,
    update_organization,
)


router = APIRouter()


@router.get("/me", response_model=OrganizationRead)
def read_current_organization(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
) -> Tenant:
    return db.get(Tenant, current_user.tenant_id)


@router.get(
    "",
    response_model=list[OrganizationRead],
    dependencies=[Depends(require_platform_admin)],
)
def read_organizations(db: Session = Depends(get_db)) -> list[Tenant]:
    return list_organizations(db)


@router.patch(
    "/me",
    response_model=OrganizationRead,
)
def patch_current_organization(
    payload: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role_in_tenant(TENANT_ADMIN_ROLES)),
) -> Tenant:
    organization = db.get(Tenant, current_user.tenant_id)
    return update_organization(db, organization, payload)


@router.post(
    "",
    response_model=OrganizationRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_platform_admin)],
)
def create_new_organization(
    payload: OrganizationCreate,
    db: Session = Depends(get_db),
) -> Tenant:
    return create_organization(db, payload)


@router.post(
    "/{organization_id}/invite",
    response_model=UserInvitationRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_platform_admin)],
)
def invite_user_to_organization(
    organization_id: UUID,
    payload: UserInvite,
    db: Session = Depends(get_db),
) -> UserInvitationRead:
    invitation = invite_organization_user(db, organization_id, payload)
    return UserInvitationRead.model_validate(invitation)
