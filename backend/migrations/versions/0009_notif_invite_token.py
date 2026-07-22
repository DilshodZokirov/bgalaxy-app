"""add invite_token to notifications

Revision ID: 0009_notif_invite_token
Revises: 0008_notifications
Create Date: 2026-07-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009_notif_invite_token"
down_revision: Union[str, None] = "0008_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("invite_token", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "invite_token")
