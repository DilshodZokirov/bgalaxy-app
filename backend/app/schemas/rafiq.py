import uuid
from datetime import datetime

from pydantic import BaseModel


class RafiqMessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class RafiqChatRequest(BaseModel):
    message: str
    active_company_id: str | None = None


class RafiqChatResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime
    client_action: dict | None = None
