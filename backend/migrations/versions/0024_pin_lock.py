"""add pin_hash and auto_lock_minutes to users for 2FA/PIN lock

Revision ID: 0024_pin_lock
Revises: 0023_head_admin
Create Date: 2026-07-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0024_pin_lock"
down_revision: Union[str, None] = "0023_head_admin"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("pin_hash", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("auto_lock_minutes", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("users", "auto_lock_minutes")
    op.drop_column("users", "pin_hash")
