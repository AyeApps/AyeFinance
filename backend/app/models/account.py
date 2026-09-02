from decimal import Decimal
from enum import StrEnum

from beanie import Indexed
from pydantic import Field

from app.models.base import AyeDecimal, SoftDeleteDocument


class AccountType(StrEnum):
    corriente = "corriente"
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


    class Settings:
        name = "accounts"
        use_state_management = True
