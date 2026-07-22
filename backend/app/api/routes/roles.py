from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.company import Company, TeamMembership
from app.models.notification import Notification
from app.models.role import Role
from app.models.user import User
from app.schemas.role import (
    AssignRole,
    MyPermissions,
    RoleCreate,
    RoleOut,
    RoleUpdate,
    SetHeadAdminRequest,
    TransferOwnershipRequest,
)
from app.services.notify import ping_notifications
from app.services.permissions import get_permissions

router = APIRouter(prefix="/companies/{company_id}", tags=["roles"])


async def _require_owner(db: AsyncSession, company_id: str, user_id) -> None:
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if company is None or str(company.owner_id) != str(user_id):
        raise HTTPException(status_code=403, detail="Faqat kompaniya egasi bu amalni bajara oladi")


@router.get("/roles", response_model=list[RoleOut])
async def list_roles(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Role).where(Role.company_id == company_id))
    return result.scalars().all()


@router.post("/roles", response_model=RoleOut, status_code=201)
async def create_role(
    company_id: str,
    payload: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_owner(db, company_id, current_user.id)
    role = Role(company_id=company_id, name=payload.name, permissions=payload.permissions)
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return role


@router.patch("/roles/{role_id}", response_model=RoleOut)
async def update_role(
    company_id: str,
    role_id: str,
    payload: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_owner(db, company_id, current_user.id)
    result = await db.execute(
        select(Role).where(Role.id == role_id, Role.company_id == company_id)
    )
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=404, detail="Lavozim topilmadi")
    if payload.name is not None:
        role.name = payload.name
    if payload.permissions is not None:
        role.permissions = payload.permissions
    await db.commit()
    await db.refresh(role)
    return role


@router.delete("/roles/{role_id}", status_code=204)
async def delete_role(
    company_id: str,
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_owner(db, company_id, current_user.id)
    result = await db.execute(
        select(Role).where(Role.id == role_id, Role.company_id == company_id)
    )
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=404, detail="Lavozim topilmadi")
    # Members holding this role fall back to "no role" rather than blocking deletion.
    memberships = await db.execute(
        select(TeamMembership).where(TeamMembership.role_id == role_id)
    )
    for membership in memberships.scalars().all():
        membership.role_id = None
    await db.delete(role)
    await db.commit()


@router.patch("/members/{user_id}/role", status_code=204)
async def assign_member_role(
    company_id: str,
    user_id: str,
    payload: AssignRole,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_owner(db, company_id, current_user.id)

    company_result = await db.execute(select(Company).where(Company.id == company_id))
    company = company_result.scalar_one_or_none()
    if company and str(user_id) == str(company.owner_id):
        raise HTTPException(
            status_code=403,
            detail="Owner o'z lavozimini bu yerdan o'zgartira olmaydi — vakolat topshirish alohida bo'limda.",
        )

    role_result = await db.execute(
        select(Role).where(Role.id == str(payload.role_id), Role.company_id == company_id)
    )
    role = role_result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=404, detail="Lavozim topilmadi")

    membership_result = await db.execute(
        select(TeamMembership).where(
            TeamMembership.company_id == company_id, TeamMembership.user_id == user_id
        )
    )
    membership = membership_result.scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=404, detail="A'zo topilmadi")
    was_approved = membership.approved
    membership.role_id = str(payload.role_id)
    membership.approved = True

    if not was_approved:
        db.add(
            Notification(
                user_id=user_id,
                type="info",
                message=f"'{company.name if company else 'kompaniya'}'da sizga '{role.name}' lavozimi berildi — endi to'liq a'zosiz.",
                company_id=company_id,
            )
        )

    await db.commit()
    if not was_approved:
        await ping_notifications(user_id)

@router.delete("/members/{user_id}", status_code=204)
async def remove_member(
    company_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    info = await get_permissions(db, company_id, current_user.id)
    if not info["is_owner"] and not info["permissions"].get("remove_members", False):
        raise HTTPException(status_code=403, detail="Bu amal uchun ruxsatingiz yo'q")

    company_result = await db.execute(select(Company).where(Company.id == company_id))
    company = company_result.scalar_one_or_none()
    if company and str(company.owner_id) == str(user_id):
        raise HTTPException(status_code=400, detail="Kompaniya egasini olib tashlab bo'lmaydi")

    membership_result = await db.execute(
        select(TeamMembership).where(
            TeamMembership.company_id == company_id, TeamMembership.user_id == user_id
        )
    )
    membership = membership_result.scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=404, detail="A'zo topilmadi")
    await db.delete(membership)
    await db.commit()


@router.post("/head-admin", status_code=204)
async def set_head_admin(
    company_id: str,
    payload: SetHeadAdminRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_owner(db, company_id, current_user.id)
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Kompaniya topilmadi")

    if payload.user_id is not None:
        if str(payload.user_id) == str(company.owner_id):
            raise HTTPException(status_code=400, detail="Owner allaqachon eng yuqori vakolatga ega")
        membership_result = await db.execute(
            select(TeamMembership).where(
                TeamMembership.company_id == company_id, TeamMembership.user_id == str(payload.user_id)
            )
        )
        if membership_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="A'zo topilmadi")

    company.head_admin_id = payload.user_id
    await db.commit()

    if payload.user_id is not None:
        db.add(
            Notification(
                user_id=payload.user_id,
                type="info",
                message=f"'{company.name}' kompaniyasida sizga 'Bosh admin' vakolati berildi.",
                company_id=company_id,
            )
        )
        await db.commit()
        await ping_notifications(payload.user_id)


@router.post("/transfer-ownership", status_code=204)
async def transfer_ownership(
    company_id: str,
    payload: TransferOwnershipRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_owner(db, company_id, current_user.id)

    from app.core.security import verify_password

    if not current_user.hashed_password or not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Parol noto'g'ri")

    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Kompaniya topilmadi")

    if str(payload.new_owner_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Siz allaqachon egasisiz")

    membership_result = await db.execute(
        select(TeamMembership).where(
            TeamMembership.company_id == company_id, TeamMembership.user_id == str(payload.new_owner_id)
        )
    )
    new_owner_membership = membership_result.scalar_one_or_none()
    if new_owner_membership is None:
        raise HTTPException(status_code=404, detail="Yangi ega bu kompaniya a'zosi emas")

    old_owner_id = company.owner_id
    company.owner_id = payload.new_owner_id
    if str(company.head_admin_id or "") == str(payload.new_owner_id):
        company.head_admin_id = None  # they're the owner now, the label is redundant
    await db.commit()

    db.add(
        Notification(
            user_id=payload.new_owner_id,
            type="info",
            message=f"'{company.name}' kompaniyasining yangi egasi bo'ldingiz.",
            company_id=company_id,
        )
    )
    await db.commit()
    await ping_notifications(payload.new_owner_id)
    await ping_notifications(old_owner_id)


@router.get("/my-permissions", response_model=MyPermissions)
async def my_permissions(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_permissions(db, company_id, current_user.id)
