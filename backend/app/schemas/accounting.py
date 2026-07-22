import uuid
from datetime import date, datetime

from pydantic import BaseModel


class TransactionCreate(BaseModel):
    type: str  # "income" | "expense"
    category: str
    amount: float
    description: str | None = None
    occurred_on: date


class TransactionOut(BaseModel):
    id: uuid.UUID
    type: str
    category: str
    amount: float
    description: str | None
    occurred_on: date
    created_at: datetime
    created_by_name: str | None = None

    class Config:
        from_attributes = True


class InvoiceItem(BaseModel):
    name: str
    quantity: float
    price: float


class InvoiceCreate(BaseModel):
    client_name: str
    items: list[InvoiceItem]
    issue_date: date
    due_date: date | None = None


class InvoiceUpdate(BaseModel):
    status: str


class InvoiceOut(BaseModel):
    id: uuid.UUID
    client_name: str
    items: list[dict]
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
    amount: float


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
