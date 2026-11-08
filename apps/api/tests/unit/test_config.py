import pytest

from coral_api.core.config import DatabaseSettings, Environment, LogFormat, Settings


def test_defaults_are_local_and_docs_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CORAL_ENV", raising=False)
    settings = Settings(_env_file=None)
    assert settings.env is Environment.LOCAL
    assert settings.docs_enabled


def test_nested_env_vars_and_csv_cors(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORAL_ENV", "production")
    monkeypatch.setenv("CORAL_LOG_FORMAT", "json")
    monkeypatch.setenv("CORAL_DATABASE__HOST", "db.internal")
    monkeypatch.setenv("CORAL_DATABASE__POOL_SIZE", "25")
    monkeypatch.setenv("CORAL_TELEMETRY__ENABLED", "true")
    monkeypatch.setenv("CORAL_CORS_ORIGINS", "https://a.example, https://b.example")

    settings = Settings(_env_file=None)

    assert settings.is_production
    assert not settings.docs_enabled
    assert settings.log_format is LogFormat.JSON
    assert settings.database.host == "db.internal"
    assert settings.database.pool_size == 25
    assert settings.telemetry.enabled
    assert settings.cors_origins == ["https://a.example", "https://b.example"]


def test_database_url_escapes_credentials() -> None:
    db = DatabaseSettings(user="app", password="p@ss/word", host="h", port=6543, name="coral")  # type: ignore[arg-type]
    assert db.url == "postgresql+asyncpg://app:p%40ss%2Fword@h:6543/coral"


def test_password_is_not_leaked_in_repr() -> None:
    db = DatabaseSettings(password="supersecret")  # type: ignore[arg-type]
    assert "supersecret" not in repr(db.model_dump(exclude={"url"}))
