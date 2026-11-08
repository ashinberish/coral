"""Domain errors and RFC 9457 ``application/problem+json`` responses.

Raise :class:`AppError` subclasses from services; never leak stack traces
or internal messages to clients for unexpected errors.
"""

from http import HTTPStatus
from typing import Any, ClassVar

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from coral_api.core.logging import get_logger

PROBLEM_JSON = "application/problem+json"
logger = get_logger(__name__)


class Problem(BaseModel):
    """RFC 9457 problem details body (documented in OpenAPI)."""

    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    instance: str | None = None
    code: str | None = None
    request_id: str | None = None
    errors: list[dict[str, Any]] | None = None


class AppError(Exception):
    status: ClassVar[HTTPStatus] = HTTPStatus.INTERNAL_SERVER_ERROR
    code: ClassVar[str] = "internal_error"
    headers: ClassVar[dict[str, str]] = {}

    def __init__(self, detail: str | None = None) -> None:
        super().__init__(detail or self.status.phrase)
        self.detail = detail


class UnauthorizedError(AppError):
    """Missing, invalid or expired credentials."""

    status = HTTPStatus.UNAUTHORIZED
    code = "unauthorized"
    headers: ClassVar[dict[str, str]] = {"WWW-Authenticate": "Bearer"}


class ServiceUnavailableError(AppError):
    status = HTTPStatus.SERVICE_UNAVAILABLE
    code = "service_unavailable"


class NotFoundError(AppError):
    status = HTTPStatus.NOT_FOUND
    code = "not_found"


class ConflictError(AppError):
    status = HTTPStatus.CONFLICT
    code = "conflict"


class DomainValidationError(AppError):
    status = HTTPStatus.UNPROCESSABLE_CONTENT
    code = "validation_error"


def _problem(request: Request, problem: Problem) -> JSONResponse:
    problem.instance = problem.instance or request.url.path
    problem.request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        problem.model_dump(exclude_none=True), status_code=problem.status, media_type=PROBLEM_JSON
    )


async def _app_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)  # noqa: S101 - narrowed by registration
    response = _problem(
        request,
        Problem(title=exc.status.phrase, status=exc.status, detail=exc.detail, code=exc.code),
    )
    response.headers.update(exc.headers)
    return response


async def _http_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)  # noqa: S101
    status = HTTPStatus(exc.status_code)
    detail = exc.detail if isinstance(exc.detail, str) and exc.detail != status.phrase else None
    response = _problem(request, Problem(title=status.phrase, status=status, detail=detail))
    if exc.headers:
        response.headers.update(exc.headers)
    return response


async def _validation_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)  # noqa: S101
    errors = [
        {"loc": list(err["loc"]), "msg": err["msg"], "type": err["type"]} for err in exc.errors()
    ]
    status = HTTPStatus.UNPROCESSABLE_CONTENT
    return _problem(
        request,
        Problem(title=status.phrase, status=status, code="validation_error", errors=errors),
    )


async def _unhandled_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled_error", path=request.url.path)
    status = HTTPStatus.INTERNAL_SERVER_ERROR
    return _problem(request, Problem(title=status.phrase, status=status, code="internal_error"))


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(Exception, _unhandled_error)
