"""add low_stock_threshold to warehouse products

Revision ID: 0029_warehouse_threshold
Revises: 0028_warehouse_image
Create Date: 2026-07-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0029_warehouse_threshold"
down_revision: Union[str, None] = "0028_warehouse_image"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("warehouse_products", sa.Column("low_stock_threshold", sa.Numeric(12, 3), nullable=True))


def downgrade() -> None:
    op.drop_column("warehouse_products", "low_stock_threshold")
