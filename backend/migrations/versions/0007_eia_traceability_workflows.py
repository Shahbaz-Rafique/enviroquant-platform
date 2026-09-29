"""eia traceability workflows

Revision ID: 0007_eia_traceability
Revises: 0006_eia_collaboration
Create Date: 2026-05-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0007_eia_traceability"
down_revision = "0006_eia_collaboration"
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
    op.add_column("eia_document_members", sa.Column("tenant_id", UUID, nullable=True))
    op.execute(
        """
        UPDATE eia_document_members AS edm
        SET tenant_id = ed.tenant_id
        FROM eia_documents AS ed
        WHERE edm.eia_document_id = ed.id
        """
    )
    op.alter_column("eia_document_members", "tenant_id", nullable=False)
    op.create_foreign_key(
        "fk_eia_document_members_tenant_id",
        "eia_document_members",
        "tenants",
        ["tenant_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_eia_document_members_tenant_id", "eia_document_members", ["tenant_id"])

    op.add_column("subsection_comments", sa.Column("tenant_id", UUID, nullable=True))
    op.execute(
        """
        UPDATE subsection_comments AS sc
        SET tenant_id = ss.tenant_id
        FROM eia_subsections AS ss
        WHERE sc.subsection_id = ss.id
        """
    )
    op.alter_column("subsection_comments", "tenant_id", nullable=False)
    op.create_foreign_key(
        "fk_subsection_comments_tenant_id",
        "subsection_comments",
        "tenants",
        ["tenant_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_subsection_comments_tenant_id", "subsection_comments", ["tenant_id"])

    op.add_column("checklist_mappings", sa.Column("tenant_id", UUID, nullable=True))
    op.execute(
        """
        UPDATE checklist_mappings AS cm
        SET tenant_id = ss.tenant_id
        FROM eia_subsections AS ss
        WHERE cm.subsection_id = ss.id
        """
    )
    op.alter_column("checklist_mappings", "tenant_id", nullable=False)
    op.create_foreign_key(
        "fk_checklist_mappings_tenant_id",
        "checklist_mappings",
        "tenants",
        ["tenant_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_checklist_mappings_tenant_id", "checklist_mappings", ["tenant_id"])

    op.create_table(
        "eia_source_mappings",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("eia_document_id", UUID, nullable=False),
        sa.Column("source_document_id", UUID, nullable=False),
        sa.Column("source_version_id", UUID, nullable=True),
        sa.Column("subsection_id", UUID, nullable=True),
        sa.Column("detected_section_number", sa.String(length=40), nullable=True),
        sa.Column("detected_title", sa.String(length=500), nullable=True),
        sa.Column("detected_content", sa.Text(), nullable=True),
        sa.Column("suggested_content_html", sa.Text(), nullable=True),
        sa.Column("confidence_score", sa.Float(), server_default="0", nullable=False),
        sa.Column("status", sa.String(length=40), server_default="SUGGESTED", nullable=False),
        sa.Column("detection_method", sa.String(length=80), server_default="rule_based", nullable=False),
        sa.Column("assistant_notes", sa.Text(), nullable=True),
        sa.Column("confirmed_by_id", UUID, nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["confirmed_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["eia_document_id"], ["eia_documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_version_id"], ["document_versions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["subsection_id"], ["eia_subsections.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_eia_source_mappings_eia_document_id", "eia_source_mappings", ["eia_document_id"])
    op.create_index("ix_eia_source_mappings_source_document_id", "eia_source_mappings", ["source_document_id"])
    op.create_index("ix_eia_source_mappings_source_version_id", "eia_source_mappings", ["source_version_id"])
    op.create_index("ix_eia_source_mappings_subsection_id", "eia_source_mappings", ["subsection_id"])
    op.create_index("ix_eia_source_mappings_tenant_id", "eia_source_mappings", ["tenant_id"])

    op.create_table(
        "subsection_revisions",
        sa.Column("id", UUID, nullable=False),
        sa.Column("tenant_id", UUID, nullable=False),
        sa.Column("eia_document_id", UUID, nullable=False),
        sa.Column("subsection_id", UUID, nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("created_by_id", UUID, nullable=True),
        sa.Column("source_mapping_id", UUID, nullable=True),
        sa.Column("content", sa.Text(), server_default="", nullable=False),
        sa.Column("content_html", sa.Text(), nullable=True),
        sa.Column("content_json", JSONB, nullable=True),
        sa.Column("completion_status", sa.String(length=40), nullable=False),
        sa.Column("progress_percentage", sa.Float(), server_default="0", nullable=False),
        sa.Column("source_type", sa.String(length=60), server_default="manual_save", nullable=False),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["eia_document_id"], ["eia_documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_mapping_id"], ["eia_source_mappings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["subsection_id"], ["eia_subsections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("subsection_id", "revision_number", name="uq_subsection_revisions_number"),
    )
    op.create_index("ix_subsection_revisions_eia_document_id", "subsection_revisions", ["eia_document_id"])
    op.create_index("ix_subsection_revisions_subsection_id", "subsection_revisions", ["subsection_id"])
    op.create_index("ix_subsection_revisions_tenant_id", "subsection_revisions", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_subsection_revisions_tenant_id", table_name="subsection_revisions")
    op.drop_index("ix_subsection_revisions_subsection_id", table_name="subsection_revisions")
    op.drop_index("ix_subsection_revisions_eia_document_id", table_name="subsection_revisions")
    op.drop_table("subsection_revisions")

    op.drop_index("ix_eia_source_mappings_tenant_id", table_name="eia_source_mappings")
    op.drop_index("ix_eia_source_mappings_subsection_id", table_name="eia_source_mappings")
    op.drop_index("ix_eia_source_mappings_source_version_id", table_name="eia_source_mappings")
    op.drop_index("ix_eia_source_mappings_source_document_id", table_name="eia_source_mappings")
    op.drop_index("ix_eia_source_mappings_eia_document_id", table_name="eia_source_mappings")
    op.drop_table("eia_source_mappings")

    op.drop_index("ix_checklist_mappings_tenant_id", table_name="checklist_mappings")
    op.drop_constraint("fk_checklist_mappings_tenant_id", "checklist_mappings", type_="foreignkey")
    op.drop_column("checklist_mappings", "tenant_id")

    op.drop_index("ix_subsection_comments_tenant_id", table_name="subsection_comments")
    op.drop_constraint("fk_subsection_comments_tenant_id", "subsection_comments", type_="foreignkey")
    op.drop_column("subsection_comments", "tenant_id")

    op.drop_index("ix_eia_document_members_tenant_id", table_name="eia_document_members")
    op.drop_constraint("fk_eia_document_members_tenant_id", "eia_document_members", type_="foreignkey")
    op.drop_column("eia_document_members", "tenant_id")
