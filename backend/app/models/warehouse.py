import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class WarehouseProduct(Base):
    __tablename__ = "warehouse_products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(255))
    price: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    quantity: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    unit: Mapped[str] = mapped_column(String(10), default="dona")  # "dona" | "kg" | "litr"
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Type-specific fields — left null when they don't apply to the
    # company's warehouse_type (e.g. size stays null for a food warehouse).
    size: Mapped[str | None] = mapped_column(String(50), nullable=True)  # clothing
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)  # clothing
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)  # food
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True)  # technology
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("warehouse_products.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    change: Mapped[float] = mapped_column(Numeric(12, 3))  # positive = kirim, negative = chiqim
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
