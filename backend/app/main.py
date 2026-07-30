import asyncio
import logging
import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import accounting, analytics, auth, avatar, channels, chat, companies, complaints, developers, direct_chat, geo, group_meeting, invites, logs, meetings, notification_ws, notifications, office, partner_meeting, rafiq, roles, scheduled_meetings, tasks, users, warehouse
from app.core.config import settings
from app.services.scheduled_meeting_notifier import scheduled_meeting_loop

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    task = asyncio.create_task(scheduled_meeting_loop())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title=settings.app_name, lifespan=lifespan)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    # Also allow any private-network origin (localhost, 192.168.x.x, 10.x.x.x,
    # 172.16-31.x.x) on any port — this covers LAN/mobile-hotspot testing
    # where the machine's IP changes between networks, without needing to
    # edit CORS_ORIGINS by hand every time.
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def log_unhandled_exceptions(request: Request, exc: Exception):
    """Catches anything that isn't already a handled HTTPException, logs it
    (both to the DB, for the /logs viewer, and to the console), and returns a
    generic 500 instead of leaking a raw traceback to the client."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    try:
        from app.db.database import async_session
        from app.models.error_log import ErrorLog

        async with async_session() as db:
            db.add(
                ErrorLog(
                    source="backend",
                    level="error",
                    message=str(exc)[:4000],
                    stack_trace=traceback.format_exc()[:8000],
                    path=str(request.url.path),
                    method=request.method,
                )
            )
            await db.commit()
    except Exception:
        logger.exception("Failed to persist the error log entry itself")

    return JSONResponse(status_code=500, content={"detail": "Serverda kutilmagan xatolik yuz berdi."})


app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(geo.router)
app.include_router(chat.router)
app.include_router(channels.router)
app.include_router(tasks.router)
app.include_router(tasks.ws_router)
app.include_router(direct_chat.router)
app.include_router(meetings.router)
app.include_router(invites.router)
app.include_router(users.router)
app.include_router(rafiq.router)
app.include_router(roles.router)
app.include_router(avatar.router)
app.include_router(accounting.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(notification_ws.router)
app.include_router(logs.router)
app.include_router(developers.router)
app.include_router(complaints.router)
app.include_router(office.router)
app.include_router(group_meeting.router)
app.include_router(partner_meeting.router)
app.include_router(scheduled_meetings.router)
app.include_router(warehouse.router)


@app.get("/health")
async def health():
    return {"status": "ok", "tasks_comments": True, "tasks_ws": True}
