from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUser
from app.models.recurring_item import Frequency, RecurringItem, RecurringType
from app.models.transaction import TransactionType
from app.schemas.recurring import RecurringCreate, RecurringResponse, RecurringUpdate
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.services.account_service import get_account
from app.services.balance_service import trigger_balance_recalculation
from app.services.transaction_service import create_transaction

router = APIRouter()


def advance_next_date(current_date: datetime, freq: Frequency) -> datetime:
    if freq == Frequency.semanal:
        return current_date + timedelta(days=7)
    elif freq == Frequency.quincenal:
        return current_date + timedelta(days=15)
    elif freq == Frequency.mensual:
        # Advance by roughly 30 days or next month
        return current_date + timedelta(days=30)
    return current_date + timedelta(days=30)


@router.get("/", response_model=list[RecurringResponse])
async def list_recurring_items(
    current_user: CurrentUser,
    type: RecurringType | None = Query(default=None),
    is_active: bool | None = Query(default=None),
):
    query_conditions = [
        RecurringItem.user_id == str(current_user.id),
        RecurringItem.deleted_at == None,  # noqa: E711
    ]
    if type:
        query_conditions.append(RecurringItem.type == type)
    if is_active is not None:
        query_conditions.append(RecurringItem.is_active == is_active)

    items = await RecurringItem.find(*query_conditions).sort("next_date").to_list()

    return [
        RecurringResponse(
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
        for r in items
    ]


@router.post("/", response_model=RecurringResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring_item(current_user: CurrentUser, data: RecurringCreate):
    # Verify account ownership
    await get_account(str(current_user.id), data.account_id)

    item = RecurringItem(
        user_id=str(current_user.id),
        name=data.name,
        type=data.type,
        amount=data.amount,
        frequency=data.frequency,
        day_of_month=data.day_of_month,
        account_id=data.account_id,
        next_date=data.next_date or datetime.now(UTC),
        is_active=data.is_active,
    )
    await item.insert()
    trigger_balance_recalculation(data.account_id)

    return RecurringResponse(
        id=str(item.id),
        user_id=item.user_id,
        name=item.name,
        type=item.type,
        amount=item.amount,
        frequency=item.frequency,
        day_of_month=item.day_of_month,
        account_id=item.account_id,
        next_date=item.next_date,
        is_active=item.is_active,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("/{id}", response_model=RecurringResponse)
async def get_recurring_detail(id: str, current_user: CurrentUser):
    item = await RecurringItem.get(id)
    if not item or item.deleted_at is not None or item.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item recurrente no encontrado.",
        )
    return RecurringResponse(
        id=str(item.id),
        user_id=item.user_id,
        name=item.name,
        type=item.type,
        amount=item.amount,
        frequency=item.frequency,
        day_of_month=item.day_of_month,
        account_id=item.account_id,
        next_date=item.next_date,
        is_active=item.is_active,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.patch("/{id}", response_model=RecurringResponse)
async def update_recurring_detail(id: str, data: RecurringUpdate, current_user: CurrentUser):
    item = await RecurringItem.get(id)
    if not item or item.deleted_at is not None or item.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item recurrente no encontrado.",
        )

    update_data = data.model_dump(exclude_unset=True)
    if "account_id" in update_data and update_data["account_id"]:
        await get_account(str(current_user.id), update_data["account_id"])

    for field, val in update_data.items():
        setattr(item, field, val)

    item.updated_at = datetime.now(UTC)
    await item.save()
    trigger_balance_recalculation(item.account_id)

    return RecurringResponse(
        id=str(item.id),
        user_id=item.user_id,
        name=item.name,
        type=item.type,
        amount=item.amount,
        frequency=item.frequency,
        day_of_month=item.day_of_month,
        account_id=item.account_id,
        next_date=item.next_date,
        is_active=item.is_active,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_item(id: str, current_user: CurrentUser):
    item = await RecurringItem.get(id)
    if not item or item.deleted_at is not None or item.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item recurrente no encontrado.",
        )
    acc_id = item.account_id
    await item.soft_delete()
    trigger_balance_recalculation(acc_id)
    return None


@router.post("/{id}/apply", response_model=TransactionResponse)
async def apply_recurring_item(id: str, current_user: CurrentUser):
    """
    Applies the recurring item immediately as a transaction, updates the account balance,
    and advances next_date.
    """
    item = await RecurringItem.get(id)
    if not item or item.deleted_at is not None or item.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item recurrente no encontrado.",
        )

    tx_type = (
        TransactionType.ingreso
        if item.type == RecurringType.ingreso_fijo
        else TransactionType.gasto
    )
    category = "Ingreso Fijo" if item.type == RecurringType.ingreso_fijo else "Gasto Fijo"

    tx_data = TransactionCreate(
        account_id=item.account_id,
        amount=item.amount,
        type=tx_type,
        concept=f"[Recurrente] {item.name}",
        category=category,
        date=datetime.now(UTC),
        is_recurring=True,
        recurring_item_id=str(item.id),
    )

    tx = await create_transaction(str(current_user.id), tx_data)

    # Advance next date
    item.next_date = advance_next_date(item.next_date, item.frequency)
    item.updated_at = datetime.now(UTC)
    await item.save()
    trigger_balance_recalculation(item.account_id)

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
