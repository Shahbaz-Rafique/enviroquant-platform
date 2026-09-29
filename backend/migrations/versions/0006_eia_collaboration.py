"""eia collaboration

Revision ID: 0006_eia_collaboration
Revises: 0005_subsection_content
Create Date: 2026-05-21
"""
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0006_eia_collaboration"
down_revision = "0005_subsection_content"
branch_labels = None
depends_on = None


UUID = postgresql.UUID(as_uuid=True)


def timestamp_columns() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "eia_document_members",
        sa.Column("id", UUID, nullable=False),
        sa.Column("eia_document_id", UUID, nullable=False),
        sa.Column("user_id", UUID, nullable=False),
        sa.Column("role", sa.String(length=50), server_default="VIEWER", nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["eia_document_id"], ["eia_documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("eia_document_id", "user_id", name="uq_eia_document_members_document_user"),
    )
    op.create_index("ix_eia_document_members_eia_document_id", "eia_document_members", ["eia_document_id"])
    op.create_index("ix_eia_document_members_user_id", "eia_document_members", ["user_id"])

    op.create_table(
        "subsection_comments",
        sa.Column("id", UUID, nullable=False),
        sa.Column("subsection_id", UUID, nullable=False),
        sa.Column("user_id", UUID, nullable=False),
        sa.Column("parent_comment_id", UUID, nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_resolved", sa.Boolean(), server_default=sa.false(), nullable=False),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(["parent_comment_id"], ["subsection_comments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subsection_id"], ["eia_subsections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_subsection_comments_parent_comment_id", "subsection_comments", ["parent_comment_id"])
    op.create_index("ix_subsection_comments_subsection_id", "subsection_comments", ["subsection_id"])
    op.create_index("ix_subsection_comments_user_id", "subsection_comments", ["user_id"])

    op.create_table(
        "checklist_mappings",
        sa.Column("id", UUID, nullable=False),
        sa.Column("subsection_id", UUID, nullable=False),
        sa.Column("checklist_section", sa.String(length=20), nullable=False),
        sa.Column("checklist_title", sa.String(length=500), nullable=False),
        sa.Column("importance", sa.String(length=20), server_default="HIGH", nullable=False),
        sa.ForeignKeyConstraint(["subsection_id"], ["eia_subsections.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("subsection_id", "checklist_section", name="uq_checklist_mappings_subsection_section"),
    )
    op.create_index("ix_checklist_mappings_subsection_id", "checklist_mappings", ["subsection_id"])

    connection = op.get_bind()
    documents = connection.execute(sa.text("SELECT id, created_by_id FROM eia_documents")).mappings().all()
    if documents:
        connection.execute(
            sa.text(
                """
                INSERT INTO eia_document_members (id, eia_document_id, user_id, role)
                VALUES (:id, :eia_document_id, :user_id, :role)
                """
            ),
            [
                {
                    "id": uuid.uuid4(),
                    "eia_document_id": document["id"],
                    "user_id": document["created_by_id"],
                    "role": "EDITOR",
                }
                for document in documents
            ],
        )

    subsections = connection.execute(
        sa.text("SELECT id, subsection_number, title FROM eia_subsections")
    ).mappings().all()
    if subsections:
        connection.execute(
            sa.text(
                """
                INSERT INTO checklist_mappings (id, subsection_id, checklist_section, checklist_title, importance)
                VALUES (:id, :subsection_id, :checklist_section, :checklist_title, :importance)
                """
            ),
            [
                {
                    "id": uuid.uuid4(),
                    "subsection_id": subsection["id"],
                    "checklist_section": subsection["subsection_number"],
                    "checklist_title": subsection["title"],
                    "importance": "HIGH" if str(subsection["subsection_number"]).count(".") >= 2 else "MEDIUM",
                }
                for subsection in subsections
            ],
        )


def downgrade() -> None:
    op.drop_index("ix_checklist_mappings_subsection_id", table_name="checklist_mappings")
    op.drop_table("checklist_mappings")
    op.drop_index("ix_subsection_comments_user_id", table_name="subsection_comments")
    op.drop_index("ix_subsection_comments_subsection_id", table_name="subsection_comments")
    op.drop_index("ix_subsection_comments_parent_comment_id", table_name="subsection_comments")
    op.drop_table("subsection_comments")
    op.drop_index("ix_eia_document_members_user_id", table_name="eia_document_members")
    op.drop_index("ix_eia_document_members_eia_document_id", table_name="eia_document_members")
    op.drop_table("eia_document_members")
