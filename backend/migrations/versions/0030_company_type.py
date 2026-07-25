"""add company_type to companies

Revision ID: 0030_company_type
Revises: 0029_warehouse_threshold
Create Date: 2026-07-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0030_company_type"
down_revision: Union[str, None] = "0029_warehouse_threshold"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "companies", sa.Column("company_type", sa.String(length=20), nullable=False, server_default="kompaniya")
    )


def downgrade() -> None:
    op.drop_column("companies", "company_type")
