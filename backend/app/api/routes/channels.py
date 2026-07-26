from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete as sa_delete
from sqlalchemy import func as sa_func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.channel import ChatChannel, ChatChannelMember
from app.models.chat import Message
from app.models.company import TeamMembership
from app.models.notification import Notification
from app.models.role import Role
from app.models.user import User
from app.schemas.channel import ChannelCreate, ChannelMemberAdd, ChannelMemberOut, ChannelOut, ChannelRename, MentionCandidate
from app.services.notify import ping_notifications

router = APIRouter(prefix="/companies/{company_id}/channels", tags=["channels"])


async def _require_company_member(db: AsyncSession, company_id: str, user_id) -> None:
    result = await db.execute(
        select(TeamMembership).where(
            TeamMembership.company_id == company_id, TeamMembership.user_id == user_id
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Siz bu kompaniya a'zosi emassiz")


async def _require_channel_member(db: AsyncSession, channel_id: str, user_id) -> ChatChannel:
    channel_result = await db.execute(select(ChatChannel).where(ChatChannel.id == channel_id))
    channel = channel_result.scalar_one_or_none()
    if channel is None:
        raise HTTPException(status_code=404, detail="Kanal topilmadi")
    result = await db.execute(
        select(ChatChannelMember).where(
            ChatChannelMember.channel_id == channel_id,
            ChatChannelMember.user_id == user_id,
            ChatChannelMember.approved == True,  # noqa: E712
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Siz bu kanal a'zosi emassiz")
    return channel


async def _invite_to_channel(db: AsyncSession, channel: ChatChannel, user_ids: set[str], inviter: User) -> list[str]:
    existing_result = await db.execute(
        select(ChatChannelMember.user_id).where(ChatChannelMember.channel_id == channel.id)
    )
    existing = {str(uid) for uid in existing_result.scalars().all()}

    invited = []
    for uid in user_ids:
        if uid in existing:
            continue
        db.add(ChatChannelMember(channel_id=channel.id, user_id=uid, approved=False))
        db.add(
            Notification(
                user_id=uid,
                type="channel_invite",
                message=f"{inviter.full_name} sizni #{channel.name} kanaliga qo'shdi.",
                company_id=channel.company_id,
                invite_token=str(channel.id),
            )
        )
        invited.append(uid)
    return invited


@router.get("", response_model=list[ChannelOut])
async def list_channels(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Channels the current user has actually accepted membership in — pending
    invites don't show up until approved."""
    result = await db.execute(
        select(ChatChannel)
        .join(ChatChannelMember, ChatChannelMember.channel_id == ChatChannel.id)
        .where(
            ChatChannel.company_id == company_id,
            ChatChannelMember.user_id == current_user.id,
            ChatChannelMember.approved == True,  # noqa: E712
        )
        .order_by(ChatChannel.created_at)
    )
    channels = result.scalars().all()

    out = []
    for ch in channels:
        count_result = await db.execute(
            select(sa_func.count())
            .select_from(ChatChannelMember)
            .where(ChatChannelMember.channel_id == ch.id, ChatChannelMember.approved == True)  # noqa: E712
        )
        last_result = await db.execute(
            select(Message)
            .where(Message.channel_id == ch.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = last_result.scalar_one_or_none()
        last_message = None
        if last_msg is not None:
            last_message = "Xabar o'chirildi" if last_msg.deleted else (last_msg.content or "")
        out.append(
            ChannelOut.model_validate(ch, from_attributes=True).model_copy(
                update={
                    "member_count": count_result.scalar_one(),
                    "last_message": last_message,
                    "last_message_at": last_msg.created_at if last_msg else None,
                }
            )
        )
    out.sort(key=lambda c: c.last_message_at or c.created_at, reverse=True)
    return out


@router.post("", response_model=ChannelOut, status_code=201)
async def create_channel(
    company_id: str,
    payload: ChannelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_company_member(db, company_id, current_user.id)

    channel = ChatChannel(company_id=company_id, name=payload.name, created_by=current_user.id)
    db.add(channel)
    await db.flush()

    # Creator is the owner — auto-approved. Everyone else is invited and
    # only shows up once they accept the notification.
    db.add(ChatChannelMember(channel_id=channel.id, user_id=current_user.id, approved=True))
    invite_ids = {str(uid) for uid in payload.member_ids if str(uid) != str(current_user.id)}
    invited = await _invite_to_channel(db, channel, invite_ids, current_user)

    await db.commit()
    await db.refresh(channel)
    for uid in invited:
        await ping_notifications(uid)
    return ChannelOut.model_validate(channel, from_attributes=True).model_copy(update={"member_count": 1})


@router.patch("/{channel_id}", response_model=ChannelOut)
async def rename_channel(
    company_id: str,
    channel_id: str,
    payload: ChannelRename,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ChatChannel).where(ChatChannel.id == channel_id, ChatChannel.company_id == company_id))
    channel = result.scalar_one_or_none()
    if channel is None:
        raise HTTPException(status_code=404, detail="Kanal topilmadi")
    if str(channel.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat kanal egasi nomini o'zgartira oladi")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nom bo'sh bo'lmasin")
    channel.name = name
    await db.commit()
    await db.refresh(channel)

    count_result = await db.execute(
        select(sa_func.count()).select_from(ChatChannelMember).where(ChatChannelMember.channel_id == channel.id, ChatChannelMember.approved == True)  # noqa: E712
    )
    return ChannelOut.model_validate(channel, from_attributes=True).model_copy(update={"member_count": count_result.scalar_one()})


@router.delete("/{channel_id}", status_code=204)
async def delete_channel(
    company_id: str,
    channel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ChatChannel).where(ChatChannel.id == channel_id, ChatChannel.company_id == company_id))
    channel = result.scalar_one_or_none()
    if channel is None:
        raise HTTPException(status_code=404, detail="Kanal topilmadi")
    if str(channel.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat kanal yaratuvchisi uni yopa oladi")

    await db.execute(sa_delete(Message).where(Message.channel_id == channel_id))
    await db.execute(sa_delete(ChatChannelMember).where(ChatChannelMember.channel_id == channel_id))
    await db.execute(sa_delete(ChatChannel).where(ChatChannel.id == channel_id))
    await db.commit()


@router.get("/{channel_id}/members", response_model=list[ChannelMemberOut])
async def list_channel_members(
    company_id: str,
    channel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_channel_member(db, channel_id, current_user.id)
    result = await db.execute(
        select(User)
        .join(ChatChannelMember, ChatChannelMember.user_id == User.id)
        .where(ChatChannelMember.channel_id == channel_id, ChatChannelMember.approved == True)  # noqa: E712
        .order_by(User.full_name)
    )
    return [ChannelMemberOut(user_id=u.id, full_name=u.full_name) for u in result.scalars().all()]


@router.delete("/{channel_id}/members/{user_id}", status_code=204)
async def remove_channel_member(
    company_id: str,
    channel_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await _require_channel_member(db, channel_id, current_user.id)

    if str(user_id) == str(channel.created_by):
        raise HTTPException(status_code=400, detail="Kanal egasini chiqarib bo'lmaydi")
    if str(user_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="O'zingizni chiqara olmaysiz")

    result = await db.execute(
        select(ChatChannelMember).where(
            ChatChannelMember.channel_id == channel_id, ChatChannelMember.user_id == user_id
        )
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="A'zo topilmadi")
    await db.delete(member)
    await db.commit()


@router.post("/{channel_id}/members", status_code=204)
async def add_channel_members(
    company_id: str,
    channel_id: str,
    payload: ChannelMemberAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channel = await _require_channel_member(db, channel_id, current_user.id)
    invited = await _invite_to_channel(db, channel, {str(uid) for uid in payload.user_ids}, current_user)
    await db.commit()
    for uid in invited:
        await ping_notifications(uid)


@router.get("/{channel_id}/mention-candidates", response_model=list[MentionCandidate])
async def mention_candidates(
    company_id: str,
    channel_id: str,
    q: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Powers the "#" autocomplete — role names (broadcast to everyone with
    that role) and individual member names, filtered by prefix."""
    await _require_channel_member(db, channel_id, current_user.id)
    q = q.lower()

    candidates: list[MentionCandidate] = []

    roles_result = await db.execute(select(Role).where(Role.company_id == company_id))
    for role in roles_result.scalars().all():
        key = role.name.lower().replace(" ", "")
        if key.startswith(q):
            candidates.append(MentionCandidate(type="role", key=key, label=f"{role.name} (barchasiga)"))

    members_result = await db.execute(
        select(User)
        .join(TeamMembership, TeamMembership.user_id == User.id)
        .where(TeamMembership.company_id == company_id)
    )
    for user in members_result.scalars().all():
        key = user.full_name.lower().replace(" ", "")
        if key.startswith(q) or (user.full_name.split() and user.full_name.split()[0].lower().startswith(q)):
            candidates.append(MentionCandidate(type="user", key=key, label=user.full_name))

    return candidates[:10]
