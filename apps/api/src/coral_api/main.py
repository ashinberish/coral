"""Application factory."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from coral_api.api.v1.router import router as v1_router
from coral_api.core.config import Settings, get_settings
from coral_api.core.errors import Problem, register_exception_handlers
from coral_api.core.logging import configure_logging, get_logger
from coral_api.core.middleware import RequestContextMiddleware
from coral_api.core.telemetry import setup_telemetry
from coral_api.db.session import Database
from coral_api.modules.auth.providers import JwksIdentityVerifier
from coral_api.modules.health.router import router as health_router

logger = get_logger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        database = Database(settings.database)
        app.state.database = database
        telemetry.instrument_engine(database.engine)
        logger.info("startup", env=settings.env.value, version=settings.version)
        try:
            yield
        finally:
            await database.dispose()
            telemetry.shutdown()
            logger.info("shutdown")

    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        lifespan=lifespan,
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
        responses={
            422: {"model": Problem, "description": "Validation error"},
            500: {"model": Problem, "description": "Internal error"},
        },
    )
    app.state.settings = settings
    app.state.identity_verifier = JwksIdentityVerifier(settings.auth)

    register_exception_handlers(app)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["x-request-id"],
        )
    app.add_middleware(RequestContextMiddleware)

    app.include_router(health_router)
    app.include_router(v1_router, prefix=settings.api_prefix)

    telemetry = setup_telemetry(app, settings)
    app.state.telemetry = telemetry
    return app
