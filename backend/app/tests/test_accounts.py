import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_list_accounts(client: AsyncClient, auth_headers):
    # Create account
    payload = {
        "name": "Scotiabank",
        "account_type": "corriente",
        "currency": "MXN",
        "initial_balance": "15000.50",
        "color": "#FE9D01",
        "icon": "account_balance",
        "is_liquid": True,
    }
    create_resp = await client.post("/api/v1/accounts/", json=payload, headers=auth_headers)
    assert create_resp.status_code == 201
    created_acc = create_resp.json()
    assert created_acc["name"] == "Scotiabank"
    assert created_acc["current_balance"] == "15000.50"

    # List accounts
    list_resp = await client.get("/api/v1/accounts/", headers=auth_headers)
    assert list_resp.status_code == 200
    accounts = list_resp.json()
    assert any(a["id"] == created_acc["id"] for a in accounts)
    assert any(a["name"] == "Efectivo" for a in accounts)


@pytest.mark.asyncio
async def test_account_summary(client: AsyncClient, auth_headers):
    # Create liquid corriente account
    await client.post(
        "/api/v1/accounts/",
        json={
            "name": "Efectivo",
            "account_type": "corriente",
            "initial_balance": "2000.00",
            "is_liquid": True,
        },
        headers=auth_headers,
    )
    # Create non-liquid ahorro account
    await client.post(
        "/api/v1/accounts/",
        json={
            "name": "Ahorro Fondo",
            "account_type": "ahorro",
            "initial_balance": "10000.00",
            "is_liquid": False,
        },
        headers=auth_headers,
    )

    summary_resp = await client.get("/api/v1/accounts/summary", headers=auth_headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["liquid_total"] == "2000.00"
    assert summary["savings_total"] == "10000.00"
    assert summary["grand_total"] == "12000.00"
    assert summary["accounts_count"] == 2


@pytest.mark.asyncio
async def test_horizontal_isolation_accounts(
    client: AsyncClient, auth_headers, auth_headers_user_2
):
    # User 1 creates an account
    resp = await client.post(
        "/api/v1/accounts/",
        json={"name": "User 1 Secret Account", "initial_balance": "50000.00"},
        headers=auth_headers,
    )
    user1_acc_id = resp.json()["id"]

    # User 2 lists accounts -> should only contain User 2 accounts and not User 1 account
    user2_list = await client.get("/api/v1/accounts/", headers=auth_headers_user_2)
    assert user2_list.status_code == 200
    user2_accs = user2_list.json()
    assert not any(a["id"] == user1_acc_id for a in user2_accs)
    assert all(a["user_id"] == "user_test_456" for a in user2_accs)

    # User 2 tries to access User 1 account directly -> should be 404
    user2_detail = await client.get(f"/api/v1/accounts/{user1_acc_id}", headers=auth_headers_user_2)
    assert user2_detail.status_code == 404


@pytest.mark.asyncio
async def test_soft_delete_account(client: AsyncClient, auth_headers):
    # Create
    resp = await client.post(
        "/api/v1/accounts/",
        json={"name": "To Delete Account", "initial_balance": "1000.00"},
        headers=auth_headers,
    )
    acc_id = resp.json()["id"]

    # Delete
    del_resp = await client.delete(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert del_resp.status_code == 204

    # List -> should not contain deleted account
    list_resp = await client.get("/api/v1/accounts/", headers=auth_headers)
    assert list_resp.status_code == 200
    assert not any(a["id"] == acc_id for a in list_resp.json())

    # Detail -> 404
    detail_resp = await client.get(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert detail_resp.status_code == 404


@pytest.mark.asyncio
async def test_create_and_update_credit_card_account(client: AsyncClient, auth_headers):
    payload = {
        "name": "Banamex Joy",
        "account_type": "credito",
        "currency": "MXN",
        "initial_balance": "0.00",
        "color": "#E60045",
        "icon": "credit_card",
        "bank_id": "banamex",
        "is_liquid": True,
        "card_product": "Tarjeta Joy Citibanamex",
        "credit_limit": "45000.00",
        "cut_off_day": 6,
        "payment_due_day": 6,
        "payment_grace_days": 30,
    }
    create_resp = await client.post("/api/v1/accounts/", json=payload, headers=auth_headers)
    assert create_resp.status_code == 201
    data = create_resp.json()
    assert data["card_product"] == "Tarjeta Joy Citibanamex"
    assert data["credit_limit"] == "45000.00"
    assert data["cut_off_day"] == 6
    assert data["payment_due_day"] == 6
    assert data["payment_grace_days"] == 30
    assert data["bank_id"] == "banamex"

    acc_id = data["id"]

    # Test update
    patch_resp = await client.patch(
        f"/api/v1/accounts/{acc_id}",
        json={"credit_limit": "60000.00", "cut_off_day": 18, "payment_grace_days": 25},
        headers=auth_headers,
    )
    assert patch_resp.status_code == 200
    updated_data = patch_resp.json()
    assert updated_data["credit_limit"] == "60000.00"
    assert updated_data["cut_off_day"] == 18
    assert updated_data["payment_due_day"] == 6
    assert updated_data["payment_grace_days"] == 25


@pytest.mark.asyncio
async def test_create_debit_card_account_with_product(client: AsyncClient, auth_headers):
    payload = {
        "name": "Nómina BBVA",
        "account_type": "debito",
        "currency": "MXN",
        "initial_balance": "8500.00",
        "color": "#004481",
        "icon": "account_balance",
        "bank_id": "bbva",
        "is_liquid": True,
        "card_product": "Nómina BBVA",
    }
    create_resp = await client.post("/api/v1/accounts/", json=payload, headers=auth_headers)
    assert create_resp.status_code == 201
    data = create_resp.json()
    assert data["card_product"] == "Nómina BBVA"
    assert data["bank_id"] == "bbva"
    assert data["account_type"] == "debito"
    assert data["credit_limit"] is None


@pytest.mark.asyncio
async def test_default_cash_account_and_deletion(client: AsyncClient, auth_headers):
    # A user calling list accounts should automatically receive the default 'Efectivo' account
    resp = await client.get("/api/v1/accounts/", headers=auth_headers)
    assert resp.status_code == 200
    accs = resp.json()
    efectivo = next((a for a in accs if a["name"] == "Efectivo"), None)
    assert efectivo is not None
    assert efectivo["is_liquid"] is True
    assert efectivo["currency"] == "MXN"

    # If the user deletes "Efectivo", it should be deleted and NOT recreated
    del_resp = await client.delete(f"/api/v1/accounts/{efectivo['id']}", headers=auth_headers)
    assert del_resp.status_code == 204

    # Fetch again: Efectivo should not be in the list anymore
    resp2 = await client.get("/api/v1/accounts/", headers=auth_headers)
    assert resp2.status_code == 200
    accs2 = resp2.json()
    assert not any(a["name"] == "Efectivo" for a in accs2)
