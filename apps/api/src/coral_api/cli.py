"""``coral-api`` entrypoint: run the server with uvicorn."""

import uvicorn

from coral_api.core.config import get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        "coral_api.main:create_app",
        factory=True,
        host="0.0.0.0",  # noqa: S104 - container entrypoint
        port=8000,
        reload=settings.env.value == "local",
        proxy_headers=True,
        forwarded_allow_ips="*",
        log_config=None,  # our structlog config owns logging
    )
