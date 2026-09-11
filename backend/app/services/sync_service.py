from datetime import UTC, datetime

from app.models.account import Account
from app.models.recurring_item import RecurringItem
from app.models.transaction import Transaction
from app.schemas.account import AccountResponse
from app.schemas.recurring import RecurringResponse
from app.schemas.sync import SyncDeltaResponse
from app.schemas.transaction import TransactionResponse
from app.services.balance_service import calculate_user_summary


def _serialize_account(acc: Account) -> AccountResponse:
    return AccountResponse(
        id=str(acc.id),
        user_id=acc.user_id,
        name=acc.name,
        account_type=acc.account_type,
        currency=acc.currency,
        current_balance=acc.current_balance,
        projected_balance=acc.projected_balance,
        color=acc.color,
        icon=acc.icon,
        bank_id=getattr(acc, "bank_id", "generic") or "generic",
        is_liquid=acc.is_liquid,
        card_product=getattr(acc, "card_product", None),
        credit_limit=getattr(acc, "credit_limit", None),
        cut_off_day=getattr(acc, "cut_off_day", None),
        payment_due_day=getattr(acc, "payment_due_day", None),
        payment_grace_days=getattr(acc, "payment_grace_days", None),
        has_yield=getattr(acc, "has_yield", False) or False,
        annual_yield_rate=getattr(acc, "annual_yield_rate", None),
        created_at=acc.created_at,
        updated_at=acc.updated_at,
    )


def _serialize_transaction(tx: Transaction) -> TransactionResponse:
    return TransactionResponse(
        id=str(tx.id),
        user_id=tx.user_id,
        account_id=tx.account_id,
        destination_account_id=tx.destination_account_id,
        amount=tx.amount,
        type=tx.type,
        concept=tx.concept,
        category=tx.category,
        date=tx.date,
        notes=tx.notes,
        is_recurring=tx.is_recurring,
        recurring_item_id=tx.recurring_item_id,
        is_msi=getattr(tx, "is_msi", False) or False,
        msi_months=getattr(tx, "msi_months", None),
        msi_monthly_amount=getattr(tx, "msi_monthly_amount", None),
        created_at=tx.created_at,
        updated_at=tx.updated_at,
    )


def _serialize_recurring(r: RecurringItem) -> RecurringResponse:
    return RecurringResponse(
        id=str(r.id),
        user_id=r.user_id,
        name=r.name,
        type=r.type,
        amount=r.amount,
        frequency=r.frequency,
        day_of_month=r.day_of_month,
        account_id=r.account_id,
        next_date=r.next_date,
        is_active=r.is_active,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


async def get_sync_delta(user_id: str, since: datetime | None = None) -> SyncDeltaResponse:
    now = datetime.now(UTC)

    # Initial sync or cold start (since is None)
    if since is None:
        active_accounts = await Account.find(
            Account.user_id == user_id,
            Account.deleted_at == None,  # noqa: E711
        ).to_list()

        recent_transactions = (
            await Transaction.find(
                Transaction.user_id == user_id,
                Transaction.deleted_at == None,  # noqa: E711
            )
            .sort("-date", "-created_at")
            .limit(100)
            .to_list()
        )

        recurring_items = await RecurringItem.find(
            RecurringItem.user_id == user_id,
            RecurringItem.deleted_at == None,  # noqa: E711
        ).to_list()

        summary = await calculate_user_summary(user_id)

        return SyncDeltaResponse(
            has_changes=True,
            server_time=now,
            accounts=[_serialize_account(a) for a in active_accounts],
            transactions=[_serialize_transaction(t) for t in recent_transactions],
            recurring_items=[_serialize_recurring(r) for r in recurring_items],
            deleted_account_ids=[],
            deleted_transaction_ids=[],
            deleted_recurring_ids=[],
            summary=summary,
        )

    # Delta sync: find items modified since `since`
    # Accounts modified
    modified_accounts = await Account.find(
        Account.user_id == user_id,
        Account.updated_at > since,
    ).to_list()

    updated_accounts: list[AccountResponse] = []
    deleted_account_ids: list[str] = []
    for acc in modified_accounts:
        if acc.deleted_at is not None:
            deleted_account_ids.append(str(acc.id))
        else:
            updated_accounts.append(_serialize_account(acc))

    # Transactions modified
    modified_transactions = await Transaction.find(
        Transaction.user_id == user_id,
        Transaction.updated_at > since,
    ).to_list()

    updated_transactions: list[TransactionResponse] = []
    deleted_transaction_ids: list[str] = []
    for tx in modified_transactions:
        if tx.deleted_at is not None:
            deleted_transaction_ids.append(str(tx.id))
        else:
            updated_transactions.append(_serialize_transaction(tx))

    # Recurring items modified
    modified_recurring = await RecurringItem.find(
        RecurringItem.user_id == user_id,
        RecurringItem.updated_at > since,
    ).to_list()

    updated_recurring: list[RecurringResponse] = []
    deleted_recurring_ids: list[str] = []
    for r in modified_recurring:
        if r.deleted_at is not None:
            deleted_recurring_ids.append(str(r.id))
        else:
            updated_recurring.append(_serialize_recurring(r))

    has_changes = bool(
        updated_accounts
        or deleted_account_ids
        or updated_transactions
        or deleted_transaction_ids
        or updated_recurring
        or deleted_recurring_ids
    )

    summary = await calculate_user_summary(user_id) if has_changes else None

    return SyncDeltaResponse(
        has_changes=has_changes,
        server_time=now,
        accounts=updated_accounts,
        transactions=updated_transactions,
        recurring_items=updated_recurring,
        deleted_account_ids=deleted_account_ids,
        deleted_transaction_ids=deleted_transaction_ids,
        deleted_recurring_ids=deleted_recurring_ids,
        summary=summary,
    )
