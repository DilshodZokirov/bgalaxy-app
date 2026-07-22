import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.api.deps import get_current_user
from app.core.security import decode_access_token
from app.db.database import async_session
from app.models.user import User
from app.services.connection_manager import signaling_manager

router = APIRouter(tags=["meetings"])

# Tracks display names for active call participants: call_id -> {websocket: name}
_participant_names: dict[str, dict[WebSocket, str]] = {}
# Tracks which user_ids currently hold a slot in each call, so the same
# account can't occupy two of the (max 2) participant slots at once —
# e.g. joining from a phone while already connected from a computer.
_connected_user_ids: dict[str, set[str]] = {}
# Tracks the call owner (whoever started it) for host-control permission
# checks and for showing "who's hosting" on the call-status banner.
_call_owner: dict[str, dict] = {}  # call_id -> {"user_id":, "name":}
# Pending join requests awaiting the owner's approval.
_join_requests: dict[str, dict[str, dict]] = {}  # call_id -> {request_id: {...}}


@router.get("/companies/{company_id}/call-status")
async def call_status(company_id: str):
    room_id = f"{company_id}-call"
    participants = len(signaling_manager.rooms.get(room_id, []))
    owner = _call_owner.get(room_id)
    return {
        "active": participants > 0,
        "participants": participants,
        "creator_name": owner["name"] if owner else None,
    }


@router.post("/meetings/{call_id}/join-requests", status_code=201)
async def create_join_request(
    call_id: str, current_user: User = Depends(get_current_user)
):
    if not signaling_manager.rooms.get(call_id):
        raise HTTPException(status_code=400, detail="Uchrashuv hozir faol emas")

    request_id = str(uuid_lib.uuid4())
    _join_requests.setdefault(call_id, {})[request_id] = {
        "user_id": str(current_user.id),
        "name": current_user.full_name,
        "status": "pending",
    }
    await signaling_manager.broadcast(
        call_id,
        {
            "type": "join-request",
            "request_id": request_id,
            "user_id": str(current_user.id),
            "name": current_user.full_name,
        },
    )
    return {"request_id": request_id, "status": "pending"}


@router.get("/meetings/{call_id}/join-requests/{request_id}")
async def get_join_request(call_id: str, request_id: str):
    request = _join_requests.get(call_id, {}).get(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="So'rov topilmadi")
    return {"status": request["status"]}


@router.post("/meetings/{call_id}/join-requests/{request_id}/respond")
async def respond_join_request(
    call_id: str,
    request_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
):
    owner = _call_owner.get(call_id)
    if not owner or owner["user_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat uchrashuv yaratuvchisi javob bera oladi")

    request = _join_requests.get(call_id, {}).get(request_id)
    if not request:
        raise HTTPException(status_code=404, detail="So'rov topilmadi")

    request["status"] = "approved" if payload.get("approved") else "denied"
    return {"status": request["status"]}


@router.websocket("/ws/call/{call_id}")
async def call_signaling(websocket: WebSocket, call_id: str):
    """Relays WebRTC signaling messages (offer/answer/ICE candidates) between
    exactly two participants in a 1-to-1 call. `call_id` is a shared room
    the two peers agree on ahead of time (e.g. generated when the meeting is scheduled).

    Message shape (client <-> server), forwarded as-is to the other peer:
      { "type": "offer" | "answer" | "ice-candidate" | "end-call" | "host-control", "payload": {...} }
    """
    token = websocket.query_params.get("token")
    user_id = decode_access_token(token) if token else None
    if user_id is None:
        await websocket.close(code=4401)
        return

    # MVP limit: only 2 participants per call_id (no SFU yet)
    existing_count = len(signaling_manager.rooms.get(call_id, []))
    if existing_count >= 2:
        await websocket.close(code=4409)  # room full
        return

    # Same account can't hold two slots at once (e.g. phone + computer both
    # signed in) — block the second connection attempt.
    if user_id in _connected_user_ids.get(call_id, set()):
        await websocket.close(code=4408, reason="already-connected")
        return

    async with async_session() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
    display_name = user.full_name if user else "Foydalanuvchi"

    existing = list(_participant_names.get(call_id, {}).items())

    await signaling_manager.connect(call_id, websocket)
    _participant_names.setdefault(call_id, {})[websocket] = display_name
    _connected_user_ids.setdefault(call_id, set()).add(user_id)

    # The first participant "owns" the call (can end it for everyone, approve
    # join requests, and control other participants' mic/camera).
    is_owner = existing_count == 0
    is_initiator = existing_count == 1
    if is_owner:
        _call_owner[call_id] = {"user_id": user_id, "name": display_name}

    peer_name = None
    peer_user_id = None
    if existing:
        _, peer_name = existing[0]
        peer_user_id = next(iter(_connected_user_ids.get(call_id, set()) - {user_id}), None)

    await websocket.send_json(
        {
            "type": "role",
            "initiator": is_initiator,
            "owner": is_owner,
            "self_name": display_name,
            "self_user_id": user_id,
            "peer_name": peer_name,
            "peer_user_id": peer_user_id,
        }
    )
    await signaling_manager.broadcast(
        call_id,
        {"type": "peer-joined", "name": display_name, "user_id": user_id},
        exclude=websocket,
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "end-call":
                await signaling_manager.broadcast(call_id, {"type": "call-ended"}, exclude=websocket)
            elif msg_type == "host-control":
                # Only the owner may issue mute/disable-video/kick/allow-video commands.
                owner = _call_owner.get(call_id)
                if owner and owner["user_id"] == user_id:
                    await signaling_manager.broadcast(call_id, data, exclude=websocket)
            else:
                await signaling_manager.broadcast(call_id, data, exclude=websocket)
    except WebSocketDisconnect:
        signaling_manager.disconnect(call_id, websocket)
        _participant_names.get(call_id, {}).pop(websocket, None)
        _connected_user_ids.get(call_id, set()).discard(user_id)
        if _call_owner.get(call_id, {}).get("user_id") == user_id:
            _call_owner.pop(call_id, None)
            _join_requests.pop(call_id, None)
        await signaling_manager.broadcast(call_id, {"type": "peer-left"})
