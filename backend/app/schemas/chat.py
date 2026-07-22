import uuid
from datetime import datetime

from pydantic import BaseModel


class MessageOut(BaseModel):
    id: uuid.UUID
    channel_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    content: str
    reply_to_id: uuid.UUID | None = None
    reply_sender_name: str | None = None
    reply_preview: str | None = None
    forwarded_from: str | None = None
    edited: bool = False
    deleted: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str
    forwarded_from: str | None = None


class MessageUpdate(BaseModel):
    content: str
