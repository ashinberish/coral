import httpx
from fastapi import FastAPI
from pydantic import BaseModel

from coral_api.core.errors import NotFoundError


class Payload(BaseModel):
    amount_ml: int


def add_test_routes(app: FastAPI) -> None:
    @app.get("/_test/missing")
    async def missing() -> None:
        raise NotFoundError("Drink log 42 does not exist")

    @app.post("/_test/validate")
    async def validate(payload: Payload) -> Payload:
        return payload

    @app.get("/_test/boom")
    async def boom() -> None:
        raise RuntimeError("secret internal detail")


async def test_app_error_is_problem_json(app: FastAPI, client: httpx.AsyncClient) -> None:
    add_test_routes(app)
    response = await client.get("/_test/missing")

    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"
    body = response.json()
    assert body["title"] == "Not Found"
    assert body["code"] == "not_found"
    assert body["detail"] == "Drink log 42 does not exist"
    assert body["instance"] == "/_test/missing"
    assert body["request_id"] == response.headers["x-request-id"]


async def test_validation_error_lists_fields(app: FastAPI, client: httpx.AsyncClient) -> None:
    add_test_routes(app)
    response = await client.post("/_test/validate", json={"amount_ml": "lots"})

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert body["errors"][0]["loc"] == ["body", "amount_ml"]


async def test_unhandled_error_hides_internals(app: FastAPI) -> None:
    add_test_routes(app)
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/_test/boom")

    assert response.status_code == 500
    assert "secret" not in response.text
    assert response.json()["code"] == "internal_error"


async def test_unknown_route_is_problem_json(client: httpx.AsyncClient) -> None:
    response = await client.get("/nope")
    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"


async def test_request_id_is_propagated_or_generated(client: httpx.AsyncClient) -> None:
    echoed = await client.get("/healthz", headers={"x-request-id": "abc-123"})
    assert echoed.headers["x-request-id"] == "abc-123"

    unsafe = await client.get("/healthz", headers={"x-request-id": "bad id\n"})
    assert unsafe.headers["x-request-id"] != "bad id\n"
    assert len(unsafe.headers["x-request-id"]) == 32
