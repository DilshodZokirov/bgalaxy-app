"""add approved flag to chat_channel_members

Revision ID: 0011_channel_member_approved
Revises: 0010_chat_channels
Create Date: 2026-07-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011_channel_member_approved"
down_revision: Union[str, None] = "0010_chat_channels"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chat_channel_members",
        sa.Column("approved", sa.Boolean(), nullable=False, server_default="true"),
    )


def downgrade() -> None:
    op.drop_column("chat_channel_members", "approved")
