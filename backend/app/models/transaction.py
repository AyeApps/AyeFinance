from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum

from beanie import Indexed
from pydantic import Field

from app.models.base import AyeDecimal, SoftDeleteDocument


class TransactionType(StrEnum):
    ingreso = "ingreso"
    gasto = "gasto"
    transferencia = "transferencia"


class Transaction(SoftDeleteDocument):
    user_id: Indexed(str)
    account_id: Indexed(str)
    destination_account_id: str | None = None
    amount: AyeDecimal = Field(default=Decimal("0.00"))
    type: TransactionType
    concept: str
    category: str = "General"
    date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    notes: str | None = None
    is_recurring: bool = False
    recurring_item_id: str | None = None

    class Settings:
        name = "transactions"
        use_state_management = True
