from datetime import date, datetime, timedelta, timezone

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func as sa_func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.accounting import Invoice, Transaction
from app.models.company import TeamMembership
from app.models.task import Task, task_points
from app.models.user import User
from app.services.permissions import require_permission

router = APIRouter(prefix="/companies/{company_id}/analytics", tags=["analytics"])


def _month_key(d: date) -> str:
    return d.strftime("%Y-%m")


def _day_key(d: date) -> str:
    return d.strftime("%Y-%m-%d")


def _last_n_months(n: int) -> list[str]:
    today = date.today()
    return [_month_key((today.replace(day=1) - relativedelta(months=i))) for i in range(n - 1, -1, -1)]


def _last_n_days(n: int) -> list[str]:
    today = date.today()
    return [_day_key(today - timedelta(days=i)) for i in range(n - 1, -1, -1)]


def _week_key(d: date) -> str:
    monday = d - timedelta(days=d.weekday())
    return monday.strftime("%m-%d")


def _last_n_weeks(n: int) -> list[str]:
    today = date.today()
    this_monday = today - timedelta(days=today.weekday())
    return [_week_key(this_monday - timedelta(weeks=i)) for i in range(n - 1, -1, -1)]


PERIOD_DAYS = {
    "today": 0,
    "week": 7,
    "month": 30,
    "3m": 91,
    "6m": 182,
    "year": 365,
}


def _period_start(period: str) -> date:
    days = PERIOD_DAYS.get(period, 30)
    return date.today() - timedelta(days=days)


MONTHS_FOR_PERIOD = {
    "today": 1,
    "week": 1,
    "month": 1,
    "3m": 3,
    "6m": 6,
    "year": 12,
}


def _months_for(period: str) -> int:
    return MONTHS_FOR_PERIOD.get(period, 6)


def _trend_config(period: str):
    """Returns (bucket_keys, start_date, key_fn) for a trend chart — daily
    buckets for "today"/"week", weekly buckets for "month" (a single
    whole-month bucket wasn't a useful line/trend), monthly buckets for
    everything longer."""
    if period == "today":
        return _last_n_days(1), date.today(), _day_key
    if period == "week":
        return _last_n_days(7), date.today() - timedelta(days=6), _day_key
    if period == "month":
        return _last_n_weeks(4), date.today() - timedelta(weeks=4), _week_key
    months = _months_for(period)
    start = date.today().replace(day=1) - relativedelta(months=months - 1)
    return _last_n_months(months), start, _month_key


@router.get("/member/{user_id}")
async def get_member_analytics(
    company_id: str,
    user_id: str,
    period: str = "month",
    page: int = 1,
    page_size: int = 10,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_permission(db, company_id, current_user.id, "view_analytics")

    from app.models.activity_ping import ActivityPing

    start = _period_start(period)
    start_dt = datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc)

    ping_result = await db.execute(
        select(ActivityPing).where(ActivityPing.user_id == user_id, ActivityPing.created_at >= start_dt)
    )
    ping_count = len(ping_result.scalars().all())
    time_spent_minutes = ping_count * 5

    task_query = select(Task).where(
        Task.company_id == company_id,
        Task.assignee_id == user_id,
        Task.status.in_(("accepted", "rejected")),
        Task.completed_at >= start,
    )
    all_result = await db.execute(task_query)
    all_tasks = all_result.scalars().all()
    accepted = sum(1 for t in all_tasks if t.status == "accepted")
    total = len(all_tasks)
    success_rate = round(accepted / total * 100) if total else None

    filtered_query = task_query
    if status:
        filtered_query = filtered_query.where(Task.status == status)
    filtered_query = filtered_query.order_by(Task.completed_at.desc())

    page = max(1, page)
    page_size = max(1, min(page_size, 50))
    count_result = await db.execute(select(sa_func.count()).select_from(filtered_query.subquery()))
    filtered_total = count_result.scalar_one()
    page_result = await db.execute(filtered_query.offset((page - 1) * page_size).limit(page_size))
    page_tasks = page_result.scalars().all()

    return {
        "time_spent_minutes": time_spent_minutes,
        "tasks_total": total,
        "tasks_accepted": accepted,
        "tasks_rejected": total - accepted,
        "success_rate": success_rate,
        "tasks": {
            "items": [
                {
                    "id": str(t.id),
                    "title": t.title,
                    "priority": t.priority,
                    "status": t.status,
                    "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                    "points": task_points(t.status, t.priority),
                }
                for t in page_tasks
            ],
            "total": filtered_total,
            "page": page,
            "page_size": page_size,
        },
    }


@router.get("")
async def get_company_analytics(
    company_id: str,
    task_period: str = "month",
    perf_period: str = "month",
    fin_period: str = "month",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_permission(db, company_id, current_user.id, "view_analytics")

    task_months, task_start, task_key_fn = _trend_config(task_period)
    fin_months, fin_start, fin_key_fn = _trend_config(fin_period)
    perf_start = _period_start(perf_period)

    # ---------- Team activity ----------
    result = await db.execute(
        select(User, TeamMembership)
        .join(TeamMembership, TeamMembership.user_id == User.id)
        .where(TeamMembership.company_id == company_id, TeamMembership.approved == True)  # noqa: E712
    )
    now = datetime.now(timezone.utc)
    team_activity = []
    for user, _ in result.all():
        last_seen = user.last_seen_at
        if last_seen and last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=timezone.utc)
        is_active = bool(last_seen and (now - last_seen) <= timedelta(days=7))
        team_activity.append(
            {
                "user_id": str(user.id),
                "full_name": user.full_name,
                "last_seen_at": last_seen.isoformat() if last_seen else None,
                "active": is_active,
            }
        )
    team_activity.sort(key=lambda t: t["last_seen_at"] or "", reverse=True)

    # ---------- Task trend ----------
    task_result = await db.execute(
        select(Task).where(
            Task.company_id == company_id,
            Task.status.in_(("accepted", "rejected")),
            Task.completed_at >= task_start,
        )
    )
    finished_tasks = task_result.scalars().all()

    monthly = {m: {"month": m, "accepted": 0, "rejected": 0} for m in task_months}
    for t in finished_tasks:
        mk = task_key_fn(t.completed_at)
        if mk in monthly:
            monthly[mk]["accepted" if t.status == "accepted" else "rejected"] += 1

    task_trend = []
    for m in task_months:
        entry = monthly[m]
        total = entry["accepted"] + entry["rejected"]
        entry["completion_rate"] = round(entry["accepted"] / total * 100) if total else None
        task_trend.append(entry)

    # ---------- Member performance (separate period) ----------
    perf_result = await db.execute(
        select(Task).where(
            Task.company_id == company_id,
            Task.status.in_(("accepted", "rejected")),
            Task.completed_at >= perf_start,
        )
    )
    perf_tasks = perf_result.scalars().all()
    member_stats: dict[str, dict] = {}
    for t in perf_tasks:
        uid = str(t.assignee_id)
        stat = member_stats.setdefault(uid, {"accepted": 0, "rejected": 0, "score": 0})
        stat["accepted" if t.status == "accepted" else "rejected"] += 1
        stat["score"] += task_points(t.status, t.priority)

    name_result = await db.execute(select(User).where(User.id.in_([k for k in member_stats.keys()] or ["00000000-0000-0000-0000-000000000000"])))
    names = {str(u.id): u.full_name for u in name_result.scalars().all()}
    member_performance = sorted(
        [
            {"user_id": uid, "full_name": names.get(uid, "Noma'lum"), **stat}
            for uid, stat in member_stats.items()
        ],
        key=lambda m: m["score"],
        reverse=True,
    )

    # ---------- Kanban bottlenecks ----------
    active_result = await db.execute(
        select(Task.status).where(Task.company_id == company_id, Task.status.in_(("todo", "in_progress", "testing")))
    )
    stage_counts = {"todo": 0, "in_progress": 0, "testing": 0}
    for (status_val,) in active_result.all():
        stage_counts[status_val] += 1

    # ---------- Financial trend (separate period) ----------
    tx_result = await db.execute(
        select(Transaction).where(Transaction.company_id == company_id, Transaction.occurred_on >= fin_start)
    )
    all_tx = tx_result.scalars().all()
    inv_result = await db.execute(
        select(Invoice).where(Invoice.company_id == company_id, Invoice.issue_date >= fin_start)
    )
    all_inv = inv_result.scalars().all()

    fin_monthly = {m: {"month": m, "income": 0.0, "expense": 0.0} for m in fin_months}
    for t in all_tx:
        mk = fin_key_fn(t.occurred_on)
        if mk in fin_monthly:
            fin_monthly[mk]["income" if t.type == "income" else "expense"] += float(t.amount)
    for inv in all_inv:
        mk = fin_key_fn(inv.issue_date)
        if mk in fin_monthly:
            if inv.status == "paid":
                fin_monthly[mk]["income"] += float(inv.total_amount)
            elif inv.status == "overdue":
                fin_monthly[mk]["expense"] += float(inv.total_amount)
    financial_trend = [fin_monthly[m] for m in fin_months]

    unpaid_result = await db.execute(
        select(Invoice).where(Invoice.company_id == company_id, Invoice.status.in_(("sent", "overdue")))
    )
    unpaid = unpaid_result.scalars().all()
    unpaid_invoices = {"count": len(unpaid), "total": sum(float(i.total_amount) for i in unpaid)}

    return {
        "team_activity": team_activity,
        "task_trend": task_trend,
        "member_performance": member_performance,
        "stage_counts": stage_counts,
        "financial_trend": financial_trend,
        "unpaid_invoices": unpaid_invoices,
    }
