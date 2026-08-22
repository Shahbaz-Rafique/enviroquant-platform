"""version compliance methodology and regulation knowledge

Revision ID: 0011_methodology_regulations
Revises: 0010_eia_review_approvals
Create Date: 2026-08-21
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0011_methodology_regulations"
down_revision = "0010_eia_review_approvals"
branch_labels = None
depends_on = None

UUID = postgresql.UUID(as_uuid=True)
JSONB = postgresql.JSONB(astext_type=sa.Text())
CHECKLIST_VERSION = "enviroquant-eia-checklist-2026.1"
METHODOLOGY_VERSION = "evidence-first-mvp-1.0"
RULES_VERSION = "deterministic-classification-1.0"


def timestamp_columns() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def upgrade() -> None:
    op.add_column(
        "eia_documents",
        sa.Column("checklist_version", sa.String(80), nullable=False, server_default=CHECKLIST_VERSION),
    )
    op.add_column(
        "checklist_mappings",
        sa.Column("checklist_version", sa.String(80), nullable=False, server_default=CHECKLIST_VERSION),
    )
    op.add_column(
        "eia_evaluation_runs",
        sa.Column("checklist_version", sa.String(80), nullable=False, server_default=CHECKLIST_VERSION),
    )
    op.add_column(
        "eia_evaluation_runs",
        sa.Column("methodology_version", sa.String(80), nullable=False, server_default=METHODOLOGY_VERSION),
    )
    op.add_column(
        "eia_evaluation_runs",
        sa.Column("rules_version", sa.String(80), nullable=False, server_default=RULES_VERSION),
    )

    op.create_table(
        "regulation_standards",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("code", sa.String(80), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("jurisdiction", sa.String(120), nullable=False),
        sa.Column("authority", sa.String(200), nullable=True),
        sa.Column("version", sa.String(60), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=True),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("source_url", sa.String(1000), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "code", "version", name="uq_regulation_standard_tenant_code_version"),
    )
    op.create_index("ix_regulation_standards_tenant_id", "regulation_standards", ["tenant_id"])

    op.create_table(
        "regulation_requirements",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("standard_id", UUID, nullable=False),
        sa.Column("requirement_code", sa.String(100), nullable=False),
        sa.Column("title", sa.String(400), nullable=False),
        sa.Column("requirement_text", sa.Text(), nullable=False),
        sa.Column("section_tags", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["standard_id"], ["regulation_standards.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("standard_id", "requirement_code", name="uq_regulation_requirement_code"),
    )
    op.create_index("ix_regulation_requirements_tenant_id", "regulation_requirements", ["tenant_id"])
    op.create_index("ix_regulation_requirements_standard_id", "regulation_requirements", ["standard_id"])

    op.add_column(
        "checklist_mappings",
        sa.Column("regulation_requirement_id", UUID, nullable=True),
    )
    op.create_foreign_key(
        "fk_checklist_mapping_regulation_requirement",
        "checklist_mappings",
        "regulation_requirements",
        ["regulation_requirement_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.execute(
        "UPDATE eia_evaluation_findings SET status = 'MISSING_INFORMATION' WHERE status = 'MISSING'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE eia_evaluation_findings SET status = 'MISSING' WHERE status = 'MISSING_INFORMATION'"
    )
    op.drop_constraint(
        "fk_checklist_mapping_regulation_requirement", "checklist_mappings", type_="foreignkey"
    )
    op.drop_column("checklist_mappings", "regulation_requirement_id")
    op.drop_index("ix_regulation_requirements_standard_id", table_name="regulation_requirements")
    op.drop_index("ix_regulation_requirements_tenant_id", table_name="regulation_requirements")
    op.drop_table("regulation_requirements")
    op.drop_index("ix_regulation_standards_tenant_id", table_name="regulation_standards")
    op.drop_table("regulation_standards")
    op.drop_column("eia_evaluation_runs", "rules_version")
    op.drop_column("eia_evaluation_runs", "methodology_version")
    op.drop_column("eia_evaluation_runs", "checklist_version")
    op.drop_column("checklist_mappings", "checklist_version")
    op.drop_column("eia_documents", "checklist_version")
