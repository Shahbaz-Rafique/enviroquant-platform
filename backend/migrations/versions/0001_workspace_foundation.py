"""workspace foundation

Revision ID: 0001_workspace_foundation
Revises:
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_workspace_foundation"
down_revision = None
branch_labels = None
depends_on = None


UUID = postgresql.UUID(as_uuid=True)
JSONB = postgresql.JSONB(astext_type=sa.Text())


def timestamp_columns() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", UUID, nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
        *timestamp_columns(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_tenants_slug", "tenants", ["slug"])

    op.create_table(
        "permissions",
        sa.Column("id", UUID, nullable=False),
        sa.Column("key", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        *timestamp_columns(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_index("ix_permissions_key", "permissions", ["key"])

    op.create_table(
        "roles",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "name", name="uq_roles_tenant_name"),
    )
    op.create_index("ix_roles_tenant_id", "roles", ["tenant_id"])

    op.create_table(
        "role_permissions",
        sa.Column("role_id", UUID, nullable=False),
        sa.Column("permission_id", UUID, nullable=False),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("role_id", "permission_id"),
    )

    op.create_table(
        "users",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])

    op.create_table(
        "user_roles",
        sa.Column("user_id", UUID, nullable=False),
        sa.Column("role_id", UUID, nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "role_id"),
    )

    op.create_table(
        "projects",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sector", sa.String(length=120), nullable=True),
        sa.Column("country", sa.String(length=120), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="draft"),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_by_id", UUID, nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projects_tenant_id", "projects", ["tenant_id"])

    op.create_table(
        "project_members",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("project_id", UUID, nullable=False),
        sa.Column("user_id", UUID, nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False, server_default="owner"),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "user_id", name="uq_project_members_project_user"),
    )
    op.create_index("ix_project_members_project_id", "project_members", ["project_id"])
    op.create_index("ix_project_members_tenant_id", "project_members", ["tenant_id"])
    op.create_index("ix_project_members_user_id", "project_members", ["user_id"])

    op.create_table(
        "documents",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("project_id", UUID, nullable=False),
        sa.Column("uploaded_by_id", UUID, nullable=False),
        sa.Column("current_version_id", UUID, nullable=True),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("document_type", sa.String(length=80), nullable=False, server_default="eia_report"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="uploaded"),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_project_id", "documents", ["project_id"])
    op.create_index("ix_documents_tenant_id", "documents", ["tenant_id"])

    op.create_table(
        "document_versions",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("document_id", UUID, nullable=False),
        sa.Column("uploaded_by_id", UUID, nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("mime_type", sa.String(length=160), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("parser_status", sa.String(length=40), nullable=False, server_default="pending"),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_id", "version_number", name="uq_document_versions_document_number"),
    )
    op.create_index("ix_document_versions_document_id", "document_versions", ["document_id"])
    op.create_index("ix_document_versions_tenant_id", "document_versions", ["tenant_id"])
    op.create_foreign_key(
        "fk_documents_current_version",
        "documents",
        "document_versions",
        ["current_version_id"],
        ["id"],
    )

    op.create_table(
        "audit_events",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("actor_user_id", UUID, nullable=True),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=120), nullable=False),
        sa.Column("entity_id", UUID, nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_events_tenant_id", "audit_events", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_events_tenant_id", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_constraint("fk_documents_current_version", "documents", type_="foreignkey")
    op.drop_index("ix_document_versions_tenant_id", table_name="document_versions")
    op.drop_index("ix_document_versions_document_id", table_name="document_versions")
    op.drop_table("document_versions")
    op.drop_index("ix_documents_tenant_id", table_name="documents")
    op.drop_index("ix_documents_project_id", table_name="documents")
    op.drop_table("documents")
    op.drop_index("ix_project_members_user_id", table_name="project_members")
    op.drop_index("ix_project_members_tenant_id", table_name="project_members")
    op.drop_index("ix_project_members_project_id", table_name="project_members")
    op.drop_table("project_members")
    op.drop_index("ix_projects_tenant_id", table_name="projects")
    op.drop_table("projects")
    op.drop_table("user_roles")
    op.drop_index("ix_users_tenant_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("role_permissions")
    op.drop_index("ix_roles_tenant_id", table_name="roles")
    op.drop_table("roles")
    op.drop_index("ix_permissions_key", table_name="permissions")
    op.drop_table("permissions")
    op.drop_index("ix_tenants_slug", table_name="tenants")
    op.drop_table("tenants")
