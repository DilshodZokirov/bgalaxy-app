from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func as sa_func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_optional
from app.db.database import get_db
from app.models.error_log import ErrorLog
from app.models.user import User
from app.schemas.error_log import ErrorLogOut, FrontendErrorReport

router = APIRouter(prefix="/logs", tags=["logs"])


async def _require_developer(db: AsyncSession, current_user: User) -> None:
    if not current_user.is_developer:
        raise HTTPException(status_code=403, detail="Bu bo'lim faqat dasturchilar uchun")


@router.post("/frontend", status_code=204)
async def report_frontend_error(
    payload: FrontendErrorReport,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    db.add(
        ErrorLog(
            source="frontend",
            level=payload.level if payload.level in ("error", "warning") else "error",
            message=payload.message[:4000],
            stack_trace=payload.stack[:8000] if payload.stack else None,
            path=payload.path,
            user_id=current_user.id if current_user else None,
            user_agent=request.headers.get("user-agent", "")[:500],
        )
    )
    await db.commit()


@router.get("", response_model=list[ErrorLogOut])
async def list_logs(
    page: int = 1,
    page_size: int = 30,
    source: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_developer(db, current_user)

    query = select(ErrorLog, User).outerjoin(User, User.id == ErrorLog.user_id)
    if source:
        query = query.where(ErrorLog.source == source)
    query = query.order_by(ErrorLog.created_at.desc())

    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    out = []
    for log, user in result.all():
        out.append(
            ErrorLogOut(
                id=log.id,
                source=log.source,
                level=log.level,
                message=log.message,
                stack_trace=log.stack_trace,
                path=log.path,
                method=log.method,
                user_email=user.email if user else None,
                user_agent=log.user_agent,
                created_at=log.created_at,
            )
        )
    return out


@router.get("/count")
async def count_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _require_developer(db, current_user)
    result = await db.execute(select(sa_func.count()).select_from(ErrorLog))
    return {"total": result.scalar_one()}
