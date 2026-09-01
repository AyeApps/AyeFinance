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
    assert len(accounts) == 1
    assert accounts[0]["id"] == created_acc["id"]


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

    # User 2 lists accounts -> should be empty
    user2_list = await client.get("/api/v1/accounts/", headers=auth_headers_user_2)
    assert user2_list.status_code == 200
    assert len(user2_list.json()) == 0

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

    # List -> empty
    list_resp = await client.get("/api/v1/accounts/", headers=auth_headers)
    assert len(list_resp.json()) == 0

    # Detail -> 404
    detail_resp = await client.get(f"/api/v1/accounts/{acc_id}", headers=auth_headers)
    assert detail_resp.status_code == 404
