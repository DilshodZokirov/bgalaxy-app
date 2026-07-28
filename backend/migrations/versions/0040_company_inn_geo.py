"""company INN + geo coordinates for delivery maps

Revision ID: 0040_company_inn_geo
Revises: 0039_company_location_brand
Create Date: 2026-07-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0040_company_inn_geo"
down_revision: Union[str, None] = "0039_company_location_brand"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("inn", sa.String(length=20), nullable=True))
    op.add_column("companies", sa.Column("latitude", sa.Numeric(10, 7), nullable=True))
    op.add_column("companies", sa.Column("longitude", sa.Numeric(10, 7), nullable=True))
    op.add_column("companies", sa.Column("geo_label", sa.String(length=500), nullable=True))
    op.create_index("ix_companies_inn", "companies", ["inn"])


def downgrade() -> None:
    op.drop_index("ix_companies_inn", table_name="companies")
    op.drop_column("companies", "geo_label")
    op.drop_column("companies", "longitude")
    op.drop_column("companies", "latitude")
    op.drop_column("companies", "inn")
