"""add channel to direct_conversations (chat vs office)

Revision ID: 0025_conversation_channel
Revises: 0024_pin_lock
Create Date: 2026-07-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0025_conversation_channel"
down_revision: Union[str, None] = "0024_pin_lock"d
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "direct_conversations", sa.Column("channel", sa.String(length=10), nullable=False, server_default="chat")
    )


def downgrade() -> None:
    op.drop_column("direct_conversations", "channel")
