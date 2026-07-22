from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.models.user import User
from app.services.permissions import require_permission

router = APIRouter(prefix="/companies/{company_id}/group-call", tags=["group-call"])


@router.post("/token")
async def get_group_call_token(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.livekit_api_key or not settings.livekit_api_secret or not settings.livekit_url:
        raise HTTPException(
            status_code=503,
            detail="Guruh uchrashuvlari hali sozlanmagan — backend .env fayliga LIVEKIT_API_KEY, "
            "LIVEKIT_API_SECRET va LIVEKIT_URL qo'shing.",
        )

    await require_permission(db, company_id, current_user.id, "start_meeting")

    from livekit import api as livekit_api

    room_name = f"company-{company_id}"
    token = (
        livekit_api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(str(current_user.id))
        .with_name(current_user.full_name)
        .with_grants(
            livekit_api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )
        )
    )

    return {"token": token.to_jwt(), "url": settings.livekit_url, "room_name": room_name}
