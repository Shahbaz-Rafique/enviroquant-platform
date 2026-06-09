"""formal review approvals

Revision ID: 0010_eia_review_approvals
Revises: 0009_document_chunks_comments
Create Date: 2026-06-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0010_eia_review_approvals"
down_revision = "0009_document_chunks_comments"
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
        "eia_review_approvals",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("project_id", UUID, nullable=False),
        sa.Column("eia_document_id", UUID, nullable=False),
        sa.Column("evaluation_run_id", UUID, nullable=False),
        sa.Column("requested_by_id", UUID, nullable=False),
        sa.Column("decided_by_id", UUID, nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="REQUESTED"),
        sa.Column("request_note", sa.Text(), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["eia_document_id"], ["eia_documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["evaluation_run_id"], ["eia_evaluation_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["decided_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_eia_review_approvals_tenant_id", "eia_review_approvals", ["tenant_id"])
    op.create_index("ix_eia_review_approvals_project_id", "eia_review_approvals", ["project_id"])
    op.create_index("ix_eia_review_approvals_eia_document_id", "eia_review_approvals", ["eia_document_id"])
    op.create_index("ix_eia_review_approvals_evaluation_run_id", "eia_review_approvals", ["evaluation_run_id"])


def downgrade() -> None:
    op.drop_index("ix_eia_review_approvals_evaluation_run_id", table_name="eia_review_approvals")
    op.drop_index("ix_eia_review_approvals_eia_document_id", table_name="eia_review_approvals")
    op.drop_index("ix_eia_review_approvals_project_id", table_name="eia_review_approvals")
    op.drop_index("ix_eia_review_approvals_tenant_id", table_name="eia_review_approvals")
    op.drop_table("eia_review_approvals")
