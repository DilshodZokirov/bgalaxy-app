import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class WarehouseSettingsUpdate(BaseModel):
    """Legacy single-warehouse toggle — still accepted for backward compat.
    Prefer POST/DELETE /warehouses for multi-warehouse management."""

    has_warehouse: bool
    warehouse_type: str | None = None  # "technology" | "clothing" | "food"


class WarehouseCreate(BaseModel):
    warehouse_type: str  # "technology" | "clothing" | "food"
    name: str | None = None


class WarehouseOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    warehouse_type: str
    name: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    price: float = 0
    quantity: float = 0
    unit: str = "dona"  # "dona" | "kg" | "litr"
    warehouse_id: uuid.UUID | None = None
    image_url: str | None = None
    low_stock_threshold: float | None = None
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
    low_stock_threshold: float | None = None
    size: str | None = None
    color: str | None = None
    expiry_date: date | None = None
    sku: str | None = None
    notes: str | None = None


class ProductListMarketplace(BaseModel):
    """List a product on Marketplace with a selling price."""

    price: float = Field(gt=0)


class ProductOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    warehouse_id: uuid.UUID | None = None
    warehouse_type: str | None = None
    name: str
    price: float
    quantity: float
    reserved_quantity: float = 0
    available_quantity: float | None = None
    unit: str
    image_url: str | None = None
    low_stock_threshold: float | None = None
    source_company_id: uuid.UUID | None = None
    source_company_name: str | None = None
    listed_on_marketplace: bool = True
    size: str | None = None
    color: str | None = None
    expiry_date: date | None = None
    sku: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MarketplaceProductOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    company_name: str
    warehouse_id: uuid.UUID | None = None
    warehouse_type: str | None = None
    name: str
    price: float
    quantity: float  # available for sale (quantity - reserved)
    reserved_quantity: float = 0
    unit: str
    image_url: str | None = None

    class Config:
        from_attributes = True


class MarketplaceSellerOut(BaseModel):
    company_id: uuid.UUID
    company_name: str
    company_type: str
    logo_url: str | None = None
    location_region: str | None = None
    product_count: int = 0
    avg_rating: float | None = None
    rating_count: int = 0


class OrderCreate(BaseModel):
    seller_company_id: uuid.UUID
    product_id: uuid.UUID
    quantity: float
    warehouse_id: uuid.UUID | None = None  # buyer's target warehouse (optional)


class CartItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: float = Field(gt=0)


class CartOrderCreate(BaseModel):
    """Multi-product checkout — all items must belong to one seller."""

    seller_company_id: uuid.UUID
    items: list[CartItemCreate]
    warehouse_id: uuid.UUID | None = None


class OrderTransition(BaseModel):
    action: str  # start_loading | confirm_loaded | dispatch | accept_courier | confirm_arrival | confirm_receipt | cancel
    note: str | None = None


class OrderOut(BaseModel):
    id: uuid.UUID
    batch_id: uuid.UUID | None = None
    buyer_company_id: uuid.UUID
    seller_company_id: uuid.UUID
    seller_product_id: uuid.UUID
    buyer_warehouse_id: uuid.UUID | None = None
    product_name: str
    unit: str
    quantity: float
    unit_price: float
    total_price: float
    status: str
    status_note: str | None = None
    ordered_by_user_id: uuid.UUID | None = None
    courier_user_id: uuid.UUID | None = None
    buyer_company_name: str | None = None
    seller_company_name: str | None = None
    courier_name: str | None = None
    loaded_at: datetime | None = None
    dispatched_at: datetime | None = None
    courier_accepted_at: datetime | None = None
    arrived_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class RatingCreate(BaseModel):
    rated_company_id: uuid.UUID
    order_id: uuid.UUID
    score: int = Field(ge=1, le=5)


class RatingOut(BaseModel):
    id: uuid.UUID
    rater_company_id: uuid.UUID
    rated_company_id: uuid.UUID
    order_id: uuid.UUID
    batch_id: uuid.UUID | None = None
    score: int
    created_at: datetime

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
