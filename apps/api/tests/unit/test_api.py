import httpx
from pydantic import SecretStr

from coral_api.core.config import AuthSettings, Environment, Settings
from coral_api.main import create_app


async def test_liveness(client: httpx.AsyncClient) -> None:
    response = await client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_meta(client: httpx.AsyncClient) -> None:
    response = await client.get("/v1/meta")
    assert response.status_code == 200
    assert response.json() == {"name": "Coral API", "version": "0.1.0", "environment": "test"}


async def test_docs_disabled_in_production() -> None:
    app = create_app(
        Settings(
            _env_file=None,
            env=Environment.PRODUCTION,
            auth=AuthSettings(jwt_secret=SecretStr("s" * 40)),
        )
    )
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        assert (await client.get("/docs")).status_code == 404
        assert (await client.get("/openapi.json")).status_code == 404
