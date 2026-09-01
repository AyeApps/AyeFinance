from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.models.transaction import TransactionType


class TransactionCreate(BaseModel):
    account_id: str
    destination_account_id: str | None = None
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    type: TransactionType
    concept: str = Field(..., min_length=1, max_length=200)
    category: str = Field(default="General", max_length=100)
    date: datetime | None = None
    notes: str | None = Field(default=None, max_length=500)
    is_recurring: bool = False
    recurring_item_id: str | None = None

    @model_validator(mode="after")
    def validate_transfer(self) -> "TransactionCreate":
        if self.type == TransactionType.transferencia:
            if not self.destination_account_id:
                raise ValueError("Para una transferencia se requiere la cuenta de destino.")
            if self.account_id == self.destination_account_id:
                raise ValueError("La cuenta de origen y destino no pueden ser la misma.")
        return self


class TransactionUpdate(BaseModel):
    concept: str | None = Field(default=None, min_length=1, max_length=200)
    category: str | None = Field(default=None, max_length=100)
    date: datetime | None = None
    notes: str | None = Field(default=None, max_length=500)


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    account_id: str
    destination_account_id: str | None = None
    amount: Decimal
    type: TransactionType
    concept: str
    category: str
    date: datetime
    notes: str | None = None
    is_recurring: bool
    recurring_item_id: str | None = None
    created_at: datetime
    updated_at: datetime


class TransactionFilters(BaseModel):
    account_id: str | None = None
    type: TransactionType | None = None
    category: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    search: str | None = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
