from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserSearchResult

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=list[UserSearchResult])
async def search_users(
    q: str = Query(min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Finds registered users by name or email for invite/add-member pickers.
    Only returns people who already have a BG account."""
    term = q.strip()
    pattern = f"%{term}%"
    result = await db.execute(
        select(User)
        .where(
            User.id != current_user.id,
            or_(User.email.ilike(pattern), User.full_name.ilike(pattern)),
        )
        .order_by(User.full_name)
        .limit(12)
    )
    return result.scalars().all()
