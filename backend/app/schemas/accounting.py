import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    type: str  # "income" | "expense"
    category: str
    amount: float = Field(gt=0)
    description: str | None = None
    occurred_on: date


class TransactionUpdate(BaseModel):
    type: str | None = None
    category: str | None = None
    amount: float | None = Field(default=None, gt=0)
    description: str | None = None
    occurred_on: date | None = None


class TransactionOut(BaseModel):
    id: uuid.UUID
    type: str
    category: str
    amount: float
    description: str | None
    occurred_on: date
    created_at: datetime
    created_by_name: str | None = None
    source_invoice_id: uuid.UUID | None = None
    source_payroll_id: uuid.UUID | None = None

    class Config:
        from_attributes = True


class InvoiceItem(BaseModel):
    name: str
    quantity: float = Field(gt=0)
    price: float = Field(ge=0)


class InvoiceCreate(BaseModel):
    client_name: str
    items: list[InvoiceItem]
    issue_date: date
    due_date: date | None = None
    vat_rate: float = Field(default=12, ge=0, le=100)


class InvoiceUpdate(BaseModel):
    status: str | None = None
    client_name: str | None = None
    items: list[InvoiceItem] | None = None
    issue_date: date | None = None
    due_date: date | None = None
    vat_rate: float | None = Field(default=None, ge=0, le=100)


class InvoiceOut(BaseModel):
    id: uuid.UUID
    invoice_number: str
    client_name: str
    items: list[dict]
    vat_rate: float
    subtotal_amount: float
    vat_amount: float
    total_amount: float
    status: str
    issue_date: date
    due_date: date | None
    created_at: datetime
    created_by_name: str | None = None

    class Config:
        from_attributes = True


class PayrollCreate(BaseModel):
    employee_id: uuid.UUID
    period: str
    amount: float = Field(gt=0)


class PayrollOut(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: str | None = None
    period: str
    amount: float
    status: str
    paid_at: datetime | None
    created_by_name: str | None = None

    class Config:
        from_attributes = True


class AccountingSummary(BaseModel):
    month: str
    total_income: float
    total_expense: float
    total_payroll: float
    balance: float
    total_receivable: float = 0  # sent/overdue fakturalar (qarz)


class PeriodBucket(BaseModel):
    label: str
    income: float
    expense: float
    payroll: float
    balance: float


class PeriodTotals(BaseModel):
    total_income: float
    total_expense: float
    total_payroll: float
    balance: float


class PeriodStats(BaseModel):
    period: str
    buckets: list[PeriodBucket]
    totals: PeriodTotals
