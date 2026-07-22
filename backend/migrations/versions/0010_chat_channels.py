"""add chat channels

Revision ID: 0010_chat_channels
Revises: 0009_notif_invite_token
Create Date: 2026-07-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0010_chat_channels"
down_revision: Union[str, None] = "0009_notif_invite_token"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chat_channels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "chat_channel_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("channel_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chat_channels.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.add_column(
        "messages",
        sa.Column("channel_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chat_channels.id"), nullable=True),
    )
    op.add_column("messages", sa.Column("edited", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("messages", sa.Column("deleted", sa.Boolean(), nullable=False, server_default="false"))

    # Data migration: give every existing company a default "Umumiy" channel
    # containing all of its current members, and point existing messages at it.
    conn = op.get_bind()
    companies = conn.execute(sa.text("SELECT id, owner_id FROM companies")).fetchall()
    for company_id, owner_id in companies:
        channel_id = conn.execute(
            sa.text(
                "INSERT INTO chat_channels (id, company_id, name, created_by, created_at) "
                "VALUES (gen_random_uuid(), :company_id, 'Umumiy', :owner_id, now()) RETURNING id"
            ),
            {"company_id": company_id, "owner_id": owner_id},
        ).scalar()

        members = conn.execute(
            sa.text("SELECT DISTINCT user_id FROM team_memberships WHERE company_id = :company_id"),
            {"company_id": company_id},
        ).fetchall()
        for (user_id,) in members:
            conn.execute(
                sa.text(
                    "INSERT INTO chat_channel_members (id, channel_id, user_id, added_at) "
                    "VALUES (gen_random_uuid(), :channel_id, :user_id, now())"
                ),
                {"channel_id": channel_id, "user_id": user_id},
            )

        conn.execute(
            sa.text("UPDATE messages SET channel_id = :channel_id WHERE company_id = :company_id"),
            {"channel_id": channel_id, "company_id": company_id},
        )


def downgrade() -> None:
    op.drop_column("messages", "deleted")
    op.drop_column("messages", "edited")
    op.drop_column("messages", "channel_id")
    op.drop_table("chat_channel_members")
    op.drop_table("chat_channels")
