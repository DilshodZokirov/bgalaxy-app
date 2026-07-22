import asyncio
import base64

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import UserOut

router = APIRouter(prefix="/avatar", tags=["avatar"])

MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB
STYLE_PROMPT = (
    "Convert this photo into a friendly, colorful cartoon-style avatar illustration "
    "of the same person — simplified, illustrated style suitable for a profile picture, "
    "square framing, clean background. Keep it recognizable as the same person."
)


@router.post("/generate", response_model=UserOut)
async def generate_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="Bu funksiya hali sozlanmagan — backend .env fayliga GEMINI_API_KEY qo'shing.",
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Rasm hajmi juda katta (8 MB dan kichik bo'lsin)")

    def _generate() -> bytes:
        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(model_name="gemini-2.5-flash-image")
        response = model.generate_content(
            [
                STYLE_PROMPT,
                {"mime_type": file.content_type or "image/jpeg", "data": image_bytes},
            ]
        )
        for part in response.parts:
            inline_data = getattr(part, "inline_data", None)
            if inline_data and inline_data.data:
                return inline_data.data
        raise ValueError("Model rasm qaytarmadi")

    try:
        generated_bytes = await asyncio.to_thread(_generate)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Avatar yaratishda xatolik: {exc}")

    encoded = base64.b64encode(generated_bytes).decode("ascii")
    current_user.avatar_url = f"data:image/png;base64,{encoded}"
    await db.commit()
    await db.refresh(current_user)
    return current_user
