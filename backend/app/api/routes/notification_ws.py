from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token
from app.services.connection_manager import notification_manager

router = APIRouter(tags=["notifications"])


@router.websocket("/ws/notifications")
async def notifications_ws(websocket: WebSocket):
    token = websocket.query_params.get("token")
    user_id = decode_access_token(token) if token else None
    if user_id is None:
        await websocket.close(code=4401)
        return

    await notification_manager.connect(str(user_id), websocket)
    try:
        while True:
            # Clients don't need to send anything — this just keeps the
            # socket open so the server can push pings. Ignore any inbound
            # messages (e.g. keepalive pings from the browser).
            await websocket.receive_text()
    except WebSocketDisconnect:
        notification_manager.disconnect(str(user_id), websocket)
