from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.models.recurring_item import Frequency, RecurringType


class RecurringCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    type: RecurringType
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    frequency: Frequency = Frequency.mensual
    day_of_month: int | None = Field(default=None, ge=1, le=31)
    account_id: str
    next_date: datetime | None = None
    is_active: bool = True

    @model_validator(mode="after")
    def validate_day_of_month(self) -> "RecurringCreate":
        if self.frequency == Frequency.mensual and self.day_of_month is None:
            # If not provided, day of month will default to next_date day
            pass
        return self


class RecurringUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    type: RecurringType | None = None
    amount: Decimal | None = Field(default=None, gt=Decimal("0.00"))
    frequency: Frequency | None = None
    day_of_month: int | None = Field(default=None, ge=1, le=31)
    account_id: str | None = None
    next_date: datetime | None = None
    is_active: bool | None = None


class RecurringResponse(BaseModel):
    id: str
    user_id: str
    name: str
    type: RecurringType
    amount: Decimal
    frequency: Frequency
    day_of_month: int | None = None
    account_id: str
    next_date: datetime
    is_active: bool
    created_at: datetime
    updated_at: datetime
