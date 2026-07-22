from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
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
    """Finds registered users by email prefix, for the invite autocomplete.
    Only returns matches among users who already have an account — invites
    can't be sent to unregistered emails."""
    result = await db.execute(
        select(User).where(User.email.ilike(f"{q}%")).limit(8)
    )
    return result.scalars().all()
