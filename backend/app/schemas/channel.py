import uuid
from datetime import datetime

from pydantic import BaseModel


class ChannelCreate(BaseModel):
    name: str
    member_ids: list[uuid.UUID] = []


class ChannelRename(BaseModel):
    name: str


class ChannelOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    created_by: uuid.UUID
    created_at: datetime
    member_count: int = 0
    last_message: str | None = None
    last_message_at: datetime | None = None

    class Config:
        from_attributes = True


class ChannelMemberAdd(BaseModel):
    user_ids: list[uuid.UUID]


class ChannelMemberOut(BaseModel):
    user_id: uuid.UUID
    full_name: str


class MentionCandidate(BaseModel):
    type: str  # "role" | "user"
    key: str
    label: str
