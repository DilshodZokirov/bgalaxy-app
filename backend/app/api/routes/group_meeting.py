from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.models.company import TeamMembership
from app.models.notification import Notification
from app.models.user import User
from app.services.notify import ping_notifications
from app.services.permissions import require_permission
from app.services import livekit_admin

router = APIRouter(prefix="/companies/{company_id}/group-call", tags=["group-call"])

# Tracks the last time we notified the company about a fresh group call, so
# joining an ALREADY-active call doesn't re-notify everyone — only treated
# as a new "meeting started" event if nobody's joined in a while.
_last_notified: dict[str, datetime] = {}
NOTIFY_COOLDOWN = timedelta(minutes=5)


@router.post("/token")
async def get_group_call_token(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.livekit_api_key or not settings.livekit_api_secret or not settings.livekit_url:
        raise HTTPException(
            status_code=503,
            detail="Guruh uchrashuvlari hali sozlanmagan — backend .env fayliga LIVEKIT_API_KEY, "
            "LIVEKIT_API_SECRET va LIVEKIT_URL qo'shing.",
        )

    await require_permission(db, company_id, current_user.id, "start_meeting")

    now = datetime.now(timezone.utc)
    last = _last_notified.get(company_id)
    if last is None or now - last > NOTIFY_COOLDOWN:
        _last_notified[company_id] = now
        members_result = await db.execute(
            select(TeamMembership.user_id).where(
                TeamMembership.company_id == company_id, TeamMembership.approved == True  # noqa: E712
            )
        )
        member_ids = [str(uid) for (uid,) in members_result.all() if str(uid) != str(current_user.id)]
        for member_id in member_ids:
            db.add(
                Notification(
                    user_id=member_id,
                    type="group_call_started",
                    message=f"{current_user.full_name} guruh uchrashuvini boshladi.",
                    related_user_id=current_user.id,
                    company_id=company_id,
                )
            )
        await db.commit()
        for member_id in member_ids:
            await ping_notifications(member_id)

    from livekit import api as livekit_api

    room_name = f"company-{company_id}"
    token = (
        livekit_api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(str(current_user.id))
        .with_name(current_user.full_name)
        .with_grants(
            livekit_api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )
        )
    )

    return {"token": token.to_jwt(), "url": settings.livekit_url, "room_name": room_name}


@router.get("/active")
async def get_active_group_call(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lets the Uchrashuvlar hub show "this company has an ongoing group
    call, tap to rejoin" instead of only ever offering to start a fresh
    one."""
    await require_permission(db, company_id, current_user.id, "start_meeting")
    room_name = f"company-{company_id}"
    participants = await livekit_admin.list_room_participants(room_name)
    return {
        "active": len(participants) > 0,
        "room_name": room_name,
        "participants": [{"identity": p["identity"], "name": p["name"]} for p in participants],
    }


@router.post("/mute/{user_id}")
async def mute_group_call_participant(
    company_id: str,
    user_id: str,
    kind: str = "audio",
    muted: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Host controls — requires host_meeting_controls, same as the office
    used to grant only to Admin/Menejer by default. Works on the shared
    company-wide room only (partner meetings have their own version of
    this, gated on being the meeting's starter instead)."""
    if kind not in ("audio", "video"):
        raise HTTPException(status_code=400, detail="kind 'audio' yoki 'video' bo'lishi kerak")
    await require_permission(db, company_id, current_user.id, "host_meeting_controls")

    room_name = f"company-{company_id}"
    ok = await livekit_admin.mute_participant_track(room_name, user_id, kind, muted)
    if not ok:
        raise HTTPException(status_code=404, detail="Foydalanuvchi xonada topilmadi yoki mos trek yo'q")
    return {"muted": muted, "kind": kind}
