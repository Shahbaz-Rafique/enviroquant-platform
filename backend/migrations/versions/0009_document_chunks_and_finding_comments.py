"""document chunks and finding comments

Revision ID: 0009_document_chunks_comments
Revises: 0008_eia_evaluation_runs
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0009_document_chunks_comments"
down_revision = "0008_eia_evaluation_runs"
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
        "document_chunks",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("project_id", UUID, nullable=False),
        sa.Column("document_id", UUID, nullable=False),
        sa.Column("document_version_id", UUID, nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("chunk_key", sa.String(length=100), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("section_number", sa.String(length=40), nullable=True),
        sa.Column("section_title", sa.String(length=500), nullable=True),
        sa.Column("heading_path", JSONB, server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["document_version_id"], ["document_versions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_version_id", "chunk_index", name="uq_document_chunks_version_index"),
    )
    op.create_index("ix_document_chunks_tenant_id", "document_chunks", ["tenant_id"])
    op.create_index("ix_document_chunks_project_id", "document_chunks", ["project_id"])
    op.create_index("ix_document_chunks_document_id", "document_chunks", ["document_id"])
    op.create_index("ix_document_chunks_document_version_id", "document_chunks", ["document_version_id"])

    op.create_table(
        "eia_evaluation_finding_comments",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("evaluation_run_id", UUID, nullable=False),
        sa.Column("finding_id", UUID, nullable=False),
        sa.Column("user_id", UUID, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["evaluation_run_id"], ["eia_evaluation_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["finding_id"], ["eia_evaluation_findings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_eia_evaluation_finding_comments_tenant_id",
        "eia_evaluation_finding_comments",
        ["tenant_id"],
    )
    op.create_index(
        "ix_eia_evaluation_finding_comments_evaluation_run_id",
        "eia_evaluation_finding_comments",
        ["evaluation_run_id"],
    )
    op.create_index(
        "ix_eia_evaluation_finding_comments_finding_id",
        "eia_evaluation_finding_comments",
        ["finding_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_eia_evaluation_finding_comments_finding_id",
        table_name="eia_evaluation_finding_comments",
    )
    op.drop_index(
        "ix_eia_evaluation_finding_comments_evaluation_run_id",
        table_name="eia_evaluation_finding_comments",
    )
    op.drop_index(
        "ix_eia_evaluation_finding_comments_tenant_id",
        table_name="eia_evaluation_finding_comments",
    )
    op.drop_table("eia_evaluation_finding_comments")

    op.drop_index("ix_document_chunks_document_version_id", table_name="document_chunks")
    op.drop_index("ix_document_chunks_document_id", table_name="document_chunks")
    op.drop_index("ix_document_chunks_project_id", table_name="document_chunks")
    op.drop_index("ix_document_chunks_tenant_id", table_name="document_chunks")
    op.drop_table("document_chunks")
