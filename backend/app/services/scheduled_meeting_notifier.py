"""Polls for due scheduled meetings and fires in-app notifications."""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.db.database import async_session
from app.models.company import Company, TeamMembership
from app.models.notification import Notification
from app.models.scheduled_meeting import ScheduledMeeting
from app.models.user import User
from app.services.notify import ping_notifications

logger = logging.getLogger(__name__)
POLL_SECONDS = 15


async def _fire_due_meetings() -> int:
    now = datetime.now(timezone.utc)
    fired = 0
    async with async_session() as db:
        result = await db.execute(
            select(ScheduledMeeting).where(
                ScheduledMeeting.status == "scheduled",
                ScheduledMeeting.starts_at <= now,
            )
        )
        meetings = result.scalars().all()
        if not meetings:
            return 0

        for meeting in meetings:
            company = (
                await db.execute(select(Company).where(Company.id == meeting.company_id))
            ).scalar_one_or_none()
            creator = (
                await db.execute(select(User).where(User.id == meeting.created_by))
            ).scalar_one_or_none()
            creator_name = creator.full_name if creator else "Hamkasb"
            company_name = company.name if company else "Kompaniya"
            topic = (meeting.description or meeting.title).strip()
            preview = topic[:120] + ("…" if len(topic) > 120 else "")

            members_result = await db.execute(
                select(TeamMembership.user_id).where(
                    TeamMembership.company_id == meeting.company_id,
                    TeamMembership.approved == True,  # noqa: E712
                )
            )
            member_ids = [str(uid) for (uid,) in members_result.all()]
            if str(meeting.created_by) not in member_ids:
                member_ids.append(str(meeting.created_by))

            message = (
                f"Vaqti keldi: {meeting.title} — {company_name}. "
                f"{creator_name} belgilagan uchrashuv. "
                f"{('Mavzu: ' + preview) if preview else ''}"
            ).strip()

            for uid in member_ids:
                db.add(
                    Notification(
                        user_id=uid,
                        type="scheduled_meeting",
                        message=message[:500],
                        company_id=meeting.company_id,
                        related_user_id=meeting.created_by,
                        invite_token=str(meeting.id),
                    )
                )

            meeting.status = "notified"
            meeting.notified_at = now
            fired += 1

        await db.commit()

        # ping after commit
        for meeting in meetings:
            members_result = await db.execute(
                select(TeamMembership.user_id).where(
                    TeamMembership.company_id == meeting.company_id,
                    TeamMembership.approved == True,  # noqa: E712
                )
            )
            member_ids = {str(uid) for (uid,) in members_result.all()}
            member_ids.add(str(meeting.created_by))
            for uid in member_ids:
                await ping_notifications(uid)

    return fired


async def scheduled_meeting_loop() -> None:
    logger.info("Scheduled meeting notifier started (every %ss)", POLL_SECONDS)
    while True:
        try:
            count = await _fire_due_meetings()
            if count:
                logger.info("Fired %s scheduled meeting notification(s)", count)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Scheduled meeting notifier tick failed")
        await asyncio.sleep(POLL_SECONDS)
