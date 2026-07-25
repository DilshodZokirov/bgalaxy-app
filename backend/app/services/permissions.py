from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company, TeamMembership
from app.models.role import PERMISSION_KEYS, Role


async def get_permissions(db: AsyncSession, company_id, user_id) -> dict:
    """Returns {"is_owner": bool, "role_name": str|None, "permissions": dict,
    "head_admin_id": UUID|None}. The owner always has every permission,
    regardless of assigned role."""
    company_result = await db.execute(select(Company).where(Company.id == company_id))
    company = company_result.scalar_one_or_none()
    is_owner = bool(company and str(company.owner_id) == str(user_id))
    head_admin_id = company.head_admin_id if company else None

    if is_owner:
        return {
            "is_owner": True,
            "role_name": "Owner",
            "permissions": {key: True for key in PERMISSION_KEYS},
            "head_admin_id": head_admin_id,
        }

    membership_result = await db.execute(
        select(TeamMembership).where(
            TeamMembership.company_id == company_id, TeamMembership.user_id == user_id
        )
    )
    membership = membership_result.scalar_one_or_none()
    if membership is None or membership.role_id is None:
        return {
            "is_owner": False,
            "role_name": None,
            "permissions": {key: False for key in PERMISSION_KEYS},
            "head_admin_id": head_admin_id,
        }

    role_result = await db.execute(select(Role).where(Role.id == membership.role_id))
    role = role_result.scalar_one_or_none()
    if role is None:
        return {
            "is_owner": False,
            "role_name": None,
            "permissions": {key: False for key in PERMISSION_KEYS},
            "head_admin_id": head_admin_id,
        }

    permissions = {key: bool(role.permissions.get(key, False)) for key in PERMISSION_KEYS}
    return {"is_owner": False, "role_name": role.name, "permissions": permissions, "head_admin_id": head_admin_id}


async def require_permission(db: AsyncSession, company_id, user_id, permission_key: str) -> None:
    info = await get_permissions(db, company_id, user_id)
    if not info["permissions"].get(permission_key, False):
        raise HTTPException(status_code=403, detail="Bu amal uchun ruxsatingiz yo'q")


async def require_any_permission(db: AsyncSession, company_id, user_id, permission_keys: list[str]) -> None:
    """Passes if the user has AT LEAST ONE of the given permission keys (or
    is the owner) — used where several different roles should all be able
    to do something, e.g. viewing the warehouse (manage_warehouse OR
    ombor_ishchi)."""
    info = await get_permissions(db, company_id, user_id)
    if not any(info["permissions"].get(key, False) for key in permission_keys):
        raise HTTPException(status_code=403, detail="Bu amal uchun ruxsatingiz yo'q")
