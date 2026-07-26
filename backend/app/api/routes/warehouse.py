import uuid as uuid_lib
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.company import Company
from app.models.user import User
from app.models.warehouse import StockMovement, WarehouseProduct, WarehouseOrder
from app.schemas.company import CompanyOut
from app.schemas.warehouse import (
    MarketplaceProductOut,
    OrderCreate,
    OrderOut,
    ProductCreate,
    ProductOut,
    ProductUpdate,
    StockAdjustment,
    StockMovementOut,
    WarehouseSettingsUpdate,
)
from app.services.permissions import require_any_permission, require_permission

router = APIRouter(prefix="/companies/{company_id}/warehouse", tags=["warehouse"])

WAREHOUSE_TYPES = {"technology", "clothing", "food"}
VIEW_PERMISSIONS = ["manage_warehouse", "ombor_ishchi"]


def _day_key(d: date) -> str:
    return d.strftime("%Y-%m-%d")


def _week_key(d: date) -> str:
    monday = d - timedelta(days=d.weekday())
    return monday.strftime("%m-%d")


def _month_key(d: date) -> str:
    return d.strftime("%Y-%m")


def _dashboard_buckets(period: str):
    """Returns (bucket_keys, start_date, key_fn) — mirrors the granularity
    pattern used on the Kompaniya Analitikasi trend charts."""
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
    await require_any_permission(db, company_id, current_user.id, VIEW_PERMISSIONS)
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

    if company.company_type == "distributor":
        raise HTTPException(
            status_code=400,
            detail="Distributiv firma o'zi mahsulot qo'sha olmaydi — Bozor bo'limidan boshqa kompaniyalar omboridan buyurtma bering.",
        )

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
        return existing

    product = WarehouseProduct(
        id=uuid_lib.uuid4(),
        company_id=company_id,
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
    await db.flush()  # guarantees the product row exists before we reference its id below
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

    new_quantity = float(product.quantity) + payload.change
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Statistika: qabul qilingan (kirim) mahsulotlar davr bo'yicha, HAR BIR
    mahsulot uchun alohida (turli birliklarni — dona/kg/litr — bitta songa
    qo'shib bo'lmaydi, shuning uchun bu yerda hech narsa aralashtirilmaydi).
    "Sotilgan" — bu kompaniya SOTUVCHI bo'lgan barcha WarehouseOrder
    yozuvlaridan hisoblanadi (Distributiv firma undan buyurtma berganda
    avtomatik yoziladi)."""
    await require_any_permission(db, company_id, current_user.id, VIEW_PERMISSIONS)
    await _require_warehouse_enabled(db, company_id)

    buckets, start, key_fn = _dashboard_buckets(period)

    orders_result = await db.execute(
        select(WarehouseOrder.created_at, WarehouseOrder.total_price, WarehouseOrder.quantity).where(
            WarehouseOrder.seller_company_id == company_id, WarehouseOrder.created_at >= start
        )
    )
    sold_value_by_bucket = {b: 0.0 for b in buckets}
    total_sold_value = 0.0
    total_sold_quantity = 0.0
    for created_at, total_price, quantity in orders_result.all():
        key = key_fn(created_at.date())
        if key in sold_value_by_bucket:
            sold_value_by_bucket[key] += float(total_price)
        total_sold_value += float(total_price)
        total_sold_quantity += float(quantity)

    result = await db.execute(
        select(
            StockMovement.created_at, StockMovement.change,
            WarehouseProduct.id, WarehouseProduct.name, WarehouseProduct.unit, WarehouseProduct.price,
        )
        .join(WarehouseProduct, WarehouseProduct.id == StockMovement.product_id)
        .where(
            WarehouseProduct.company_id == company_id,
            StockMovement.created_at >= start,
            StockMovement.change > 0,
        )
    )
    rows = result.all()

    # Trend line stays unit-agnostic on purpose — it counts KIRIM EVENTS per
    # period bucket, not raw quantities, so mixing a "5 kg" delivery with a
    # "5 dona" delivery in the same chart never produces a meaningless sum.
    # received_value (change × price, summed in so'm) IS safe to sum across
    # units though — that's what powers the "Umumiy byudjet" trend chart.
    events_by_bucket = {b: 0 for b in buckets}
    received_value_by_bucket = {b: 0.0 for b in buckets}
    # Per-product totals, kept in each product's own unit — this is what
    # actually answers "how much of THIS product came in this period".
    by_product: dict[str, dict] = {}
    for created_at, change, product_id_val, name, unit, price in rows:
        key = key_fn(created_at.date())
        if key in events_by_bucket:
            events_by_bucket[key] += 1
            received_value_by_bucket[key] += float(change) * float(price)
        entry = by_product.setdefault(str(product_id_val), {"name": name, "unit": unit, "received": 0.0})
        entry["received"] += float(change)

    trend = [
        {"label": b, "events": events_by_bucket[b], "received_value": received_value_by_bucket[b], "sold_value": sold_value_by_bucket[b]}
        for b in buckets
    ]
    by_product_list = sorted(by_product.values(), key=lambda e: e["received"], reverse=True)

    products_result = await db.execute(
        select(WarehouseProduct.unit, func.count(WarehouseProduct.id), func.coalesce(func.sum(WarehouseProduct.quantity), 0))
        .where(WarehouseProduct.company_id == company_id)
        .group_by(WarehouseProduct.unit)
    )
    total_by_unit = {}
    product_count = 0
    for unit, count, qty in products_result.all():
        total_by_unit[unit] = float(qty)
        product_count += count

    # "Umumiy byudjet" view — price ties every product to a common unit
    # (so'm), so unlike raw quantities, these values CAN be meaningfully
    # summed across a mix of dona/kg/litr products.
    budget_result = await db.execute(
        select(WarehouseProduct.name, WarehouseProduct.unit, WarehouseProduct.quantity, WarehouseProduct.price)
        .where(WarehouseProduct.company_id == company_id)
    )
    by_product_budget = []
    total_budget_value = 0.0
    for name, unit, qty, price in budget_result.all():
        value = float(qty) * float(price)
        total_budget_value += value
        by_product_budget.append({"name": name, "unit": unit, "quantity": float(qty), "price": float(price), "value": value})
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
    }


@router.get("/marketplace", response_model=list[MarketplaceProductOut])
async def browse_marketplace(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Faqat Distributiv firmalar uchun — boshqa (ishlab chiqaruvchi)
    kompaniyalarning ombordagi, zaxirasi bor mahsulotlarini ko'rsatadi."""
    await require_any_permission(db, company_id, current_user.id, VIEW_PERMISSIONS)
    buyer = await _get_company(db, company_id)
    if buyer.company_type != "distributor":
        raise HTTPException(status_code=400, detail="Bozor faqat Distributiv firmalar uchun mavjud")

    result = await db.execute(
        select(WarehouseProduct, Company.name)
        .join(Company, Company.id == WarehouseProduct.company_id)
        .where(
            Company.company_type == "kompaniya",
            Company.has_warehouse == True,  # noqa: E712
            WarehouseProduct.quantity > 0,
        )
        .order_by(WarehouseProduct.name)
    )
    out = []
    for product, company_name in result.all():
        out.append(
            MarketplaceProductOut(
                id=product.id,
                company_id=product.company_id,
                company_name=company_name,
                name=product.name,
                price=float(product.price),
                quantity=float(product.quantity),
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
    """Distributiv firma boshqa kompaniyaning omboridan buyurtma beradi —
    sotuvchidan avtomatik ayiriladi, xaridorning o'z omboriga (manba
    belgilangan holda) qo'shiladi, va ikkala tomonda ham tarix yoziladi."""
    await require_permission(db, company_id, current_user.id, "manage_warehouse")
    buyer = await _require_warehouse_enabled(db, company_id)
    if buyer.company_type != "distributor":
        raise HTTPException(status_code=400, detail="Buyurtma faqat Distributiv firmalar uchun mavjud")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Miqdor musbat bo'lishi kerak")

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
    if float(seller_product.quantity) < payload.quantity:
        raise HTTPException(status_code=400, detail="Sotuvchida yetarli zaxira yo'q")

    # 1) deduct from the seller (this is the "sold" event their dashboard cares about)
    seller_product.quantity = float(seller_product.quantity) - payload.quantity
    db.add(
        StockMovement(
            id=uuid_lib.uuid4(),
            product_id=seller_product.id,
            user_id=current_user.id,
            change=-payload.quantity,
            note=f"Sotildi — {buyer.name} (Distributiv)",
        )
    )

    # 2) add to (or top up) the buyer's own source-tagged copy of the product
    existing_result = await db.execute(
        select(WarehouseProduct).where(
            WarehouseProduct.company_id == company_id,
            func.lower(WarehouseProduct.name) == seller_product.name.strip().lower(),
            WarehouseProduct.unit == seller_product.unit,
            WarehouseProduct.source_company_id == seller.id,
        )
    )
    buyer_product = existing_result.scalar_one_or_none()
    if buyer_product is not None:
        buyer_product.quantity = float(buyer_product.quantity) + payload.quantity
    else:
        buyer_product = WarehouseProduct(
            id=uuid_lib.uuid4(),
            company_id=company_id,
            name=seller_product.name,
            price=seller_product.price,
            quantity=payload.quantity,
            unit=seller_product.unit,
            image_url=seller_product.image_url,
            source_company_id=seller.id,
            source_company_name=seller.name,
        )
        db.add(buyer_product)
    await db.flush()
    db.add(
        StockMovement(
            id=uuid_lib.uuid4(),
            product_id=buyer_product.id,
            user_id=current_user.id,
            change=payload.quantity,
            note=f"Sotib olindi — {seller.name}",
        )
    )

    order = WarehouseOrder(
        id=uuid_lib.uuid4(),
        buyer_company_id=company_id,
        seller_company_id=seller.id,
        seller_product_id=seller_product.id,
        product_name=seller_product.name,
        unit=seller_product.unit,
        quantity=payload.quantity,
        unit_price=float(seller_product.price),
        total_price=float(seller_product.price) * payload.quantity,
        ordered_by_user_id=current_user.id,
    )
    db.add(order)

    await db.commit()
    await db.refresh(order)
    return order


@router.get("/orders", response_model=list[OrderOut])
async def list_orders(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Shu kompaniya XARIDOR sifatida bergan barcha buyurtmalar tarixi."""
    await require_any_permission(db, company_id, current_user.id, VIEW_PERMISSIONS)
    result = await db.execute(
        select(WarehouseOrder)
        .where(WarehouseOrder.buyer_company_id == company_id)
        .order_by(WarehouseOrder.created_at.desc())
    )
    return result.scalars().all()
