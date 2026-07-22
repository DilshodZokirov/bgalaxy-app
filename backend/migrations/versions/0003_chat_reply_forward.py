"""add reply and forward support to messages

Revision ID: 0003_chat_reply_forward
Revises: 0002_invites
Create Date: 2026-07-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003_chat_reply_forward"
down_revision: Union[str, None] = "0002_invites"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "messages",
        sa.Column("reply_to_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("messages.id"), nullable=True),
    )
    op.add_column(
        "messages",
        sa.Column("forwarded_from", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("messages", "forwarded_from")
    op.drop_column("messages", "reply_to_id")
