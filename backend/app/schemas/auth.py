import uuid

from pydantic import BaseModel, EmailStr

from app.schemas.company import CompanyOut
from app.schemas.role import MyPermissions


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleLogin(BaseModel):
    id_token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class SetPinRequest(BaseModel):
    password: str
    pin: str


class ChangePinRequest(BaseModel):
    password: str
    old_pin: str
    new_pin: str


class VerifyPinRequest(BaseModel):
    pin: str


class ResetPinRequest(BaseModel):
    token: str
    new_pin: str


class AutoLockRequest(BaseModel):
    auto_lock_minutes: int


class MessageOut(BaseModel):
    message: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    avatar_url: str | None = None
    email_verified: bool = False
    theme: str = "dark"
    ui_theme: str | None = None
    dark_background: str | None = None
    light_background: str | None = None
    is_developer: bool = False
    has_pin: bool = False
    auto_lock_minutes: int = 0

    class Config:
        from_attributes = True


class NavFlagsOut(BaseModel):
    accounting: bool = False
    analytics: bool = False
    warehouse: bool = False


class BootstrapOut(BaseModel):
    """Single payload for app shell: user + companies + active perms/nav."""

    user: UserOut
    companies: list[CompanyOut]
    active_company_id: uuid.UUID | None = None
    permissions: MyPermissions | None = None
    nav: NavFlagsOut = NavFlagsOut()


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
