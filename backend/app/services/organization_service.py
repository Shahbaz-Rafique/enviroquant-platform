from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.schemas.organization import OrganizationCreate, OrganizationUpdate
from app.services.auth_service import slugify
from app.services.rbac_service import create_default_roles


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
