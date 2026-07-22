import uuid

from pydantic import BaseModel, EmailStr


class UserSearchResult(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    theme: str | None = None
    ui_theme: str | None = None
    dark_background: str | None = None
    light_background: str | None = None
