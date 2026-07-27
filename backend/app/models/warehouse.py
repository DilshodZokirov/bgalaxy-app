import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Warehouse(Base):
    """One production-type warehouse under a company.

    A company may have at most 3 warehouses and at most one of each type
    (technology / clothing / food).
    """

    __tablename__ = "warehouses"
    __table_args__ = (UniqueConstraint("company_id", "warehouse_type", name="uq_warehouses_company_type"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), index=True)
    warehouse_type: Mapped[str] = mapped_column(String(30))  # "technology" | "clothing" | "food"
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WarehouseProduct(Base):
    __tablename__ = "warehouse_products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    warehouse_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    price: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    quantity: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    # Marketplace orders reserve stock without deducting until delivery completes.
    reserved_quantity: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    unit: Mapped[str] = mapped_column(String(10), default="dona")  # "dona" | "kg" | "litr"
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    low_stock_threshold: Mapped[float | None] = mapped_column(Numeric(12, 3), nullable=True)
    # Set only for a distributor's inventory — where this stock was bought
    # from. Null for a manufacturer's (kompaniya) own self-added products.
    source_company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True)
    source_company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Type-specific fields — left null when they don't apply to the
    # warehouse's type (e.g. size stays null for a food warehouse).
    size: Mapped[str | None] = mapped_column(String(50), nullable=True)  # clothing
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)  # clothing
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)  # food
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True)  # technology
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class WarehouseOrder(Base):
    """Distributor marketplace order with multi-stage fulfillment.

    On place: seller stock is reserved (not deducted). On complete: seller
    stock is finalized, buyer warehouse is credited, seller accounting
    income is recorded. See warehouse routes order pipeline.
    """

    __tablename__ = "warehouse_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    seller_company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"))
    seller_product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("warehouse_products.id"))
    buyer_warehouse_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=True
    )
    product_name: Mapped[str] = mapped_column(String(255))
    unit: Mapped[str] = mapped_column(String(10))
    quantity: Mapped[float] = mapped_column(Numeric(12, 3))
    unit_price: Mapped[float] = mapped_column(Numeric(14, 2))
    total_price: Mapped[float] = mapped_column(Numeric(14, 2))
    # ordered | loading | loaded | on_road | courier_accepted | awaiting_receipt | completed | cancelled
    status: Mapped[str] = mapped_column(String(30), default="ordered", index=True)
    status_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ordered_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    courier_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    loaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    courier_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    arrived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("warehouse_products.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    change: Mapped[float] = mapped_column(Numeric(12, 3))  # positive = kirim, negative = chiqim
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
