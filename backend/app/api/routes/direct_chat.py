import os
import uuid as uuid_lib

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import decode_access_token
from app.db.database import async_session, get_db
from app.models.direct_chat import DirectConversation, DirectConversationMember, DirectMessage
from app.models.notification import Notification
from app.models.user import User
from app.schemas.direct_chat import (
    ConversationOut,
    ConversationStart,
    DirectMemberOut,
    DirectMessageOut,
    DirectMessageUpdate,
    ParticipantOut,
)
from app.services.connection_manager import direct_chat_manager
from app.services.notify import ping_notifications

router = APIRouter(tags=["direct-chat"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB


async def _require_participant(db: AsyncSession, conversation_id: str, user_id) -> None:
    result = await db.execute(
        select(DirectConversationMember).where(
            DirectConversationMember.conversation_id == conversation_id,
            DirectConversationMember.user_id == user_id,
            DirectConversationMember.approved == True,  # noqa: E712
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Siz bu suhbat ishtirokchisi emassiz")


async def _names_map(db: AsyncSession, user_ids: set) -> dict:
    user_ids = {uid for uid in user_ids if uid}
    if not user_ids:
        return {}
    result = await db.execute(select(User).where(User.id.in_(user_ids)))
    return {str(u.id): u.full_name for u in result.scalars().all()}


async def delete_conversation_cascade(db: AsyncSession, conversation_id: str) -> None:
    """Removes a conversation entirely: its messages, its membership rows, any
    still-pending invite notifications pointing at it, and the conversation
    itself. Shared by the manual delete endpoint and the auto-delete-on-reject
    flow in notifications.py."""
    from app.models.notification import Notification

    await db.execute(sa_delete(DirectMessage).where(DirectMessage.conversation_id == conversation_id))
    await db.execute(
        sa_delete(Notification).where(
            Notification.type == "direct_chat_invite", Notification.invite_token == str(conversation_id)
        )
    )
    await db.execute(
        sa_delete(DirectConversationMember).where(DirectConversationMember.conversation_id == conversation_id)
    )
    await db.execute(sa_delete(DirectConversation).where(DirectConversation.id == conversation_id))
    await db.commit()


def _to_message_out(message: DirectMessage, sender_name: str) -> DirectMessageOut:
    return DirectMessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_name=sender_name,
        content="Xabar o'chirildi" if message.deleted else message.content,
        file_url=None if message.deleted else message.file_url,
        file_name=None if message.deleted else message.file_name,
        edited=message.edited,
        deleted=message.deleted,
        created_at=message.created_at,
    )


@router.get("/direct-conversations", response_model=list[ConversationOut])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DirectConversation)
        .join(DirectConversationMember, DirectConversationMember.conversation_id == DirectConversation.id)
        .where(
            DirectConversationMember.user_id == current_user.id,
            DirectConversationMember.approved == True,  # noqa: E712
        )
        .order_by(DirectConversation.created_at.desc())
    )
    conversations = result.scalars().all()

    out = []
    for conv in conversations:
        members_result = await db.execute(
            select(User)
            .join(DirectConversationMember, DirectConversationMember.user_id == User.id)
            .where(DirectConversationMember.conversation_id == conv.id, User.id != current_user.id)
        )
        participants = [ParticipantOut(user_id=u.id, full_name=u.full_name) for u in members_result.scalars().all()]

        last_msg_result = await db.execute(
            select(DirectMessage)
            .where(DirectMessage.conversation_id == conv.id)
            .order_by(DirectMessage.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()
        last_message = None
        if last_msg:
            last_message = "Xabar o'chirildi" if last_msg.deleted else (last_msg.content or f"📎 {last_msg.file_name}")

        out.append(
            ConversationOut(
                id=conv.id,
                created_by=conv.created_by,
                channel=conv.channel,
                participants=participants,
                last_message=last_message,
                last_message_at=last_msg.created_at if last_msg else None,
                created_at=conv.created_at,
            )
        )
    out.sort(key=lambda c: c.last_message_at or c.created_at, reverse=True)
    return out


@router.post("/direct-conversations", response_model=ConversationOut, status_code=201)
async def start_conversation(
    payload: ConversationStart,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    partner_ids = {str(pid) for pid in payload.partner_ids if str(pid) != str(current_user.id)}
    if not partner_ids:
        raise HTTPException(status_code=400, detail="Kamida bitta hamkor tanlang")

    partners_result = await db.execute(select(User).where(User.id.in_(partner_ids)))
    partners = partners_result.scalars().all()
    if len(partners) != len(partner_ids):
        raise HTTPException(status_code=404, detail="Tanlangan foydalanuvchilardan biri topilmadi")

    # For a plain 1-1 chat, reuse an existing conversation with exactly these two people.
    if len(partner_ids) == 1:
        (other_id,) = partner_ids
        candidate_result = await db.execute(
            select(DirectConversationMember.conversation_id)
            .where(DirectConversationMember.user_id == current_user.id)
        )
        my_conv_ids = {str(cid) for cid in candidate_result.scalars().all()}
        other_result = await db.execute(
            select(DirectConversationMember.conversation_id)
            .where(DirectConversationMember.user_id == other_id)
        )
        other_conv_ids = {str(cid) for cid in other_result.scalars().all()}
        shared = my_conv_ids & other_conv_ids
        for conv_id in shared:
            count_result = await db.execute(
                select(DirectConversationMember).where(DirectConversationMember.conversation_id == conv_id)
            )
            if len(count_result.scalars().all()) == 2:
                conv_result = await db.execute(select(DirectConversation).where(DirectConversation.id == conv_id))
                existing = conv_result.scalar_one()
                if existing.channel != payload.channel:
                    continue
                names = await _names_map(db, {str(other_id)})
                return ConversationOut(
                    id=existing.id,
                    created_by=existing.created_by,
                    channel=existing.channel,
                    participants=[ParticipantOut(user_id=other_id, full_name=names.get(str(other_id), ""))],
                    last_message=None,
                    last_message_at=None,
                    created_at=existing.created_at,
                )

    conversation = DirectConversation(created_by=current_user.id, channel=payload.channel)
    db.add(conversation)
    await db.flush()
    db.add(DirectConversationMember(conversation_id=conversation.id, user_id=current_user.id, approved=True))
    is_office = payload.channel == "office"
    for pid in partner_ids:
        db.add(DirectConversationMember(conversation_id=conversation.id, user_id=pid, approved=is_office))
        if not is_office:
            db.add(
                Notification(
                    user_id=pid,
                    type="direct_chat_invite",
                    message=f"{current_user.full_name} siz bilan maxfiy suhbat boshlamoqchi.",
                    related_user_id=current_user.id,
                    invite_token=str(conversation.id),
                )
            )
    await db.commit()
    await db.refresh(conversation)
    if not is_office:
        for pid in partner_ids:
            await ping_notifications(pid)

    names = await _names_map(db, partner_ids)
    return ConversationOut(
        id=conversation.id,
        created_by=conversation.created_by,
        channel=conversation.channel,
        participants=[ParticipantOut(user_id=pid, full_name=names.get(pid, "")) for pid in partner_ids],
        last_message=None,
        last_message_at=None,
        created_at=conversation.created_at,
    )


@router.get("/direct-conversations/{conversation_id}/members", response_model=list[DirectMemberOut])
async def list_conversation_members(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_participant(db, conversation_id, current_user.id)
    result = await db.execute(
        select(User, DirectConversationMember)
        .join(DirectConversationMember, DirectConversationMember.user_id == User.id)
        .where(DirectConversationMember.conversation_id == conversation_id)
        .order_by(User.full_name)
    )
    return [
        DirectMemberOut(user_id=u.id, full_name=u.full_name, approved=m.approved) for u, m in result.all()
    ]


@router.delete("/direct-conversations/{conversation_id}/members/me", status_code=204)
async def leave_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Any participant (active or still-pending) can remove themselves. If
    that leaves only the creator behind, the whole conversation is cleaned up
    the same way a rejection would."""
    result = await db.execute(
        select(DirectConversationMember).where(
            DirectConversationMember.conversation_id == conversation_id,
            DirectConversationMember.user_id == current_user.id,
        )
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="Siz bu suhbat ishtirokchisi emassiz")

    await db.delete(member)
    await db.commit()

    remaining_result = await db.execute(
        select(DirectConversationMember).where(DirectConversationMember.conversation_id == conversation_id)
    )
    remaining = remaining_result.scalars().all()
    if len(remaining) <= 1:
        await delete_conversation_cascade(db, conversation_id)


@router.delete("/direct-conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(DirectConversation).where(DirectConversation.id == conversation_id))
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=404, detail="Suhbat topilmadi")
    if str(conversation.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat suhbatni boshlagan odam uni o'chira oladi")

    await delete_conversation_cascade(db, conversation_id)


@router.get("/direct-conversations/{conversation_id}/messages", response_model=list[DirectMessageOut])
async def get_direct_messages(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_participant(db, conversation_id, current_user.id)
    result = await db.execute(
        select(DirectMessage, User)
        .join(User, User.id == DirectMessage.sender_id)
        .where(DirectMessage.conversation_id == conversation_id)
        .order_by(DirectMessage.created_at)
    )
    return [_to_message_out(m, u.full_name) for m, u in result.all()]


@router.post("/direct-conversations/{conversation_id}/messages", response_model=DirectMessageOut, status_code=201)
async def send_direct_message(
    conversation_id: str,
    content: str = Form(""),
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_participant(db, conversation_id, current_user.id)

    file_url = None
    file_name = None
    if file is not None and file.filename:
        data = await file.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail="Fayl hajmi juda katta (15 MB dan kichik bo'lsin)")
        ext = os.path.splitext(file.filename)[1]
        stored_name = f"{uuid_lib.uuid4().hex}{ext}"
        with open(os.path.join(UPLOAD_DIR, stored_name), "wb") as f:
            f.write(data)
        file_url = f"/uploads/{stored_name}"
        file_name = file.filename

    if not content.strip() and not file_url:
        raise HTTPException(status_code=400, detail="Xabar yoki fayl kerak")

    message = DirectMessage(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=content.strip() or None,
        file_url=file_url,
        file_name=file_name,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    out = _to_message_out(message, current_user.full_name)
    await direct_chat_manager.broadcast(str(conversation_id), out.model_dump(mode="json"))

    conv_result = await db.execute(select(DirectConversation).where(DirectConversation.id == conversation_id))
    conv = conv_result.scalar_one_or_none()
    if conv and conv.channel == "office":
        return out

    # Notify the other participant(s) so they see it even if not actively viewing.
    members_result = await db.execute(
        select(DirectConversationMember.user_id).where(
            DirectConversationMember.conversation_id == conversation_id,
            DirectConversationMember.user_id != current_user.id,
        )
    )
    recipient_ids = members_result.scalars().all()
    for uid in recipient_ids:
        db.add(
            Notification(
                user_id=uid,
                type="direct_message",
                message=f"{current_user.full_name}: {content.strip()[:60] if content.strip() else f'📎 {file_name}'}",
            )
        )
    await db.commit()
    for uid in recipient_ids:
        await ping_notifications(uid)

    return out


@router.patch("/direct-conversations/{conversation_id}/messages/{message_id}", response_model=DirectMessageOut)
async def edit_direct_message(
    conversation_id: str,
    message_id: str,
    payload: DirectMessageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_participant(db, conversation_id, current_user.id)
    result = await db.execute(
        select(DirectMessage).where(DirectMessage.id == message_id, DirectMessage.conversation_id == conversation_id)
    )
    message = result.scalar_one_or_none()
    if message is None:
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    if str(message.sender_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat o'zingizning xabaringizni tahrirlay olasiz")

    message.content = payload.content
    message.edited = True
    await db.commit()

    out = _to_message_out(message, current_user.full_name)
    await direct_chat_manager.broadcast(str(conversation_id), {"type": "message_updated", **out.model_dump(mode="json")})
    return out


@router.delete("/direct-conversations/{conversation_id}/messages/{message_id}", status_code=204)
async def delete_direct_message(
    conversation_id: str,
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_participant(db, conversation_id, current_user.id)
    result = await db.execute(
        select(DirectMessage).where(DirectMessage.id == message_id, DirectMessage.conversation_id == conversation_id)
    )
    message = result.scalar_one_or_none()
    if message is None:
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    if str(message.sender_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat o'zingizning xabaringizni o'chira olasiz")

    message.deleted = True
    await db.commit()
    await direct_chat_manager.broadcast(str(conversation_id), {"type": "message_deleted", "id": str(message_id)})


@router.websocket("/ws/direct/{conversation_id}")
async def direct_chat_ws(websocket: WebSocket, conversation_id: str):
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
            await _require_participant(db, conversation_id, user_id)
        except HTTPException:
            await websocket.close(code=4403)
            return

    await direct_chat_manager.connect(str(conversation_id), websocket)
    try:
        while True:
            data = await websocket.receive_json()
            content = (data.get("content") or "").strip()
            if not content:
                continue
            async with async_session() as db:
                message = DirectMessage(conversation_id=conversation_id, sender_id=user_id, content=content)
                db.add(message)
                await db.commit()
                await db.refresh(message)
                out = _to_message_out(message, sender.full_name)
                await direct_chat_manager.broadcast(str(conversation_id), out.model_dump(mode="json"))

                conv_result = await db.execute(
                    select(DirectConversation).where(DirectConversation.id == conversation_id)
                )
                conv = conv_result.scalar_one_or_none()
                if conv and conv.channel == "office":
                    continue

                members_result = await db.execute(
                    select(DirectConversationMember.user_id).where(
                        DirectConversationMember.conversation_id == conversation_id,
                        DirectConversationMember.user_id != user_id,
                    )
                )
                recipient_ids = members_result.scalars().all()
                for uid in recipient_ids:
                    db.add(
                        Notification(
                            user_id=uid,
                            type="direct_message",
                            message=f"{sender.full_name}: {content[:60]}",
                        )
                    )
                await db.commit()
                for uid in recipient_ids:
                    await ping_notifications(uid)
    except WebSocketDisconnect:
        direct_chat_manager.disconnect(str(conversation_id), websocket)
