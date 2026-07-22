"""add password reset fields and direct conversation approval

Revision ID: 0016_reset_and_dm_approval
Revises: 0015_email_verify_google
Create Date: 2026-07-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0016_reset_and_dm_approval"
down_revision: Union[str, None] = "0015_email_verify_google"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("reset_token", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("reset_token_expires", sa.DateTime(timezone=True), nullable=True))

    # Existing direct-conversation members are grandfathered in as approved.
    op.add_column(
        "direct_conversation_members",
        sa.Column("approved", sa.Boolean(), nullable=False, server_default="true"),
    )


def downgrade() -> None:
    op.drop_column("direct_conversation_members", "approved")
    op.drop_column("users", "reset_token_expires")
    op.drop_column("users", "reset_token")
