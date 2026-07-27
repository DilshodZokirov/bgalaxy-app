"""multi-warehouse per company (max 3, unique types)

Revision ID: 0037_multi_warehouses
Revises: 0036_pin_reset_token
Create Date: 2026-07-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0037_multi_warehouses"
down_revision: Union[str, None] = "0036_pin_reset_token"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TYPE_NAMES = {
    "technology": "Texnologiya ombori",
    "clothing": "Kiyim-kechak ombori",
    "food": "Oziq-ovqat ombori",
}


def upgrade() -> None:
    op.create_table(
        "warehouses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("warehouse_type", sa.String(length=30), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("company_id", "warehouse_type", name="uq_warehouses_company_type"),
    )
    op.create_index("ix_warehouses_company_id", "warehouses", ["company_id"])

    op.add_column(
        "warehouse_products",
        sa.Column("warehouse_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_warehouse_products_warehouse_id",
        "warehouse_products",
        "warehouses",
        ["warehouse_id"],
        ["id"],
    )
    op.create_index("ix_warehouse_products_warehouse_id", "warehouse_products", ["warehouse_id"])

    conn = op.get_bind()
    companies = conn.execute(
        sa.text(
            """
            SELECT id, warehouse_type
            FROM companies
            WHERE has_warehouse IS TRUE
              AND warehouse_type IS NOT NULL
              AND warehouse_type IN ('technology', 'clothing', 'food')
            """
        )
    ).fetchall()

    for company_id, warehouse_type in companies:
        wh_id = str(__import__("uuid").uuid4())
        name = TYPE_NAMES.get(warehouse_type, warehouse_type)
        conn.execute(
            sa.text(
                """
                INSERT INTO warehouses (id, company_id, warehouse_type, name)
                VALUES (CAST(:id AS uuid), CAST(:company_id AS uuid), :warehouse_type, :name)
                """
            ),
            {
                "id": wh_id,
                "company_id": str(company_id),
                "warehouse_type": warehouse_type,
                "name": name,
            },
        )
        conn.execute(
            sa.text(
                """
                UPDATE warehouse_products
                SET warehouse_id = CAST(:wh_id AS uuid)
                WHERE company_id = CAST(:company_id AS uuid)
                  AND warehouse_id IS NULL
                """
            ),
            {"wh_id": wh_id, "company_id": str(company_id)},
        )


def downgrade() -> None:
    op.drop_index("ix_warehouse_products_warehouse_id", table_name="warehouse_products")
    op.drop_constraint("fk_warehouse_products_warehouse_id", "warehouse_products", type_="foreignkey")
    op.drop_column("warehouse_products", "warehouse_id")
    op.drop_index("ix_warehouses_company_id", table_name="warehouses")
    op.drop_table("warehouses")
