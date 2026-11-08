import pytest

from coral_api.core.config import DatabaseSettings, Environment, LogFormat, Settings


def test_defaults_are_local_and_docs_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CORAL_ENV", raising=False)
    settings = Settings(_env_file=None)
    assert settings.env is Environment.LOCAL
    assert settings.docs_enabled


def test_nested_env_vars_and_csv_cors(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORAL_ENV", "production")
    monkeypatch.setenv("CORAL_AUTH__JWT_SECRET", "s" * 40)
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


NEON_POOLED = (
    "postgresql://app:s3cret@ep-calm-123456-pooler.eu-central-1.aws.neon.tech/neondb"
    "?sslmode=require&channel_binding=require"
)


def test_platform_database_url_is_normalised_for_asyncpg(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", NEON_POOLED)
    db = Settings(_env_file=None).database

    assert db.url == (
        "postgresql+asyncpg://app:s3cret@ep-calm-123456-pooler.eu-central-1.aws.neon.tech/neondb"
        "?prepared_statement_cache_size=0"
    )
    assert db.uses_pgbouncer
    assert db.connect_args["ssl"] == "require"
    assert db.connect_args["statement_cache_size"] == 0
    name_func = db.connect_args["prepared_statement_name_func"]
    assert name_func() != name_func()  # unique names per statement


def test_explicit_dsn_beats_platform_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", NEON_POOLED)
    monkeypatch.setenv("CORAL_DATABASE__DSN", "postgres://x:y@db.internal:6000/coral")
    db = Settings(_env_file=None).database

    assert db.url == "postgresql+asyncpg://x:y@db.internal:6000/coral"
    assert not db.uses_pgbouncer
    assert db.connect_args == {}


def test_pgbouncer_can_be_forced_off_and_ssl_disable_is_ignored() -> None:
    db = DatabaseSettings(
        dsn="postgresql://a:b@ep-x-pooler.neon.tech/db?sslmode=disable",  # type: ignore[arg-type]
        pgbouncer=False,
    )
    assert db.url == "postgresql+asyncpg://a:b@ep-x-pooler.neon.tech/db"
    assert db.connect_args == {}


def test_production_requires_a_real_jwt_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORAL_ENV", "production")
    with pytest.raises(ValueError, match="CORAL_AUTH__JWT_SECRET"):
        Settings(_env_file=None)
    monkeypatch.setenv("CORAL_AUTH__JWT_SECRET", "short")
    with pytest.raises(ValueError, match="CORAL_AUTH__JWT_SECRET"):
        Settings(_env_file=None)


def test_auth_audiences_from_csv(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORAL_AUTH__GOOGLE_AUDIENCES", "web.apps.googleusercontent.com, ios.x")
    assert Settings(_env_file=None).auth.google_audiences == [
        "web.apps.googleusercontent.com",
        "ios.x",
    ]
