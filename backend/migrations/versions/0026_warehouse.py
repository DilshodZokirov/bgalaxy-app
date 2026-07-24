"""add warehouse module (company enablement + products + stock movements)

Revision ID: 0026_warehouse
Revises: 0025_conversation_channel
Create Date: 2026-07-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0026_warehouse"
down_revision: Union[str, None] = "0025_conversation_channel"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("has_warehouse", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("companies", sa.Column("warehouse_type", sa.String(length=30), nullable=True))

    op.create_table(
        "warehouse_products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("price", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("size", sa.String(length=50), nullable=True),
        sa.Column("color", sa.String(length=50), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("sku", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "stock_movements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("warehouse_products.id"), nullable=False
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("change", sa.Integer(), nullable=False),
        sa.Column("note", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("stock_movements")
    op.drop_table("warehouse_products")
    op.drop_column("companies", "warehouse_type")
    op.drop_column("companies", "has_warehouse")
