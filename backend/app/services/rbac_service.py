from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS
from app.models.rbac import Permission, Role
from app.models.tenant import Tenant


def ensure_permissions(db: Session) -> dict[str, Permission]:
    existing = db.scalars(select(Permission)).all()
    by_key = {permission.key: permission for permission in existing}

    for permission_key in ALL_PERMISSIONS:
        if permission_key not in by_key:
            permission = Permission(key=permission_key)
            db.add(permission)
            by_key[permission_key] = permission

    db.flush()
    return by_key


def sync_tenant_roles(db: Session, tenant: Tenant) -> dict[str, Role]:
    permissions = ensure_permissions(db)
    existing_roles = db.scalars(select(Role).where(Role.tenant_id == tenant.id)).all()
    roles: dict[str, Role] = {role.name: role for role in existing_roles}

    for role_name, permission_keys in DEFAULT_ROLE_PERMISSIONS.items():
        role = roles.get(role_name)
        if role is None:
            role = Role(
                tenant_id=tenant.id,
                name=role_name,
                description=f"Default {role_name} role",
                is_system=True,
            )
            db.add(role)
            roles[role_name] = role

        role.permissions = [permissions[key] for key in permission_keys]

    db.flush()
    return roles


def create_default_roles(db: Session, tenant: Tenant) -> dict[str, Role]:
    return sync_tenant_roles(db, tenant)
