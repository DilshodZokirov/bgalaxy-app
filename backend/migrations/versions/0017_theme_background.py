"""add theme and background preferences to users

Revision ID: 0017_theme_background
Revises: 0016_reset_and_dm_approval
Create Date: 2026-07-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0017_theme_background"
down_revision: Union[str, None] = "0016_reset_and_dm_approval"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("theme", sa.String(length=10), nullable=False, server_default="dark"))
    op.add_column("users", sa.Column("dark_background", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("light_background", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "light_background")
    op.drop_column("users", "dark_background")
    op.drop_column("users", "theme")
