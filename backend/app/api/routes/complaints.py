from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.complaint import Complaint
from app.models.user import User

router = APIRouter(prefix="/complaints", tags=["complaints"])


class ComplaintCreate(BaseModel):
    message: str
    contact_email: EmailStr
    path: str | None = None


class ComplaintOut(BaseModel):
    id: str
    message: str
    contact_email: str
    path: str | None
    status: str
    user_email: str
    user_full_name: str
    created_at: str


def _require_developer(current_user: User) -> None:
    if not current_user.is_developer:
        raise HTTPException(status_code=403, detail="Bu bo'lim faqat dasturchilar uchun")


@router.post("", status_code=204)
async def submit_complaint(
    payload: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Xabar bo'sh bo'lmasin")
    contact_email = str(payload.contact_email).strip().lower()
    if not contact_email:
        raise HTTPException(status_code=400, detail="Email manzilini kiriting")
    db.add(
        Complaint(
            user_id=current_user.id,
            message=payload.message.strip()[:4000],
            contact_email=contact_email[:255],
            path=payload.path,
        )
    )
    await db.commit()


@router.get("", response_model=list[ComplaintOut])
async def list_complaints(
    page: int = 1,
    page_size: int = 30,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_developer(current_user)
    query = select(Complaint, User).join(User, User.id == Complaint.user_id)
    if status:
        query = query.where(Complaint.status == status)
    query = query.order_by(Complaint.created_at.desc())

    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    return [
        ComplaintOut(
            id=str(c.id),
            message=c.message,
            contact_email=c.contact_email or u.email,
            path=c.path,
            status=c.status,
            user_email=u.email,
            user_full_name=u.full_name,
            created_at=c.created_at.isoformat(),
        )
        for c, u in result.all()
    ]


@router.patch("/{complaint_id}/resolve", status_code=204)
async def resolve_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_developer(current_user)
    result = await db.execute(select(Complaint).where(Complaint.id == complaint_id))
    complaint = result.scalar_one_or_none()
    if complaint is None:
        raise HTTPException(status_code=404, detail="Topilmadi")
    complaint.status = "resolved"
    await db.commit()
