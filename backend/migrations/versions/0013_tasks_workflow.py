"""rework tasks: priority, dates, review workflow

Revision ID: 0013_tasks_workflow
Revises: 0012_tasks
Create Date: 2026-07-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0013_tasks_workflow"
down_revision: Union[str, None] = "0012_tasks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("priority", sa.String(length=10), nullable=False, server_default="medium"))
    op.add_column(
        "tasks",
        sa.Column("checked_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )
    op.add_column("tasks", sa.Column("start_date", sa.Date(), nullable=True))
    op.add_column("tasks", sa.Column("due_date", sa.Date(), nullable=True))
    op.add_column("tasks", sa.Column("completed_at", sa.Date(), nullable=True))

    # Backfill existing rows (if any) with sane defaults so we can make the
    # date columns non-nullable going forward.
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE tasks SET start_date = created_at::date, due_date = created_at::date + interval '7 days' "
            "WHERE start_date IS NULL"
        )
    )
    op.alter_column("tasks", "start_date", nullable=False)
    op.alter_column("tasks", "due_date", nullable=False)

    # assignee_id becomes required (group/"everyone" assignments now expand
    # into one row per person at creation time instead of a nullable pool).
    conn.execute(sa.text("DELETE FROM tasks WHERE assignee_id IS NULL"))
    op.alter_column("tasks", "assignee_id", nullable=False)


def downgrade() -> None:
    op.alter_column("tasks", "assignee_id", nullable=True)
    op.drop_column("tasks", "completed_at")
    op.drop_column("tasks", "due_date")
    op.drop_column("tasks", "start_date")
    op.drop_column("tasks", "checked_by")
    op.drop_column("tasks", "priority")
