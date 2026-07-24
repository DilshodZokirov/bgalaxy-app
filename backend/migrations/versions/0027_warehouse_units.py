"""add unit of measure to warehouse products (dona/kg/litr)

Revision ID: 0027_warehouse_units
Revises: 0026_warehouse
Create Date: 2026-07-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0027_warehouse_units"
down_revision: Union[str, None] = "0026_warehouse"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "warehouse_products", sa.Column("unit", sa.String(length=10), nullable=False, server_default="dona")
    )
    op.alter_column(
        "warehouse_products",
        "quantity",
        type_=sa.Numeric(12, 3),
        existing_type=sa.Integer(),
        postgresql_using="quantity::numeric(12,3)",
    )
    op.alter_column(
        "stock_movements",
        "change",
        type_=sa.Numeric(12, 3),
        existing_type=sa.Integer(),
        postgresql_using="change::numeric(12,3)",
    )


def downgrade() -> None:
    op.alter_column(
        "stock_movements",
        "change",
        type_=sa.Integer(),
        existing_type=sa.Numeric(12, 3),
        postgresql_using="change::integer",
    )
    op.alter_column(
        "warehouse_products",
        "quantity",
        type_=sa.Integer(),
        existing_type=sa.Numeric(12, 3),
        postgresql_using="quantity::integer",
    )
    op.drop_column("warehouse_products", "unit")
