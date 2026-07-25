import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base

# Every role's permission set is a dict with these keys (all default False
# unless set). Keeping this flat/simple avoids a separate join table for a
# small, fixed list of permission flags.
PERMISSION_KEYS = [
    "invite_members",
    "remove_members",
    "start_meeting",
    "host_meeting_controls",
    "edit_company_settings",
    "manage_accounting",
    "manage_tasks",
    "view_analytics",
    "manage_warehouse",
    "ombor_ishchi",
]

DEFAULT_ROLE_PERMISSIONS = {
    "Admin": {
        "invite_members": True,
        "remove_members": True,
        "start_meeting": True,
        "host_meeting_controls": True,
        "edit_company_settings": True,
        "manage_accounting": True,
        "manage_tasks": True,
        "view_analytics": True,
        "manage_warehouse": True,
        "ombor_ishchi": True,
    },
    "Menejer": {
        "invite_members": False,
        "remove_members": False,
        "start_meeting": True,
        "host_meeting_controls": True,
        "edit_company_settings": False,
        "manage_accounting": False,
        "manage_tasks": True,
        "view_analytics": True,
        "manage_warehouse": True,
        "ombor_ishchi": True,
    },
    "Buxgalter": {
        "invite_members": False,
        "remove_members": False,
        "start_meeting": False,
        "host_meeting_controls": False,
        "edit_company_settings": False,
        "manage_accounting": True,
        "manage_tasks": False,
        "view_analytics": False,
        "manage_warehouse": False,
        "ombor_ishchi": False,
    },
    "Xodim": {
        "invite_members": False,
        "remove_members": False,
        "start_meeting": True,
        "host_meeting_controls": False,
        "edit_company_settings": False,
        "manage_accounting": False,
        "manage_tasks": False,
        "view_analytics": False,
        "manage_warehouse": False,
        "ombor_ishchi": False,
    },
}


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id")
    )
    name: Mapped[str] = mapped_column(String(100))
    permissions: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
