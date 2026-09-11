from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.account import AccountResponse, AccountSummaryResponse
from app.schemas.recurring import RecurringResponse
from app.schemas.transaction import TransactionResponse


class SyncDeltaResponse(BaseModel):
    has_changes: bool = False
    server_time: datetime
    accounts: list[AccountResponse] = Field(default_factory=list)
    transactions: list[TransactionResponse] = Field(default_factory=list)
    recurring_items: list[RecurringResponse] = Field(default_factory=list)
    deleted_account_ids: list[str] = Field(default_factory=list)
    deleted_transaction_ids: list[str] = Field(default_factory=list)
    deleted_recurring_ids: list[str] = Field(default_factory=list)
    summary: AccountSummaryResponse | None = None
