"""add ui_theme accent-palette field to users

Revision ID: 0018_ui_theme
Revises: 0017_theme_background
Create Date: 2026-07-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0018_ui_theme"
down_revision: Union[str, None] = "0017_theme_background"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("ui_theme", sa.String(length=30), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "ui_theme")
