from datetime import datetime

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentUser
from app.models.transaction import TransactionType
from app.schemas.pagination import PaginatedResponse
from app.schemas.transaction import (
    TransactionCreate,
    TransactionFilters,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.transaction_service import (
    create_transaction,
    delete_transaction,
    get_transaction,
    get_transactions,
    update_transaction,
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[TransactionResponse])
async def list_transactions(
    current_user: CurrentUser,
    account_id: str | None = Query(default=None),
    type: TransactionType | None = Query(default=None),
    category: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    filters = TransactionFilters(
        account_id=account_id,
        type=type,
        category=category,
        date_from=date_from,
        date_to=date_to,
        search=search,
        page=page,
        limit=limit,
    )
    return await get_transactions(str(current_user.id), filters)


@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_transaction(current_user: CurrentUser, data: TransactionCreate):
    tx = await create_transaction(str(current_user.id), data)
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
        created_at=tx.created_at,
        updated_at=tx.updated_at,
    )


@router.get("/{id}", response_model=TransactionResponse)
async def get_transaction_detail(id: str, current_user: CurrentUser):
    tx = await get_transaction(str(current_user.id), id)
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
        created_at=tx.created_at,
        updated_at=tx.updated_at,
    )


@router.patch("/{id}", response_model=TransactionResponse)
async def update_transaction_detail(id: str, data: TransactionUpdate, current_user: CurrentUser):
    tx = await update_transaction(str(current_user.id), id, data)
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
        created_at=tx.created_at,
        updated_at=tx.updated_at,
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction_item(id: str, current_user: CurrentUser):
    await delete_transaction(str(current_user.id), id)
    return None
