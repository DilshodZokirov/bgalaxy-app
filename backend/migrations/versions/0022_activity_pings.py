"""add activity_pings table for time-on-site estimation

Revision ID: 0022_activity_pings
Revises: 0021_last_seen
Create Date: 2026-07-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0022_activity_pings"
down_revision: Union[str, None] = "0021_last_seen"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activity_pings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_activity_pings_user_id", "activity_pings", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_activity_pings_user_id", table_name="activity_pings")
    op.drop_table("activity_pings")
