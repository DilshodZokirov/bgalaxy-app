import uuid
from datetime import date, datetime

from pydantic import BaseModel


class WarehouseSettingsUpdate(BaseModel):
    has_warehouse: bool
    warehouse_type: str | None = None  # "technology" | "clothing" | "food"


class ProductCreate(BaseModel):
    name: str
    price: float = 0
    quantity: int = 0
    size: str | None = None
    color: str | None = None
    expiry_date: date | None = None
    sku: str | None = None
    notes: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    size: str | None = None
    color: str | None = None
    expiry_date: date | None = None
    sku: str | None = None
    notes: str | None = None


class ProductOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    price: float
    quantity: int
    size: str | None = None
    color: str | None = None
    expiry_date: date | None = None
    sku: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StockAdjustment(BaseModel):
    change: int  # positive = kirim, negative = chiqim
    note: str | None = None


class StockMovementOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str | None = None
    change: int
    note: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
