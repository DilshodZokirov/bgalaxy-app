import uuid
from datetime import date, datetime

from pydantic import BaseModel


class WarehouseSettingsUpdate(BaseModel):
    has_warehouse: bool
    warehouse_type: str | None = None  # "technology" | "clothing" | "food"


class ProductCreate(BaseModel):
    name: str
    price: float = 0
    quantity: float = 0
    unit: str = "dona"  # "dona" | "kg" | "litr"
    image_url: str | None = None
    size: str | None = None
    color: str | None = None
    expiry_date: date | None = None
    sku: str | None = None
    notes: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    unit: str | None = None
    image_url: str | None = None
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
    quantity: float
    unit: str
    image_url: str | None = None
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
    change: float  # positive = kirim, negative = chiqim
    note: str | None = None


class StockMovementOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str | None = None
    change: float
    note: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
