from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_error

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_error

    # Self-healing bootstrap: the configured initial-developer email is
    # promoted the first time it's seen, so there's always at least one
    # account that can reach the developer panel and grant access to others.
    from app.core.config import settings

    if not user.is_developer and settings.initial_developer_email and user.email == settings.initial_developer_email:
        user.is_developer = True
        await db.commit()
        await db.refresh(user)

    # Throttled activity tracking — only writes when stale by 5+ minutes, so
    # this doesn't turn into a DB write on every single request.
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    last_seen = user.last_seen_at
    if last_seen and last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)
    if last_seen is None or now - last_seen > timedelta(minutes=5):
        user.last_seen_at = now
        from app.models.activity_ping import ActivityPing

        db.add(ActivityPing(user_id=user.id))
        await db.commit()

    return user


async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Same as get_current_user but returns None instead of raising when
    there's no (or an invalid) token — for endpoints that should work for
    both logged-in and anonymous callers, like frontend error reporting."""
    if not token:
        return None
    user_id = decode_access_token(token)
    if user_id is None:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
