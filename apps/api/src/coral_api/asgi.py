"""ASGI entrypoint for platforms that import a module-level ``app`` (Vercel, plain uvicorn).

Settings are read from the environment at import time. Tests and tooling should call
:func:`coral_api.main.create_app` directly instead of importing this module.
"""

from coral_api.main import create_app

app = create_app()
