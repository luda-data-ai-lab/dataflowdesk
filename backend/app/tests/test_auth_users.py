"""Auth (SPEC §4.6) and user management (§4.7) endpoints."""

from __future__ import annotations

from httpx import AsyncClient

from app.tests.conftest import ADMIN, login


async def test_login_me_refresh(anon_client: AsyncClient) -> None:
    bad = await anon_client.post("/api/auth/login", json={"username": "admin", "password": "x"})
    assert bad.status_code == 401

    tokens = await login(anon_client, ADMIN["username"], ADMIN["password"])
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    me = await anon_client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["username"] == "admin"
    assert me.json()["role"] == "admin"
    assert "password_hash" not in me.json()

    # a refresh token is not accepted as an access token and vice versa
    wrong = await anon_client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {tokens['refresh_token']}"}
    )
    assert wrong.status_code == 401
    bad_refresh = await anon_client.post(
        "/api/auth/refresh", json={"refresh_token": tokens["access_token"]}
    )
    assert bad_refresh.status_code == 401

    refreshed = await anon_client.post(
        "/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert refreshed.status_code == 200
    assert set(refreshed.json()) == {"access_token", "refresh_token", "token_type"}


async def test_protected_endpoints_require_token(anon_client: AsyncClient) -> None:
    for path in (
        "/api/systems",
        "/api/interfaces",
        "/api/dashboard/summary",
        "/api/topology",
        "/api/changelog",
        "/api/users",
        "/api/upload/history",
    ):
        resp = await anon_client.get(path)
        assert resp.status_code == 401, path
    garbage = await anon_client.get("/api/systems", headers={"Authorization": "Bearer nope"})
    assert garbage.status_code == 401
    # branding read stays public (login page), writes do not
    assert (await anon_client.get("/api/settings/branding")).status_code == 200
    assert (
        await anon_client.put("/api/settings/branding", json={"company_name": "x"})
    ).status_code == 401
    assert (await anon_client.get("/api/health")).status_code == 200


async def test_user_crud_and_role_enforcement(client: AsyncClient) -> None:
    listed = await client.get("/api/users")
    assert listed.status_code == 200
    assert [u["username"] for u in listed.json()] == ["admin"]

    created = await client.post(
        "/api/users",
        json={"username": "kim", "password": "kim12345", "display_name": "김철수"},
    )
    assert created.status_code == 201, created.text
    kim = created.json()
    assert kim["role"] == "user" and kim["is_active"] is True

    dup = await client.post("/api/users", json={"username": "kim", "password": "kim12345"})
    assert dup.status_code == 409

    # a plain user can log in and read data but cannot manage users
    tokens = await login(client, "kim", "kim12345")
    user_headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    assert (await client.get("/api/systems", headers=user_headers)).status_code == 200
    assert (await client.get("/api/users", headers=user_headers)).status_code == 403

    updated = await client.put(
        f"/api/users/{kim['id']}",
        json={"display_name": "김철수(관리)", "role": "admin", "password": "newpass1"},
    )
    assert updated.status_code == 200
    assert updated.json()["role"] == "admin"
    assert (
        await client.post("/api/auth/login", json={"username": "kim", "password": "kim12345"})
    ).status_code == 401
    await login(client, "kim", "newpass1")

    me = (await client.get("/api/auth/me")).json()
    self_demote = await client.put(f"/api/users/{me['id']}", json={"role": "user"})
    assert self_demote.status_code == 400
    self_deactivate = await client.patch(f"/api/users/{me['id']}/deactivate")
    assert self_deactivate.status_code == 400

    deactivated = await client.patch(f"/api/users/{kim['id']}/deactivate")
    assert deactivated.status_code == 200 and deactivated.json()["is_active"] is False
    assert (
        await client.post("/api/auth/login", json={"username": "kim", "password": "newpass1"})
    ).status_code == 401
    # existing tokens of a deactivated user stop working too
    assert (await client.get("/api/systems", headers=user_headers)).status_code == 401

    reactivated = await client.patch(f"/api/users/{kim['id']}/activate")
    assert reactivated.json()["is_active"] is True
    assert (await client.put("/api/users/999", json={"role": "user"})).status_code == 404
