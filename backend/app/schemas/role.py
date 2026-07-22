import uuid
from datetime import datetime

from pydantic import BaseModel


class RoleOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    permissions: dict
    created_at: datetime

    class Config:
        from_attributes = True


class RoleCreate(BaseModel):
    name: str
    permissions: dict = {}


class RoleUpdate(BaseModel):
    name: str | None = None
    permissions: dict | None = None


class AssignRole(BaseModel):
    role_id: uuid.UUID


class SetHeadAdminRequest(BaseModel):
    user_id: uuid.UUID | None = None  # None clears the head admin


class TransferOwnershipRequest(BaseModel):
    new_owner_id: uuid.UUID
    password: str


class MyPermissions(BaseModel):
    is_owner: bool
    role_name: str | None = None
    permissions: dict
    head_admin_id: uuid.UUID | None = None
