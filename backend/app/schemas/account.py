from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from app.models.account import AccountType


class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    account_type: AccountType = AccountType.corriente
    currency: str = Field(default="MXN", min_length=3, max_length=3)
    initial_balance: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    color: str = Field(default="#FE9D01", max_length=20)
    icon: str = Field(default="account_balance", max_length=50)
    bank_id: str = Field(default="generic", max_length=50)
    is_liquid: bool = True
    card_product: str | None = Field(default=None, max_length=100)
    credit_limit: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    cut_off_day: int | None = Field(default=None, ge=1, le=31)
    payment_due_day: int | None = Field(default=None, ge=1, le=31)
    payment_grace_days: int | None = Field(default=None, ge=1, le=60)


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    account_type: AccountType | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    color: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=50)
    bank_id: str | None = Field(default=None, max_length=50)
    is_liquid: bool | None = None
    card_product: str | None = Field(default=None, max_length=100)
    credit_limit: Decimal | None = Field(default=None, ge=Decimal("0.00"))
    cut_off_day: int | None = Field(default=None, ge=1, le=31)
    payment_due_day: int | None = Field(default=None, ge=1, le=31)
    payment_grace_days: int | None = Field(default=None, ge=1, le=60)


class AccountResponse(BaseModel):
    id: str
    user_id: str
    name: str
    account_type: AccountType
    currency: str
    current_balance: Decimal
    projected_balance: Decimal
    color: str
    icon: str
    bank_id: str = "generic"
    is_liquid: bool
    card_product: str | None = None
    credit_limit: Decimal | None = None
    cut_off_day: int | None = None
    payment_due_day: int | None = None
    payment_grace_days: int | None = None
    created_at: datetime
    updated_at: datetime



class AccountFlowMetrics(BaseModel):
    balance: Decimal = Decimal("0.00")
    today_expenses: Decimal = Decimal("0.00")
    today_income: Decimal = Decimal("0.00")
    month_expenses: Decimal = Decimal("0.00")
    month_income: Decimal = Decimal("0.00")


class AccountSummaryResponse(BaseModel):
    liquid_total: Decimal
    savings_total: Decimal
    grand_total: Decimal
    projected_grand_total: Decimal
    accounts_count: int
    today_expenses: Decimal = Decimal("0.00")
    today_income: Decimal = Decimal("0.00")
    month_expenses: Decimal = Decimal("0.00")
    month_income: Decimal = Decimal("0.00")
    month_cashback: Decimal = Decimal("0.00")
    month_points: int = 0
    by_account: dict[str, Any] = Field(default_factory=dict)


class AccountWidgetSync(BaseModel):
    id: str
    name: str
    type: AccountType
    current_balance: Decimal
    currency: str

