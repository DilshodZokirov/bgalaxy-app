import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.mail import send_password_changed_email, send_password_reset_email, send_verification_email
from app.core.security import create_access_token, hash_password, verify_password
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AutoLockRequest,
    ChangePasswordRequest,
    ChangePinRequest,
    ForgotPasswordRequest,
    GoogleLogin,
    MessageOut,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SetPinRequest,
    TokenOut,
    UserLogin,
    UserOut,
    UserRegister,
    VerifyPinRequest,
)
from app.schemas.user import UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


def _send_verification(background_tasks: BackgroundTasks, user: User) -> None:
    verify_link = f"{settings.frontend_url}/verify-email/{user.verification_token}"
    background_tasks.add_task(send_verification_email, user.email, user.full_name, verify_link)


@router.post("/register", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        email_verified=False,
        verification_token=uuid.uuid4().hex,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    _send_verification(background_tasks, user)

    return MessageOut(
        message="Ro'yxatdan o'tish muvaffaqiyatli! Emailingizga tasdiqlash havolasi yuborildi — "
        "havolani bosgach, tizimga kira olasiz."
    )


@router.post("/login", response_model=TokenOut)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=401,
            detail="Bu hisob Google orqali yaratilgan — 'Google orqali kirish' tugmasidan foydalaning"
            if user
            else "Invalid email or password",
        )
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Iltimos, avval emailingizni tasdiqlang — pochtangizga yuborilgan havolani bosing.",
        )

    token = create_access_token(subject=str(user.id))
    return TokenOut(access_token=token, user=user)


@router.post("/google", response_model=TokenOut)
async def google_login(payload: GoogleLogin, db: AsyncSession = Depends(get_db)):
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google orqali kirish hali sozlanmagan")

    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    try:
        info = google_id_token.verify_oauth2_token(
            payload.id_token, google_requests.Request(), settings.google_client_id
        )
    except ValueError as exc:
        import logging

        logging.getLogger(__name__).warning("Google token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail=f"Google tokeni noto'g'ri: {exc}")

    email = info.get("email")
    google_id = info.get("sub")
    full_name = info.get("name") or email.split("@")[0]
    if not email:
        raise HTTPException(status_code=401, detail="Google hisobida email topilmadi")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            email=email,
            hashed_password=None,
            full_name=full_name,
            avatar_url=info.get("picture"),
            email_verified=True,  # Google already verified this address
            google_id=google_id,
        )
        db.add(user)
    elif not user.google_id:
        user.google_id = google_id
        user.email_verified = True  # they proved ownership via Google just now

    await db.commit()
    await db.refresh(user)

    token = create_access_token(subject=str(user.id))
    return TokenOut(access_token=token, user=user)


@router.get("/verify-email/{token}")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.verification_token == token))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Tasdiqlash havolasi noto'g'ri yoki eskirgan")

    user.email_verified = True
    user.verification_token = None
    await db.commit()
    return {"verified": True}


@router.post("/resend-verification", status_code=204)
async def resend_verification(
    payload: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Public by design — an unverified user has no token yet, so this can't
    require auth. Silently no-ops for unknown/already-verified emails so it
    can't be used to probe which addresses are registered."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None or user.email_verified:
        return
    user.verification_token = uuid.uuid4().hex
    await db.commit()
    _send_verification(background_tasks, user)


@router.post("/forgot-password", status_code=204)
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Public — always no-ops silently for unknown emails so this can't be
    used to probe which addresses are registered. Google-only accounts (no
    password yet) ARE allowed through here — this doubles as the way to set
    a first password for them, useful while Google sign-in is unreliable."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None:
        return

    user.reset_token = uuid.uuid4().hex
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.commit()

    reset_link = f"{settings.frontend_url}/reset-password/{user.reset_token}"
    background_tasks.add_task(send_password_reset_email, user.email, user.full_name, reset_link)


@router.post("/reset-password", response_model=MessageOut)
async def reset_password(
    payload: ResetPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.reset_token == payload.token))
    user = result.scalar_one_or_none()
    if user is None or user.reset_token_expires is None:
        raise HTTPException(status_code=400, detail="Havola noto'g'ri yoki eskirgan")

    expires = user.reset_token_expires
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Havola muddati o'tgan — qaytadan so'rov yuboring")

    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    await db.commit()

    background_tasks.add_task(send_password_changed_email, user.email, user.full_name)

    return MessageOut(message="Parolingiz muvaffaqiyatli almashtirildi — endi kira olasiz.")


@router.post("/change-password", response_model=MessageOut)
async def change_password(
    payload: ChangePasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=400,
            detail="Bu hisobda hali parol o'rnatilmagan — 'Parolni tiklash' orqali birinchi parolingizni o'rnating.",
        )
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Eski parol noto'g'ri")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Yangi parol kamida 6 belgidan iborat bo'lsin")

    current_user.hashed_password = hash_password(payload.new_password)
    await db.commit()

    background_tasks.add_task(send_password_changed_email, current_user.email, current_user.full_name)

    return MessageOut(message="Parolingiz muvaffaqiyatli almashtirildi.")


@router.post("/pin/set", response_model=MessageOut)
async def set_pin(
    payload: SetPinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=400,
            detail="Bu hisobda parol o'rnatilmagan (Google orqali kirgan bo'lishingiz mumkin) — avval 'Parolni tiklash' orqali parol o'rnating, keyin PIN qo'ya olasiz.",
        )
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Parol noto'g'ri")
    if not payload.pin.isdigit() or not (4 <= len(payload.pin) <= 6):
        raise HTTPException(status_code=400, detail="PIN 4-6 ta raqamdan iborat bo'lsin")

    current_user.pin_hash = hash_password(payload.pin)
    await db.commit()
    return MessageOut(message="PIN-kod o'rnatildi.")


@router.post("/pin/change", response_model=MessageOut)
async def change_pin(
    payload: ChangePinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.hashed_password or not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Parol noto'g'ri")
    if not current_user.pin_hash or not verify_password(payload.old_pin, current_user.pin_hash):
        raise HTTPException(status_code=401, detail="Joriy PIN noto'g'ri")
    if not payload.new_pin.isdigit() or not (4 <= len(payload.new_pin) <= 6):
        raise HTTPException(status_code=400, detail="Yangi PIN 4-6 ta raqamdan iborat bo'lsin")

    current_user.pin_hash = hash_password(payload.new_pin)
    await db.commit()
    return MessageOut(message="PIN-kod almashtirildi.")


@router.post("/pin/verify", response_model=MessageOut)
async def verify_pin(
    payload: VerifyPinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.pin_hash or not verify_password(payload.pin, current_user.pin_hash):
        raise HTTPException(status_code=401, detail="PIN noto'g'ri")
    return MessageOut(message="Tasdiqlandi.")


@router.patch("/lock-settings", response_model=MessageOut)
async def update_lock_settings(
    payload: AutoLockRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.auto_lock_minutes < 0 or payload.auto_lock_minutes > 180:
        raise HTTPException(status_code=400, detail="Noto'g'ri qiymat")
    current_user.auto_lock_minutes = payload.auto_lock_minutes
    await db.commit()
    return MessageOut(message="Sozlama saqlandi.")


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url
    if payload.theme is not None:
        current_user.theme = payload.theme
    if payload.ui_theme is not None:
        current_user.ui_theme = payload.ui_theme
    if payload.dark_background is not None:
        current_user.dark_background = payload.dark_background
    if payload.light_background is not None:
        current_user.light_background = payload.light_background
    await db.commit()
    await db.refresh(current_user)
    return current_user
