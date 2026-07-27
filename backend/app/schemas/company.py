import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.company import MemberRole
from app.schemas.warehouse import WarehouseOut


class CompanyCreate(BaseModel):
    name: str
    slug: str
    company_type: str = "kompaniya"  # "kompaniya" | "distributor" | "market"


class CompanyOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    owner_id: uuid.UUID
    logo_url: str | None = None
    company_type: str = "kompaniya"
    has_warehouse: bool = False
    warehouse_type: str | None = None
    warehouses: list[WarehouseOut] = []
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class TeamInvite(BaseModel):
    email: str
    role: MemberRole = MemberRole.member


class TeamMemberOut(BaseModel):
    user_id: uuid.UUID
    role: MemberRole
    full_name: str
    role_name: str | None = None
    approved: bool = True
    is_owner: bool = False
    is_head_admin: bool = False

    class Config:
        from_attributes = True
