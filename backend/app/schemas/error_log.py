import uuid
from datetime import datetime

from pydantic import BaseModel


class FrontendErrorReport(BaseModel):
    message: str
    stack: str | None = None
    path: str | None = None
    level: str = "error"


class ErrorLogOut(BaseModel):
    id: uuid.UUID
    source: str
    level: str
    message: str
    stack_trace: str | None
    path: str | None
    method: str | None
    user_email: str | None = None
    user_agent: str | None
    created_at: datetime

    class Config:
        from_attributes = True
