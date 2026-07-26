import os
import uuid as uuid_lib
from email.utils import parseaddr

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.complaint import Complaint
from app.models.user import User

router = APIRouter(prefix="/complaints", tags=["complaints"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILES = 5
MAX_FILE_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
}
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"}
_EMAIL_ADAPTER = TypeAdapter(EmailStr)


class ComplaintAttachmentOut(BaseModel):
    url: str
    name: str
    content_type: str | None = None


class ComplaintOut(BaseModel):
    id: str
    message: str
    contact_email: str
    path: str | None
    attachments: list[ComplaintAttachmentOut]
    status: str
    user_email: str
    user_full_name: str
    created_at: str


def _require_developer(current_user: User) -> None:
    if not current_user.is_developer:
        raise HTTPException(status_code=403, detail="Bu bo'lim faqat dasturchilar uchun")


def _normalize_email(raw: str) -> str:
    _, addr = parseaddr((raw or "").strip())
    email = (addr or raw or "").strip().lower()
    try:
        return str(_EMAIL_ADAPTER.validate_python(email))
    except ValidationError:
        raise HTTPException(status_code=400, detail="Email manzili noto'g'ri") from None


def _is_allowed_image(file: UploadFile) -> bool:
    content_type = (file.content_type or "").lower()
    ext = os.path.splitext(file.filename or "")[1].lower()
    if content_type in ALLOWED_IMAGE_TYPES:
        return True
    if content_type.startswith("image/") and ext in ALLOWED_EXTS:
        return True
    return ext in ALLOWED_EXTS


async def _save_images(files: list[UploadFile]) -> list[dict]:
    saved: list[dict] = []
    for file in files:
        if file is None or not file.filename:
            continue
        if not _is_allowed_image(file):
            raise HTTPException(
                status_code=400,
                detail="Faqat rasm fayllari qabul qilinadi (JPG, PNG, WEBP, GIF)",
            )
        data = await file.read()
        if not data:
            continue
        if len(data) > MAX_FILE_BYTES:
            raise HTTPException(status_code=400, detail="Rasm hajmi 10 MB dan kichik bo'lsin")
        ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
        if ext not in ALLOWED_EXTS:
            ext = ".jpg"
        stored_name = f"complaint_{uuid_lib.uuid4().hex}{ext}"
        with open(os.path.join(UPLOAD_DIR, stored_name), "wb") as out:
            out.write(data)
        saved.append(
            {
                "url": f"/uploads/{stored_name}",
                "name": file.filename[:255],
                "content_type": file.content_type,
            }
        )
        if len(saved) >= MAX_FILES:
            break
    return saved


@router.post("", status_code=204)
async def submit_complaint(
    message: str = Form(...),
    contact_email: str = Form(...),
    path: str | None = Form(None),
    files: list[UploadFile] | None = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not (message or "").strip():
        raise HTTPException(status_code=400, detail="Xabar bo'sh bo'lmasin")
    email = _normalize_email(contact_email)

    if files is None:
        upload_list = []
    elif isinstance(files, list):
        upload_list = [f for f in files if f is not None]
    else:
        upload_list = [files]
    if len(upload_list) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maksimum {MAX_FILES} ta rasm biriktiring")

    attachments = await _save_images(upload_list)

    db.add(
        Complaint(
            user_id=current_user.id,
            message=message.strip()[:4000],
            contact_email=email[:255],
            path=(path or None),
            attachments=attachments,
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
    rows = []
    for c, u in result.all():
        raw_attachments = c.attachments or []
        attachments = [
            ComplaintAttachmentOut(
                url=a.get("url", ""),
                name=a.get("name", "Rasm"),
                content_type=a.get("content_type"),
            )
            for a in raw_attachments
            if isinstance(a, dict) and a.get("url")
        ]
        rows.append(
            ComplaintOut(
                id=str(c.id),
                message=c.message,
                contact_email=c.contact_email or u.email,
                path=c.path,
                attachments=attachments,
                status=c.status,
                user_email=u.email,
                user_full_name=u.full_name,
                created_at=c.created_at.isoformat(),
            )
        )
    return rows


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
