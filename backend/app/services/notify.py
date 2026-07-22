from app.services.connection_manager import notification_manager


async def ping_notifications(user_id) -> None:
    """Tells the given user's browser (if it currently has the notification
    WebSocket open) to refresh its notification list. Never raises — this is
    a best-effort real-time nudge on top of the existing REST endpoint, not
    a required delivery path."""
    try:
        await notification_manager.broadcast(str(user_id), {"type": "notification"})
    except Exception:
        pass


async def push_live(user_id, payload: dict) -> None:
    """Sends a one-off real-time payload directly over the notification
    WebSocket — NOT stored anywhere and never shown in the 🔔 bell. Used for
    things that should only ever appear live on a specific page (e.g. an
    incoming Virtual Office call), not as a persistent notification. Silently
    does nothing if the user isn't currently connected."""
    try:
        await notification_manager.broadcast(str(user_id), payload)
    except Exception:
        pass
