"""eia evaluation runs

Revision ID: 0008_eia_evaluation_runs
Revises: 0007_eia_traceability
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0008_eia_evaluation_runs"
down_revision = "0007_eia_traceability"
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
        "eia_evaluation_runs",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("project_id", UUID, nullable=False),
        sa.Column("eia_document_id", UUID, nullable=False),
        sa.Column("source_document_id", UUID, nullable=True),
        sa.Column("source_version_id", UUID, nullable=True),
        sa.Column("created_by_id", UUID, nullable=False),
        sa.Column("status", sa.String(length=30), server_default="PENDING", nullable=False),
        sa.Column("prompt_version", sa.String(length=60), nullable=False),
        sa.Column("model_version", sa.String(length=120), nullable=False),
        sa.Column("evaluation_scope", sa.String(length=60), server_default="subsection_content", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["eia_document_id"], ["eia_documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_document_id"], ["documents.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["source_version_id"], ["document_versions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_eia_evaluation_runs_tenant_id", "eia_evaluation_runs", ["tenant_id"])
    op.create_index("ix_eia_evaluation_runs_project_id", "eia_evaluation_runs", ["project_id"])
    op.create_index("ix_eia_evaluation_runs_eia_document_id", "eia_evaluation_runs", ["eia_document_id"])
    op.create_index("ix_eia_evaluation_runs_source_document_id", "eia_evaluation_runs", ["source_document_id"])
    op.create_index("ix_eia_evaluation_runs_source_version_id", "eia_evaluation_runs", ["source_version_id"])

    op.create_table(
        "eia_evaluation_findings",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("evaluation_run_id", UUID, nullable=False),
        sa.Column("subsection_id", UUID, nullable=True),
        sa.Column("checklist_section", sa.String(length=20), nullable=False),
        sa.Column("checklist_title", sa.String(length=500), nullable=False),
        sa.Column("subsection_number", sa.String(length=20), nullable=True),
        sa.Column("subsection_title", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("adequacy", sa.String(length=40), nullable=False),
        sa.Column("confidence_score", sa.Float(), server_default="0", nullable=False),
        sa.Column("evidence_summary", sa.Text(), nullable=False),
        sa.Column("ai_analysis", sa.Text(), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=True),
        sa.Column("missing_elements", JSONB, server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("evidence_references", JSONB, server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["evaluation_run_id"], ["eia_evaluation_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subsection_id"], ["eia_subsections.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_eia_evaluation_findings_tenant_id", "eia_evaluation_findings", ["tenant_id"])
    op.create_index("ix_eia_evaluation_findings_evaluation_run_id", "eia_evaluation_findings", ["evaluation_run_id"])
    op.create_index("ix_eia_evaluation_findings_subsection_id", "eia_evaluation_findings", ["subsection_id"])

    op.create_table(
        "eia_evaluation_section_summaries",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("evaluation_run_id", UUID, nullable=False),
        sa.Column("section_number", sa.String(length=20), nullable=False),
        sa.Column("section_title", sa.String(length=255), nullable=False),
        sa.Column("findings_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("compliant_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("partially_compliant_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("needs_improvement_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("missing_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("needs_review_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("score", sa.Float(), server_default="0", nullable=False),
        sa.Column("summary_comment", sa.Text(), nullable=True),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["evaluation_run_id"], ["eia_evaluation_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_eia_evaluation_section_summaries_tenant_id",
        "eia_evaluation_section_summaries",
        ["tenant_id"],
    )
    op.create_index(
        "ix_eia_evaluation_section_summaries_evaluation_run_id",
        "eia_evaluation_section_summaries",
        ["evaluation_run_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_eia_evaluation_section_summaries_evaluation_run_id",
        table_name="eia_evaluation_section_summaries",
    )
    op.drop_index("ix_eia_evaluation_section_summaries_tenant_id", table_name="eia_evaluation_section_summaries")
    op.drop_table("eia_evaluation_section_summaries")

    op.drop_index("ix_eia_evaluation_findings_subsection_id", table_name="eia_evaluation_findings")
    op.drop_index("ix_eia_evaluation_findings_evaluation_run_id", table_name="eia_evaluation_findings")
    op.drop_index("ix_eia_evaluation_findings_tenant_id", table_name="eia_evaluation_findings")
    op.drop_table("eia_evaluation_findings")

    op.drop_index("ix_eia_evaluation_runs_source_version_id", table_name="eia_evaluation_runs")
    op.drop_index("ix_eia_evaluation_runs_source_document_id", table_name="eia_evaluation_runs")
    op.drop_index("ix_eia_evaluation_runs_eia_document_id", table_name="eia_evaluation_runs")
    op.drop_index("ix_eia_evaluation_runs_project_id", table_name="eia_evaluation_runs")
    op.drop_index("ix_eia_evaluation_runs_tenant_id", table_name="eia_evaluation_runs")
    op.drop_table("eia_evaluation_runs")
