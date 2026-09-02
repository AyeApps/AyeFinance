from fastapi import APIRouter, status

from app.core.deps import CurrentUser
from app.schemas.account import (
    AccountCreate,
    AccountResponse,
    AccountSummaryResponse,
    AccountUpdate,
)
from app.services.account_service import (
    create_account,
    delete_account,
    get_account,
    get_user_accounts,
    update_account,
)
from app.services.balance_service import calculate_user_summary

router = APIRouter()


@router.get("/", response_model=list[AccountResponse])
async def list_accounts(current_user: CurrentUser):
    accounts = await get_user_accounts(str(current_user.id))
    return [
        AccountResponse(
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
            created_at=acc.created_at,
            updated_at=acc.updated_at,
        )
        for acc in accounts
    ]


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_new_account(current_user: CurrentUser, data: AccountCreate):
    acc = await create_account(str(current_user.id), data)
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
        created_at=acc.created_at,
        updated_at=acc.updated_at,
    )



@router.get("/summary", response_model=AccountSummaryResponse)
async def get_summary(current_user: CurrentUser):
    summary_data = await calculate_user_summary(str(current_user.id))
    return AccountSummaryResponse(**summary_data)


@router.get("/{id}", response_model=AccountResponse)
async def get_account_detail(id: str, current_user: CurrentUser):
    acc = await get_account(str(current_user.id), id)
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
        is_liquid=acc.is_liquid,
        created_at=acc.created_at,
        updated_at=acc.updated_at,
    )


@router.patch("/{id}", response_model=AccountResponse)
async def update_account_detail(id: str, data: AccountUpdate, current_user: CurrentUser):
    acc = await update_account(str(current_user.id), id, data)
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
        is_liquid=acc.is_liquid,
        created_at=acc.created_at,
        updated_at=acc.updated_at,
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account_item(id: str, current_user: CurrentUser):
    await delete_account(str(current_user.id), id)
    return None
