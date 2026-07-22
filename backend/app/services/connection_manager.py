from fastapi import WebSocket


class ConnectionManager:
    """Keeps track of active WebSocket connections per room (channel or call id).

    NOTE: in-memory only — fine for a single backend instance / MVP.
    For multi-instance deployments this needs a shared pub/sub (e.g. Redis).
    """

    def __init__(self) -> None:
        self.rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.rooms.setdefault(room_id, []).append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket) -> None:
        if room_id in self.rooms and websocket in self.rooms[room_id]:
            self.rooms[room_id].remove(websocket)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def broadcast(self, room_id: str, message: dict, exclude: WebSocket | None = None) -> None:
        for connection in self.rooms.get(room_id, []):
            if connection is not exclude:
                await connection.send_json(message)


chat_manager = ConnectionManager()
signaling_manager = ConnectionManager()
office_manager = ConnectionManager()
direct_chat_manager = ConnectionManager()
notification_manager = ConnectionManager()
