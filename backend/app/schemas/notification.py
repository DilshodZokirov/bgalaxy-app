import uuid
from datetime import datetime

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: uuid.UUID
    type: str
    message: str
    company_id: uuid.UUID | None
    company_name: str | None = None
    related_user_id: uuid.UUID | None
    related_user_name: str | None = None
    invite_token: str | None = None
    read: bool
    resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True
