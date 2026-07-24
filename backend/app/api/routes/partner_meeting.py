import uuid as uuid_lib

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.services.notify import ping_notifications
from app.services import livekit_admin

router = APIRouter(prefix="/partner-meetings", tags=["partner-meetings"])

# Tracks who is allowed into each ad-hoc partner room, and who started it
# (the only person allowed to mute/unmute others there). In-memory is fine
# here — same pattern as the 1-1 call state in meetings.py.
_partner_rooms: dict[str, dict] = {}  # room_name -> {"allowed": set[str], "host": str}


def _require_livekit_configured() -> None:
    if not settings.livekit_api_key or not settings.livekit_api_secret or not settings.livekit_url:
        raise HTTPException(
            status_code=503,
            detail="Guruh/hamkor uchrashuvlari hali sozlanmagan — backend .env fayliga "
            "LIVEKIT_API_KEY, LIVEKIT_API_SECRET va LIVEKIT_URL qo'shing.",
        )


def _make_token(room_name: str, user_id: str, full_name: str) -> str:
    from livekit import api as livekit_api

    token = (
        livekit_api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(str(user_id))
        .with_name(full_name)
        .with_grants(
            livekit_api.VideoGrants(room_join=True, room=room_name, can_publish=True, can_subscribe=True)
        )
    )
    return token.to_jwt()


@router.post("/start")
async def start_partner_meeting(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_livekit_configured()

    partner_ids = payload.get("partner_ids") or ([payload["partner_id"]] if payload.get("partner_id") else [])
    partner_ids = [str(pid) for pid in partner_ids if str(pid) != str(current_user.id)]
    if not partner_ids:
        raise HTTPException(status_code=400, detail="Kamida bitta hamkor tanlang")

    result = await db.execute(select(User).where(User.id.in_(partner_ids)))
    partners = result.scalars().all()
    if len(partners) != len(set(partner_ids)):
        raise HTTPException(status_code=404, detail="Tanlangan foydalanuvchilardan biri topilmadi")

    room_name = f"partner-{uuid_lib.uuid4().hex[:12]}"
    _partner_rooms[room_name] = {
        "allowed": {str(current_user.id)} | {str(p.id) for p in partners},
        "host": str(current_user.id),
    }

    partner_names = ", ".join(p.full_name for p in partners)
    for partner in partners:
        db.add(
            Notification(
                user_id=partner.id,
                type="partner_call",
                message=f"{current_user.full_name} siz bilan video orqali bog'lanmoqchi"
                + (f" ({partner_names} bilan birga)." if len(partners) > 1 else "."),
                related_user_id=current_user.id,
                invite_token=room_name,
            )
        )
    await db.commit()
    for partner in partners:
        await ping_notifications(partner.id)

    return {"room_name": room_name}


@router.post("/join")
async def join_partner_meeting(
    payload: dict = Body(...),
    current_user: User = Depends(get_current_user),
):
    _require_livekit_configured()

    room_name = payload.get("room_name")
    room = _partner_rooms.get(room_name or "", {})
    allowed = room.get("allowed", set())
    if not room_name or str(current_user.id) not in allowed:
        raise HTTPException(status_code=403, detail="Bu xonaga kirish huquqingiz yo'q")

    token = _make_token(room_name, current_user.id, current_user.full_name)
    return {"token": token, "url": settings.livekit_url, "room_name": room_name}


@router.post("/{room_name}/add")
async def add_to_partner_meeting(
    room_name: str,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_livekit_configured()

    room = _partner_rooms.get(room_name)
    allowed = room.get("allowed") if room else None
    if allowed is None or str(current_user.id) not in allowed:
        raise HTTPException(status_code=403, detail="Siz shu uchrashuvda emassiz")

    partner_ids = [str(pid) for pid in (payload.get("partner_ids") or []) if str(pid) not in allowed]
    if not partner_ids:
        raise HTTPException(status_code=400, detail="Qo'shiladigan yangi odam yo'q")

    result = await db.execute(select(User).where(User.id.in_(partner_ids)))
    new_partners = result.scalars().all()
    if len(new_partners) != len(set(partner_ids)):
        raise HTTPException(status_code=404, detail="Tanlangan foydalanuvchilardan biri topilmadi")

    allowed.update(str(p.id) for p in new_partners)

    for partner in new_partners:
        db.add(
            Notification(
                user_id=partner.id,
                type="partner_call",
                message=f"{current_user.full_name} sizni davom etayotgan video uchrashuvga taklif qildi.",
                related_user_id=current_user.id,
                invite_token=room_name,
            )
        )
    await db.commit()
    for partner in new_partners:
        await ping_notifications(partner.id)

    return {"added": [p.full_name for p in new_partners]}


@router.get("/active")
async def list_active_partner_meetings(current_user: User = Depends(get_current_user)):
    """Rooms the current user is part of that have someone in them right
    now — lets the Uchrashuvlar hub offer "rejoin" instead of only ever
    starting brand new calls."""
    my_id = str(current_user.id)
    active = []
    for room_name, room in _partner_rooms.items():
        if my_id not in room.get("allowed", set()):
            continue
        participants = await livekit_admin.list_room_participants(room_name)
        if participants:
            active.append(
                {
                    "room_name": room_name,
                    "is_host": room.get("host") == my_id,
                    "participants": [{"identity": p["identity"], "name": p["name"]} for p in participants],
                }
            )
    return active


@router.post("/{room_name}/mute/{user_id}")
async def mute_partner_meeting_participant(
    room_name: str,
    user_id: str,
    kind: str = "audio",
    muted: bool = True,
    current_user: User = Depends(get_current_user),
):
    """Only the person who started this ad-hoc meeting can mute/unmute
    others in it — there's no company-level permission to lean on here
    since partner meetings can cross company boundaries."""
    if kind not in ("audio", "video"):
        raise HTTPException(status_code=400, detail="kind 'audio' yoki 'video' bo'lishi kerak")
    room = _partner_rooms.get(room_name)
    if room is None or room.get("host") != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat uchrashuvni boshlagan kishi buni bajara oladi")

    ok = await livekit_admin.mute_participant_track(room_name, user_id, kind, muted)
    if not ok:
        raise HTTPException(status_code=404, detail="Foydalanuvchi xonada topilmadi yoki mos trek yo'q")
    return {"muted": muted, "kind": kind}
