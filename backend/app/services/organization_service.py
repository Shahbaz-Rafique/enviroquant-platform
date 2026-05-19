from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.schemas.organization import OrganizationCreate, OrganizationUpdate
from app.schemas.user import UserInvite
from app.services.auth_service import slugify
from app.services.rbac_service import create_default_roles
from app.services.user_service import InvitationResult, invite_user_for_tenant


def list_organizations(db: Session) -> list[Tenant]:
    statement = select(Tenant).order_by(Tenant.created_at.desc())
    return list(db.scalars(statement).all())


def create_organization(db: Session, payload: OrganizationCreate) -> Tenant:
    slug = slugify(payload.slug or payload.name)
    existing = db.scalar(select(Tenant).where(Tenant.slug == slug))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization slug already exists",
        )

    organization = Tenant(name=payload.name, slug=slug)
    db.add(organization)
    db.flush()
    create_default_roles(db, organization)
    db.commit()
    db.refresh(organization)
    return organization


def update_organization(db: Session, organization: Tenant, payload: OrganizationUpdate) -> Tenant:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(organization, field, value)

    db.commit()
    db.refresh(organization)
    return organization


def invite_organization_user(
    db: Session,
    organization_id: UUID,
    payload: UserInvite,
) -> InvitationResult:
    organization = db.get(Tenant, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return invite_user_for_tenant(db, organization, payload)
