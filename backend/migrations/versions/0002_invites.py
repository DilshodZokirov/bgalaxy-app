"""add invites table

Revision ID: 0002_invites
Revises: 0001_initial
Create Date: 2026-07-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002_invites"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

member_role = postgresql.ENUM("admin", "member", name="memberrole", create_type=False)


def upgrade() -> None:
    op.create_table(
        "invites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", member_role, nullable=False, server_default="member"),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("invited_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_invites_token", "invites", ["token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_invites_token", table_name="invites")
    op.drop_table("invites")
