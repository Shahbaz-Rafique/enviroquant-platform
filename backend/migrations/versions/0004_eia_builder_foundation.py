"""eia builder foundation

Revision ID: 0004_eia_builder_foundation
Revises: 0003_user_invitation_flow
Create Date: 2026-05-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0004_eia_builder_foundation"
down_revision = "0003_user_invitation_flow"
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
        "eia_documents",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("project_id", UUID, nullable=False),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("status", sa.String(length=40), server_default="draft", nullable=False),
        sa.Column("created_by_id", UUID, nullable=False),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_eia_documents_project_id", "eia_documents", ["project_id"])
    op.create_index("ix_eia_documents_tenant_id", "eia_documents", ["tenant_id"])

    op.create_table(
        "eia_sections",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("eia_document_id", UUID, nullable=False),
        sa.Column("section_number", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["eia_document_id"], ["eia_documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("eia_document_id", "section_number", name="uq_eia_sections_document_number"),
    )
    op.create_index("ix_eia_sections_eia_document_id", "eia_sections", ["eia_document_id"])
    op.create_index("ix_eia_sections_tenant_id", "eia_sections", ["tenant_id"])

    op.create_table(
        "eia_subsections",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("eia_document_id", UUID, nullable=False),
        sa.Column("section_id", UUID, nullable=False),
        sa.Column("subsection_number", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("content", sa.Text(), server_default="", nullable=False),
        sa.Column("completion_status", sa.String(length=40), server_default="NOT_STARTED", nullable=False),
        sa.Column("progress_percentage", sa.Float(), server_default="0", nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("assigned_to_id", UUID, nullable=True),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["eia_document_id"], ["eia_documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["section_id"], ["eia_sections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("section_id", "subsection_number", name="uq_eia_subsections_section_number"),
    )
    op.create_index("ix_eia_subsections_eia_document_id", "eia_subsections", ["eia_document_id"])
    op.create_index("ix_eia_subsections_section_id", "eia_subsections", ["section_id"])
    op.create_index("ix_eia_subsections_tenant_id", "eia_subsections", ["tenant_id"])

    op.create_table(
        "eia_attachments",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("eia_document_id", UUID, nullable=False),
        sa.Column("section_id", UUID, nullable=True),
        sa.Column("subsection_id", UUID, nullable=False),
        sa.Column("uploaded_by_id", UUID, nullable=False),
        sa.Column("source_document_id", UUID, nullable=True),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column("mime_type", sa.String(length=160), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("attachment_type", sa.String(length=80), server_default="supporting_evidence", nullable=False),
        sa.Column("checklist_reference", sa.String(length=40), nullable=True),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["eia_document_id"], ["eia_documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["section_id"], ["eia_sections.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["source_document_id"], ["documents.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["subsection_id"], ["eia_subsections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_eia_attachments_eia_document_id", "eia_attachments", ["eia_document_id"])
    op.create_index("ix_eia_attachments_section_id", "eia_attachments", ["section_id"])
    op.create_index("ix_eia_attachments_subsection_id", "eia_attachments", ["subsection_id"])
    op.create_index("ix_eia_attachments_tenant_id", "eia_attachments", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_eia_attachments_tenant_id", table_name="eia_attachments")
    op.drop_index("ix_eia_attachments_subsection_id", table_name="eia_attachments")
    op.drop_index("ix_eia_attachments_section_id", table_name="eia_attachments")
    op.drop_index("ix_eia_attachments_eia_document_id", table_name="eia_attachments")
    op.drop_table("eia_attachments")
    op.drop_index("ix_eia_subsections_tenant_id", table_name="eia_subsections")
    op.drop_index("ix_eia_subsections_section_id", table_name="eia_subsections")
    op.drop_index("ix_eia_subsections_eia_document_id", table_name="eia_subsections")
    op.drop_table("eia_subsections")
    op.drop_index("ix_eia_sections_tenant_id", table_name="eia_sections")
    op.drop_index("ix_eia_sections_eia_document_id", table_name="eia_sections")
    op.drop_table("eia_sections")
    op.drop_index("ix_eia_documents_tenant_id", table_name="eia_documents")
    op.drop_index("ix_eia_documents_project_id", table_name="eia_documents")
    op.drop_table("eia_documents")
