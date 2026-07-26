"""add contact_email to complaints

Revision ID: 0034_complaint_contact_email
Revises: 0033_task_comments
Create Date: 2026-07-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0034_complaint_contact_email"
down_revision: Union[str, None] = "0033_task_comments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "complaints",
        sa.Column("contact_email", sa.String(length=255), nullable=True),
    )
    # Backfill from linked user account email for existing rows.
    op.execute(
        """
        UPDATE complaints AS c
        SET contact_email = u.email
        FROM users AS u
        WHERE c.user_id = u.id
          AND (c.contact_email IS NULL OR c.contact_email = '')
        """
    )
    op.alter_column("complaints", "contact_email", nullable=False)


def downgrade() -> None:
    op.drop_column("complaints", "contact_email")
