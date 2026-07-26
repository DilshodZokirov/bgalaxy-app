"""add distributor marketplace: source tracking on products + warehouse_orders

Revision ID: 0031_warehouse_marketplace
Revises: 0030_company_type
Create Date: 2026-07-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0031_warehouse_marketplace"
down_revision: Union[str, None] = "0030_company_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "warehouse_products",
        sa.Column("source_company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=True),
    )
    op.add_column("warehouse_products", sa.Column("source_company_name", sa.String(length=255), nullable=True))

    op.create_table(
        "warehouse_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("buyer_company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("seller_company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column(
            "seller_product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("warehouse_products.id"), nullable=False
        ),
        sa.Column("product_name", sa.String(length=255), nullable=False),
        sa.Column("unit", sa.String(length=10), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 3), nullable=False),
        sa.Column("unit_price", sa.Numeric(14, 2), nullable=False),
        sa.Column("total_price", sa.Numeric(14, 2), nullable=False),
        sa.Column("ordered_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("warehouse_orders")
    op.drop_column("warehouse_products", "source_company_name")
    op.drop_column("warehouse_products", "source_company_id")
