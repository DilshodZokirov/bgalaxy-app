"""company location + logo_url Text for brand images

Revision ID: 0039_company_location_brand
Revises: 0038_order_pipeline
Create Date: 2026-07-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0039_company_location_brand"
down_revision: Union[str, None] = "0038_order_pipeline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "companies",
        "logo_url",
        existing_type=sa.String(length=500),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.add_column("companies", sa.Column("location_region", sa.String(length=100), nullable=True))
    op.add_column("companies", sa.Column("location_address", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("companies", "location_address")
    op.drop_column("companies", "location_region")
    op.alter_column(
        "companies",
        "logo_url",
        existing_type=sa.Text(),
        type_=sa.String(length=500),
        existing_nullable=True,
    )
