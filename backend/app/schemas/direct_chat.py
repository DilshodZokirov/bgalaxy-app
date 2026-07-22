import uuid
from datetime import datetime

from pydantic import BaseModel


class ConversationStart(BaseModel):
    partner_ids: list[uuid.UUID]
    channel: str = "chat"  # "chat" | "office"


class ParticipantOut(BaseModel):
    user_id: uuid.UUID
    full_name: str


class DirectMemberOut(BaseModel):
    user_id: uuid.UUID
    full_name: str
    approved: bool


class ConversationOut(BaseModel):
    id: uuid.UUID
    created_by: uuid.UUID
    channel: str = "chat"
    participants: list[ParticipantOut]
    last_message: str | None = None
    last_message_at: datetime | None = None
    created_at: datetime


class DirectMessageOut(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    content: str | None
    file_url: str | None
    file_name: str | None
    edited: bool
    deleted: bool
    created_at: datetime


class DirectMessageUpdate(BaseModel):
    content: str
