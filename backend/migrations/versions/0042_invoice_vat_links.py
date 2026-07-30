"""invoice number, VAT, linked payment transactions

Revision ID: 0042_invoice_vat_links
Revises: 0041_marketplace_cart_ratings
Create Date: 2026-07-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0042_invoice_vat_links"
down_revision: Union[str, None] = "0041_marketplace_cart_ratings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("invoices", sa.Column("invoice_number", sa.String(length=40), nullable=True))
    op.add_column(
        "invoices",
        sa.Column("vat_rate", sa.Numeric(5, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "invoices",
        sa.Column("subtotal_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "invoices",
        sa.Column("vat_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
    )

    # Backfill: INV-YYYY-XXXX + subtotal = total, vat = 0
    op.execute(
        """
        WITH numbered AS (
          SELECT id,
                 issue_date,
                 total_amount,
                 ROW_NUMBER() OVER (
                   PARTITION BY company_id, EXTRACT(YEAR FROM issue_date)
                   ORDER BY created_at, id
                 ) AS rn
          FROM invoices
        )
        UPDATE invoices i
        SET invoice_number = 'INV-' || EXTRACT(YEAR FROM n.issue_date)::int || '-' || LPAD(n.rn::text, 4, '0'),
            subtotal_amount = n.total_amount,
            vat_amount = 0,
            vat_rate = 0
        FROM numbered n
        WHERE i.id = n.id
        """
    )

    op.alter_column("invoices", "invoice_number", nullable=False)
    op.create_index("ix_invoices_company_number", "invoices", ["company_id", "invoice_number"], unique=True)

    op.add_column(
        "transactions",
        sa.Column("source_invoice_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "transactions",
        sa.Column("source_payroll_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_transactions_source_invoice",
        "transactions",
        "invoices",
        ["source_invoice_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_transactions_source_payroll",
        "transactions",
        "payroll_entries",
        ["source_payroll_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_transactions_source_invoice", "transactions", ["source_invoice_id"], unique=False)
    op.create_index("ix_transactions_source_payroll", "transactions", ["source_payroll_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_transactions_source_payroll", table_name="transactions")
    op.drop_index("ix_transactions_source_invoice", table_name="transactions")
    op.drop_constraint("fk_transactions_source_payroll", "transactions", type_="foreignkey")
    op.drop_constraint("fk_transactions_source_invoice", "transactions", type_="foreignkey")
    op.drop_column("transactions", "source_payroll_id")
    op.drop_column("transactions", "source_invoice_id")
    op.drop_index("ix_invoices_company_number", table_name="invoices")
    op.drop_column("invoices", "vat_amount")
    op.drop_column("invoices", "subtotal_amount")
    op.drop_column("invoices", "vat_rate")
    op.drop_column("invoices", "invoice_number")
