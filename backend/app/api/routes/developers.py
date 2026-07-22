from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User

router = APIRouter(prefix="/developers", tags=["developers"])


class DeveloperOut(BaseModel):
    id: str
    email: str
    full_name: str


class GrantDeveloperRequest(BaseModel):
    email: EmailStr


def _require_developer(current_user: User) -> None:
    if not current_user.is_developer:
        raise HTTPException(status_code=403, detail="Bu bo'lim faqat dasturchilar uchun")


@router.get("", response_model=list[DeveloperOut])
async def list_developers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_developer(current_user)
    result = await db.execute(select(User).where(User.is_developer == True))  # noqa: E712
    return [DeveloperOut(id=str(u.id), email=u.email, full_name=u.full_name) for u in result.scalars().all()]


@router.post("/grant", response_model=DeveloperOut)
async def grant_developer(
    payload: GrantDeveloperRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_developer(current_user)
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Bu email bilan ro'yxatdan o'tgan foydalanuvchi topilmadi")

    user.is_developer = True
    await db.commit()
    return DeveloperOut(id=str(user.id), email=user.email, full_name=user.full_name)


@router.delete("/{user_id}", status_code=204)
async def revoke_developer(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_developer(current_user)
    if str(user_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="O'zingizni olib tashlay olmaysiz")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Topilmadi")
    user.is_developer = False
    await db.commit()
