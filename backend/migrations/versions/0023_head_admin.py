"""add head_admin_id to companies

Revision ID: 0023_head_admin
Revises: 0022_activity_pings
Create Date: 2026-07-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0023_head_admin"
down_revision: Union[str, None] = "0022_activity_pings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "companies", sa.Column("head_admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("companies", "head_admin_id")
