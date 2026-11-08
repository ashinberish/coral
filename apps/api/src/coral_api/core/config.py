"""Typed application settings, loaded from environment variables (and `.env` locally).

All variables use the ``CORAL_`` prefix; nested groups use ``__`` as delimiter, e.g.::

    CORAL_ENV=production
    CORAL_DATABASE__HOST=db.internal
    CORAL_DATABASE__PASSWORD=...
    CORAL_TELEMETRY__ENABLED=true
"""

from enum import StrEnum
from functools import lru_cache
from typing import Annotated

from pydantic import BaseModel, Field, SecretStr, computed_field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from sqlalchemy import URL

from coral_api import __version__


class Environment(StrEnum):
    LOCAL = "local"
    TEST = "test"
    STAGING = "staging"
    PRODUCTION = "production"


class LogFormat(StrEnum):
    CONSOLE = "console"
    JSON = "json"


class DatabaseSettings(BaseModel):
    host: str = "localhost"
    port: int = 5432
    user: str = "coral"
    password: SecretStr = SecretStr("coral")
    name: str = "coral"
    pool_size: int = Field(default=10, ge=1)
    max_overflow: int = Field(default=10, ge=0)
    pool_timeout_s: float = Field(default=30.0, gt=0)
    echo: bool = False

    @computed_field  # type: ignore[prop-decorator]
    @property
    def url(self) -> str:
        """SQLAlchemy async URL (asyncpg driver)."""
        return URL.create(
            "postgresql+asyncpg",
            username=self.user,
            password=self.password.get_secret_value(),
            host=self.host,
            port=self.port,
            database=self.name,
        ).render_as_string(hide_password=False)


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
    telemetry: TelemetrySettings = Field(default_factory=TelemetrySettings)

    @property
    def is_production(self) -> bool:
        return self.env is Environment.PRODUCTION

    @property
    def docs_enabled(self) -> bool:
        return not self.is_production

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
