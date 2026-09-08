import asyncio
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from app.core.logging import logger
from app.models.account import Account, AccountType
from app.models.recurring_item import RecurringItem, RecurringType
from app.models.transaction import Transaction, TransactionType


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

    by_account: dict[str, dict[str, Decimal]] = {}
    for acc in accounts:
        grand_total += acc.current_balance
        projected_grand_total += acc.projected_balance

        # Dinero Líquido vs Ahorro / Reserva
        if acc.account_type in (AccountType.ahorro, AccountType.inversion) or not acc.is_liquid:
            savings_total += acc.current_balance
        else:
            liquid_total += acc.current_balance

        by_account[str(acc.id)] = {
            "balance": acc.current_balance,
            "today_expenses": Decimal("0.00"),
            "today_income": Decimal("0.00"),
            "month_expenses": Decimal("0.00"),
            "month_income": Decimal("0.00"),
        }

    # Transacciones del mes actual e historial de hoy
    now = datetime.now(UTC)
    start_of_today = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=UTC)
    start_of_month = datetime(now.year, now.month, 1, 0, 0, 0, tzinfo=UTC)

    transactions = await Transaction.find(
        Transaction.user_id == user_id,
        Transaction.deleted_at == None,  # noqa: E711
    ).to_list()

    today_expenses = Decimal("0.00")
    today_income = Decimal("0.00")
    month_expenses = Decimal("0.00")
    month_income = Decimal("0.00")
    month_cashback = Decimal("0.00")
    month_points = 0

    for tx in transactions:
        tx_acc_id = str(tx.account_id)
        tx_date = tx.date
        if tx_date.tzinfo is None:
            tx_date = tx_date.replace(tzinfo=UTC)

        if tx_date < start_of_month:
            continue

        is_today = tx_date >= start_of_today

        if getattr(tx, "cashback_earned", None):
            month_cashback += tx.cashback_earned
        if getattr(tx, "points_earned", None):
            month_points += tx.points_earned

        if tx.type == TransactionType.gasto:
            month_expenses += tx.amount
            if is_today:
                today_expenses += tx.amount
            if tx_acc_id in by_account:
                by_account[tx_acc_id]["month_expenses"] += tx.amount
                if is_today:
                    by_account[tx_acc_id]["today_expenses"] += tx.amount

        elif tx.type == TransactionType.ingreso:
            month_income += tx.amount
            if is_today:
                today_income += tx.amount
            if tx_acc_id in by_account:
                by_account[tx_acc_id]["month_income"] += tx.amount
                if is_today:
                    by_account[tx_acc_id]["today_income"] += tx.amount

    return {
        "liquid_total": liquid_total,
        "savings_total": savings_total,
        "grand_total": grand_total,
        "projected_grand_total": projected_grand_total,
        "accounts_count": len(accounts),
        "today_expenses": today_expenses,
        "today_income": today_income,
        "month_expenses": month_expenses,
        "month_income": month_income,
        "month_cashback": month_cashback,
        "month_points": month_points,
        "by_account": by_account,
    }
