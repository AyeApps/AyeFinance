import math
from datetime import UTC, datetime

from fastapi import HTTPException, status

from app.models.account import Account
from app.models.transaction import Transaction, TransactionType
from app.schemas.pagination import PaginatedResponse
from app.schemas.transaction import (
    TransactionCreate,
    TransactionFilters,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.account_service import get_account
from app.services.balance_service import trigger_balance_recalculation


async def create_transaction(user_id: str, data: TransactionCreate) -> Transaction:
    # 1. Validate origin account ownership
    origin_account = await get_account(user_id, data.account_id)

    # 2. If transfer, validate destination account ownership
    destination_account: Account | None = None
    if data.type == TransactionType.transferencia:
        if not data.destination_account_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere cuenta de destino para una transferencia.",
            )
        destination_account = await get_account(user_id, data.destination_account_id)

    # 3. Apply balance changes
    if data.type == TransactionType.ingreso:
        origin_account.current_balance += data.amount
        origin_account.updated_at = datetime.now(UTC)
        await origin_account.save()
        trigger_balance_recalculation(str(origin_account.id))

    elif data.type == TransactionType.gasto:
        origin_account.current_balance -= data.amount
        origin_account.updated_at = datetime.now(UTC)
        await origin_account.save()
        trigger_balance_recalculation(str(origin_account.id))

    elif data.type == TransactionType.transferencia:
        origin_account.current_balance -= data.amount
        origin_account.updated_at = datetime.now(UTC)
        await origin_account.save()

        destination_account.current_balance += data.amount
        destination_account.updated_at = datetime.now(UTC)
        await destination_account.save()

        trigger_balance_recalculation(str(origin_account.id))
        trigger_balance_recalculation(str(destination_account.id))

    # 4. Save transaction
    tx = Transaction(
        user_id=user_id,
        account_id=data.account_id,
        destination_account_id=data.destination_account_id,
        amount=data.amount,
        type=data.type,
        concept=data.concept,
        category=data.category,
        date=data.date or datetime.now(UTC),
        notes=data.notes,
        is_recurring=data.is_recurring,
        recurring_item_id=data.recurring_item_id,
    )
    await tx.insert()
    return tx


async def get_transactions(
    user_id: str, filters: TransactionFilters
) -> PaginatedResponse[TransactionResponse]:
    query_conditions = [
        Transaction.user_id == user_id,
        Transaction.deleted_at == None,  # noqa: E711
    ]

    if filters.account_id:
        query_conditions.append(Transaction.account_id == filters.account_id)
    if filters.type:
        query_conditions.append(Transaction.type == filters.type)
    if filters.category:
        query_conditions.append(Transaction.category == filters.category)
    if filters.date_from:
        query_conditions.append(Transaction.date >= filters.date_from)
    if filters.date_to:
        query_conditions.append(Transaction.date <= filters.date_to)

    base_query = Transaction.find(*query_conditions)

    if filters.search:
        base_query = base_query.find({"concept": {"$regex": filters.search, "$options": "i"}})

    total = await base_query.count()
    skip = (filters.page - 1) * filters.limit
    pages = math.ceil(total / filters.limit) if total > 0 else 1

    items_doc = await base_query.sort("-date").skip(skip).limit(filters.limit).to_list()

    items = [
        TransactionResponse(
            id=str(t.id),
            user_id=t.user_id,
            account_id=t.account_id,
            destination_account_id=t.destination_account_id,
            amount=t.amount,
            type=t.type,
            concept=t.concept,
            category=t.category,
            date=t.date,
            notes=t.notes,
            is_recurring=t.is_recurring,
            recurring_item_id=t.recurring_item_id,
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
        for t in items_doc
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=filters.page,
        limit=filters.limit,
        pages=pages,
    )


async def get_transaction(user_id: str, transaction_id: str) -> Transaction:
    tx = await Transaction.get(transaction_id)
    if not tx or tx.deleted_at is not None or tx.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transacción no encontrada.",
        )
    return tx


async def update_transaction(
    user_id: str, transaction_id: str, data: TransactionUpdate
) -> Transaction:
    tx = await get_transaction(user_id, transaction_id)
    update_data = data.model_dump(exclude_unset=True)

    for field, val in update_data.items():
        setattr(tx, field, val)

    tx.updated_at = datetime.now(UTC)
    await tx.save()
    return tx


async def delete_transaction(user_id: str, transaction_id: str) -> bool:
    tx = await get_transaction(user_id, transaction_id)

    # Reverse balance changes
    origin_account = await Account.get(tx.account_id)
    if origin_account and origin_account.deleted_at is None:
        if tx.type == TransactionType.ingreso:
            origin_account.current_balance -= tx.amount
        elif tx.type == TransactionType.gasto or tx.type == TransactionType.transferencia:
            origin_account.current_balance += tx.amount

        origin_account.updated_at = datetime.now(UTC)
        await origin_account.save()
        trigger_balance_recalculation(str(origin_account.id))

    if tx.type == TransactionType.transferencia and tx.destination_account_id:
        dest_account = await Account.get(tx.destination_account_id)
        if dest_account and dest_account.deleted_at is None:
            dest_account.current_balance -= tx.amount
            dest_account.updated_at = datetime.now(UTC)
            await dest_account.save()
            trigger_balance_recalculation(str(dest_account.id))

    await tx.soft_delete()
    return True
