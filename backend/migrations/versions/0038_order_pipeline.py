"""order pipeline stages + reserved stock for marketplace

Revision ID: 0038_order_pipeline
Revises: 0037_multi_warehouses
Create Date: 2026-07-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import table, column

revision: str = "0038_order_pipeline"
down_revision: Union[str, None] = "0037_multi_warehouses"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "warehouse_products",
        sa.Column("reserved_quantity", sa.Numeric(12, 3), nullable=False, server_default="0"),
    )

    op.add_column(
        "warehouse_orders",
        sa.Column("status", sa.String(length=30), nullable=False, server_default="completed"),
    )
    op.add_column(
        "warehouse_orders",
        sa.Column("buyer_warehouse_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column("warehouse_orders", sa.Column("status_note", sa.String(length=255), nullable=True))
    op.add_column(
        "warehouse_orders",
        sa.Column("courier_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "warehouse_orders",
        sa.Column("loaded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "warehouse_orders",
        sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "warehouse_orders",
        sa.Column("courier_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "warehouse_orders",
        sa.Column("arrived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "warehouse_orders",
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_warehouse_orders_buyer_warehouse",
        "warehouse_orders",
        "warehouses",
        ["buyer_warehouse_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_warehouse_orders_courier_user",
        "warehouse_orders",
        "users",
        ["courier_user_id"],
        ["id"],
    )
    op.create_index("ix_warehouse_orders_status", "warehouse_orders", ["status"])

    # Existing historical orders are treated as already completed.
    op.execute("UPDATE warehouse_orders SET status = 'completed', completed_at = created_at WHERE completed_at IS NULL")

    # Merge new permission keys into existing roles JSON (works for JSON/JSONB).
    roles = table(
        "roles",
        column("id", postgresql.UUID(as_uuid=True)),
        column("name", sa.String),
        column("permissions", sa.JSON),
    )
    conn = op.get_bind()
    rows = conn.execute(sa.select(roles.c.id, roles.c.name, roles.c.permissions)).fetchall()
    for role_id, name, perms in rows:
        updated = dict(perms or {})
        updated.setdefault("warehouse_loader", False)
        updated.setdefault("warehouse_courier", False)
        if name in ("Admin", "Menejer"):
            updated["warehouse_loader"] = True
            updated["warehouse_courier"] = True
        conn.execute(roles.update().where(roles.c.id == role_id).values(permissions=updated))


def downgrade() -> None:
    op.drop_index("ix_warehouse_orders_status", table_name="warehouse_orders")
    op.drop_constraint("fk_warehouse_orders_courier_user", "warehouse_orders", type_="foreignkey")
    op.drop_constraint("fk_warehouse_orders_buyer_warehouse", "warehouse_orders", type_="foreignkey")
    op.drop_column("warehouse_orders", "completed_at")
    op.drop_column("warehouse_orders", "arrived_at")
    op.drop_column("warehouse_orders", "courier_accepted_at")
    op.drop_column("warehouse_orders", "dispatched_at")
    op.drop_column("warehouse_orders", "loaded_at")
    op.drop_column("warehouse_orders", "courier_user_id")
    op.drop_column("warehouse_orders", "status_note")
    op.drop_column("warehouse_orders", "buyer_warehouse_id")
    op.drop_column("warehouse_orders", "status")
    op.drop_column("warehouse_products", "reserved_quantity")
