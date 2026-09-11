import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_initial_sync_and_delta(client: AsyncClient, auth_headers):
    # 1. Create an account
    acc_resp = await client.post(
        "/api/v1/accounts/",
        json={
            "name": "BBVA Nomina",
            "account_type": "debito",
            "initial_balance": "5000.00",
            "is_liquid": True,
        },
        headers=auth_headers,
    )
    assert acc_resp.status_code == 201
    acc = acc_resp.json()

    # 2. Create a transaction
    tx_resp = await client.post(
        "/api/v1/transactions/",
        json={
            "account_id": acc["id"],
            "amount": "150.00",
            "type": "gasto",
            "concept": "Supermercado",
            "category": "Comida",
        },
        headers=auth_headers,
    )
    assert tx_resp.status_code == 201

    # 3. Test Initial Sync (since=None)
    sync_resp = await client.get("/api/v1/sync/delta", headers=auth_headers)
    assert sync_resp.status_code == 200
    sync_data = sync_resp.json()

    assert sync_data["has_changes"] is True
    assert "server_time" in sync_data
    server_time = sync_data["server_time"]
    assert any(a["id"] == acc["id"] for a in sync_data["accounts"])
    assert any(t["concept"] == "Supermercado" for t in sync_data["transactions"])
    assert sync_data["summary"] is not None

    # 4. Test Delta Sync when NO changes have occurred since server_time
    delta_no_changes = await client.get(
        f"/api/v1/sync/delta?since={server_time}",
        headers=auth_headers,
    )
    assert delta_no_changes.status_code == 200
    no_change_data = delta_no_changes.json()
    assert no_change_data["has_changes"] is False
    assert len(no_change_data["accounts"]) == 0
    assert len(no_change_data["transactions"]) == 0
    assert no_change_data["summary"] is None

    # 5. Add another transaction
    tx_resp2 = await client.post(
        "/api/v1/transactions/",
        json={
            "account_id": acc["id"],
            "amount": "50.00",
            "type": "gasto",
            "concept": "Café",
            "category": "Comida",
        },
        headers=auth_headers,
    )
    assert tx_resp2.status_code == 201

    # 6. Test Delta Sync detects the new transaction & updated account balance
    delta_changes = await client.get(
        f"/api/v1/sync/delta?since={server_time}",
        headers=auth_headers,
    )
    assert delta_changes.status_code == 200
    change_data = delta_changes.json()
    assert change_data["has_changes"] is True
    assert any(t["concept"] == "Café" for t in change_data["transactions"])
    assert change_data["summary"] is not None
