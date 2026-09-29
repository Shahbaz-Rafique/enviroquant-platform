"""user invitation flow

Revision ID: 0003_user_invitation_flow
Revises: 0002_rbac_role_alignment
Create Date: 2026-05-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0003_user_invitation_flow"
down_revision = "0002_rbac_role_alignment"
branch_labels = None
depends_on = None


UUID = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.add_column("users", sa.Column("invited_by_id", UUID, nullable=True))
    op.add_column("users", sa.Column("invitation_token_hash", sa.String(length=64), nullable=True))
    op.add_column(
        "users",
        sa.Column("invitation_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("users", sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key(
        "fk_users_invited_by_id_users",
        "users",
        "users",
        ["invited_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_users_invited_by_id", "users", ["invited_by_id"])
    op.create_index(
        "ix_users_invitation_token_hash",
        "users",
        ["invitation_token_hash"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_users_invitation_token_hash", table_name="users")
    op.drop_index("ix_users_invited_by_id", table_name="users")
    op.drop_constraint("fk_users_invited_by_id_users", "users", type_="foreignkey")
    op.drop_column("users", "activated_at")
    op.drop_column("users", "invitation_expires_at")
    op.drop_column("users", "invitation_token_hash")
    op.drop_column("users", "invited_by_id")
