import re
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterTenantRequest, TokenResponse
from app.services.rbac_service import create_default_roles, sync_tenant_roles
from app.seeds.regulation_seed import seed_kuwait_regulatory_library


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:80] or "tenant"


def register_tenant_owner(db: Session, payload: RegisterTenantRequest) -> User:
    slug = slugify(payload.tenant_slug or payload.tenant_name)
    existing_tenant = db.scalar(select(Tenant).where(Tenant.slug == slug))
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tenant slug already exists",
        )

    tenant = Tenant(name=payload.tenant_name, slug=slug)
    db.add(tenant)
    db.flush()

    roles = create_default_roles(db, tenant)
    user = User(
        tenant_id=tenant.id,
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    user.roles = [roles["admin"]]
    db.add(user)
    seed_kuwait_regulatory_library(db, tenant.id, commit=False)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, payload: LoginRequest) -> User:
    query = select(User).where(User.email == payload.email.lower(), User.status == "active")

    if payload.tenant_slug:
        query = query.join(Tenant).where(Tenant.slug == slugify(payload.tenant_slug))

    users = db.scalars(query).unique().all()
    if len(users) != 1:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email, tenant, or password",
        )

    user = users[0]
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email, tenant, or password",
        )

    if user.tenant:
        sync_tenant_roles(db, user.tenant)
        db.commit()
        db.refresh(user)

    return user


def build_token_response(user: User) -> TokenResponse:
    access_token = create_access_token(
        subject=str(user.id),
        claims={
            "user_id": str(user.id),
            "email": user.email,
            "tenant_id": str(user.tenant_id),
            "organization_id": str(user.tenant_id),
            "role": user.primary_role,
            "roles": user.role_names,
            "permissions": sorted(user.permission_keys),
        },
    )
    return TokenResponse(access_token=access_token, user=user)


def assert_same_tenant(user: User, tenant_id: UUID) -> None:
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
