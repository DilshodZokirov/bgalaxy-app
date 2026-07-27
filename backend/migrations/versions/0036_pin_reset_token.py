"""add pin_reset_token columns for forgot-PIN email flow

Revision ID: 0036_pin_reset_token
Revises: 0035_complaint_attachments
Create Date: 2026-07-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0036_pin_reset_token"
down_revision: Union[str, None] = "0035_complaint_attachments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("pin_reset_token", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("pin_reset_token_expires", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "pin_reset_token_expires")
    op.drop_column("users", "pin_reset_token")
