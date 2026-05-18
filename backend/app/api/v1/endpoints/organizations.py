from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role_in_tenant
from app.core.permissions import TENANT_ADMIN_ROLES
from app.db.session import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationRead, OrganizationUpdate
from app.services.organization_service import create_organization, update_organization


router = APIRouter()


@router.get("/me", response_model=OrganizationRead)
def read_current_organization(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Tenant:
    return db.get(Tenant, current_user.tenant_id)


@router.patch(
    "/me",
    response_model=OrganizationRead,
    dependencies=[Depends(require_role_in_tenant(TENANT_ADMIN_ROLES))],
)
def patch_current_organization(
    payload: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Tenant:
    organization = db.get(Tenant, current_user.tenant_id)
    return update_organization(db, organization, payload)


@router.post(
    "",
    response_model=OrganizationRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role_in_tenant(TENANT_ADMIN_ROLES))],
)
def create_new_organization(
    payload: OrganizationCreate,
    db: Session = Depends(get_db),
) -> Tenant:
    return create_organization(db, payload)
