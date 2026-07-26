from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.company import Company, TeamMembership
from app.models.notification import Notification
from app.models.scheduled_meeting import ScheduledMeeting
from app.models.user import User
from app.schemas.scheduled_meeting import (
    ScheduledMeetingCreate,
    ScheduledMeetingOut,
    ScheduledMeetingUpdate,
)
from app.services.notify import ping_notifications

router = APIRouter(prefix="/scheduled-meetings", tags=["scheduled-meetings"])

VISIBLE_STATUSES = ("scheduled", "notified")


async def _require_company_member(db: AsyncSession, company_id, user_id) -> None:
    result = await db.execute(
        select(TeamMembership).where(
            TeamMembership.company_id == company_id,
            TeamMembership.user_id == user_id,
            TeamMembership.approved == True,  # noqa: E712
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Kompaniya aʼzosi emassiz")


async def _to_out(db: AsyncSession, meeting: ScheduledMeeting) -> ScheduledMeetingOut:
    company = (await db.execute(select(Company).where(Company.id == meeting.company_id))).scalar_one_or_none()
    creator = (await db.execute(select(User).where(User.id == meeting.created_by))).scalar_one_or_none()
    return ScheduledMeetingOut(
        id=meeting.id,
        company_id=meeting.company_id,
        created_by=meeting.created_by,
        creator_name=creator.full_name if creator else "",
        company_name=company.name if company else "",
        title=meeting.title,
        description=meeting.description or "",
        starts_at=meeting.starts_at,
        status=meeting.status,
        notified_at=meeting.notified_at,
        created_at=meeting.created_at,
    )


@router.get("", response_model=list[ScheduledMeetingOut])
async def list_my_scheduled_meetings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Active upcoming meetings for companies the user belongs to."""
    memberships = await db.execute(
        select(TeamMembership.company_id).where(
            TeamMembership.user_id == current_user.id,
            TeamMembership.approved == True,  # noqa: E712
        )
    )
    company_ids = [cid for (cid,) in memberships.all()]
    if not company_ids:
        return []

    result = await db.execute(
        select(ScheduledMeeting)
        .where(
            ScheduledMeeting.company_id.in_(company_ids),
            ScheduledMeeting.status.in_(VISIBLE_STATUSES),
        )
        .order_by(ScheduledMeeting.starts_at.asc())
    )
    meetings = result.scalars().all()
    return [await _to_out(db, m) for m in meetings]


@router.post("", response_model=ScheduledMeetingOut, status_code=201)
async def create_scheduled_meeting(
    payload: ScheduledMeetingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_company_member(db, payload.company_id, current_user.id)

    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Sarlavha kiriting")

    starts_at = payload.starts_at
    if starts_at.tzinfo is None:
        starts_at = starts_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    if starts_at <= now:
        raise HTTPException(status_code=400, detail="Uchrashuv vaqti kelajakda bo‘lishi kerak")

    meeting = ScheduledMeeting(
        company_id=payload.company_id,
        created_by=current_user.id,
        title=title,
        description=(payload.description or "").strip(),
        starts_at=starts_at,
        status="scheduled",
    )
    db.add(meeting)
    await db.flush()

    members_result = await db.execute(
        select(TeamMembership.user_id).where(
            TeamMembership.company_id == payload.company_id,
            TeamMembership.approved == True,  # noqa: E712
        )
    )
    member_ids = [str(uid) for (uid,) in members_result.all() if str(uid) != str(current_user.id)]
    local_label = starts_at.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    topic = (meeting.description or meeting.title)[:80]
    for uid in member_ids:
        db.add(
            Notification(
                user_id=uid,
                type="scheduled_meeting_booked",
                message=(
                    f"{current_user.full_name} uchrashuv belgiladi: {meeting.title} "
                    f"({local_label}). Mavzu: {topic}"
                )[:500],
                company_id=payload.company_id,
                related_user_id=current_user.id,
                invite_token=str(meeting.id),
            )
        )

    await db.commit()
    await db.refresh(meeting)
    for uid in member_ids:
        await ping_notifications(uid)

    return await _to_out(db, meeting)


@router.patch("/{meeting_id}", response_model=ScheduledMeetingOut)
async def update_scheduled_meeting(
    meeting_id: str,
    payload: ScheduledMeetingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ScheduledMeeting).where(ScheduledMeeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Uchrashuv topilmadi")
    if str(meeting.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat yaratuvchi o‘zgartira oladi")
    if meeting.status not in VISIBLE_STATUSES:
        raise HTTPException(status_code=400, detail="Bu uchrashuvni endi o‘zgartirib bo‘lmaydi")

    if payload.title is not None:
        title = payload.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Sarlavha kiriting")
        meeting.title = title

    if payload.description is not None:
        meeting.description = payload.description.strip()

    if payload.starts_at is not None:
        starts_at = payload.starts_at
        if starts_at.tzinfo is None:
            starts_at = starts_at.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if starts_at <= now:
            raise HTTPException(status_code=400, detail="Uchrashuv vaqti kelajakda bo‘lishi kerak")
        meeting.starts_at = starts_at
        # Reschedule → wait for notifier again.
        meeting.status = "scheduled"
        meeting.notified_at = None

    await db.commit()
    await db.refresh(meeting)
    return await _to_out(db, meeting)


@router.delete("/{meeting_id}", status_code=204)
async def cancel_scheduled_meeting(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ScheduledMeeting).where(ScheduledMeeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Uchrashuv topilmadi")
    if str(meeting.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat yaratuvchi bekor qila oladi")
    if meeting.status not in VISIBLE_STATUSES:
        raise HTTPException(status_code=400, detail="Bu uchrashuv allaqachon yopilgan")
    meeting.status = "cancelled"
    await db.commit()


@router.get("/{meeting_id}", response_model=ScheduledMeetingOut)
async def get_scheduled_meeting(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ScheduledMeeting).where(ScheduledMeeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Uchrashuv topilmadi")
    await _require_company_member(db, meeting.company_id, current_user.id)
    return await _to_out(db, meeting)
