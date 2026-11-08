import uuid

import httpx
import pytest
from fastapi import FastAPI

from tests.fakes import FakeIdentityVerifier, fake_token

pytestmark = pytest.mark.db
NONCE = "n" * 32


@pytest.fixture(autouse=True)
def fake_verifier(app: FastAPI) -> None:
    app.state.identity_verifier = FakeIdentityVerifier()


async def sign_in(client: httpx.AsyncClient, subject: str | None = None) -> dict[str, object]:
    subject = subject or uuid.uuid4().hex
    response = await client.post(
        "/v1/auth/apple",
        json={
            "id_token": fake_token("apple", subject, "me@example.com"),
            "nonce": NONCE,
            "given_name": "Ash",
            "family_name": "B",
        },
        headers={"user-agent": "CoralTest/1.0"},
    )
    assert response.status_code == 200, response.text
    body: dict[str, object] = response.json()
    return body


def bearer(token: object) -> dict[str, str]:
    return {"authorization": f"Bearer {token}"}


async def test_apple_sign_in_creates_then_reuses_user(live_client: httpx.AsyncClient) -> None:
    subject = uuid.uuid4().hex
    first = await sign_in(live_client, subject)
    second = await sign_in(live_client, subject)

    assert first["is_new_user"] is True
    assert second["is_new_user"] is False
    assert first["user"]["id"] == second["user"]["id"]  # type: ignore[index]
    assert first["user"]["display_name"] == "Ash B"  # type: ignore[index]
    assert first["token_type"] == "bearer"
    assert first["expires_in"] == 900


async def test_google_sign_in_is_a_separate_identity(live_client: httpx.AsyncClient) -> None:
    response = await live_client.post(
        "/v1/auth/google", json={"id_token": fake_token("google", uuid.uuid4().hex, "g@x.com")}
    )
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "g@x.com"


async def test_invalid_provider_token_is_401(live_client: httpx.AsyncClient) -> None:
    response = await live_client.post(
        "/v1/auth/apple", json={"id_token": fake_token("google", "x"), "nonce": NONCE}
    )
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["code"] == "unauthorized"


async def test_me_requires_a_valid_access_token(live_client: httpx.AsyncClient) -> None:
    assert (await live_client.get("/v1/me")).status_code == 401
    assert (await live_client.get("/v1/me", headers=bearer("garbage"))).status_code == 401

    session = await sign_in(live_client)
    me = await live_client.get("/v1/me", headers=bearer(session["access_token"]))
    assert me.status_code == 200
    assert me.json()["id"] == session["user"]["id"]  # type: ignore[index]


async def test_update_profile(live_client: httpx.AsyncClient) -> None:
    session = await sign_in(live_client)
    headers = bearer(session["access_token"])

    ok = await live_client.patch(
        "/v1/me", json={"daily_goal_ml": 3000, "timezone": "Europe/Berlin"}, headers=headers
    )
    assert ok.status_code == 200
    assert (ok.json()["daily_goal_ml"], ok.json()["timezone"]) == (3000, "Europe/Berlin")

    bad = await live_client.patch("/v1/me", json={"timezone": "Mars/Olympus"}, headers=headers)
    assert bad.status_code == 422


async def test_refresh_rotates_and_detects_reuse(live_client: httpx.AsyncClient) -> None:
    session = await sign_in(live_client)
    first_refresh = session["refresh_token"]

    rotated = await live_client.post("/v1/auth/refresh", json={"refresh_token": first_refresh})
    assert rotated.status_code == 200
    second_refresh = rotated.json()["refresh_token"]
    assert second_refresh != first_refresh

    # Replaying the old token = theft signal → whole family revoked.
    replay = await live_client.post("/v1/auth/refresh", json={"refresh_token": first_refresh})
    assert replay.status_code == 401
    assert "reuse" in replay.json()["detail"]
    after = await live_client.post("/v1/auth/refresh", json={"refresh_token": second_refresh})
    assert after.status_code == 401


async def test_logout_revokes_session(live_client: httpx.AsyncClient) -> None:
    session = await sign_in(live_client)
    token = session["refresh_token"]
    assert (
        await live_client.post("/v1/auth/logout", json={"refresh_token": token})
    ).status_code == 204
    assert (
        await live_client.post("/v1/auth/logout", json={"refresh_token": token})
    ).status_code == 204
    refreshed = await live_client.post("/v1/auth/refresh", json={"refresh_token": token})
    assert refreshed.status_code == 401


async def test_delete_account(live_client: httpx.AsyncClient) -> None:
    subject = uuid.uuid4().hex
    session = await sign_in(live_client, subject)
    headers = bearer(session["access_token"])

    assert (await live_client.delete("/v1/me", headers=headers)).status_code == 204
    assert (await live_client.get("/v1/me", headers=headers)).status_code == 401
    refreshed = await live_client.post(
        "/v1/auth/refresh", json={"refresh_token": session["refresh_token"]}
    )
    assert refreshed.status_code == 401
    # Signing in again starts a fresh account.
    again = await sign_in(live_client, subject)
    assert again["is_new_user"] is True
