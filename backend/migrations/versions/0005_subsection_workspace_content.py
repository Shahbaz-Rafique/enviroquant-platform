"""subsection workspace content

Revision ID: 0005_subsection_content
Revises: 0004_eia_builder_foundation
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0005_subsection_content"
down_revision = "0004_eia_builder_foundation"
branch_labels = None
depends_on = None


UUID = postgresql.UUID(as_uuid=True)
JSONB = postgresql.JSONB(astext_type=sa.Text())


def upgrade() -> None:
    op.add_column("eia_subsections", sa.Column("content_html", sa.Text(), nullable=True))
    op.add_column("eia_subsections", sa.Column("content_json", JSONB, nullable=True))
    op.add_column("eia_subsections", sa.Column("last_edited_by_id", UUID, nullable=True))
    op.add_column("eia_subsections", sa.Column("last_edited_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key(
        "fk_eia_subsections_last_edited_by_id",
        "eia_subsections",
        "users",
        ["last_edited_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.execute("UPDATE eia_subsections SET content_html = NULLIF(content, '')")


def downgrade() -> None:
    op.drop_constraint(
        "fk_eia_subsections_last_edited_by_id",
        "eia_subsections",
        type_="foreignkey",
    )
    op.drop_column("eia_subsections", "last_edited_at")
    op.drop_column("eia_subsections", "last_edited_by_id")
    op.drop_column("eia_subsections", "content_json")
    op.drop_column("eia_subsections", "content_html")
