import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.company import MemberRole


class InviteCreate(BaseModel):
    email: EmailStr
    role: MemberRole = MemberRole.member


class InviteOut(BaseModel):
    token: str
    email: EmailStr
    role: MemberRole
    company_id: uuid.UUID

    class Config:
        from_attributes = True


class InvitePreview(BaseModel):
    company_name: str
    email: EmailStr
    role: MemberRole
    accepted: bool
    created_at: datetime
