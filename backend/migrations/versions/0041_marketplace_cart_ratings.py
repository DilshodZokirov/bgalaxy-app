"""marketplace listing, cart batch_id, company ratings

Revision ID: 0041_marketplace_cart_ratings
Revises: 0040_company_inn_geo
Create Date: 2026-07-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0041_marketplace_cart_ratings"
down_revision: Union[str, None] = "0040_company_inn_geo"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "warehouse_products",
        sa.Column("listed_on_marketplace", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    # Stock bought via marketplace (has source) stays off market until seller lists it
    op.execute(
        """
        UPDATE warehouse_products
        SET listed_on_marketplace = false
        WHERE source_company_id IS NOT NULL
        """
    )

    op.add_column(
        "warehouse_orders",
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_warehouse_orders_batch_id", "warehouse_orders", ["batch_id"])

    op.create_table(
        "company_ratings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("rater_company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("rated_company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("warehouse_orders.id"), nullable=False),
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("rater_company_id", "order_id", name="uq_company_ratings_rater_order"),
    )
    op.create_index("ix_company_ratings_rated", "company_ratings", ["rated_company_id"])
    op.create_index("ix_company_ratings_rater", "company_ratings", ["rater_company_id"])


def downgrade() -> None:
    op.drop_index("ix_company_ratings_rater", table_name="company_ratings")
    op.drop_index("ix_company_ratings_rated", table_name="company_ratings")
    op.drop_table("company_ratings")
    op.drop_index("ix_warehouse_orders_batch_id", table_name="warehouse_orders")
    op.drop_column("warehouse_orders", "batch_id")
    op.drop_column("warehouse_products", "listed_on_marketplace")
