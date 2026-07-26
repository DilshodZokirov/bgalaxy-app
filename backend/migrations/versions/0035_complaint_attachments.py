"""add attachments JSON to complaints

Revision ID: 0035_complaint_attachments
Revises: 0034_complaint_contact_email
Create Date: 2026-07-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0035_complaint_attachments"
down_revision: Union[str, None] = "0034_complaint_contact_email"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "complaints",
        sa.Column("attachments", sa.JSON(), nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("complaints", "attachments")
