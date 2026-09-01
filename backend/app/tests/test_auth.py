import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "AyeFinance"


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # 1. Register
    reg_payload = {
        "email": "alberto@ayeapps.com",
        "password": "Password123!",
        "name": "Alberto Aye",
    }
    reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == "alberto@ayeapps.com"

    # 2. Login
    login_payload = {
        "email": "alberto@ayeapps.com",
        "password": "Password123!",
    }
    login_resp = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert login_data["user"]["name"] == "Alberto Aye"


@pytest.mark.asyncio
async def test_invalid_login(client: AsyncClient):
    # Attempt login with unregistered user
    payload = {
        "email": "nonexistent@ayeapps.com",
        "password": "WrongPassword1!",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_auto_provisioning_on_me_endpoint(client: AsyncClient):
    from app.core.security import create_access_token

    token, _, _ = create_access_token(
        subject="external_sub_999",
        email="external@ayeapps.com",
        name="External Aye User",
        apps_access={"finance": True},
    )

    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "external_sub_999"
    assert data["email"] == "external@ayeapps.com"
    assert data["name"] == "External Aye User"


@pytest.mark.asyncio
async def test_logout_revokes_token(client: AsyncClient, auth_headers):
    # Call me endpoint before logout
    me_resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_resp.status_code == 200

    # Logout
    logout_resp = await client.delete("/api/v1/auth/logout", headers=auth_headers)
    assert logout_resp.status_code == 204

    # Call me endpoint after logout -> should be 401 Revoked
    me_resp_after = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_resp_after.status_code == 401
