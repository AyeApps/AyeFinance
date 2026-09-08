from datetime import UTC, datetime
from decimal import Decimal

from bson import ObjectId
from fastapi import HTTPException, status

from app.models.account import Account, AccountType
from app.models.recurring_item import RecurringItem
from app.schemas.account import AccountCreate, AccountUpdate
from app.services.balance_service import trigger_balance_recalculation


async def ensure_default_cash_account(user_id: str) -> None:
    """
    Garantiza que todo usuario tenga una cuenta predeterminada de 'Efectivo'
    para dinero físico. Si el usuario la elimina expresamente (deleted_at is not None),
    NO se vuelve a recrear automáticamente.
    """
    existing_cash = await Account.find(
        Account.user_id == user_id,
        Account.name == "Efectivo",
    ).first_or_none()

    if existing_cash is None:
        cash_account = Account(
            user_id=user_id,
            name="Efectivo",
            account_type=AccountType.debito,
            currency="MXN",
            current_balance=Decimal("0.00"),
            projected_balance=Decimal("0.00"),
            color="#10B981",
            icon="wallet",
            bank_id="generic",
            is_liquid=True,
        )
        await cash_account.insert()


async def create_account(user_id: str, data: AccountCreate) -> Account:
    account = Account(
        user_id=user_id,
        name=data.name,
        account_type=data.account_type,
        currency=data.currency,
        current_balance=data.initial_balance,
        projected_balance=data.initial_balance,
        color=data.color,
        icon=data.icon,
        bank_id=data.bank_id or "generic",
        is_liquid=data.is_liquid,
        card_product=data.card_product,
        credit_limit=data.credit_limit,
        cut_off_day=data.cut_off_day,
        payment_due_day=data.payment_due_day,
        payment_grace_days=data.payment_grace_days,
    )

    await account.insert()
    trigger_balance_recalculation(str(account.id))
    return account


async def get_user_accounts(user_id: str) -> list[Account]:
    await ensure_default_cash_account(user_id)
    return (
        await Account.find(
            Account.user_id == user_id,
            Account.deleted_at == None,  # noqa: E711
        )
        .sort("-created_at")
        .to_list()
    )


async def get_account(user_id: str, account_id: str) -> Account:
    if not account_id or not ObjectId.is_valid(account_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cuenta no encontrada o ID no válido.",
        )
    account = await Account.get(account_id)
    if not account or account.deleted_at is not None or account.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cuenta no encontrada.",
        )
    return account


async def update_account(user_id: str, account_id: str, data: AccountUpdate) -> Account:
    account = await get_account(user_id, account_id)
    update_data = data.model_dump(exclude_unset=True)

    for field, val in update_data.items():
        setattr(account, field, val)

    account.updated_at = datetime.now(UTC)
    await account.save()
    trigger_balance_recalculation(str(account.id))
    return account


async def delete_account(user_id: str, account_id: str) -> bool:
    account = await get_account(user_id, account_id)
    await account.soft_delete()

    # Also soft delete or deactivate associated recurring items
    recurring_items = await RecurringItem.find(
        RecurringItem.account_id == account_id,
        RecurringItem.user_id == user_id,
        RecurringItem.deleted_at == None,  # noqa: E711
    ).to_list()
    for item in recurring_items:
        await item.soft_delete()

    return True
