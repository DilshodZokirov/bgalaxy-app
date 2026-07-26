"""Finalize group-call invite notifications when a company room goes idle.

Online / aware members: invite is removed (no leftover "Qo'shilish").
Members who never saw the invite while the call was live: invite becomes an
"afsuski yakunlandi" notice.
"""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User
from app.services.connection_manager import notification_manager
from app.services.notify import ping_notifications

logger = logging.getLogger(__name__)

GROUP_CALL_STARTED = "group_call_started"
GROUP_CALL_ENDED = "group_call_ended"
SEEN_TOKEN = "seen"


async def mark_group_call_invites_seen(db: AsyncSession, notifications: list[Notification]) -> None:
    """Mark live invites as seen for the current viewer (they are online in-app)."""
    changed = False
    for n in notifications:
        if n.type == GROUP_CALL_STARTED and not n.resolved and n.invite_token != SEEN_TOKEN:
            n.invite_token = SEEN_TOKEN
            changed = True
    if changed:
        await db.commit()


async def finalize_group_call_notifications(
    db: AsyncSession,
    company_id: str,
    *,
    trust_live_presence: bool = True,
) -> int:
    """Process unresolved group_call_started rows for a company.

    trust_live_presence=True  — call this at meeting-end (leave / active empty):
        WS-connected users are treated as online → invite deleted.
    trust_live_presence=False — late sweep when a user opens notifications after
        the call already ended: only invites explicitly marked seen are deleted;
        everyone else gets the missed-call notice.
    """
    result = await db.execute(
        select(Notification).where(
            Notification.company_id == company_id,
            Notification.type == GROUP_CALL_STARTED,
            Notification.resolved.is_(False),
        )
    )
    pending = list(result.scalars().all())
    if not pending:
        return 0

    starter_ids = {n.related_user_id for n in pending if n.related_user_id}
    names: dict = {}
    if starter_ids:
        users_result = await db.execute(select(User).where(User.id.in_(starter_ids)))
        names = {u.id: u.full_name for u in users_result.scalars().all()}

    ping_ids: list[str] = []
    for n in pending:
        was_aware = n.invite_token == SEEN_TOKEN
        if trust_live_presence and notification_manager.rooms.get(str(n.user_id)):
            was_aware = True

        if was_aware:
            await db.delete(n)
            continue

        starter = names.get(n.related_user_id) or _starter_from_message(n.message) or "Kimdir"
        n.type = GROUP_CALL_ENDED
        n.message = f"{starter} guruh uchrashuvi uyushtirgan edi — afsuski yakunlandi."
        # Keep unresolved so the UI can show "Tushundim"; join is gated on type.
        n.resolved = False
        n.read = False
        n.invite_token = None
        ping_ids.append(str(n.user_id))

    await db.commit()

    for uid in dict.fromkeys(ping_ids):
        await ping_notifications(uid)

    try:
        from app.api.routes.group_meeting import _last_notified

        _last_notified.pop(str(company_id), None)
    except Exception:
        logger.debug("Could not clear group-call notify cooldown for %s", company_id)

    logger.info(
        "Finalized %s group-call invite(s) for company %s (trust_live_presence=%s)",
        len(pending),
        company_id,
        trust_live_presence,
    )
    return len(pending)


def _starter_from_message(message: str | None) -> str | None:
    if not message:
        return None
    marker = " guruh uchrashuvini boshladi"
    if marker in message:
        return message.split(marker, 1)[0].strip() or None
    return None
