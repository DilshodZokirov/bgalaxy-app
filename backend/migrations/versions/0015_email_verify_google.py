"""add email verification and google oauth fields to users

Revision ID: 0015_email_verify_google
Revises: 0014_direct_chat
Create Date: 2026-07-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0015_email_verify_google"
down_revision: Union[str, None] = "0014_direct_chat"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=True)
    # Existing accounts are grandfathered in as verified so nobody who
    # already used the app gets locked out by the new requirement.
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("users", sa.Column("verification_token", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("google_id", sa.String(length=255), nullable=True, unique=True))


def downgrade() -> None:
    op.drop_column("users", "google_id")
    op.drop_column("users", "verification_token")
    op.drop_column("users", "email_verified")
    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=False)
