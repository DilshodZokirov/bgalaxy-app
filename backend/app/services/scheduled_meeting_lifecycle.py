"""Complete / clear scheduled meetings when a group call ends."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.scheduled_meeting import ScheduledMeeting

ACTIVE_STATUSES = ("scheduled", "notified")


async def complete_scheduled_meetings_for_company(
    db: AsyncSession,
    company_id: str | UUID,
    scheduled_meeting_id: str | None = None,
) -> int:
    """Mark due/active scheduled meetings as completed so banners disappear.

    If ``scheduled_meeting_id`` is provided (join from banner/hub), that row is
    completed even when started early. Otherwise only meetings that are already
    due (`notified` or ``starts_at <= now``) are completed.
    """
    completed = 0

    if scheduled_meeting_id:
        result = await db.execute(
            select(ScheduledMeeting).where(ScheduledMeeting.id == scheduled_meeting_id)
        )
        meeting = result.scalar_one_or_none()
        if (
            meeting is not None
            and str(meeting.company_id) == str(company_id)
            and meeting.status in ACTIVE_STATUSES
        ):
            meeting.status = "completed"
            completed = 1
            await db.commit()
        return completed

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(ScheduledMeeting).where(
            ScheduledMeeting.company_id == company_id,
            ScheduledMeeting.status.in_(ACTIVE_STATUSES),
            or_(
                ScheduledMeeting.status == "notified",
                ScheduledMeeting.starts_at <= now,
            ),
        )
    )
    rows = result.scalars().all()
    for meeting in rows:
        meeting.status = "completed"
        completed += 1
    if completed:
        await db.commit()
    return completed