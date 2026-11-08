import httpx
import pytest

from coral_api.core.config import DatabaseSettings, Environment, Settings
from coral_api.main import create_app

pytestmark = pytest.mark.db


async def test_readiness_ok_with_database(live_client: httpx.AsyncClient) -> None:
    response = await live_client.get("/readyz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "checks": {"database": "ok"}}


async def test_readiness_unavailable_when_database_is_down(migrated_db: str) -> None:
    from asgi_lifespan import LifespanManager

    settings = Settings(
        _env_file=None,
        env=Environment.TEST,
        database=DatabaseSettings(host="127.0.0.1", port=1, pool_timeout_s=1),
    )
    app = create_app(settings)
    async with (
        LifespanManager(app) as manager,
        httpx.AsyncClient(
            transport=httpx.ASGITransport(app=manager.app), base_url="http://test"
        ) as client,
    ):
        response = await client.get("/readyz")

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable", "checks": {"database": "fail"}}
