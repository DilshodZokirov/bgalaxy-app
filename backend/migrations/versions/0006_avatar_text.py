"""widen users.avatar_url to text

Revision ID: 0006_avatar_text
Revises: 0005_roles
Create Date: 2026-07-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006_avatar_text"
down_revision: Union[str, None] = "0005_roles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "avatar_url", type_=sa.Text(), existing_type=sa.String(500))


def downgrade() -> None:
    op.alter_column("users", "avatar_url", type_=sa.String(500), existing_type=sa.Text())
