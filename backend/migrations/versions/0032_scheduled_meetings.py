"""add scheduled_meetings for timed meeting reminders

Revision ID: 0032_scheduled_meetings
Revises: 0031_warehouse_marketplace
Create Date: 2026-07-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0032_scheduled_meetings"
down_revision: Union[str, None] = "0031_warehouse_marketplace"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scheduled_meetings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="scheduled"),
        sa.Column("notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_scheduled_meetings_company_id", "scheduled_meetings", ["company_id"])
    op.create_index("ix_scheduled_meetings_created_by", "scheduled_meetings", ["created_by"])
    op.create_index("ix_scheduled_meetings_starts_at", "scheduled_meetings", ["starts_at"])


def downgrade() -> None:
    op.drop_index("ix_scheduled_meetings_starts_at", table_name="scheduled_meetings")
    op.drop_index("ix_scheduled_meetings_created_by", table_name="scheduled_meetings")
    op.drop_index("ix_scheduled_meetings_company_id", table_name="scheduled_meetings")
    op.drop_table("scheduled_meetings")
