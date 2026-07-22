from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.mail import send_invite_email
from app.db.database import get_db
from app.models.company import Company, MemberRole, TeamMembership
from app.models.invite import Invite
from app.models.notification import Notification
from app.services.notify import ping_notifications
from app.models.user import User
from app.schemas.invite import InviteCreate, InviteOut, InvitePreview
from app.services.permissions import require_permission

router = APIRouter(tags=["invites"])


@router.post("/companies/{company_id}/invites", response_model=InviteOut, status_code=201)
async def create_invite(
    company_id: str,
    payload: InviteCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_permission(db, company_id, current_user.id, "invite_members")

    # Only registered users can be invited — this keeps the invite flow
    # scoped to people who already have a BGalaxy account.
    target_user_result = await db.execute(select(User).where(User.email == payload.email))
    target_user = target_user_result.scalar_one_or_none()
    if target_user is None:
        raise HTTPException(status_code=404, detail="Bu email bilan ro'yxatdan o'tgan foydalanuvchi topilmadi")

    invite = Invite(
        company_id=company_id,
        email=payload.email,
        role=payload.role,
        invited_by=current_user.id,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    company_result = await db.execute(select(Company).where(Company.id == invite.company_id))
    company = company_result.scalar_one_or_none()
    company_name = company.name if company else "BGalaxy"

    db.add(
        Notification(
            user_id=target_user.id,
            type="invite",
            message=f"{current_user.full_name} sizni '{company_name}' kompaniyasiga taklif qildi.",
            company_id=invite.company_id,
            related_user_id=current_user.id,
            invite_token=invite.token,
        )
    )
    await db.commit()
    await ping_notifications(target_user.id)

    invite_link = f"{settings.frontend_url}/invite/{invite.token}"
    background_tasks.add_task(send_invite_email, payload.email, company_name, invite_link)

    return invite


@router.get("/invites/{token}", response_model=InvitePreview)
async def preview_invite(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Invite).where(Invite.token == token))
    invite = result.scalar_one_or_none()
    if invite is None:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")

    company_result = await db.execute(select(Company).where(Company.id == invite.company_id))
    company = company_result.scalar_one_or_none()

    return InvitePreview(
        company_name=company.name if company else "Noma'lum kompaniya",
        email=invite.email,
        role=invite.role,
        accepted=invite.accepted_at is not None,
        created_at=invite.created_at,
    )


@router.post("/invites/{token}/accept")
async def accept_invite(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Invite).where(Invite.token == token))
    invite = result.scalar_one_or_none()
    if invite is None:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")
    if invite.accepted_at is not None:
        raise HTTPException(status_code=400, detail="Taklif allaqachon ishlatilgan")

    existing = await db.execute(
        select(TeamMembership).where(
            TeamMembership.company_id == invite.company_id,
            TeamMembership.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none() is None:
        db.add(
            TeamMembership(
                company_id=invite.company_id,
                user_id=current_user.id,
                role=invite.role,
                role_id=None,
                approved=False,
            )
        )
        company_result = await db.execute(select(Company).where(Company.id == invite.company_id))
        company = company_result.scalar_one_or_none()
        company_name = company.name if company else "kompaniya"

        db.add(
            Notification(
                user_id=invite.invited_by,
                type="join_request",
                message=f"{current_user.full_name} kompaniyaga qo'shilishni so'ramoqda.",
                company_id=invite.company_id,
                related_user_id=current_user.id,
            )
        )
        db.add(
            Notification(
                user_id=current_user.id,
                type="info",
                message=f"'{company_name}' kompaniyasiga qo'shilish so'rovingiz ko'rib chiqilmoqda.",
                company_id=invite.company_id,
            )
        )

    invite.accepted_at = func.now()
    await db.commit()
    await ping_notifications(invite.invited_by)
    await ping_notifications(current_user.id)

    company_result = await db.execute(select(Company).where(Company.id == invite.company_id))
    company = company_result.scalar_one_or_none()
    return {"company_id": str(invite.company_id), "company_name": company.name if company else None}
