import asyncio
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from app.core.logging import logger
from app.models.account import Account, AccountType
from app.models.recurring_item import RecurringItem, RecurringType


async def recalculate_projected_balance(account_id: str):
    """
    Recalculates the projected balance of an account over the next 30 days
    based on active recurring items (ingresos fijos, gastos fijos, mensualidades).
    """
    try:
        account = await Account.get(account_id)
        if not account or account.deleted_at is not None:
            return

        now = datetime.now(UTC)

        # Base projected balance starts from current actual balance
        projected = account.current_balance

        # Find all active recurring items for this account
        recurring_items = await RecurringItem.find(
            RecurringItem.account_id == account_id,
            RecurringItem.is_active == True,  # noqa: E712
            RecurringItem.deleted_at == None,  # noqa: E711
        ).to_list()

        for item in recurring_items:
            # Estimate occurrences within the 30-day window
            # Simplified projection: add expected inflow / subtract expected outflow
            if item.type == RecurringType.ingreso_fijo:
                projected += item.amount
            elif item.type in (RecurringType.gasto_fijo, RecurringType.mensualidad):
                projected -= item.amount

        account.projected_balance = projected
        account.updated_at = now
        await account.save()
        logger.info(f"Projected balance for account {account_id} recalculated to {projected}")
    except Exception as e:
        logger.error(f"Error recalculating projected balance for account {account_id}: {e}")


def trigger_balance_recalculation(account_id: str):
    """
    Fire-and-forget balance projection trigger.
    """
    try:
        asyncio.create_task(recalculate_projected_balance(account_id))
    except Exception as e:
        logger.warning(f"Could not spawn background task for balance recalculation: {e}")


async def calculate_user_summary(user_id: str) -> dict[str, Any]:
    accounts = await Account.find(
        Account.user_id == user_id,
        Account.deleted_at == None,  # noqa: E711
    ).to_list()

    liquid_total = Decimal("0.00")
    savings_total = Decimal("0.00")
    grand_total = Decimal("0.00")
    projected_grand_total = Decimal("0.00")

    for acc in accounts:
        grand_total += acc.current_balance
        projected_grand_total += acc.projected_balance
        if acc.is_liquid:
            liquid_total += acc.current_balance
        if acc.account_type == AccountType.ahorro:
            savings_total += acc.current_balance

    return {
        "liquid_total": liquid_total,
        "savings_total": savings_total,
        "grand_total": grand_total,
        "projected_grand_total": projected_grand_total,
        "accounts_count": len(accounts),
    }
