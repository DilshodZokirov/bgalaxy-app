import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ScheduledMeetingCreate(BaseModel):
    company_id: uuid.UUID
    title: str = Field(min_length=1, max_length=255)
    description: str = ""
    starts_at: datetime


class ScheduledMeetingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    starts_at: datetime | None = None


class ScheduledMeetingOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    created_by: uuid.UUID
    creator_name: str = ""
    company_name: str = ""
    title: str
    description: str
    starts_at: datetime
    status: str
    notified_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True
