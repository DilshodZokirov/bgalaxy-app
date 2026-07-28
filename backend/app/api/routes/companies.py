import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.chat import Message
from app.models.company import Company, MemberRole, TeamMembership
from app.models.role import DEFAULT_ROLE_PERMISSIONS, Role
from app.models.invite import Invite
from app.models.user import User
from app.models.warehouse import Warehouse
from app.schemas.company import CompanyCreate, CompanyOut, TeamMemberOut
from app.schemas.warehouse import WarehouseOut

router = APIRouter(prefix="/companies", tags=["companies"])

_INN_RE = re.compile(r"^\d{9}$")


def _float_or_none(value) -> float | None:
    if value is None:
        return None
    return float(value)


def _normalize_inn(raw: str | None) -> str | None:
    if raw is None:
        return None
    digits = re.sub(r"\D", "", str(raw).strip())
    return digits or None


def _company_out(company: Company, warehouses: list[Warehouse] | None = None) -> CompanyOut:
    whs = warehouses or []
    return CompanyOut(
        id=company.id,
        name=company.name,
        slug=company.slug,
        owner_id=company.owner_id,
        logo_url=company.logo_url,
        location_region=getattr(company, "location_region", None),
        location_address=getattr(company, "location_address", None),
        inn=getattr(company, "inn", None),
        latitude=_float_or_none(getattr(company, "latitude", None)),
        longitude=_float_or_none(getattr(company, "longitude", None)),
        geo_label=getattr(company, "geo_label", None),
        company_type=company.company_type,
        has_warehouse=bool(whs) or bool(company.has_warehouse),
        warehouse_type=company.warehouse_type,
        warehouses=[WarehouseOut.model_validate(w) for w in whs],
        created_at=company.created_at,
    )


# Allowed regions in fixed display order (locatsiya tartibi).
UZ_REGIONS = [
    "Toshkent shahri",
    "Toshkent viloyati",
    "Andijon viloyati",
    "Buxoro viloyati",
    "Farg'ona viloyati",
    "Jizzax viloyati",
    "Xorazm viloyati",
    "Namangan viloyati",
    "Navoiy viloyati",
    "Qashqadaryo viloyati",
    "Samarqand viloyati",
    "Sirdaryo viloyati",
    "Surxondaryo viloyati",
    "Qoraqalpog'iston Respublikasi",
]


@router.post("", response_model=CompanyOut, status_code=201)
async def create_company(
    payload: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(Company).where(Company.slug == payload.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already taken")

    if payload.company_type not in ("kompaniya", "distributor", "market"):
        raise HTTPException(status_code=400, detail="Noto'g'ri kompaniya turi")

    region = (payload.location_region or "").strip() or None
    if not region:
        raise HTTPException(status_code=400, detail="Joylashuv (viloyat/shahar) majburiy")
    if region not in UZ_REGIONS:
        raise HTTPException(status_code=400, detail="Noto'g'ri joylashuv (viloyat/shahar)")
    address = (payload.location_address or "").strip() or None
    if address and len(address) > 255:
        raise HTTPException(status_code=400, detail="Manzil juda uzun")
    logo = (payload.logo_url or "").strip() or None
    if logo and not (logo.startswith("data:image/") or logo.startswith("http://") or logo.startswith("https://")):
        raise HTTPException(status_code=400, detail="Brand rasm formati noto'g'ri")

    inn = _normalize_inn(payload.inn)
    if not inn or not _INN_RE.match(inn):
        raise HTTPException(status_code=400, detail="INN (STIR) 9 ta raqam bo‘lishi kerak")

    lat = payload.latitude
    lng = payload.longitude
    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="Kartadan aniq joylashuvni tanlang")
    if not (-90 <= float(lat) <= 90) or not (-180 <= float(lng) <= 180):
        raise HTTPException(status_code=400, detail="Noto‘g‘ri geolokatsiya")
    # Rough Uzbekistan bounding box — soft check for delivery accuracy
    if not (37.0 <= float(lat) <= 46.0) or not (55.5 <= float(lng) <= 73.5):
        raise HTTPException(
            status_code=400,
            detail="Joylashuv O‘zbekiston hududida bo‘lishi kerak",
        )
    geo_label = (payload.geo_label or "").strip() or None
    if geo_label and len(geo_label) > 500:
        geo_label = geo_label[:500]

    company = Company(
        name=payload.name,
        slug=payload.slug,
        owner_id=current_user.id,
        company_type=payload.company_type,
        logo_url=logo,
        location_region=region,
        location_address=address,
        inn=inn,
        latitude=float(lat),
        longitude=float(lng),
        geo_label=geo_label,
    )
    db.add(company)
    await db.flush()

    # Seed the 4 default roles for this company.
    admin_role = None
    for role_name, permissions in DEFAULT_ROLE_PERMISSIONS.items():
        role = Role(company_id=company.id, name=role_name, permissions=permissions)
        db.add(role)
        if role_name == "Admin":
            admin_role = role
    await db.flush()

    # Owner is automatically an admin member
    membership = TeamMembership(
        company_id=company.id, user_id=current_user.id, role=MemberRole.admin, role_id=admin_role.id
    )
    db.add(membership)
    await db.commit()
    await db.refresh(company)
    return _company_out(company, [])


@router.get("/mine", response_model=list[CompanyOut])
async def my_companies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Lazy import avoids circular import with warehouse route helpers at module load.
    from app.api.routes.warehouse import _ensure_legacy_warehouses

    result = await db.execute(
        select(Company)
        .join(TeamMembership, TeamMembership.company_id == Company.id)
        .where(
            TeamMembership.user_id == current_user.id,
            or_(TeamMembership.approved == True, Company.owner_id == current_user.id),  # noqa: E712
        )
    )
    companies = list(result.scalars().all())
    if not companies:
        return []

    by_company: dict[str, list[Warehouse]] = {}
    dirty = False
    for company in companies:
        warehouses = await _ensure_legacy_warehouses(db, company)
        by_company[str(company.id)] = warehouses
        if warehouses and (not company.has_warehouse or company.warehouse_type is None):
            company.has_warehouse = True
            if len(warehouses) == 1:
                company.warehouse_type = warehouses[0].warehouse_type
            dirty = True

    if dirty:
        await db.commit()

    return [_company_out(c, by_company.get(str(c.id), [])) for c in companies]


@router.get("/{company_id}/members", response_model=list[TeamMemberOut])
async def list_members(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_result = await db.execute(select(Company).where(Company.id == company_id))
    company = company_result.scalar_one_or_none()

    result = await db.execute(
        select(TeamMembership, User, Role)
        .join(User, User.id == TeamMembership.user_id)
        .outerjoin(Role, Role.id == TeamMembership.role_id)
        .where(TeamMembership.company_id == company_id)
    )
    members = []
    for membership, user, role in result.all():
        members.append(
            TeamMemberOut(
                user_id=membership.user_id,
                role=membership.role,
                full_name=user.full_name,
                role_name=role.name if role else None,
                approved=membership.approved,
                is_owner=bool(company and str(company.owner_id) == str(membership.user_id)),
                is_head_admin=bool(company and str(company.head_admin_id or "") == str(membership.user_id)),
            )
        )
    return members


@router.delete("/{company_id}", status_code=204)
async def delete_company(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Kompaniya topilmadi")
    if str(company.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat kompaniya egasi uni o'chira oladi")

    # Clear self-referencing reply links first, then remove dependent rows,
    # then the company itself.
    await db.execute(
        update(Message).where(Message.company_id == company_id).values(reply_to_id=None)
    )
    await db.execute(delete(Message).where(Message.company_id == company_id))
    await db.execute(delete(Invite).where(Invite.company_id == company_id))
    await db.execute(delete(TeamMembership).where(TeamMembership.company_id == company_id))
    await db.execute(delete(Company).where(Company.id == company_id))
    await db.commit()
