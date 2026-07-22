import csv
import io
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from sqlalchemy import func as sa_func
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.accounting import Invoice, PayrollEntry, Transaction
from app.models.user import User
from app.schemas.accounting import (
    AccountingSummary,
    InvoiceCreate,
    InvoiceOut,
    InvoiceUpdate,
    PayrollCreate,
    PayrollOut,
    PeriodBucket,
    PeriodStats,
    PeriodTotals,
    TransactionCreate,
    TransactionOut,
)
from app.services.permissions import require_permission

router = APIRouter(prefix="/companies/{company_id}/accounting", tags=["accounting"])


async def _check(db: AsyncSession, company_id: str, user_id) -> None:
    await require_permission(db, company_id, user_id, "manage_accounting")


def _month_bounds(month: str) -> tuple[date, date]:
    year, mon = (int(part) for part in month.split("-"))
    start = date(year, mon, 1)
    end = date(year + 1, 1, 1) if mon == 12 else date(year, mon + 1, 1)
    return start, end


def _tx_out(tx: Transaction, creator_name: str | None) -> TransactionOut:
    return TransactionOut(
        id=tx.id,
        type=tx.type,
        category=tx.category,
        amount=float(tx.amount),
        description=tx.description,
        occurred_on=tx.occurred_on,
        created_at=tx.created_at,
        created_by_name=creator_name,
    )


def _invoice_out(inv: Invoice, creator_name: str | None) -> InvoiceOut:
    return InvoiceOut(
        id=inv.id,
        client_name=inv.client_name,
        items=inv.items,
        total_amount=float(inv.total_amount),
        status=inv.status,
        issue_date=inv.issue_date,
        due_date=inv.due_date,
        created_at=inv.created_at,
        created_by_name=creator_name,
    )


def _payroll_out(entry: PayrollEntry, employee_name: str | None, creator_name: str | None) -> PayrollOut:
    return PayrollOut(
        id=entry.id,
        employee_id=entry.employee_id,
        employee_name=employee_name,
        period=entry.period,
        amount=float(entry.amount),
        status=entry.status,
        paid_at=entry.paid_at,
        created_by_name=creator_name,
    )


# ---------- Transactions (paginated, filterable, sortable, searchable) ----------


@router.get("/transactions")
async def list_transactions(
    company_id: str,
    page: int = 1,
    page_size: int = 5,
    search: str | None = None,
    type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort_by: str = "occurred_on",
    sort_dir: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    query = (
        select(Transaction, User)
        .join(User, User.id == Transaction.created_by)
        .where(Transaction.company_id == company_id)
    )
    if type:
        query = query.where(Transaction.type == type)
    if date_from:
        query = query.where(Transaction.occurred_on >= date_from)
    if date_to:
        query = query.where(Transaction.occurred_on <= date_to)
    if search:
        like = f"%{search}%"
        query = query.where(or_(Transaction.category.ilike(like), Transaction.description.ilike(like)))

    sort_map = {"occurred_on": Transaction.occurred_on, "amount": Transaction.amount, "category": Transaction.category}
    sort_col = sort_map.get(sort_by, Transaction.occurred_on)
    query = query.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    count_result = await db.execute(select(sa_func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = [_tx_out(tx, user.full_name) for tx, user in result.all()]

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/transactions", response_model=TransactionOut, status_code=201)
async def create_transaction(
    company_id: str,
    payload: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    if payload.type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="type 'income' yoki 'expense' bo'lishi kerak")
    tx = Transaction(
        company_id=company_id,
        type=payload.type,
        category=payload.category,
        amount=payload.amount,
        description=payload.description,
        occurred_on=payload.occurred_on,
        created_by=current_user.id,
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return _tx_out(tx, current_user.full_name)


@router.delete("/transactions/{transaction_id}", status_code=204)
async def delete_transaction(
    company_id: str,
    transaction_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id, Transaction.company_id == company_id)
    )
    tx = result.scalar_one_or_none()
    if tx is None:
        raise HTTPException(status_code=404, detail="Topilmadi")
    await db.delete(tx)
    await db.commit()


# ---------- Invoices ----------


@router.get("/invoices")
async def list_invoices(
    company_id: str,
    page: int = 1,
    page_size: int = 5,
    search: str | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort_by: str = "issue_date",
    sort_dir: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    query = select(Invoice, User).join(User, User.id == Invoice.created_by).where(Invoice.company_id == company_id)
    if status:
        query = query.where(Invoice.status == status)
    if date_from:
        query = query.where(Invoice.issue_date >= date_from)
    if date_to:
        query = query.where(Invoice.issue_date <= date_to)
    if search:
        query = query.where(Invoice.client_name.ilike(f"%{search}%"))

    sort_map = {"issue_date": Invoice.issue_date, "total_amount": Invoice.total_amount, "client_name": Invoice.client_name}
    sort_col = sort_map.get(sort_by, Invoice.issue_date)
    query = query.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    count_result = await db.execute(select(sa_func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = [_invoice_out(inv, user.full_name) for inv, user in result.all()]

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/invoices", response_model=InvoiceOut, status_code=201)
async def create_invoice(
    company_id: str,
    payload: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    items = [item.model_dump() for item in payload.items]
    total = sum(item["quantity"] * item["price"] for item in items)
    invoice = Invoice(
        company_id=company_id,
        client_name=payload.client_name,
        items=items,
        total_amount=total,
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        created_by=current_user.id,
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    return _invoice_out(invoice, current_user.full_name)


@router.patch("/invoices/{invoice_id}", response_model=InvoiceOut)
async def update_invoice(
    company_id: str,
    invoice_id: str,
    payload: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    result = await db.execute(
        select(Invoice, User).join(User, User.id == Invoice.created_by).where(
            Invoice.id == invoice_id, Invoice.company_id == company_id
        )
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Topilmadi")
    invoice, creator = row
    if payload.status not in ("draft", "sent", "paid", "overdue"):
        raise HTTPException(status_code=400, detail="Noto'g'ri status")
    invoice.status = payload.status
    await db.commit()
    await db.refresh(invoice)
    return _invoice_out(invoice, creator.full_name)


@router.delete("/invoices/{invoice_id}", status_code=204)
async def delete_invoice(
    company_id: str,
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.company_id == company_id)
    )
    invoice = result.scalar_one_or_none()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Topilmadi")
    await db.delete(invoice)
    await db.commit()


# ---------- Payroll ----------


@router.get("/payroll")
async def list_payroll(
    company_id: str,
    page: int = 1,
    page_size: int = 5,
    search: str | None = None,
    period_from: str | None = None,
    period_to: str | None = None,
    sort_by: str = "period",
    sort_dir: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    Employee = User
    query = (
        select(PayrollEntry, Employee)
        .join(Employee, Employee.id == PayrollEntry.employee_id)
        .where(PayrollEntry.company_id == company_id)
    )
    if period_from:
        query = query.where(PayrollEntry.period >= period_from)
    if period_to:
        query = query.where(PayrollEntry.period <= period_to)
    if search:
        query = query.where(Employee.full_name.ilike(f"%{search}%"))

    sort_map = {"period": PayrollEntry.period, "amount": PayrollEntry.amount}
    sort_col = sort_map.get(sort_by, PayrollEntry.period)
    query = query.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    count_result = await db.execute(select(sa_func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    # created_by names — batch lookup
    entries = result.all()
    creator_ids = {str(entry.created_by) for entry, _ in entries}
    creators = {}
    if creator_ids:
        creators_result = await db.execute(select(User).where(User.id.in_(creator_ids)))
        creators = {str(u.id): u.full_name for u in creators_result.scalars().all()}

    items = [_payroll_out(entry, employee.full_name, creators.get(str(entry.created_by))) for entry, employee in entries]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/payroll", response_model=PayrollOut, status_code=201)
async def create_payroll(
    company_id: str,
    payload: PayrollCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    employee_result = await db.execute(select(User).where(User.id == str(payload.employee_id)))
    employee = employee_result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(status_code=404, detail="Xodim topilmadi")

    entry = PayrollEntry(
        company_id=company_id,
        employee_id=payload.employee_id,
        period=payload.period,
        amount=payload.amount,
        created_by=current_user.id,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return _payroll_out(entry, employee.full_name, current_user.full_name)


@router.patch("/payroll/{entry_id}/pay", response_model=PayrollOut)
async def mark_payroll_paid(
    company_id: str,
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    result = await db.execute(
        select(PayrollEntry).where(PayrollEntry.id == entry_id, PayrollEntry.company_id == company_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Topilmadi")

    entry.status = "paid"
    entry.paid_at = datetime.utcnow()
    await db.commit()

    user_ids = {str(entry.employee_id), str(entry.created_by)}
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users_by_id = {str(u.id): u for u in users_result.scalars().all()}
    return _payroll_out(
        entry,
        users_by_id.get(str(entry.employee_id)) and users_by_id[str(entry.employee_id)].full_name,
        users_by_id.get(str(entry.created_by)) and users_by_id[str(entry.created_by)].full_name,
    )


# ---------- Umumiy — month-scoped summary (stat cards) ----------


@router.get("/summary", response_model=AccountingSummary)
async def get_summary(
    company_id: str,
    month: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    month_start, month_end = _month_bounds(month)

    tx_result = await db.execute(
        select(Transaction).where(
            Transaction.company_id == company_id,
            Transaction.occurred_on >= month_start,
            Transaction.occurred_on < month_end,
        )
    )
    transactions = tx_result.scalars().all()
    total_income = sum(float(t.amount) for t in transactions if t.type == "income")
    total_expense = sum(float(t.amount) for t in transactions if t.type == "expense")

    # Invoices contribute based on status: paid -> income, overdue -> expense.
    inv_result = await db.execute(
        select(Invoice).where(
            Invoice.company_id == company_id,
            Invoice.issue_date >= month_start,
            Invoice.issue_date < month_end,
        )
    )
    for inv in inv_result.scalars().all():
        if inv.status == "paid":
            total_income += float(inv.total_amount)
        elif inv.status == "overdue":
            total_expense += float(inv.total_amount)

    payroll_result = await db.execute(
        select(PayrollEntry).where(PayrollEntry.company_id == company_id, PayrollEntry.period == month)
    )
    total_payroll = sum(float(p.amount) for p in payroll_result.scalars().all())

    return AccountingSummary(
        month=month,
        total_income=total_income,
        total_expense=total_expense,
        total_payroll=total_payroll,
        balance=total_income - total_expense - total_payroll,
    )


# ---------- Statistika — period-based chart data ----------


def _period_bounds(period: str) -> tuple[date, date, str]:
    today = datetime.utcnow().date()
    if period == "year":
        y, m = today.year - 1, today.month
        start = date(y, m, 1)
        bucket = "month"
    elif period == "6m":
        y, m = today.year, today.month - 5
        while m <= 0:
            m += 12
            y -= 1
        start = date(y, m, 1)
        bucket = "month"
    elif period == "3m":
        y, m = today.year, today.month - 2
        while m <= 0:
            m += 12
            y -= 1
        start = date(y, m, 1)
        bucket = "month"
    elif period == "1m":
        start = today.replace(day=1)
        bucket = "day"
    elif period == "1w":
        start = today - timedelta(days=6)
        bucket = "day"
    else:
        raise HTTPException(status_code=400, detail="Noto'g'ri davr")
    return start, today, bucket


@router.get("/stats", response_model=PeriodStats)
async def get_stats(
    company_id: str,
    period: str = "6m",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    start, end, bucket = _period_bounds(period)

    tx_result = await db.execute(
        select(Transaction).where(
            Transaction.company_id == company_id,
            Transaction.occurred_on >= start,
            Transaction.occurred_on <= end,
        )
    )
    all_tx = tx_result.scalars().all()

    inv_result = await db.execute(
        select(Invoice).where(
            Invoice.company_id == company_id,
            Invoice.issue_date >= start,
            Invoice.issue_date <= end,
        )
    )
    all_inv = inv_result.scalars().all()

    payroll_result = await db.execute(select(PayrollEntry).where(PayrollEntry.company_id == company_id))
    all_payroll = payroll_result.scalars().all()

    def bucket_key(d: date) -> str:
        return d.strftime("%Y-%m") if bucket == "month" else d.strftime("%Y-%m-%d")

    keys: list[str] = []
    if bucket == "month":
        y, m = start.year, start.month
        while (y, m) <= (end.year, end.month):
            keys.append(f"{y}-{m:02d}")
            m += 1
            if m > 12:
                m = 1
                y += 1
    else:
        d = start
        while d <= end:
            keys.append(d.strftime("%Y-%m-%d"))
            d += timedelta(days=1)

    data = {k: {"income": 0.0, "expense": 0.0, "payroll": 0.0} for k in keys}

    for t in all_tx:
        k = bucket_key(t.occurred_on)
        if k in data:
            if t.type == "income":
                data[k]["income"] += float(t.amount)
            else:
                data[k]["expense"] += float(t.amount)

    for inv in all_inv:
        k = bucket_key(inv.issue_date)
        if k in data:
            if inv.status == "paid":
                data[k]["income"] += float(inv.total_amount)
            elif inv.status == "overdue":
                data[k]["expense"] += float(inv.total_amount)

    if bucket == "month":
        for p in all_payroll:
            if p.period in data:
                data[p.period]["payroll"] += float(p.amount)
    # Payroll is inherently monthly — for day-level buckets (1m/1w) it isn't
    # distributed per-day, so "Oylik" will read 0 at that granularity.

    buckets = [
        PeriodBucket(
            label=k,
            income=v["income"],
            expense=v["expense"],
            payroll=v["payroll"],
            balance=v["income"] - v["expense"] - v["payroll"],
        )
        for k, v in data.items()
    ]

    totals = PeriodTotals(
        total_income=sum(b.income for b in buckets),
        total_expense=sum(b.expense for b in buckets),
        total_payroll=sum(b.payroll for b in buckets),
        balance=sum(b.balance for b in buckets),
    )

    return PeriodStats(period=period, buckets=buckets, totals=totals)


# ---------- Report preview (JSON) + download (CSV), both date-range based ----------


@router.get("/yearly-summary")
async def get_yearly_summary(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Last 10 calendar years of income/expense/balance (transactions +
    invoice status same as elsewhere: paid=income, overdue=expense, minus
    payroll), each with a delta vs. the previous year — powers the Dashboard
    yearly comparison widget."""
    await _check(db, company_id, current_user.id)

    current_year = datetime.utcnow().year
    start_year = current_year - 9

    tx_result = await db.execute(
        select(Transaction).where(
            Transaction.company_id == company_id,
            Transaction.occurred_on >= date(start_year, 1, 1),
        )
    )
    all_tx = tx_result.scalars().all()

    inv_result = await db.execute(
        select(Invoice).where(
            Invoice.company_id == company_id,
            Invoice.issue_date >= date(start_year, 1, 1),
        )
    )
    all_inv = inv_result.scalars().all()

    payroll_result = await db.execute(select(PayrollEntry).where(PayrollEntry.company_id == company_id))
    all_payroll = payroll_result.scalars().all()

    years_data = {}
    for year in range(start_year, current_year + 1):
        income = sum(float(t.amount) for t in all_tx if t.type == "income" and t.occurred_on.year == year)
        expense = sum(float(t.amount) for t in all_tx if t.type == "expense" and t.occurred_on.year == year)
        for inv in all_inv:
            if inv.issue_date.year == year:
                if inv.status == "paid":
                    income += float(inv.total_amount)
                elif inv.status == "overdue":
                    expense += float(inv.total_amount)
        payroll = sum(float(p.amount) for p in all_payroll if p.period.startswith(str(year)))
        years_data[year] = {
            "year": year,
            "income": income,
            "expense": expense,
            "balance": income - expense - payroll,
        }

    years = [years_data[y] for y in range(start_year, current_year + 1)]
    for i, entry in enumerate(years):
        prev = years[i - 1] if i > 0 else None
        entry["income_delta"] = entry["income"] - prev["income"] if prev else None
        entry["expense_delta"] = entry["expense"] - prev["expense"] if prev else None
        entry["balance_delta"] = entry["balance"] - prev["balance"] if prev else None

    return {"years": years}


@router.get("/report-data")
async def preview_report(
    company_id: str,
    date_from: date,
    date_to: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)

    tx_result = await db.execute(
        select(Transaction, User)
        .join(User, User.id == Transaction.created_by)
        .where(
            Transaction.company_id == company_id,
            Transaction.occurred_on >= date_from,
            Transaction.occurred_on <= date_to,
        )
        .order_by(Transaction.occurred_on)
    )
    invoice_result = await db.execute(
        select(Invoice, User)
        .join(User, User.id == Invoice.created_by)
        .where(Invoice.company_id == company_id, Invoice.issue_date >= date_from, Invoice.issue_date <= date_to)
    )
    payroll_result = await db.execute(
        select(PayrollEntry, User)
        .join(User, User.id == PayrollEntry.employee_id)
        .where(
            PayrollEntry.company_id == company_id,
            PayrollEntry.period >= date_from.strftime("%Y-%m"),
            PayrollEntry.period <= date_to.strftime("%Y-%m"),
        )
    )

    return {
        "date_from": str(date_from),
        "date_to": str(date_to),
        "transactions": [
            {
                "occurred_on": str(tx.occurred_on),
                "type": tx.type,
                "category": tx.category,
                "amount": float(tx.amount),
                "description": tx.description,
                "created_by_name": user.full_name,
            }
            for tx, user in tx_result.all()
        ],
        "invoices": [
            {
                "client_name": inv.client_name,
                "total_amount": float(inv.total_amount),
                "issue_date": str(inv.issue_date),
                "status": inv.status,
                "created_by_name": user.full_name,
            }
            for inv, user in invoice_result.all()
        ],
        "payroll": [
            {
                "employee_name": employee.full_name,
                "period": entry.period,
                "amount": float(entry.amount),
                "status": entry.status,
            }
            for entry, employee in payroll_result.all()
        ],
    }


@router.get("/report")
async def download_report(
    company_id: str,
    date_from: date,
    date_to: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)

    tx_result = await db.execute(
        select(Transaction, User)
        .join(User, User.id == Transaction.created_by)
        .where(
            Transaction.company_id == company_id,
            Transaction.occurred_on >= date_from,
            Transaction.occurred_on <= date_to,
        )
        .order_by(Transaction.occurred_on)
    )
    invoice_result = await db.execute(
        select(Invoice, User)
        .join(User, User.id == Invoice.created_by)
        .where(Invoice.company_id == company_id, Invoice.issue_date >= date_from, Invoice.issue_date <= date_to)
    )
    payroll_result = await db.execute(
        select(PayrollEntry, User)
        .join(User, User.id == PayrollEntry.employee_id)
        .where(
            PayrollEntry.company_id == company_id,
            PayrollEntry.period >= date_from.strftime("%Y-%m"),
            PayrollEntry.period <= date_to.strftime("%Y-%m"),
        )
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow([f"Hisobot — {date_from} / {date_to}"])
    writer.writerow([])
    writer.writerow(["TRANZAKSIYALAR"])
    writer.writerow(["Sana", "Turi", "Kategoriya", "Summasi", "Izoh", "Kim kiritdi"])
    for tx, user in tx_result.all():
        writer.writerow([tx.occurred_on, tx.type, tx.category, float(tx.amount), tx.description or "", user.full_name])

    writer.writerow([])
    writer.writerow(["HISOB-FAKTURALAR"])
    writer.writerow(["Mijoz", "Summasi", "Sana", "Holati", "Kim yaratdi"])
    for inv, user in invoice_result.all():
        writer.writerow([inv.client_name, float(inv.total_amount), inv.issue_date, inv.status, user.full_name])

    writer.writerow([])
    writer.writerow(["ISH HAQI"])
    writer.writerow(["Xodim", "Davr", "Summasi", "Holati"])
    for entry, employee in payroll_result.all():
        writer.writerow([employee.full_name, entry.period, float(entry.amount), entry.status])

    csv_content = buffer.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="hisobot-{date_from}_{date_to}.csv"'},
    )


# ---------- Excel report with selectable live formulas ----------

FORMULA_FUNCS = {
    "sum": ("SUM", "Jami"),
    "average": ("AVERAGE", "O'rtacha"),
    "max": ("MAX", "Eng ko'p"),
    "min": ("MIN", "Eng kam"),
    "count": ("COUNT", "Soni"),
    "median": ("MEDIAN", "Mediana"),
}


def _write_sheet(ws, headers: list[str], rows: list[list], amount_col_index: int, formula_keys: list[str]):
    """Writes a header row + data rows, then (if any rows exist) one summary
    row per selected formula, using a real Excel formula over the amount
    column so it recalculates if someone edits the numbers later."""
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="1E2938", end_color="1E2938", fill_type="solid")

    for row in rows:
        ws.append(row)

    last_data_row = 1 + len(rows)
    if rows and formula_keys:
        col_letter = chr(ord("A") + amount_col_index)
        for key in formula_keys:
            func, label = FORMULA_FUNCS.get(key, (None, None))
            if not func:
                continue
            summary_row = [""] * len(headers)
            summary_row[0] = label
            ws.append(summary_row)
            new_row_idx = ws.max_row
            formula_cell = ws.cell(row=new_row_idx, column=amount_col_index + 1)
            formula_cell.value = f"={func}({col_letter}2:{col_letter}{last_data_row})"
            ws.cell(row=new_row_idx, column=1).font = Font(bold=True)


@router.get("/report-excel")
async def download_report_excel(
    company_id: str,
    date_from: date,
    date_to: date,
    formulas: str = "sum,average",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check(db, company_id, current_user.id)
    formula_keys = [f.strip() for f in formulas.split(",") if f.strip() in FORMULA_FUNCS]

    tx_result = await db.execute(
        select(Transaction, User)
        .join(User, User.id == Transaction.created_by)
        .where(
            Transaction.company_id == company_id,
            Transaction.occurred_on >= date_from,
            Transaction.occurred_on <= date_to,
        )
        .order_by(Transaction.occurred_on)
    )
    invoice_result = await db.execute(
        select(Invoice, User)
        .join(User, User.id == Invoice.created_by)
        .where(Invoice.company_id == company_id, Invoice.issue_date >= date_from, Invoice.issue_date <= date_to)
    )
    payroll_result = await db.execute(
        select(PayrollEntry, User)
        .join(User, User.id == PayrollEntry.employee_id)
        .where(
            PayrollEntry.company_id == company_id,
            PayrollEntry.period >= date_from.strftime("%Y-%m"),
            PayrollEntry.period <= date_to.strftime("%Y-%m"),
        )
    )

    wb = Workbook()

    ws_tx = wb.active
    ws_tx.title = "Tranzaksiyalar"
    tx_rows = [
        [str(tx.occurred_on), tx.type, tx.category, float(tx.amount), tx.description or "", user.full_name]
        for tx, user in tx_result.all()
    ]
    _write_sheet(ws_tx, ["Sana", "Turi", "Kategoriya", "Summasi", "Izoh", "Kim kiritdi"], tx_rows, 3, formula_keys)

    ws_inv = wb.create_sheet("Hisob-fakturalar")
    inv_rows = [
        [inv.client_name, float(inv.total_amount), str(inv.issue_date), inv.status, user.full_name]
        for inv, user in invoice_result.all()
    ]
    _write_sheet(ws_inv, ["Mijoz", "Summasi", "Sana", "Holati", "Kim yaratdi"], inv_rows, 1, formula_keys)

    ws_payroll = wb.create_sheet("Ish haqi")
    payroll_rows = [
        [employee.full_name, entry.period, float(entry.amount), entry.status]
        for entry, employee in payroll_result.all()
    ]
    _write_sheet(ws_payroll, ["Xodim", "Davr", "Summasi", "Holati"], payroll_rows, 2, formula_keys)

    for ws in wb.worksheets:
        for column_cells in ws.columns:
            length = max((len(str(c.value)) if c.value is not None else 0) for c in column_cells)
            ws.column_dimensions[column_cells[0].column_letter].width = min(max(length + 2, 10), 40)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="hisobot-{date_from}_{date_to}.xlsx"'},
    )
