import uuid

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import decode_access_token
from app.db.database import async_session, get_db
from app.models.company import Company, TeamMembership
from app.models.user import User
from app.services.connection_manager import office_manager
from app.services.notify import push_live

router = APIRouter(tags=["office"])

# Tracks each connected player's last-known state per company room, so a
# newly-joining client can be told who's already there.
_players: dict[str, dict[str, dict]] = {}


@router.get("/companies/{company_id}/office/presence")
async def get_office_presence(
    company_id: str,
    current_user: User = Depends(get_current_user),
):
    room_players = _players.get(company_id, {})
    return [
        {"user_id": uid, "name": state.get("name", "")}
        for uid, state in room_players.items()
        if uid != str(current_user.id)
    ]


@router.post("/companies/{company_id}/office/call/{target_user_id}")
async def start_office_call(
    company_id: str,
    target_user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.livekit_api_key or not settings.livekit_api_secret or not settings.livekit_url:
        raise HTTPException(status_code=503, detail="Qo'ng'iroq xizmati hali sozlanmagan")

    target_result = await db.execute(select(User).where(User.id == target_user_id))
    target_user = target_result.scalar_one_or_none()
    if target_user is None:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    from livekit import api as livekit_api

    room_name = f"office-call-{uuid.uuid4().hex[:12]}"
    token = (
        livekit_api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(str(current_user.id))
        .with_name(current_user.full_name)
        .with_grants(livekit_api.VideoGrants(room_join=True, room=room_name, can_publish=True, can_subscribe=True))
    )

    await push_live(
        target_user_id,
        {
            "type": "incoming_office_call",
            "company_id": company_id,
            "room_name": room_name,
            "caller_id": str(current_user.id),
            "caller_name": current_user.full_name,
        },
    )

    return {"room_name": room_name, "token": token.to_jwt(), "url": settings.livekit_url}


@router.post("/companies/{company_id}/office/call/{room_name}/accept")
async def accept_office_call(
    company_id: str,
    room_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.livekit_api_key or not settings.livekit_api_secret or not settings.livekit_url:
        raise HTTPException(status_code=503, detail="Qo'ng'iroq xizmati hali sozlanmagan")

    from livekit import api as livekit_api

    token = (
        livekit_api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(str(current_user.id))
        .with_name(current_user.full_name)
        .with_grants(livekit_api.VideoGrants(room_join=True, room=room_name, can_publish=True, can_subscribe=True))
    )
    return {"room_name": room_name, "token": token.to_jwt(), "url": settings.livekit_url}


@router.post("/companies/{company_id}/office/call/{room_name}/reject")
async def reject_office_call(
    company_id: str,
    room_name: str,
    caller_id: str,
    current_user: User = Depends(get_current_user),
):
    await push_live(caller_id, {"type": "office_call_rejected", "room_name": room_name, "by_name": current_user.full_name})


@router.post("/companies/{company_id}/office/call/{room_name}/cancel")
async def cancel_office_call(
    company_id: str,
    room_name: str,
    target_user_id: str,
    current_user: User = Depends(get_current_user),
):
    """Caller hung up before (or after) the callee answered — tell the
    callee's browser to stop ringing / drop the call, with no way to still
    pick it up."""
    await push_live(target_user_id, {"type": "office_call_cancelled", "room_name": room_name})


@router.post("/companies/{company_id}/office/voice-token")
async def get_office_voice_token(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Everyone visiting the office can talk — a shared, always-on audio room
    (no video) so people who happen to be in the 3D room at the same time
    can hear each other, same as being in a real open office."""
    if not settings.livekit_api_key or not settings.livekit_api_secret or not settings.livekit_url:
        raise HTTPException(
            status_code=503,
            detail="Ovozli suhbat hali sozlanmagan — backend .env fayliga LIVEKIT_API_KEY, "
            "LIVEKIT_API_SECRET va LIVEKIT_URL qo'shing.",
        )

    company_result = await db.execute(select(Company).where(Company.id == company_id))
    company = company_result.scalar_one_or_none()
    is_owner = bool(company and str(company.owner_id) == str(current_user.id))
    if not is_owner:
        membership_result = await db.execute(
            select(TeamMembership).where(
                TeamMembership.company_id == company_id, TeamMembership.user_id == current_user.id
            )
        )
        if membership_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=403, detail="Siz bu kompaniya a'zosi emassiz")

    from livekit import api as livekit_api

    room_name = f"office-{company_id}"
    token = (
        livekit_api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(str(current_user.id))
        .with_name(current_user.full_name)
        .with_grants(
            livekit_api.VideoGrants(room_join=True, room=room_name, can_publish=True, can_subscribe=True)
        )
    )

    return {"token": token.to_jwt(), "url": settings.livekit_url, "room_name": room_name}


@router.websocket("/ws/office/{company_id}")
async def office_presence(websocket: WebSocket, company_id: str):
    token = websocket.query_params.get("token")
    user_id = decode_access_token(token) if token else None
    if user_id is None:
        await websocket.close(code=4401)
        return

    async with async_session() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
    display_name = user.full_name if user else "Foydalanuvchi"

    await office_manager.connect(company_id, websocket)
    room_players = _players.setdefault(company_id, {})

    # Tell the newcomer who's already in the room.
    await websocket.send_json(
        {
            "type": "roster",
            "self_user_id": user_id,
            "players": [{"user_id": uid, **state} for uid, state in room_players.items() if uid != user_id],
        }
    )

    room_players[user_id] = {"name": display_name, "x": 0, "y": 1, "z": 4, "rot": 0}
    await office_manager.broadcast(
        company_id,
        {"type": "player-joined", "user_id": user_id, "name": display_name, "x": 0, "y": 1, "z": 4, "rot": 0},
        exclude=websocket,
    )

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "move":
                state = {
                    "name": display_name,
                    "x": data.get("x", 0),
                    "y": data.get("y", 1),
                    "z": data.get("z", 0),
                    "rot": data.get("rot", 0),
                }
                room_players[user_id] = state
                await office_manager.broadcast(
                    company_id,
                    {"type": "player-moved", "user_id": user_id, **state},
                    exclude=websocket,
                )
    except WebSocketDisconnect:
        office_manager.disconnect(company_id, websocket)
        room_players.pop(user_id, None)
        if not room_players:
            _players.pop(company_id, None)
        await office_manager.broadcast(company_id, {"type": "player-left", "user_id": user_id})
