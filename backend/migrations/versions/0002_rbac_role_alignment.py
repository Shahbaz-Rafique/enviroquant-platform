"""rbac role alignment

Revision ID: 0002_rbac_role_alignment
Revises: 0001_workspace_foundation
Create Date: 2026-05-14
"""
from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op


revision = "0002_rbac_role_alignment"
down_revision = "0001_workspace_foundation"
branch_labels = None
depends_on = None


ROLE_PERMISSION_MAP = {
    "owner": [
        "tenant:read",
        "tenant:manage",
        "user:read",
        "user:manage",
        "project:create",
        "project:read",
        "project:update",
        "project:delete",
        "document:upload",
        "document:read",
        "document:version:create",
        "document:delete",
        "review:read",
        "review:manage",
    ],
    "admin": [
        "tenant:read",
        "tenant:manage",
        "user:read",
        "user:manage",
        "project:create",
        "project:read",
        "project:update",
        "project:delete",
        "document:upload",
        "document:read",
        "document:version:create",
        "document:delete",
        "review:read",
        "review:manage",
    ],
    "consultant": [
        "tenant:read",
        "project:create",
        "project:read",
        "project:update",
        "document:upload",
        "document:read",
        "document:version:create",
    ],
    "reviewer": ["tenant:read", "project:read", "document:read", "review:read", "review:manage"],
    "regulator": ["tenant:read", "project:read", "document:read", "review:read", "review:manage"],
    "viewer": ["tenant:read", "project:read", "document:read"],
}


def upgrade() -> None:
    bind = op.get_bind()
    now = sa.func.now()

    permission_ids: dict[str, uuid.UUID] = {}
    for permission_key in sorted({key for keys in ROLE_PERMISSION_MAP.values() for key in keys}):
        existing_id = bind.execute(
            sa.text("SELECT id FROM permissions WHERE key = :key"),
            {"key": permission_key},
        ).scalar()
        if existing_id:
            permission_ids[permission_key] = existing_id
            continue

        permission_id = uuid.uuid4()
        bind.execute(
            sa.text(
                """
                INSERT INTO permissions (id, key, description, created_at, updated_at)
                VALUES (:id, :key, NULL, now(), now())
                """
            ),
            {"id": permission_id, "key": permission_key},
        )
        permission_ids[permission_key] = permission_id

    tenants = bind.execute(sa.text("SELECT id FROM tenants")).fetchall()
    for tenant in tenants:
        for role_name, permission_keys in ROLE_PERMISSION_MAP.items():
            role_id = bind.execute(
                sa.text("SELECT id FROM roles WHERE tenant_id = :tenant_id AND name = :name"),
                {"tenant_id": tenant.id, "name": role_name},
            ).scalar()
            if not role_id:
                role_id = uuid.uuid4()
                bind.execute(
                    sa.text(
                        """
                        INSERT INTO roles (id, tenant_id, name, description, is_system, created_at, updated_at)
                        VALUES (:id, :tenant_id, :name, :description, true, now(), now())
                        """
                    ),
                    {
                        "id": role_id,
                        "tenant_id": tenant.id,
                        "name": role_name,
                        "description": f"Default {role_name} role",
                    },
                )

            bind.execute(sa.text("DELETE FROM role_permissions WHERE role_id = :role_id"), {"role_id": role_id})
            for permission_key in permission_keys:
                bind.execute(
                    sa.text(
                        """
                        INSERT INTO role_permissions (role_id, permission_id)
                        VALUES (:role_id, :permission_id)
                        """
                    ),
                    {"role_id": role_id, "permission_id": permission_ids[permission_key]},
                )

    op.alter_column("projects", "status", server_default="DRAFT")
    bind.execute(sa.text("UPDATE projects SET status = upper(status) WHERE status = lower(status)"))
    bind.execute(sa.text("UPDATE documents SET status = upper(status) WHERE status = lower(status)"))


def downgrade() -> None:
    op.alter_column("projects", "status", server_default="draft")
