import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class ActivityPing(Base):
    """One row per ~5 minutes of active usage per user (written alongside the
    throttled last_seen_at update in get_current_user). Counting pings in a
    date range gives a reasonable estimate of time spent on the site without
    needing full session tracking."""

    __tablename__ = "activity_pings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
