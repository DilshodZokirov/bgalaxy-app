import re

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import decode_access_token
from app.db.database import async_session, get_db
from app.models.chat import Message
from app.models.channel import ChatChannel, ChatChannelMember
from app.models.company import TeamMembership
from app.models.notification import Notification
from app.models.role import Role
from app.models.user import User
from app.schemas.chat import MessageCreate, MessageOut, MessageUpdate
from app.services.connection_manager import chat_manager
from app.services.notify import ping_notifications

router = APIRouter(tags=["chat"])

REPLY_PREVIEW_LENGTH = 80
MENTION_RE = re.compile(r"#(\w+)", re.UNICODE)


def _to_message_out(message: Message, sender_name: str, reply_info: dict | None) -> MessageOut:
    reply_sender_name = None
    reply_preview = None
    if message.reply_to_id and reply_info and message.reply_to_id in reply_info:
        reply_sender_name, reply_content = reply_info[message.reply_to_id]
        reply_preview = (
            reply_content[:REPLY_PREVIEW_LENGTH] + "…"
            if len(reply_content) > REPLY_PREVIEW_LENGTH
            else reply_content
        )
    return MessageOut(
        id=message.id,
        channel_id=message.channel_id,
        sender_id=message.sender_id,
        sender_name=sender_name,
        content="Xabar o'chirildi" if message.deleted else message.content,
        reply_to_id=message.reply_to_id,
        reply_sender_name=reply_sender_name,
        reply_preview=reply_preview,
        forwarded_from=message.forwarded_from,
        edited=message.edited,
        deleted=message.deleted,
        created_at=message.created_at,
    )


async def _require_channel_member(db: AsyncSession, channel_id: str, user_id) -> ChatChannel:
    channel_result = await db.execute(select(ChatChannel).where(ChatChannel.id == channel_id))
    channel = channel_result.scalar_one_or_none()
    if channel is None:
        raise HTTPException(status_code=404, detail="Kanal topilmadi")
    member_result = await db.execute(
        select(ChatChannelMember).where(
            ChatChannelMember.channel_id == channel_id,
            ChatChannelMember.user_id == user_id,
            ChatChannelMember.approved == True,  # noqa: E712
        )
    )
    if member_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Siz bu kanal a'zosi emassiz")
    return channel


async def _notify_mentions(db: AsyncSession, channel: ChatChannel, content: str, sender: User) -> None:
    """Parses #role and #FullName mentions and notifies the matching people."""
    tokens = {m.lower() for m in MENTION_RE.findall(content)}
    if not tokens:
        return

    roles_result = await db.execute(select(Role).where(Role.company_id == channel.company_id))
    roles = roles_result.scalars().all()
    role_by_key = {r.name.lower().replace(" ", ""): r for r in roles}

    members_result = await db.execute(
        select(User, TeamMembership)
        .join(TeamMembership, TeamMembership.user_id == User.id)
        .where(TeamMembership.company_id == channel.company_id)
    )
    member_rows = members_result.all()

    notify_ids: set[str] = set()
    preview = content[:80] + ("…" if len(content) > 80 else "")

    for token in tokens:
        role = role_by_key.get(token)
        if role:
            for user, membership in member_rows:
                if membership.role_id == role.id:
                    notify_ids.add(str(user.id))
        for user, _membership in member_rows:
            full_key = user.full_name.lower().replace(" ", "")
            first_key = user.full_name.split()[0].lower() if user.full_name.split() else ""
            if token == full_key or token == first_key:
                notify_ids.add(str(user.id))

    notify_ids.discard(str(sender.id))
    for uid in notify_ids:
        db.add(
            Notification(
                user_id=uid,
                type="mention",
                message=f"{sender.full_name} #{channel.name} kanalida sizni eslatib o'tdi: \"{preview}\"",
                company_id=channel.company_id,
            )
        )
    if notify_ids:
        await db.commit()
        for uid in notify_ids:
            await ping_notifications(uid)


@router.get("/channels/{channel_id}/messages", response_model=list[MessageOut])
async def get_history(channel_id: str, limit: int = 50, current_user: User = Depends(get_current_user)):
    async with async_session() as db:
        await _require_channel_member(db, channel_id, current_user.id)

        result = await db.execute(
            select(Message, User)
            .join(User, User.id == Message.sender_id)
            .where(Message.channel_id == channel_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        rows = list(reversed(result.all()))

        reply_ids = {m.reply_to_id for m, _ in rows if m.reply_to_id}
        reply_info: dict = {}
        if reply_ids:
            reply_result = await db.execute(
                select(Message, User)
                .join(User, User.id == Message.sender_id)
                .where(Message.id.in_(reply_ids))
            )
            for parent_msg, parent_user in reply_result.all():
                reply_info[parent_msg.id] = (parent_user.full_name, parent_msg.content)

        return [_to_message_out(message, user.full_name, reply_info) for message, user in rows]


@router.post("/channels/{channel_id}/messages", response_model=MessageOut, status_code=201)
async def forward_message(
    channel_id: str,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Posts a message directly via REST — used for forwarding a message into
    a (possibly different) channel without needing an open WebSocket there."""
    channel = await _require_channel_member(db, channel_id, current_user.id)

    message = Message(
        company_id=channel.company_id,
        channel_id=channel_id,
        sender_id=current_user.id,
        content=payload.content,
        forwarded_from=payload.forwarded_from,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    out = _to_message_out(message, current_user.full_name, None)
    await chat_manager.broadcast(str(channel_id), out.model_dump(mode="json"))
    await _notify_mentions(db, channel, payload.content, current_user)
    return out


@router.patch("/channels/{channel_id}/messages/{message_id}", response_model=MessageOut)
async def edit_message(
    channel_id: str,
    message_id: str,
    payload: MessageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_channel_member(db, channel_id, current_user.id)
    result = await db.execute(select(Message).where(Message.id == message_id, Message.channel_id == channel_id))
    message = result.scalar_one_or_none()
    if message is None:
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    if str(message.sender_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat o'zingizning xabaringizni tahrirlay olasiz")
    if message.deleted:
        raise HTTPException(status_code=400, detail="O'chirilgan xabarni tahrirlab bo'lmaydi")

    message.content = payload.content
    message.edited = True
    await db.commit()

    out = _to_message_out(message, current_user.full_name, None)
    await chat_manager.broadcast(str(channel_id), {"type": "message_updated", **out.model_dump(mode="json")})
    return out


@router.delete("/channels/{channel_id}/messages/{message_id}", status_code=204)
async def delete_message(
    channel_id: str,
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_channel_member(db, channel_id, current_user.id)
    result = await db.execute(select(Message).where(Message.id == message_id, Message.channel_id == channel_id))
    message = result.scalar_one_or_none()
    if message is None:
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    if str(message.sender_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat o'zingizning xabaringizni o'chira olasiz")

    message.deleted = True
    await db.commit()
    await chat_manager.broadcast(str(channel_id), {"type": "message_deleted", "id": str(message_id)})


@router.websocket("/ws/chat/{channel_id}")
async def chat_ws(websocket: WebSocket, channel_id: str):
    # Expect ?token=<jwt> as a query param since browsers can't set headers on WS
    token = websocket.query_params.get("token")
    user_id = decode_access_token(token) if token else None
    if user_id is None:
        await websocket.close(code=4401)
        return

    async with async_session() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        sender = result.scalar_one_or_none()
        if sender is None:
            await websocket.close(code=4401)
            return
        try:
            channel = await _require_channel_member(db, channel_id, user_id)
        except HTTPException:
            await websocket.close(code=4403)
            return
    sender_name = sender.full_name

    await chat_manager.connect(str(channel_id), websocket)
    try:
        while True:
            data = await websocket.receive_json()
            content = data.get("content", "").strip()
            if not content:
                continue
            reply_to_id = data.get("reply_to_id")

            async with async_session() as db:
                message = Message(
                    company_id=channel.company_id,
                    channel_id=channel_id,
                    sender_id=user_id,
                    content=content,
                    reply_to_id=reply_to_id,
                )
                db.add(message)
                await db.commit()
                await db.refresh(message)

                reply_info = None
                if reply_to_id:
                    parent_result = await db.execute(
                        select(Message, User)
                        .join(User, User.id == Message.sender_id)
                        .where(Message.id == reply_to_id)
                    )
                    row = parent_result.first()
                    if row:
                        parent_msg, parent_user = row
                        reply_info = {parent_msg.id: (parent_user.full_name, parent_msg.content)}

                out = _to_message_out(message, sender_name, reply_info)
                await chat_manager.broadcast(str(channel_id), out.model_dump(mode="json"))
                await _notify_mentions(db, channel, content, sender)
    except WebSocketDisconnect:
        chat_manager.disconnect(str(channel_id), websocket)
