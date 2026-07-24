import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.company import Company
from app.models.user import User
from app.models.warehouse import StockMovement, WarehouseProduct
from app.schemas.company import CompanyOut
from app.schemas.warehouse import (
    ProductCreate,
    ProductOut,
    ProductUpdate,
    StockAdjustment,
    StockMovementOut,
    WarehouseSettingsUpdate,
)
from app.services.permissions import require_permission

router = APIRouter(prefix="/companies/{company_id}/warehouse", tags=["warehouse"])

WAREHOUSE_TYPES = {"technology", "clothing", "food"}


async def _get_company(db: AsyncSession, company_id: str) -> Company:
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Kompaniya topilmadi")
    return company


async def _require_warehouse_enabled(db: AsyncSession, company_id: str) -> Company:
    company = await _get_company(db, company_id)
    if not company.has_warehouse:
        raise HTTPException(status_code=400, detail="Ombor bo'limi bu kompaniyada yoqilmagan")
    return company


@router.patch("/settings", response_model=CompanyOut)
async def update_warehouse_settings(
    company_id: str,
    payload: WarehouseSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_permission(db, company_id, current_user.id, "edit_company_settings")
    company = await _get_company(db, company_id)

    if payload.has_warehouse:
        if payload.warehouse_type not in WAREHOUSE_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Ishlab chiqarish turini tanlang: technology, clothing yoki food",
            )
        company.warehouse_type = payload.warehouse_type
    else:
        company.warehouse_type = None
    company.has_warehouse = payload.has_warehouse

    await db.commit()
    await db.refresh(company)
    return company


@router.get("/products", response_model=list[ProductOut])
async def list_products(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_warehouse_enabled(db, company_id)
    result = await db.execute(
        select(WarehouseProduct)
        .where(WarehouseProduct.company_id == company_id)
        .order_by(WarehouseProduct.created_at.desc())
    )
    return result.scalars().all()


@router.post("/products", response_model=ProductOut, status_code=201)
async def create_product(
    company_id: str,
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_permission(db, company_id, current_user.id, "manage_warehouse")
    company = await _require_warehouse_enabled(db, company_id)

    # Type-specific fields don't apply outside their warehouse_type — drop
    # them here rather than trust the client to leave them out.
    size = payload.size if company.warehouse_type == "clothing" else None
    color = payload.color if company.warehouse_type == "clothing" else None
    expiry_date = payload.expiry_date if company.warehouse_type == "food" else None
    sku = payload.sku if company.warehouse_type == "technology" else None

    # Same product (by name, plus size/color for clothing or sku for tech)
    # already exists — don't create a duplicate row, just add to its stock.
    existing_query = select(WarehouseProduct).where(
        WarehouseProduct.company_id == company_id,
        func.lower(WarehouseProduct.name) == payload.name.strip().lower(),
        WarehouseProduct.unit == payload.unit,
    )
    if company.warehouse_type == "clothing":
        existing_query = existing_query.where(
            WarehouseProduct.size == size, WarehouseProduct.color == color
        )
    elif company.warehouse_type == "technology":
        existing_query = existing_query.where(WarehouseProduct.sku == sku)
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalar_one_or_none()

    if existing is not None:
        if payload.quantity:
            existing.quantity += payload.quantity
            db.add(
                StockMovement(
                    id=uuid_lib.uuid4(),
                    product_id=existing.id,
                    user_id=current_user.id,
                    change=payload.quantity,
                    note="Qo'shimcha zaxira (mavjud mahsulotga qo'shildi)",
                )
            )
            await db.commit()
            await db.refresh(existing)
        return existing

    product = WarehouseProduct(
        id=uuid_lib.uuid4(),
        company_id=company_id,
        name=payload.name,
        price=payload.price,
        quantity=payload.quantity,
        unit=payload.unit,
        image_url=payload.image_url,
        size=size,
        color=color,
        expiry_date=expiry_date,
        sku=sku,
        notes=payload.notes,
    )
    db.add(product)
    if payload.quantity:
        db.add(
            StockMovement(
                id=uuid_lib.uuid4(),
                product_id=product.id,
                user_id=current_user.id,
                change=payload.quantity,
                note="Boshlang'ich zaxira",
            )
        )
    await db.commit()
    await db.refresh(product)
    return product


@router.patch("/products/{product_id}", response_model=ProductOut)
async def update_product(
    company_id: str,
    product_id: str,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_permission(db, company_id, current_user.id, "manage_warehouse")
    company = await _require_warehouse_enabled(db, company_id)

    result = await db.execute(
        select(WarehouseProduct).where(WarehouseProduct.id == product_id, WarehouseProduct.company_id == company_id)
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")

    data = payload.model_dump(exclude_unset=True)
    if "size" in data and company.warehouse_type != "clothing":
        data.pop("size")
    if "color" in data and company.warehouse_type != "clothing":
        data.pop("color")
    if "expiry_date" in data and company.warehouse_type != "food":
        data.pop("expiry_date")
    if "sku" in data and company.warehouse_type != "technology":
        data.pop("sku")
    for key, value in data.items():
        setattr(product, key, value)

    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    company_id: str,
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_permission(db, company_id, current_user.id, "manage_warehouse")
    await _require_warehouse_enabled(db, company_id)

    result = await db.execute(
        select(WarehouseProduct).where(WarehouseProduct.id == product_id, WarehouseProduct.company_id == company_id)
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")

    await db.execute(StockMovement.__table__.delete().where(StockMovement.product_id == product_id))
    await db.delete(product)
    await db.commit()


@router.post("/products/{product_id}/stock", response_model=ProductOut)
async def adjust_stock(
    company_id: str,
    product_id: str,
    payload: StockAdjustment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Kirim (positive change) or chiqim (negative change) — logged as a
    StockMovement and reflected immediately in the product's quantity."""
    await require_permission(db, company_id, current_user.id, "manage_warehouse")
    await _require_warehouse_enabled(db, company_id)

    if payload.change == 0:
        raise HTTPException(status_code=400, detail="O'zgarish 0 bo'lishi mumkin emas")

    result = await db.execute(
        select(WarehouseProduct).where(WarehouseProduct.id == product_id, WarehouseProduct.company_id == company_id)
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")

    new_quantity = product.quantity + payload.change
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Omborda yetarli mahsulot yo'q")

    product.quantity = new_quantity
    db.add(
        StockMovement(
            id=uuid_lib.uuid4(),
            product_id=product.id,
            user_id=current_user.id,
            change=payload.change,
            note=payload.note,
        )
    )
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/products/{product_id}/history", response_model=list[StockMovementOut])
async def get_stock_history(
    company_id: str,
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_warehouse_enabled(db, company_id)

    result = await db.execute(
        select(StockMovement, User.full_name)
        .join(User, User.id == StockMovement.user_id)
        .where(StockMovement.product_id == product_id)
        .order_by(StockMovement.created_at.desc())
    )
    out = []
    for movement, user_name in result.all():
        out.append(
            StockMovementOut(
                id=movement.id,
                product_id=movement.product_id,
                user_id=movement.user_id,
                user_name=user_name,
                change=movement.change,
                note=movement.note,
                created_at=movement.created_at,
            )
        )
    return out
