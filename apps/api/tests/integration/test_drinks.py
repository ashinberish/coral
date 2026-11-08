import uuid
from datetime import UTC, datetime

import httpx
import pytest
from fastapi import FastAPI

from tests.fakes import FakeIdentityVerifier, fake_token

pytestmark = pytest.mark.db


@pytest.fixture(autouse=True)
def fake_verifier(app: FastAPI) -> None:
    app.state.identity_verifier = FakeIdentityVerifier()


async def auth_headers(client: httpx.AsyncClient) -> dict[str, str]:
    response = await client.post(
        "/v1/auth/google", json={"id_token": fake_token("google", uuid.uuid4().hex)}
    )
    return {"authorization": f"Bearer {response.json()['access_token']}"}


def drink(
    day: str = "2026-11-08", hour: int = 9, amount: int = 250, **extra: object
) -> dict[str, object]:
    return {
        "amount_ml": amount,
        "logged_at": datetime.fromisoformat(f"{day}T{hour:02d}:00:00")
        .replace(tzinfo=UTC)
        .isoformat(),
        "day_key": day,
        **extra,
    }


async def test_log_list_and_daily_totals(live_client: httpx.AsyncClient) -> None:
    headers = await auth_headers(live_client)
    for payload in (
        drink(hour=13, amount=250),
        drink(hour=9, amount=200, drink_type="coffee"),
        drink(day="2026-11-07", hour=20, amount=500),
    ):
        response = await live_client.post("/v1/drinks", json=payload, headers=headers)
        assert response.status_code == 201, response.text

    listed = await live_client.get(
        "/v1/drinks", params={"from_day": "2026-11-08", "to_day": "2026-11-08"}, headers=headers
    )
    assert [d["amount_ml"] for d in listed.json()] == [200, 250]
    assert listed.json()[0]["drink_type"] == "coffee"

    days = await live_client.get(
        "/v1/days", params={"from_day": "2026-11-01", "to_day": "2026-11-08"}, headers=headers
    )
    assert days.json() == [
        {"day_key": "2026-11-07", "total_ml": 500, "drink_count": 1},
        {"day_key": "2026-11-08", "total_ml": 450, "drink_count": 2},
    ]


async def test_create_is_idempotent_with_client_id(live_client: httpx.AsyncClient) -> None:
    headers = await auth_headers(live_client)
    payload = drink(id=str(uuid.uuid4()))
    first = await live_client.post("/v1/drinks", json=payload, headers=headers)
    retry = await live_client.post("/v1/drinks", json=payload, headers=headers)

    assert first.status_code == retry.status_code == 201
    assert first.json() == retry.json()
    days = await live_client.get(
        "/v1/days", params={"from_day": "2026-11-08", "to_day": "2026-11-08"}, headers=headers
    )
    assert days.json()[0]["drink_count"] == 1


async def test_cannot_reuse_another_users_id(live_client: httpx.AsyncClient) -> None:
    payload = drink(id=str(uuid.uuid4()))
    owner = await auth_headers(live_client)
    intruder = await auth_headers(live_client)
    assert (await live_client.post("/v1/drinks", json=payload, headers=owner)).status_code == 201
    clash = await live_client.post("/v1/drinks", json=payload, headers=intruder)
    assert clash.status_code == 409


async def test_users_only_see_and_delete_their_own_logs(live_client: httpx.AsyncClient) -> None:
    alice = await auth_headers(live_client)
    bob = await auth_headers(live_client)
    created = (await live_client.post("/v1/drinks", json=drink(), headers=alice)).json()
    params = {"from_day": "2026-11-08", "to_day": "2026-11-08"}

    assert (await live_client.get("/v1/drinks", params=params, headers=bob)).json() == []
    # Bob's delete is a silent no-op (idempotent, no existence leak).
    assert (await live_client.delete(f"/v1/drinks/{created['id']}", headers=bob)).status_code == 204
    assert len((await live_client.get("/v1/drinks", params=params, headers=alice)).json()) == 1

    for _ in range(2):  # idempotent for offline retries
        gone = await live_client.delete(f"/v1/drinks/{created['id']}", headers=alice)
        assert gone.status_code == 204
    assert (await live_client.get("/v1/drinks", params=params, headers=alice)).json() == []


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        (drink(amount=0), "amount_ml"),
        (drink(amount=6000), "amount_ml"),
        ({**drink(), "day_key": "2026-11-20"}, "day_key"),
        ({**drink(), "logged_at": "2026-11-08T09:00:00"}, "logged_at"),  # naive datetime
    ],
)
async def test_validation(
    live_client: httpx.AsyncClient, payload: dict[str, object], field: str
) -> None:
    headers = await auth_headers(live_client)
    response = await live_client.post("/v1/drinks", json=payload, headers=headers)
    assert response.status_code == 422
    assert field in str(response.json()["errors"]) or "day_key" in str(response.json())


async def test_range_limits(live_client: httpx.AsyncClient) -> None:
    headers = await auth_headers(live_client)
    backwards = await live_client.get(
        "/v1/days", params={"from_day": "2026-11-08", "to_day": "2026-11-01"}, headers=headers
    )
    huge = await live_client.get(
        "/v1/days", params={"from_day": "2020-01-01", "to_day": "2026-11-08"}, headers=headers
    )
    assert backwards.status_code == huge.status_code == 422


async def test_drinks_require_auth(live_client: httpx.AsyncClient) -> None:
    assert (await live_client.post("/v1/drinks", json=drink())).status_code == 401


async def test_deleting_account_removes_drinks(live_client: httpx.AsyncClient) -> None:
    headers = await auth_headers(live_client)
    await live_client.post("/v1/drinks", json=drink(), headers=headers)
    assert (await live_client.delete("/v1/me", headers=headers)).status_code == 204
