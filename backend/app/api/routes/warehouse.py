import uuid as uuid_lib
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.accounting import Transaction
from app.models.company import Company
from app.models.user import User
from app.models.warehouse import StockMovement, Warehouse, WarehouseOrder, WarehouseProduct
from app.schemas.company import CompanyOut
from app.schemas.warehouse import (
    MarketplaceProductOut,
    OrderCreate,
    OrderOut,
    OrderTransition,
    ProductCreate,
    ProductOut,
    ProductUpdate,
    StockAdjustment,
    StockMovementOut,
    WarehouseCreate,
    WarehouseOut,
    WarehouseSettingsUpdate,
)
from app.services.order_pipeline import (
    ORDER_STATUS_LABELS,
    available_qty,
    notify_users,
    users_with_permission,
)
from app.services.permissions import get_permissions, require_any_permission, require_permission

router = APIRouter(prefix="/companies/{company_id}/warehouse", tags=["warehouse"])

WAREHOUSE_TYPES = {"technology", "clothing", "food"}
WAREHOUSE_TYPE_NAMES = {
    "technology": "Texnologiya ombori",
    "clothing": "Kiyim-kechak ombori",
    "food": "Oziq-ovqat ombori",
}
MAX_WAREHOUSES = 3
VIEW_PERMISSIONS = ["manage_warehouse", "ombor_ishchi", "warehouse_loader", "warehouse_courier"]


def _day_key(d: date) -> str:
    return d.strftime("%Y-%m-%d")


def _week_key(d: date) -> str:
    monday = d - timedelta(days=d.weekday())
    return monday.strftime("%m-%d")


def _month_key(d: date) -> str:
    return d.strftime("%Y-%m")


def _dashboard_buckets(period: str):
    """Returns (bucket_keys, start_date, key_fn) — mirrors the granularity
    pattern used on the Kompaniya Statistika trend charts."""
    today = date.today()
    if period == "today":
        return [_day_key(today)], today, _day_key
    if period == "week":
        keys = [_day_key(today - timedelta(days=i)) for i in range(6, -1, -1)]
        return keys, today - timedelta(days=6), _day_key
    if period == "month":
        this_monday = today - timedelta(days=today.weekday())
        keys = [_week_key(this_monday - timedelta(weeks=i)) for i in range(3, -1, -1)]
        return keys, today - timedelta(weeks=4), _week_key
    months_map = {"3m": 3, "6m": 6, "year": 12}
    n = months_map.get(period, 6)
    keys = []
    start_month = today.replace(day=1)
    for i in range(n - 1, -1, -1):
        y, m = start_month.year, start_month.month - i
        while m <= 0:
            m += 12
            y -= 1
        keys.append(f"{y:04d}-{m:02d}")
    start = date(int(keys[0][:4]), int(keys[0][5:7]), 1)
    return keys, start, _month_key


async def _get_company(db: AsyncSession, company_id: str) -> Company:
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Kompaniya topilmadi")
    return company


async def _list_warehouses(db: AsyncSession, company_id: str) -> list[Warehouse]:
    result = await db.execute(
        select(Warehouse)
        .where(Warehouse.company_id == company_id)
        .order_by(Warehouse.created_at.asc())
    )
    return list(result.scalars().all())


async def _ensure_legacy_warehouses(db: AsyncSession, company: Company) -> list[Warehouse]:
    """Restore the pre-multi-warehouse company ombor if the warehouses
    table was empty after deploy (legacy has_warehouse + warehouse_type).

    Never deletes existing data — only creates the missing Warehouse row
    and attaches orphan products (warehouse_id IS NULL).
    """
    warehouses = await _list_warehouses(db, str(company.id))
    if warehouses:
        if len(warehouses) == 1:
            await db.execute(
                WarehouseProduct.__table__.update()
                .where(
                    WarehouseProduct.company_id == company.id,
                    WarehouseProduct.warehouse_id.is_(None),
                )
                .values(warehouse_id=warehouses[0].id)
            )
            await db.flush()
        return warehouses

    product_count = (
        await db.execute(
            select(func.count()).select_from(WarehouseProduct).where(WarehouseProduct.company_id == company.id)
        )
    ).scalar_one()

    wh_type = company.warehouse_type if company.warehouse_type in WAREHOUSE_TYPES else None
    if not company.has_warehouse and not wh_type and not product_count:
        return []

    if wh_type is None and product_count:
        # Infer type from product fields if legacy type was cleared.
        sample = (
            await db.execute(
                select(WarehouseProduct.size, WarehouseProduct.sku, WarehouseProduct.expiry_date)
                .where(WarehouseProduct.company_id == company.id)
                .limit(20)
            )
        ).all()
        if any(row[2] is not None for row in sample):
            wh_type = "food"
        elif any(row[1] for row in sample):
            wh_type = "technology"
        elif any(row[0] for row in sample):
            wh_type = "clothing"
        elif company.has_warehouse:
            wh_type = "food"

    if wh_type is None:
        if company.has_warehouse:
            wh_type = "food"
        else:
            return []

    if wh_type not in WAREHOUSE_TYPES:
        return []

    warehouse = Warehouse(
        id=uuid_lib.uuid4(),
        company_id=company.id,
        warehouse_type=wh_type,
        name=WAREHOUSE_TYPE_NAMES[wh_type],
    )
    db.add(warehouse)
    await db.flush()
    await db.execute(
        WarehouseProduct.__table__.update()
        .where(
            WarehouseProduct.company_id == company.id,
            WarehouseProduct.warehouse_id.is_(None),
        )
        .values(warehouse_id=warehouse.id)
    )
    company.has_warehouse = True
    company.warehouse_type = wh_type
    await db.flush()
    return [warehouse]


async def _sync_company_flags(db: AsyncSession, company: Company) -> list[Warehouse]:
    """Update company.has_warehouse / warehouse_type from the warehouses table.
    Does NOT auto-create rows (that would undo intentional deletes)."""
    warehouses = await _list_warehouses(db, str(company.id))
    company.has_warehouse = len(warehouses) > 0
    if len(warehouses) == 1:
        company.warehouse_type = warehouses[0].warehouse_type
    elif len(warehouses) == 0:
        company.warehouse_type = None
    else:
        company.warehouse_type = None
    return warehouses


def _company_out(company: Company, warehouses: list[Warehouse]) -> CompanyOut:
    lat = getattr(company, "latitude", None)
    lng = getattr(company, "longitude", None)
    return CompanyOut(
        id=company.id,
        name=company.name,
        slug=company.slug,
        owner_id=company.owner_id,
        logo_url=company.logo_url,
        location_region=getattr(company, "location_region", None),
        location_address=getattr(company, "location_address", None),
        inn=getattr(company, "inn", None),
        latitude=float(lat) if lat is not None else None,
        longitude=float(lng) if lng is not None else None,
        geo_label=getattr(company, "geo_label", None),
        company_type=company.company_type,
        has_warehouse=bool(warehouses) or bool(company.has_warehouse),
        warehouse_type=company.warehouse_type
        or (warehouses[0].warehouse_type if len(warehouses) == 1 else None),
        warehouses=[WarehouseOut.model_validate(w) for w in warehouses],
        created_at=company.created_at,
    )


async def _require_warehouse_enabled(db: AsyncSession, company_id: str) -> tuple[Company, list[Warehouse]]:
    company = await _get_company(db, company_id)
    warehouses = await _ensure_legacy_warehouses(db, company)
    if warehouses:
        company.has_warehouse = True
        await db.commit()
    if not warehouses and not company.has_warehouse:
        raise HTTPException(status_code=400, detail="Ombor bo'limi bu kompaniyada yoqilmagan")
    return company, warehouses


async def _get_warehouse(
    db: AsyncSession, company_id: str, warehouse_id: str | None
) -> Warehouse | None:
    if not warehouse_id:
        return None
    result = await db.execute(
        select(Warehouse).where(Warehouse.id == warehouse_id, Warehouse.company_id == company_id)
    )
    warehouse = result.scalar_one_or_none()
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Ombor topilmadi")
    return warehouse


def _product_out(product: WarehouseProduct, warehouse: Warehouse | None = None) -> ProductOut:
    wh_type = warehouse.warehouse_type if warehouse else None
    qty = float(product.quantity)
    reserved = float(getattr(product, "reserved_quantity", 0) or 0)
    return ProductOut(
        id=product.id,
        company_id=product.company_id,
        warehouse_id=product.warehouse_id,
        warehouse_type=wh_type,
        name=product.name,
        price=float(product.price),
        quantity=qty,
        reserved_quantity=reserved,
        available_quantity=max(0.0, qty - reserved),
        unit=product.unit,
        image_url=product.image_url,
        low_stock_threshold=float(product.low_stock_threshold) if product.low_stock_threshold is not None else None,
        source_company_id=product.source_company_id,
        source_company_name=product.source_company_name,
        size=product.size,
        color=product.color,
        expiry_date=product.expiry_date,
        sku=product.sku,
        notes=product.notes,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


async def _order_out(db: AsyncSession, order: WarehouseOrder) -> OrderOut:
    buyer_name = None
    seller_name = None
    courier_name = None
    buyer = (await db.execute(select(Company).where(Company.id == order.buyer_company_id))).scalar_one_or_none()
    seller = (await db.execute(select(Company).where(Company.id == order.seller_company_id))).scalar_one_or_none()
    if buyer:
        buyer_name = buyer.name
    if seller:
        seller_name = seller.name
    if order.courier_user_id:
        courier = (await db.execute(select(User).where(User.id == order.courier_user_id))).scalar_one_or_none()
        if courier:
            courier_name = courier.full_name
    return OrderOut(
        id=order.id,
        buyer_company_id=order.buyer_company_id,
        seller_company_id=order.seller_company_id,
        seller_product_id=order.seller_product_id,
        buyer_warehouse_id=order.buyer_warehouse_id,
        product_name=order.product_name,
        unit=order.unit,
        quantity=float(order.quantity),
        unit_price=float(order.unit_price),
        total_price=float(order.total_price),
        status=order.status,
        status_note=order.status_note,
        ordered_by_user_id=order.ordered_by_user_id,
        courier_user_id=order.courier_user_id,
        buyer_company_name=buyer_name,
        seller_company_name=seller_name,
        courier_name=courier_name,
        loaded_at=order.loaded_at,
        dispatched_at=order.dispatched_at,
        courier_accepted_at=order.courier_accepted_at,
        arrived_at=order.arrived_at,
        completed_at=order.completed_at,
        created_at=order.created_at,
    )


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _warehouse_map(db: AsyncSession, company_id: str) -> dict[str, Warehouse]:
    company = await _get_company(db, company_id)
    warehouses = await _ensure_legacy_warehouses(db, company)
    if warehouses and not company.has_warehouse:
        company.has_warehouse = True
        await db.commit()
    return {str(w.id): w for w in warehouses}


@router.get("/list", response_model=list[WarehouseOut])
async def list_warehouses(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_any_permission(db, company_id, current_user.id, VIEW_PERMISSIONS + ["edit_company_settings"])
    company = await _get_company(db, company_id)
    warehouses = await _ensure_legacy_warehouses(db, company)
    if warehouses:
        company.has_warehouse = True
        if len(warehouses) == 1:
            company.warehouse_type = warehouses[0].warehouse_type
        await db.commit()
    return warehouses


@router.post("/list", response_model=WarehouseOut, status_code=201)
async def create_warehouse(
    company_id: str,
    payload: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_permission(db, company_id, current_user.id, "edit_company_settings")
    company = await _get_company(db, company_id)

    if payload.warehouse_type not in WAREHOUSE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Ombor turi: technology, clothing yoki food bo'lishi kerak",
        )

    existing = await _list_warehouses(db, company_id)
    if len(existing) >= MAX_WAREHOUSES:
        raise HTTPException(status_code=400, detail="Bir korxonada maksimal 3 ta ombor bo'lishi mumkin")
    if any(w.warehouse_type == payload.warehouse_type for w in existing):
        raise HTTPException(
            status_code=400,
            detail="Bu turdagi ombor allaqachon mavjud — har bir turdan faqat bittadan",
        )

    warehouse = Warehouse(
        id=uuid_lib.uuid4(),
        company_id=company_id,
        warehouse_type=payload.warehouse_type,
        name=(payload.name or "").strip() or WAREHOUSE_TYPE_NAMES[payload.warehouse_type],
    )
    db.add(warehouse)
    await db.flush()
    await _sync_company_flags(db, company)
    await db.commit()
    await db.refresh(warehouse)
    return warehouse


@router.delete("/list/{warehouse_id}", status_code=204)
async def delete_warehouse(
    company_id: str,
    warehouse_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_permission(db, company_id, current_user.id, "edit_company_settings")
    company = await _get_company(db, company_id)
    warehouse = await _get_warehouse(db, company_id, warehouse_id)
    assert warehouse is not None

    products_result = await db.execute(
        select(WarehouseProduct.id).where(WarehouseProduct.warehouse_id == warehouse.id)
    )
    product_ids = [row[0] for row in products_result.all()]
    if product_ids:
        await db.execute(StockMovement.__table__.delete().where(StockMovement.product_id.in_(product_ids)))
        await db.execute(WarehouseProduct.__table__.delete().where(WarehouseProduct.id.in_(product_ids)))

    await db.delete(warehouse)
    await db.flush()
    await _sync_company_flags(db, company)
    await db.commit()


@router.patch("/settings", response_model=CompanyOut)
async def update_warehouse_settings(
    company_id: str,
    payload: WarehouseSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Legacy toggle — creates the first warehouse or removes all."""
    await require_permission(db, company_id, current_user.id, "edit_company_settings")
    company = await _get_company(db, company_id)
    warehouses = await _list_warehouses(db, company_id)

    if payload.has_warehouse:
        if payload.warehouse_type not in WAREHOUSE_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Ishlab chiqarish turini tanlang: technology, clothing yoki food",
            )
        if not any(w.warehouse_type == payload.warehouse_type for w in warehouses):
            if len(warehouses) >= MAX_WAREHOUSES:
                raise HTTPException(status_code=400, detail="Bir korxonada maksimal 3 ta ombor bo'lishi mumkin")
            db.add(
                Warehouse(
                    id=uuid_lib.uuid4(),
                    company_id=company_id,
                    warehouse_type=payload.warehouse_type,
                    name=WAREHOUSE_TYPE_NAMES[payload.warehouse_type],
                )
            )
            await db.flush()
    else:
        for wh in warehouses:
            products_result = await db.execute(
                select(WarehouseProduct.id).where(WarehouseProduct.warehouse_id == wh.id)
            )
            product_ids = [row[0] for row in products_result.all()]
            if product_ids:
                await db.execute(StockMovement.__table__.delete().where(StockMovement.product_id.in_(product_ids)))
                await db.execute(WarehouseProduct.__table__.delete().where(WarehouseProduct.id.in_(product_ids)))
            await db.delete(wh)
        await db.flush()

    warehouses = await _sync_company_flags(db, company)
    await db.commit()
    await db.refresh(company)
    return _company_out(company, warehouses)


@router.get("/products", response_model=list[ProductOut])
async def list_products(
    company_id: str,
    warehouse_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_any_permission(db, company_id, current_user.id, VIEW_PERMISSIONS)
    await _require_warehouse_enabled(db, company_id)
    wh_map = await _warehouse_map(db, company_id)

    query = select(WarehouseProduct).where(WarehouseProduct.company_id == company_id)
    if warehouse_id:
        await _get_warehouse(db, company_id, warehouse_id)
        query = query.where(WarehouseProduct.warehouse_id == warehouse_id)
    result = await db.execute(query.order_by(WarehouseProduct.created_at.desc()))
    products = result.scalars().all()
    return [_product_out(p, wh_map.get(str(p.warehouse_id)) if p.warehouse_id else None) for p in products]


@router.post("/products", response_model=ProductOut, status_code=201)
async def create_product(
    company_id: str,
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_permission(db, company_id, current_user.id, "manage_warehouse")
    company, warehouses = await _require_warehouse_enabled(db, company_id)

    if company.company_type == "distributor":
        raise HTTPException(
            status_code=400,
            detail="Distributiv firma o'zi mahsulot qo'sha olmaydi — Bozor bo'limidan boshqa kompaniyalar omboridan buyurtma bering.",
        )

    if not warehouses:
        raise HTTPException(status_code=400, detail="Avval Sozlamalardan ombor yarating")

    warehouse: Warehouse | None = None
    if payload.warehouse_id:
        warehouse = await _get_warehouse(db, company_id, str(payload.warehouse_id))
    elif len(warehouses) == 1:
        warehouse = warehouses[0]
    else:
        raise HTTPException(status_code=400, detail="Qaysi omborga qo'shishni tanlang")

    assert warehouse is not None
    wh_type = warehouse.warehouse_type

    size = payload.size if wh_type == "clothing" else None
    color = payload.color if wh_type == "clothing" else None
    expiry_date = payload.expiry_date if wh_type == "food" else None
    sku = payload.sku if wh_type == "technology" else None

    existing_query = select(WarehouseProduct).where(
        WarehouseProduct.company_id == company_id,
        WarehouseProduct.warehouse_id == warehouse.id,
        func.lower(WarehouseProduct.name) == payload.name.strip().lower(),
        WarehouseProduct.unit == payload.unit,
    )
    if wh_type == "clothing":
        existing_query = existing_query.where(
            WarehouseProduct.size == size, WarehouseProduct.color == color
        )
    elif wh_type == "technology":
        existing_query = existing_query.where(WarehouseProduct.sku == sku)
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalar_one_or_none()

    if existing is not None:
        if payload.quantity:
            existing.quantity = float(existing.quantity) + payload.quantity
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
        return _product_out(existing, warehouse)

    product = WarehouseProduct(
        id=uuid_lib.uuid4(),
        company_id=company_id,
        warehouse_id=warehouse.id,
        name=payload.name,
        price=payload.price,
        quantity=payload.quantity,
        unit=payload.unit,
        image_url=payload.image_url,
        low_stock_threshold=payload.low_stock_threshold,
        size=size,
        color=color,
        expiry_date=expiry_date,
        sku=sku,
        notes=payload.notes,
    )
    db.add(product)
    await db.flush()
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
    return _product_out(product, warehouse)


@router.patch("/products/{product_id}", response_model=ProductOut)
async def update_product(
    company_id: str,
    product_id: str,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_permission(db, company_id, current_user.id, "manage_warehouse")
    company, _warehouses = await _require_warehouse_enabled(db, company_id)
    if company.company_type == "distributor":
        raise HTTPException(
            status_code=400,
            detail="Distributiv firma mahsulotni tahrirlay olmaydi — kerak bo'lsa Bozordan qayta buyurtma bering.",
        )

    result = await db.execute(
        select(WarehouseProduct).where(WarehouseProduct.id == product_id, WarehouseProduct.company_id == company_id)
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")

    warehouse = await _get_warehouse(db, company_id, str(product.warehouse_id) if product.warehouse_id else None)
    wh_type = warehouse.warehouse_type if warehouse else None

    data = payload.model_dump(exclude_unset=True)
    if "size" in data and wh_type != "clothing":
        data.pop("size")
    if "color" in data and wh_type != "clothing":
        data.pop("color")
    if "expiry_date" in data and wh_type != "food":
        data.pop("expiry_date")
    if "sku" in data and wh_type != "technology":
        data.pop("sku")
    for key, value in data.items():
        setattr(product, key, value)

    await db.commit()
    await db.refresh(product)
    return _product_out(product, warehouse)


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    company_id: str,
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_permission(db, company_id, current_user.id, "manage_warehouse")
    company, _warehouses = await _require_warehouse_enabled(db, company_id)
    if company.company_type == "distributor":
        raise HTTPException(
            status_code=400,
            detail="Distributiv firma mahsulotni o'chira olmaydi — zaxira Bozor buyurtmalari orqali boshqariladi.",
        )

    result = await db.execute(
        select(WarehouseProduct).where(WarehouseProduct.id == product_id, WarehouseProduct.company_id == company_id)
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    if float(getattr(product, "reserved_quantity", 0) or 0) > 0:
        raise HTTPException(
            status_code=400,
            detail="Bu mahsulotda band qilingan buyurtmalar bor — o'chirib bo'lmaydi",
        )

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
    company, _warehouses = await _require_warehouse_enabled(db, company_id)
    if company.company_type == "distributor":
        raise HTTPException(
            status_code=400,
            detail="Distributiv firma zaxirani qo'lda o'zgartira olmaydi — Bozor orqali qayta buyurtma bering.",
        )

    if payload.change == 0:
        raise HTTPException(status_code=400, detail="O'zgarish 0 bo'lishi mumkin emas")

    result = await db.execute(
        select(WarehouseProduct).where(WarehouseProduct.id == product_id, WarehouseProduct.company_id == company_id)
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")

    new_quantity = float(product.quantity) + payload.change
    reserved = float(getattr(product, "reserved_quantity", 0) or 0)
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Omborda yetarli mahsulot yo'q")
    if new_quantity < reserved:
        raise HTTPException(
            status_code=400,
            detail=f"Band qilingan zaxira bor ({reserved}). Chiqim qilish mumkin emas",
        )

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
    warehouse = await _get_warehouse(db, company_id, str(product.warehouse_id) if product.warehouse_id else None)
    return _product_out(product, warehouse)


@router.get("/products/{product_id}/history", response_model=list[StockMovementOut])
async def get_stock_history(
    company_id: str,
    product_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_any_permission(db, company_id, current_user.id, VIEW_PERMISSIONS)
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


@router.get("/dashboard")
async def get_warehouse_dashboard(
    company_id: str,
    period: str = "month",
    warehouse_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Statistika: bitta ombor yoki barcha omborlar umumiy byudjeti."""
    await require_any_permission(db, company_id, current_user.id, VIEW_PERMISSIONS)
    await _require_warehouse_enabled(db, company_id)
    if warehouse_id:
        await _get_warehouse(db, company_id, warehouse_id)

    buckets, start, key_fn = _dashboard_buckets(period)

    sold_query = (
        select(WarehouseOrder.created_at, WarehouseOrder.total_price, WarehouseOrder.quantity)
        .join(WarehouseProduct, WarehouseProduct.id == WarehouseOrder.seller_product_id)
        .where(
            WarehouseOrder.seller_company_id == company_id,
            WarehouseOrder.status == "completed",
            WarehouseOrder.created_at >= start,
        )
    )
    if warehouse_id:
        sold_query = sold_query.where(WarehouseProduct.warehouse_id == warehouse_id)
    orders_result = await db.execute(sold_query)
    sold_value_by_bucket = {b: 0.0 for b in buckets}
    total_sold_value = 0.0
    total_sold_quantity = 0.0
    for created_at, total_price, quantity in orders_result.all():
        key = key_fn(created_at.date())
        if key in sold_value_by_bucket:
            sold_value_by_bucket[key] += float(total_price)
        total_sold_value += float(total_price)
        total_sold_quantity += float(quantity)

    kirim_filters = [
        WarehouseProduct.company_id == company_id,
        StockMovement.created_at >= start,
        StockMovement.change > 0,
    ]
    if warehouse_id:
        kirim_filters.append(WarehouseProduct.warehouse_id == warehouse_id)
    result = await db.execute(
        select(
            StockMovement.created_at,
            StockMovement.change,
            WarehouseProduct.id,
            WarehouseProduct.name,
            WarehouseProduct.unit,
            WarehouseProduct.price,
        )
        .join(WarehouseProduct, WarehouseProduct.id == StockMovement.product_id)
        .where(*kirim_filters)
    )
    rows = result.all()

    events_by_bucket = {b: 0 for b in buckets}
    received_value_by_bucket = {b: 0.0 for b in buckets}
    by_product: dict[str, dict] = {}
    for created_at, change, product_id_val, name, unit, price in rows:
        key = key_fn(created_at.date())
        if key in events_by_bucket:
            events_by_bucket[key] += 1
            received_value_by_bucket[key] += float(change) * float(price)
        entry = by_product.setdefault(str(product_id_val), {"name": name, "unit": unit, "received": 0.0})
        entry["received"] += float(change)

    trend = [
        {
            "label": b,
            "events": events_by_bucket[b],
            "received_value": received_value_by_bucket[b],
            "sold_value": sold_value_by_bucket[b],
        }
        for b in buckets
    ]
    by_product_list = sorted(by_product.values(), key=lambda e: e["received"], reverse=True)

    stock_query = select(
        WarehouseProduct.unit,
        func.count(WarehouseProduct.id),
        func.coalesce(func.sum(WarehouseProduct.quantity), 0),
    ).where(WarehouseProduct.company_id == company_id)
    if warehouse_id:
        stock_query = stock_query.where(WarehouseProduct.warehouse_id == warehouse_id)
    products_result = await db.execute(stock_query.group_by(WarehouseProduct.unit))
    total_by_unit = {}
    product_count = 0
    for unit, count, qty in products_result.all():
        total_by_unit[unit] = float(qty)
        product_count += count

    budget_query = select(
        WarehouseProduct.name, WarehouseProduct.unit, WarehouseProduct.quantity, WarehouseProduct.price
    ).where(WarehouseProduct.company_id == company_id)
    if warehouse_id:
        budget_query = budget_query.where(WarehouseProduct.warehouse_id == warehouse_id)
    budget_result = await db.execute(budget_query)
    by_product_budget = []
    total_budget_value = 0.0
    for name, unit, qty, price in budget_result.all():
        value = float(qty) * float(price)
        total_budget_value += value
        by_product_budget.append(
            {"name": name, "unit": unit, "quantity": float(qty), "price": float(price), "value": value}
        )
    by_product_budget.sort(key=lambda e: e["value"], reverse=True)

    return {
        "trend": trend,
        "by_product": by_product_list,
        "total_by_unit": total_by_unit,
        "total_sold": total_sold_quantity,
        "total_sold_value": total_sold_value,
        "product_count": product_count,
        "by_product_budget": by_product_budget,
        "total_budget_value": total_budget_value,
        "warehouse_id": warehouse_id,
        "aggregated": warehouse_id is None,
    }


@router.get("/marketplace", response_model=list[MarketplaceProductOut])
async def browse_marketplace(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Faqat Distributiv firmalar uchun — boshqa (ishlab chiqaruvchi)
    kompaniyalarning ombordagi, zaxirasi bor mahsulotlarini ko'rsatadi.
    Mavjud miqdor = quantity - reserved (boshqa buyurtmalar band qilgan zaxira)."""
    await require_any_permission(db, company_id, current_user.id, VIEW_PERMISSIONS)
    buyer = await _get_company(db, company_id)
    if buyer.company_type != "distributor":
        raise HTTPException(status_code=400, detail="Bozor faqat Distributiv firmalar uchun mavjud")

    result = await db.execute(
        select(WarehouseProduct, Company.name, Warehouse.warehouse_type)
        .join(Company, Company.id == WarehouseProduct.company_id)
        .outerjoin(Warehouse, Warehouse.id == WarehouseProduct.warehouse_id)
        .where(
            Company.company_type == "kompaniya",
            Company.has_warehouse == True,  # noqa: E712
            WarehouseProduct.quantity > 0,
        )
        .order_by(WarehouseProduct.name)
    )
    out = []
    for product, company_name, wh_type in result.all():
        avail = await available_qty(product)
        if avail <= 0:
            continue
        reserved = float(getattr(product, "reserved_quantity", 0) or 0)
        out.append(
            MarketplaceProductOut(
                id=product.id,
                company_id=product.company_id,
                company_name=company_name,
                warehouse_id=product.warehouse_id,
                warehouse_type=wh_type,
                name=product.name,
                price=float(product.price),
                quantity=avail,
                reserved_quantity=reserved,
                unit=product.unit,
                image_url=product.image_url,
            )
        )
    return out


@router.post("/marketplace/order", response_model=OrderOut, status_code=201)
async def place_marketplace_order(
    company_id: str,
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Distributiv firma buyurtma beradi — zaxira band qilinadi, omborga
    o'tkazish va byudjet faqat yetkazib berish yakunlanganda amalga oshadi."""
    await require_permission(db, company_id, current_user.id, "manage_warehouse")
    buyer, buyer_warehouses = await _require_warehouse_enabled(db, company_id)
    if buyer.company_type != "distributor":
        raise HTTPException(status_code=400, detail="Buyurtma faqat Distributiv firmalar uchun mavjud")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Miqdor musbat bo'lishi kerak")
    if not buyer_warehouses:
        raise HTTPException(status_code=400, detail="Avval Sozlamalardan ombor yarating")

    seller_result = await db.execute(select(Company).where(Company.id == payload.seller_company_id))
    seller = seller_result.scalar_one_or_none()
    if seller is None or seller.company_type != "kompaniya" or not seller.has_warehouse:
        raise HTTPException(status_code=404, detail="Sotuvchi kompaniya topilmadi")

    product_result = await db.execute(
        select(WarehouseProduct).where(
            WarehouseProduct.id == payload.product_id, WarehouseProduct.company_id == payload.seller_company_id
        )
    )
    seller_product = product_result.scalar_one_or_none()
    if seller_product is None:
        raise HTTPException(status_code=404, detail="Mahsulot topilmadi")
    avail = await available_qty(seller_product)
    if avail < payload.quantity:
        raise HTTPException(status_code=400, detail="Sotuvchida yetarli zaxira yo'q")

    target_warehouse: Warehouse | None = None
    if payload.warehouse_id:
        target_warehouse = await _get_warehouse(db, company_id, str(payload.warehouse_id))
    else:
        seller_wh = await _get_warehouse(
            db, str(seller.id), str(seller_product.warehouse_id) if seller_product.warehouse_id else None
        )
        if seller_wh:
            target_warehouse = next(
                (w for w in buyer_warehouses if w.warehouse_type == seller_wh.warehouse_type), None
            )
        if target_warehouse is None:
            target_warehouse = buyer_warehouses[0]

    seller_product.reserved_quantity = float(getattr(seller_product, "reserved_quantity", 0) or 0) + payload.quantity

    order = WarehouseOrder(
        id=uuid_lib.uuid4(),
        buyer_company_id=company_id,
        seller_company_id=seller.id,
        seller_product_id=seller_product.id,
        buyer_warehouse_id=target_warehouse.id,
        product_name=seller_product.name,
        unit=seller_product.unit,
        quantity=payload.quantity,
        unit_price=float(seller_product.price),
        total_price=float(seller_product.price) * payload.quantity,
        status="ordered",
        ordered_by_user_id=current_user.id,
    )
    db.add(order)
    await db.flush()

    seller_notify = await users_with_permission(db, seller.id, "manage_warehouse")
    await notify_users(
        db,
        user_ids=seller_notify,
        ntype="warehouse_order",
        message=(
            f"Yangi buyurtma: {buyer.name} — {seller_product.name} "
            f"× {payload.quantity} {seller_product.unit} ({ORDER_STATUS_LABELS['ordered']})"
        ),
        company_id=seller.id,
        invite_token=str(order.id),
        related_user_id=current_user.id,
    )

    await db.commit()
    await db.refresh(order)
    return await _order_out(db, order)


async def _complete_order(
    db: AsyncSession,
    order: WarehouseOrder,
    *,
    actor: User,
    buyer: Company,
    seller: Company,
) -> None:
    """Finalize stock transfer + seller income after distributor confirms receipt."""
    product_result = await db.execute(
        select(WarehouseProduct).where(WarehouseProduct.id == order.seller_product_id)
    )
    seller_product = product_result.scalar_one_or_none()
    if seller_product is None:
        raise HTTPException(status_code=404, detail="Sotuvchi mahsuloti topilmadi")

    qty = float(order.quantity)
    reserved = float(getattr(seller_product, "reserved_quantity", 0) or 0)
    if reserved < qty:
        raise HTTPException(status_code=400, detail="Band qilingan zaxira yetarli emas")
    if float(seller_product.quantity) < qty:
        raise HTTPException(status_code=400, detail="Sotuvchi omborida mahsulot yetarli emas")

    seller_product.reserved_quantity = reserved - qty
    seller_product.quantity = float(seller_product.quantity) - qty
    db.add(
        StockMovement(
            id=uuid_lib.uuid4(),
            product_id=seller_product.id,
            user_id=actor.id,
            change=-qty,
            note=f"Sotildi — {buyer.name} (Distributiv, yetkazildi)",
        )
    )

    target_wh_id = order.buyer_warehouse_id
    if target_wh_id is None:
        buyer_warehouses = await _list_warehouses(db, str(buyer.id))
        if not buyer_warehouses:
            raise HTTPException(status_code=400, detail="Xaridor ombori topilmadi")
        target_wh_id = buyer_warehouses[0].id

    existing_result = await db.execute(
        select(WarehouseProduct).where(
            WarehouseProduct.company_id == buyer.id,
            WarehouseProduct.warehouse_id == target_wh_id,
            func.lower(WarehouseProduct.name) == seller_product.name.strip().lower(),
            WarehouseProduct.unit == seller_product.unit,
            WarehouseProduct.source_company_id == seller.id,
        )
    )
    buyer_product = existing_result.scalar_one_or_none()
    if buyer_product is not None:
        buyer_product.quantity = float(buyer_product.quantity) + qty
    else:
        buyer_product = WarehouseProduct(
            id=uuid_lib.uuid4(),
            company_id=buyer.id,
            warehouse_id=target_wh_id,
            name=seller_product.name,
            price=seller_product.price,
            quantity=qty,
            unit=seller_product.unit,
            image_url=seller_product.image_url,
            source_company_id=seller.id,
            source_company_name=seller.name,
            size=seller_product.size,
            color=seller_product.color,
            expiry_date=seller_product.expiry_date,
            sku=seller_product.sku,
        )
        db.add(buyer_product)
    await db.flush()
    db.add(
        StockMovement(
            id=uuid_lib.uuid4(),
            product_id=buyer_product.id,
            user_id=actor.id,
            change=qty,
            note=f"Sotib olindi — {seller.name} (qabul qilindi)",
        )
    )

    db.add(
        Transaction(
            id=uuid_lib.uuid4(),
            company_id=seller.id,
            type="income",
            category="Ombor sotuv",
            amount=float(order.total_price),
            description=(
                f"Yetkazib berildi: {order.product_name} × {qty} {order.unit} — {buyer.name}"
            ),
            occurred_on=date.today(),
            created_by=actor.id,
        )
    )

    order.status = "completed"
    order.completed_at = _utcnow()
    order.status_note = "Mahsulot qabul qilindi va omborga qo'shildi"


async def _cancel_order(db: AsyncSession, order: WarehouseOrder) -> None:
    if order.status not in {"ordered", "loading"}:
        raise HTTPException(status_code=400, detail="Bu bosqichda bekor qilib bo'lmaydi")
    product = (
        await db.execute(select(WarehouseProduct).where(WarehouseProduct.id == order.seller_product_id))
    ).scalar_one_or_none()
    if product is not None:
        reserved = float(getattr(product, "reserved_quantity", 0) or 0)
        product.reserved_quantity = max(0.0, reserved - float(order.quantity))
    order.status = "cancelled"
    order.status_note = "Buyurtma bekor qilindi"
    order.completed_at = _utcnow()


@router.get("/orders", response_model=list[OrderOut])
async def list_orders(
    company_id: str,
    scope: str = Query(default="auto"),
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Buyurtmalar ro'yxati.

    scope:
      - purchases — distributor (xaridor) buyurtmalari
      - sales — ishlab chiqaruvchi ombor kuzatuvi
      - loader — yuklash navbati (loading)
      - courier — yo'ldagi / yetkazib beruvchi arizalari
      - receipt — qabul qilish kutilayotganlar
      - auto — kompaniya turiga qarab (distributor→purchases, else→sales)
    """
    await require_any_permission(db, company_id, current_user.id, VIEW_PERMISSIONS)
    company = await _get_company(db, company_id)
    perms = await get_permissions(db, company_id, current_user.id)

    resolved = scope
    if scope == "auto":
        resolved = "purchases" if company.company_type == "distributor" else "sales"

    query = select(WarehouseOrder)
    if resolved == "purchases":
        query = query.where(WarehouseOrder.buyer_company_id == company_id)
    elif resolved == "sales":
        await require_any_permission(
            db, company_id, current_user.id, ["manage_warehouse", "ombor_ishchi", "warehouse_loader"]
        )
        query = query.where(WarehouseOrder.seller_company_id == company_id)
    elif resolved == "loader":
        await require_any_permission(
            db, company_id, current_user.id, ["warehouse_loader", "manage_warehouse"]
        )
        query = query.where(
            WarehouseOrder.seller_company_id == company_id,
            WarehouseOrder.status == "loading",
        )
    elif resolved == "courier":
        await require_any_permission(
            db, company_id, current_user.id, ["warehouse_courier", "manage_warehouse"]
        )
        # Couriers see open road jobs + ones they already accepted
        query = query.where(
            WarehouseOrder.seller_company_id == company_id,
            or_(
                WarehouseOrder.status == "on_road",
                WarehouseOrder.status.in_(["courier_accepted", "awaiting_receipt"]),
            ),
        )
        # Non-managers only see unclaimed or their own accepted jobs
        if not perms["is_owner"] and not perms["permissions"].get("manage_warehouse"):
            query = query.where(
                or_(
                    WarehouseOrder.courier_user_id.is_(None),
                    WarehouseOrder.courier_user_id == current_user.id,
                )
            )
    elif resolved == "receipt":
        await require_any_permission(
            db, company_id, current_user.id, ["manage_warehouse", "ombor_ishchi"]
        )
        query = query.where(
            WarehouseOrder.buyer_company_id == company_id,
            WarehouseOrder.status == "awaiting_receipt",
        )
    else:
        raise HTTPException(status_code=400, detail="Noto'g'ri scope")

    if status:
        query = query.where(WarehouseOrder.status == status)

    result = await db.execute(query.order_by(WarehouseOrder.created_at.desc()))
    orders = list(result.scalars().all())
    return [await _order_out(db, o) for o in orders]


@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_order(
    company_id: str,
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_any_permission(db, company_id, current_user.id, VIEW_PERMISSIONS)
    order = (
        await db.execute(select(WarehouseOrder).where(WarehouseOrder.id == order_id))
    ).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    if str(order.buyer_company_id) != company_id and str(order.seller_company_id) != company_id:
        raise HTTPException(status_code=403, detail="Bu buyurtmaga ruxsat yo'q")
    return await _order_out(db, order)


@router.post("/orders/{order_id}/transition", response_model=OrderOut)
async def transition_order(
    company_id: str,
    order_id: str,
    payload: OrderTransition,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Buyurtma bosqichini o'tkazish."""
    order = (
        await db.execute(select(WarehouseOrder).where(WarehouseOrder.id == order_id))
    ).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")

    buyer = await _get_company(db, str(order.buyer_company_id))
    seller = await _get_company(db, str(order.seller_company_id))
    action = payload.action.strip().lower()
    now = _utcnow()

    if action == "cancel":
        if str(company_id) not in {str(order.buyer_company_id), str(order.seller_company_id)}:
            raise HTTPException(status_code=403, detail="Bu amal uchun ruxsat yo'q")
        await require_permission(db, company_id, current_user.id, "manage_warehouse")
        await _cancel_order(db, order)
        notify_ids = await users_with_permission(db, order.buyer_company_id, "manage_warehouse")
        notify_ids += await users_with_permission(db, order.seller_company_id, "manage_warehouse")
        await notify_users(
            db,
            user_ids=notify_ids,
            ntype="warehouse_order",
            message=f"Buyurtma bekor qilindi: {order.product_name}",
            company_id=company_id,
            invite_token=str(order.id),
        )
        await db.commit()
        await db.refresh(order)
        return await _order_out(db, order)

    if action == "start_loading":
        if str(company_id) != str(order.seller_company_id):
            raise HTTPException(status_code=403, detail="Faqat sotuvchi ombori")
        await require_permission(db, company_id, current_user.id, "manage_warehouse")
        if order.status != "ordered":
            raise HTTPException(status_code=400, detail="Buyurtma 'Buyurtma qilindi' holatida emas")
        order.status = "loading"
        order.status_note = payload.note or "Yuklash boshlandi"
        loader_ids = await users_with_permission(db, seller.id, "warehouse_loader")
        await notify_users(
            db,
            user_ids=loader_ids,
            ntype="warehouse_order",
            message=f"Yuklash: {order.product_name} → {buyer.name} ({order.quantity} {order.unit})",
            company_id=seller.id,
            invite_token=str(order.id),
        )

    elif action == "confirm_loaded":
        if str(company_id) != str(order.seller_company_id):
            raise HTTPException(status_code=403, detail="Faqat sotuvchi ombori")
        await require_any_permission(
            db, company_id, current_user.id, ["warehouse_loader", "manage_warehouse"]
        )
        if order.status != "loading":
            raise HTTPException(status_code=400, detail="Buyurtma yuklash holatida emas")
        order.status = "loaded"
        order.loaded_at = now
        order.status_note = payload.note or "Yuklandi"
        mgr_ids = await users_with_permission(db, seller.id, "manage_warehouse")
        await notify_users(
            db,
            user_ids=mgr_ids,
            ntype="warehouse_order",
            message=f"Yuklandi — yo'lga chiqarish mumkin: {order.product_name} → {buyer.name}",
            company_id=seller.id,
            invite_token=str(order.id),
        )

    elif action == "dispatch":
        if str(company_id) != str(order.seller_company_id):
            raise HTTPException(status_code=403, detail="Faqat sotuvchi ombori")
        await require_permission(db, company_id, current_user.id, "manage_warehouse")
        if order.status != "loaded":
            raise HTTPException(status_code=400, detail="Avval yuklashni tasdiqlang")
        order.status = "on_road"
        order.dispatched_at = now
        order.status_note = payload.note or "Yo'lga chiqarildi"
        courier_ids = await users_with_permission(db, seller.id, "warehouse_courier")
        await notify_users(
            db,
            user_ids=courier_ids,
            ntype="warehouse_order",
            message=f"Yo'lda ariza: {order.product_name} → {buyer.name} ({order.quantity} {order.unit})",
            company_id=seller.id,
            invite_token=str(order.id),
        )
        buyer_ids = await users_with_permission(db, buyer.id, "manage_warehouse")
        await notify_users(
            db,
            user_ids=buyer_ids,
            ntype="warehouse_order",
            message=f"Buyurtmangiz yo'lda: {order.product_name} ({seller.name})",
            company_id=buyer.id,
            invite_token=str(order.id),
        )

    elif action == "accept_courier":
        if str(company_id) != str(order.seller_company_id):
            raise HTTPException(status_code=403, detail="Faqat sotuvchi kompaniya yetkazuvchilari")
        await require_any_permission(
            db, company_id, current_user.id, ["warehouse_courier", "manage_warehouse"]
        )
        if order.status != "on_road":
            raise HTTPException(status_code=400, detail="Buyurtma yo'lda emas")
        if order.courier_user_id and str(order.courier_user_id) != str(current_user.id):
            raise HTTPException(status_code=400, detail="Bu arizani boshqa yetkazuvchi olgan")
        order.status = "courier_accepted"
        order.courier_user_id = current_user.id
        order.courier_accepted_at = now
        order.status_note = payload.note or f"Yetkazuvchi: {current_user.full_name}"

    elif action == "confirm_arrival":
        if str(company_id) != str(order.seller_company_id):
            raise HTTPException(status_code=403, detail="Faqat sotuvchi kompaniya yetkazuvchilari")
        await require_any_permission(
            db, company_id, current_user.id, ["warehouse_courier", "manage_warehouse"]
        )
        if order.status != "courier_accepted":
            raise HTTPException(status_code=400, detail="Avval arizani qabul qiling")
        if order.courier_user_id and str(order.courier_user_id) != str(current_user.id):
            perms = await get_permissions(db, company_id, current_user.id)
            if not perms["is_owner"] and not perms["permissions"].get("manage_warehouse"):
                raise HTTPException(status_code=403, detail="Faqat o'z arizangizni tasdiqlashingiz mumkin")
        order.status = "awaiting_receipt"
        order.arrived_at = now
        order.status_note = payload.note or "Korxonaga yetib keldi — qabul qilish kutilmoqda"
        receipt_ids = await users_with_permission(db, buyer.id, "manage_warehouse")
        await notify_users(
            db,
            user_ids=receipt_ids,
            ntype="warehouse_receipt",
            message=(
                f"Qabul qilish: {order.product_name} × {order.quantity} {order.unit} "
                f"({seller.name}) — tekshirish bo'limiga o'ting"
            ),
            company_id=buyer.id,
            invite_token=str(order.id),
        )

    elif action == "confirm_receipt":
        if str(company_id) != str(order.buyer_company_id):
            raise HTTPException(status_code=403, detail="Faqat xaridor (distributiv) tasdiqlaydi")
        await require_permission(db, company_id, current_user.id, "manage_warehouse")
        if order.status != "awaiting_receipt":
            raise HTTPException(status_code=400, detail="Buyurtma qabul qilish holatida emas")
        await _complete_order(db, order, actor=current_user, buyer=buyer, seller=seller)
        seller_ids = await users_with_permission(db, seller.id, "manage_warehouse")
        seller_ids += await users_with_permission(db, seller.id, "manage_accounting")
        await notify_users(
            db,
            user_ids=seller_ids,
            ntype="warehouse_order",
            message=(
                f"Muvaffaqiyatli sotildi va yetkazildi: {order.product_name} × {order.quantity} "
                f"{order.unit} — {buyer.name}. Byudjetga +{float(order.total_price):,.0f} so'm"
            ),
            company_id=seller.id,
            invite_token=str(order.id),
        )
        buyer_ids = await users_with_permission(db, buyer.id, "manage_warehouse")
        await notify_users(
            db,
            user_ids=buyer_ids,
            ntype="warehouse_order",
            message=f"Mahsulot omboringizga qo'shildi: {order.product_name} × {order.quantity} {order.unit}",
            company_id=buyer.id,
            invite_token=str(order.id),
        )

    else:
        raise HTTPException(status_code=400, detail="Noto'g'ri amal")

    await db.commit()
    await db.refresh(order)
    return await _order_out(db, order)
