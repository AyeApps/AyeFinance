from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum

from beanie import Indexed
from pydantic import Field

from app.models.base import AyeDecimal, SoftDeleteDocument


class RecurringType(StrEnum):
    ingreso_fijo = "ingreso_fijo"
    gasto_fijo = "gasto_fijo"
    mensualidad = "mensualidad"


class Frequency(StrEnum):
    semanal = "semanal"
    quincenal = "quincenal"
    mensual = "mensual"


class RecurringItem(SoftDeleteDocument):
    user_id: Indexed(str)
    name: str
    type: RecurringType
    amount: AyeDecimal = Field(default=Decimal("0.00"))
    frequency: Frequency = Frequency.mensual
    day_of_month: int | None = Field(default=None, ge=1, le=31)
    account_id: Indexed(str)
    next_date: datetime = Field(default_factory=lambda: datetime.now(UTC))
    is_active: bool = True

    class Settings:
        name = "recurring_items"
        use_state_management = True
