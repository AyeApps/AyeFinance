from decimal import Decimal
from enum import StrEnum

from beanie import Indexed
from pydantic import Field

from app.models.base import AyeDecimal, SoftDeleteDocument


class AccountType(StrEnum):
    corriente = "corriente"
    debito = "debito"
    credito = "credito"
    ahorro = "ahorro"
    inversion = "inversion"


class Account(SoftDeleteDocument):
    user_id: Indexed(str)
    name: str
    account_type: AccountType = AccountType.corriente
    currency: str = "MXN"
    current_balance: AyeDecimal = Field(default=Decimal("0.00"))
    projected_balance: AyeDecimal = Field(default=Decimal("0.00"))
    color: str = "#FE9D01"
    icon: str = "account_balance"
    bank_id: str = "generic"
    is_liquid: bool = True
    card_product: str | None = None
    credit_limit: AyeDecimal | None = None
    cut_off_day: int | None = Field(default=None, ge=1, le=31)
    payment_due_day: int | None = Field(default=None, ge=1, le=31)
    payment_grace_days: int | None = Field(default=None, ge=1, le=60)
    has_yield: bool = False
    annual_yield_rate: AyeDecimal | None = None


    class Settings:
        name = "accounts"
        use_state_management = True
