"""Invoice totals, numbering, PDF, and linked cash transactions."""
from __future__ import annotations

import io
from datetime import date, datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import func as sa_func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.accounting import Invoice, PayrollEntry, Transaction
from app.models.company import Company
from app.models.user import User

STATUS_UZ = {
    "draft": "Qoralama",
    "sent": "Yuborilgan",
    "paid": "To'langan",
    "overdue": "Muddati o'tgan",
}


def calc_invoice_totals(items: list[dict], vat_rate: float) -> tuple[float, float, float]:
    subtotal = round(sum(float(i["quantity"]) * float(i["price"]) for i in items), 2)
    rate = float(vat_rate or 0)
    vat = round(subtotal * rate / 100.0, 2)
    total = round(subtotal + vat, 2)
    return subtotal, vat, total


async def next_invoice_number(db: AsyncSession, company_id: str, issue_date: date) -> str:
    year = issue_date.year
    prefix = f"INV-{year}-"
    result = await db.execute(
        select(sa_func.count())
        .select_from(Invoice)
        .where(Invoice.company_id == company_id, Invoice.invoice_number.like(f"{prefix}%"))
    )
    n = int(result.scalar_one() or 0) + 1
    return f"{prefix}{n:04d}"


async def ensure_invoice_income_tx(
    db: AsyncSession,
    *,
    company_id: str,
    invoice: Invoice,
    user_id,
) -> None:
    existing = await db.execute(
        select(Transaction).where(
            Transaction.company_id == company_id,
            Transaction.source_invoice_id == invoice.id,
        )
    )
    tx = existing.scalar_one_or_none()
    desc = f"{invoice.invoice_number} — {invoice.client_name}"
    if tx:
        tx.amount = float(invoice.total_amount)
        tx.description = desc
        tx.occurred_on = invoice.issue_date or date.today()
        return
    db.add(
        Transaction(
            company_id=company_id,
            type="income",
            category="Faktura to'lovi",
            amount=float(invoice.total_amount),
            description=desc,
            occurred_on=invoice.issue_date or date.today(),
            created_by=user_id,
            source_invoice_id=invoice.id,
        )
    )


async def remove_invoice_income_tx(db: AsyncSession, *, company_id: str, invoice_id) -> None:
    result = await db.execute(
        select(Transaction).where(
            Transaction.company_id == company_id,
            Transaction.source_invoice_id == invoice_id,
        )
    )
    for tx in result.scalars().all():
        await db.delete(tx)


async def ensure_payroll_expense_tx(
    db: AsyncSession,
    *,
    company_id: str,
    entry: PayrollEntry,
    employee_name: str,
    user_id,
) -> None:
    existing = await db.execute(
        select(Transaction).where(
            Transaction.company_id == company_id,
            Transaction.source_payroll_id == entry.id,
        )
    )
    tx = existing.scalar_one_or_none()
    paid_day = (entry.paid_at.date() if entry.paid_at else date.today())
    desc = f"{employee_name} — {entry.period}"
    if tx:
        tx.amount = float(entry.amount)
        tx.description = desc
        tx.occurred_on = paid_day
        return
    db.add(
        Transaction(
            company_id=company_id,
            type="expense",
            category="Ish haqi",
            amount=float(entry.amount),
            description=desc,
            occurred_on=paid_day,
            created_by=user_id,
            source_payroll_id=entry.id,
        )
    )


async def remove_payroll_expense_tx(db: AsyncSession, *, company_id: str, payroll_id) -> None:
    result = await db.execute(
        select(Transaction).where(
            Transaction.company_id == company_id,
            Transaction.source_payroll_id == payroll_id,
        )
    )
    for tx in result.scalars().all():
        await db.delete(tx)


def build_invoice_pdf(
    *,
    company: Company,
    invoice: Invoice,
    creator_name: str | None,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "InvTitle",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=8,
        textColor=colors.HexColor("#0f172a"),
    )
    muted = ParagraphStyle(
        "InvMuted",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=4,
    )
    body = ParagraphStyle("InvBody", parent=styles["Normal"], fontSize=11, spaceAfter=3)

    story = []
    story.append(Paragraph("HISOB-FAKTURA", title))
    story.append(Paragraph(f"№ {invoice.invoice_number}", body))
    story.append(Paragraph(f"Korxona: {company.name}", body))
    story.append(Paragraph(f"Mijoz: {invoice.client_name}", body))
    story.append(Paragraph(f"Sana: {invoice.issue_date}", muted))
    if invoice.due_date:
        story.append(Paragraph(f"Muddat: {invoice.due_date}", muted))
    story.append(Paragraph(f"Holat: {STATUS_UZ.get(invoice.status, invoice.status)}", muted))
    if creator_name:
        story.append(Paragraph(f"Yaratgan: {creator_name}", muted))
    story.append(Spacer(1, 8 * mm))

    rows = [["№", "Mahsulot / xizmat", "Miqdor", "Narx", "Summa"]]
    for i, item in enumerate(invoice.items or [], start=1):
        qty = float(item.get("quantity") or 0)
        price = float(item.get("price") or 0)
        rows.append(
            [
                str(i),
                str(item.get("name") or ""),
                f"{qty:g}",
                f"{price:,.2f}",
                f"{qty * price:,.2f}",
            ]
        )

    table = Table(rows, colWidths=[12 * mm, 80 * mm, 25 * mm, 30 * mm, 30 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0ea5e9")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 8 * mm))

    totals = [
        ["Oraliq (QQS siz):", f"{float(invoice.subtotal_amount):,.2f} so'm"],
        [f"QQS ({float(invoice.vat_rate):g}%):", f"{float(invoice.vat_amount):,.2f} so'm"],
        ["Jami:", f"{float(invoice.total_amount):,.2f} so'm"],
    ]
    t2 = Table(totals, colWidths=[120 * mm, 55 * mm])
    t2.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(t2)
    story.append(Spacer(1, 12 * mm))
    story.append(
        Paragraph(
            f"Yaratilgan: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC · Business Galaxy",
            muted,
        )
    )

    doc.build(story)
    return buf.getvalue()
