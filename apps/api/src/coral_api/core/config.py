"""Typed application settings, loaded from environment variables (and `.env` locally).

All variables use the ``CORAL_`` prefix; nested groups use ``__`` as delimiter, e.g.::

    CORAL_ENV=production
    CORAL_DATABASE__HOST=db.internal
    CORAL_DATABASE__PASSWORD=...
    CORAL_TELEMETRY__ENABLED=true

Hosted Postgres (e.g. Neon via the Vercel Marketplace) injects a single connection URL;
``DATABASE_URL`` (or ``CORAL_DATABASE_URL`` / ``CORAL_DATABASE__DSN``) overrides the
individual host/user/password fields.
"""

import uuid
from enum import StrEnum
from functools import lru_cache
from typing import Annotated, Any, Self

from pydantic import (
    AliasChoices,
    BaseModel,
    Field,
    SecretStr,
    computed_field,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from sqlalchemy import URL, make_url

from coral_api import __version__


class Environment(StrEnum):
    LOCAL = "local"
    TEST = "test"
    STAGING = "staging"
    PRODUCTION = "production"


class LogFormat(StrEnum):
    CONSOLE = "console"
    JSON = "json"


# libpq-style query parameters that asyncpg does not understand as URL options.
_LIBPQ_ONLY_PARAMS = ("sslmode", "channel_binding", "options", "sslrootcert")


def _unique_prepared_statement_name() -> str:
    return f"__asyncpg_{uuid.uuid4()}__"


class DatabaseSettings(BaseModel):
    # Either a full URL (hosted Postgres) ...
    dsn: SecretStr | None = None
    # ... or individual parts (local / self-hosted).
    host: str = "localhost"
    port: int = 5432
    user: str = "coral"
    password: SecretStr = SecretStr("coral")
    name: str = "coral"

    pool_size: int = Field(default=10, ge=1)
    max_overflow: int = Field(default=10, ge=0)
    pool_timeout_s: float = Field(default=30.0, gt=0)
    echo: bool = False
    # Connecting through PgBouncer in transaction mode (e.g. Neon's "-pooler" host).
    # None = auto-detect from the hostname.
    pgbouncer: bool | None = None

    def _source_url(self) -> URL:
        if self.dsn is not None:
            return make_url(self.dsn.get_secret_value())
        return URL.create(
            "postgresql",
            username=self.user,
            password=self.password.get_secret_value(),
            host=self.host,
            port=self.port,
            database=self.name,
        )

    @property
    def uses_pgbouncer(self) -> bool:
        if self.pgbouncer is not None:
            return self.pgbouncer
        return "-pooler" in (self._source_url().host or "")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def url(self) -> str:
        """SQLAlchemy async URL (asyncpg driver), with libpq-only options removed."""
        source = self._source_url()
        query = {k: v for k, v in source.query.items() if k not in _LIBPQ_ONLY_PARAMS}
        if self.uses_pgbouncer:
            # SQLAlchemy's own prepared-statement cache must be off behind PgBouncer.
            query["prepared_statement_cache_size"] = "0"
        url = source.set(drivername="postgresql+asyncpg", query=query)
        return url.render_as_string(hide_password=False)

    @property
    def connect_args(self) -> dict[str, Any]:
        """asyncpg connection arguments derived from the URL / settings."""
        args: dict[str, Any] = {}
        sslmode = self._source_url().query.get("sslmode")
        if isinstance(sslmode, str) and sslmode != "disable":
            args["ssl"] = sslmode  # asyncpg accepts libpq sslmode names
        if self.uses_pgbouncer:
            # Transaction pooling: no server-side statement cache, unique statement names.
            # https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#prepared-statement-name-with-pgbouncer
            args["statement_cache_size"] = 0
            args["prepared_statement_name_func"] = _unique_prepared_statement_name
        return args


class TelemetrySettings(BaseModel):
    enabled: bool = False
    service_name: str = "coral-api"
    otlp_endpoint: str = "http://localhost:4317"
    otlp_insecure: bool = True
    sample_ratio: float = Field(default=1.0, ge=0.0, le=1.0)
    metrics_export_interval_ms: int = Field(default=15_000, ge=1_000)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="CORAL_",
        env_nested_delimiter="__",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Coral API"
    version: str = __version__
    env: Environment = Environment.LOCAL
    api_prefix: str = "/v1"

    log_level: str = "INFO"
    log_format: LogFormat = LogFormat.CONSOLE

    # Comma-separated in env: CORAL_CORS_ORIGINS=https://a.example,https://b.example
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)

    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    # Convenience alias for platform-injected URLs (Neon/Vercel set DATABASE_URL).
    # (The pydantic mypy plugin flags any dynamic alias; this field has a default.)
    database_url: SecretStr | None = Field(  # type: ignore[pydantic-alias]
        default=None,
        validation_alias=AliasChoices("CORAL_DATABASE_URL", "DATABASE_URL", "database_url"),
        exclude=True,
    )
    telemetry: TelemetrySettings = Field(default_factory=TelemetrySettings)

    @property
    def is_production(self) -> bool:
        return self.env is Environment.PRODUCTION

    @property
    def docs_enabled(self) -> bool:
        return not self.is_production

    @model_validator(mode="after")
    def _apply_database_url(self) -> Self:
        if self.database_url is not None and self.database.dsn is None:
            self.database.dsn = self.database_url
        return self

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, value: object) -> object:
        return _split_csv(value) if isinstance(value, str) else value


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    """Process-wide settings, read once from the environment.

    Request handlers should use ``SettingsDep`` (the settings the app was built with).
    """
    return Settings()
