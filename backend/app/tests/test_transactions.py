import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_income_and_expense_transactions(client: AsyncClient, auth_headers):
    # 1. Create account
    acc_resp = await client.post(
        "/api/v1/accounts/",
        json={"name": "Cuenta Principal", "initial_balance": "1000.00"},
        headers=auth_headers,
    )
    acc_id = acc_resp.json()["id"]

    # 2. Add Income ($500)
    inc_resp = await client.post(
        "/api/v1/transactions/",
        json={
            "account_id": acc_id,
            "amount": "500.00",
            "type": "ingreso",
            "concept": "Freelance Design",
            "category": "Trabajo",
        },
        headers=auth_headers,
    )
    assert inc_resp.status_code == 201

    # Check updated balance -> $1500
    acc_check = await client.get(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert acc_check.json()["current_balance"] == "1500.00"

    # 3. Add Expense ($200)
    exp_resp = await client.post(
        "/api/v1/transactions/",
        json={
            "account_id": acc_id,
            "amount": "200.00",
            "type": "gasto",
            "concept": "Supermercado",
            "category": "Comida",
        },
        headers=auth_headers,
    )
    assert exp_resp.status_code == 201

    # Check updated balance -> $1300
    acc_check_2 = await client.get(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert acc_check_2.json()["current_balance"] == "1300.00"


@pytest.mark.asyncio
async def test_transfer_transaction(client: AsyncClient, auth_headers):
    # Create 2 accounts
    acc1 = (
        await client.post(
            "/api/v1/accounts/",
            json={"name": "Origen", "initial_balance": "1000.00"},
            headers=auth_headers,
        )
    ).json()
    acc2 = (
        await client.post(
            "/api/v1/accounts/",
            json={"name": "Destino", "initial_balance": "500.00"},
            headers=auth_headers,
        )
    ).json()

    # Transfer $300 from acc1 to acc2
    transfer_resp = await client.post(
        "/api/v1/transactions/",
        json={
            "account_id": acc1["id"],
            "destination_account_id": acc2["id"],
            "amount": "300.00",
            "type": "transferencia",
            "concept": "Traspaso a ahorro",
            "category": "Ahorro",
        },
        headers=auth_headers,
    )
    assert transfer_resp.status_code == 201

    # Check balances
    acc1_updated = (await client.get(f"/api/v1/accounts/{acc1['id']}", headers=auth_headers)).json()
    acc2_updated = (await client.get(f"/api/v1/accounts/{acc2['id']}", headers=auth_headers)).json()
    assert acc1_updated["current_balance"] == "700.00"
    assert acc2_updated["current_balance"] == "800.00"


@pytest.mark.asyncio
async def test_delete_transaction_reverses_balance(client: AsyncClient, auth_headers):
    acc = (
        await client.post(
            "/api/v1/accounts/",
            json={"name": "Balance Reversal Test", "initial_balance": "1000.00"},
            headers=auth_headers,
        )
    ).json()

    # Add expense $400 -> balance becomes $600
    tx = (
        await client.post(
            "/api/v1/transactions/",
            json={
                "account_id": acc["id"],
                "amount": "400.00",
                "type": "gasto",
                "concept": "Cena",
            },
            headers=auth_headers,
        )
    ).json()

    acc_after_tx = (await client.get(f"/api/v1/accounts/{acc['id']}", headers=auth_headers)).json()
    assert acc_after_tx["current_balance"] == "600.00"

    # Delete transaction -> balance should restore to $1000.00
    del_resp = await client.delete(f"/api/v1/transactions/{tx['id']}", headers=auth_headers)
    assert del_resp.status_code == 204

    acc_restored = (await client.get(f"/api/v1/accounts/{acc['id']}", headers=auth_headers)).json()
    assert acc_restored["current_balance"] == "1000.00"


@pytest.mark.asyncio
async def test_recurring_item_apply(client: AsyncClient, auth_headers):
    acc = (
        await client.post(
            "/api/v1/accounts/",
            json={"name": "Nomina Acc", "initial_balance": "5000.00"},
            headers=auth_headers,
        )
    ).json()

    # Create recurring item (Salary $12,000)
    rec_item = (
        await client.post(
            "/api/v1/recurring/",
            json={
                "name": "Sueldo Quincenal",
                "type": "ingreso_fijo",
                "amount": "12000.00",
                "frequency": "quincenal",
                "account_id": acc["id"],
            },
            headers=auth_headers,
        )
    ).json()
    assert rec_item["name"] == "Sueldo Quincenal"

    # Apply recurring item now
    apply_resp = await client.post(
        f"/api/v1/recurring/{rec_item['id']}/apply", headers=auth_headers
    )
    assert apply_resp.status_code == 200
    tx_created = apply_resp.json()
    assert tx_created["is_recurring"] is True
    assert tx_created["amount"] == "12000.00"

    # Check account balance updated -> $17,000.00
    acc_check = (await client.get(f"/api/v1/accounts/{acc['id']}", headers=auth_headers)).json()
    assert acc_check["current_balance"] == "17000.00"
