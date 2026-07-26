from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.channel import ChatChannelMember
from app.models.company import Company, TeamMembership
from app.models.direct_chat import DirectConversationMember
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut
from app.services import livekit_admin
from app.services.group_call_notifications import (
    GROUP_CALL_STARTED,
    finalize_group_call_notifications,
    mark_group_call_invites_seen,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])

_DISMISSIBLE_TYPES = {
    "group_call_started",
    "group_call_ended",
    "partner_call",
    "scheduled_meeting",
    "scheduled_meeting_booked",
    "task_assigned",
    "task_update",
    "direct_message",
    "mention",
    "info",
    "invite",
}


async def _to_out(db: AsyncSession, n: Notification) -> NotificationOut:
    company_name = None
    if n.company_id:
        c = await db.execute(select(Company).where(Company.id == n.company_id))
        company = c.scalar_one_or_none()
        company_name = company.name if company else None

    related_name = None
    if n.related_user_id:
        u = await db.execute(select(User).where(User.id == n.related_user_id))
        user = u.scalar_one_or_none()
        related_name = user.full_name if user else None

    return NotificationOut(
        id=n.id,
        type=n.type,
        message=n.message,
        company_id=n.company_id,
        company_name=company_name,
        related_user_id=n.related_user_id,
        related_user_name=related_name,
        invite_token=n.invite_token,
        read=n.read,
        resolved=n.resolved,
        created_at=n.created_at,
    )


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Sweep stale group-call invites for this user before returning the list.
    pending_result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.type == GROUP_CALL_STARTED,
            Notification.resolved.is_(False),
            Notification.company_id.is_not(None),
        )
    )
    pending_started = list(pending_result.scalars().all())
    company_ids = {str(n.company_id) for n in pending_started}
    still_live: list[Notification] = []
    for company_id in company_ids:
        participants = await livekit_admin.list_room_participants(f"company-{company_id}")
        if participants:
            still_live.extend(n for n in pending_started if str(n.company_id) == company_id)
        else:
            # Late cleanup — do not treat "online now" as "was online during call".
            await finalize_group_call_notifications(db, company_id, trust_live_presence=False)

    if still_live:
        await mark_group_call_invites_seen(db, still_live)

    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(20)
    )
    notifications = result.scalars().all()
    return [await _to_out(db, n) for n in notifications]


@router.post("/{notification_id}/read", status_code=204)
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == current_user.id)
    )
    n = result.scalar_one_or_none()
    if n is None:
        raise HTTPException(status_code=404, detail="Topilmadi")
    n.read = True
    await db.commit()


@router.post("/{notification_id}/dismiss", status_code=204)
async def dismiss_notification(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hide action buttons (Join / Close) without accepting — used for call
    invites the user chooses to ignore, and for missed-call notices."""
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == current_user.id)
    )
    n = result.scalar_one_or_none()
    if n is None:
        raise HTTPException(status_code=404, detail="Topilmadi")
    # Live join invites: remove entirely so "Qo'shilish" cannot linger.
    if n.type == GROUP_CALL_STARTED:
        await db.delete(n)
    else:
        n.read = True
        n.resolved = True
    await db.commit()


@router.post("/read-all", status_code=204)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        update(Notification).where(Notification.user_id == current_user.id).values(read=True)
    )
    await db.commit()


@router.post("/{notification_id}/accept", status_code=204)
async def accept_join_request(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == current_user.id)
    )
    n = result.scalar_one_or_none()
    if n is None or n.type not in ("join_request", "channel_invite", "direct_chat_invite"):
        raise HTTPException(status_code=404, detail="Topilmadi")

    if n.type == "join_request":
        membership_result = await db.execute(
            select(TeamMembership).where(
                TeamMembership.company_id == n.company_id, TeamMembership.user_id == n.related_user_id
            )
        )
        membership = membership_result.scalar_one_or_none()
        if membership:
            membership.approved = True
    elif n.type == "channel_invite":  # n.invite_token holds the channel_id
        member_result = await db.execute(
            select(ChatChannelMember).where(
                ChatChannelMember.channel_id == n.invite_token, ChatChannelMember.user_id == current_user.id
            )
        )
        member = member_result.scalar_one_or_none()
        if member:
            member.approved = True
    else:  # direct_chat_invite — n.invite_token holds the conversation_id
        member_result = await db.execute(
            select(DirectConversationMember).where(
                DirectConversationMember.conversation_id == n.invite_token,
                DirectConversationMember.user_id == current_user.id,
            )
        )
        member = member_result.scalar_one_or_none()
        if member:
            member.approved = True

    n.read = True
    n.resolved = True
    await db.commit()


@router.post("/{notification_id}/reject", status_code=204)
async def reject_join_request(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.user_id == current_user.id)
    )
    n = result.scalar_one_or_none()
    if n is None or n.type not in ("join_request", "channel_invite", "direct_chat_invite"):
        raise HTTPException(status_code=404, detail="Topilmadi")

    if n.type == "join_request":
        membership_result = await db.execute(
            select(TeamMembership).where(
                TeamMembership.company_id == n.company_id, TeamMembership.user_id == n.related_user_id
            )
        )
        membership = membership_result.scalar_one_or_none()
        if membership:
            await db.delete(membership)
    elif n.type == "channel_invite":
        member_result = await db.execute(
            select(ChatChannelMember).where(
                ChatChannelMember.channel_id == n.invite_token, ChatChannelMember.user_id == current_user.id
            )
        )
        member = member_result.scalar_one_or_none()
        if member:
            await db.delete(member)
    else:  # direct_chat_invite
        member_result = await db.execute(
            select(DirectConversationMember).where(
                DirectConversationMember.conversation_id == n.invite_token,
                DirectConversationMember.user_id == current_user.id,
            )
        )
        member = member_result.scalar_one_or_none()
        if member:
            await db.delete(member)
            await db.commit()

            remaining_result = await db.execute(
                select(DirectConversationMember).where(
                    DirectConversationMember.conversation_id == n.invite_token
                )
            )
            remaining = remaining_result.scalars().all()
            if len(remaining) <= 1:
                from app.api.routes.direct_chat import delete_conversation_cascade

                await delete_conversation_cascade(db, n.invite_token)
                return  # the cascade already deleted this notification row too

    n.read = True
    n.resolved = True
    await db.commit()
