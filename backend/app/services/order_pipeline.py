"""Helpers for marketplace order pipeline notifications and permission lookups."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company, TeamMembership
from app.models.notification import Notification
from app.models.role import Role
from app.services.notify import ping_notifications


ORDER_STATUS_LABELS = {
    "ordered": "Buyurtma qilindi",
    "loading": "Yuklash jarayonida",
    "loaded": "Yuklandi",
    "on_road": "Yo'lda",
    "courier_accepted": "Yetkazib beruvchi qabul qildi",
    "awaiting_receipt": "Qabul qilish kutilmoqda",
    "completed": "Yakunlandi",
    "cancelled": "Bekor qilindi",
}


async def users_with_permission(db: AsyncSession, company_id, permission_key: str) -> list[uuid.UUID]:
    """Owner always included; plus approved members whose role grants the key."""
    company = (await db.execute(select(Company).where(Company.id == company_id))).scalar_one_or_none()
    if company is None:
        return []

    user_ids: set[uuid.UUID] = {company.owner_id}

    result = await db.execute(
        select(TeamMembership, Role)
        .outerjoin(Role, Role.id == TeamMembership.role_id)
        .where(
            TeamMembership.company_id == company_id,
            TeamMembership.approved.is_(True),
        )
    )
    for membership, role in result.all():
        if role is None:
            continue
        perms = role.permissions or {}
        if perms.get(permission_key, False):
            user_ids.add(membership.user_id)

    return list(user_ids)


async def notify_users(
    db: AsyncSession,
    *,
    user_ids: list[uuid.UUID],
    ntype: str,
    message: str,
    company_id,
    invite_token: str | None = None,
    related_user_id=None,
) -> None:
    seen: set[str] = set()
    for uid in user_ids:
        key = str(uid)
        if key in seen:
            continue
        seen.add(key)
        db.add(
            Notification(
                id=uuid.uuid4(),
                user_id=uid,
                type=ntype,
                message=message,
                company_id=company_id,
                related_user_id=related_user_id,
                invite_token=invite_token,
            )
        )
    await db.flush()
    for uid in seen:
        await ping_notifications(uid)


async def available_qty(product) -> float:
    return max(0.0, float(product.quantity) - float(getattr(product, "reserved_quantity", 0) or 0))
