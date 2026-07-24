"""add image_url to warehouse products

Revision ID: 0028_warehouse_image
Revises: 0027_warehouse_units
Create Date: 2026-07-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0028_warehouse_image"
down_revision: Union[str, None] = "0027_warehouse_units"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("warehouse_products", sa.Column("image_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("warehouse_products", "image_url")
