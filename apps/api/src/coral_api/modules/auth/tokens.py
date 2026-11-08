"""Our own tokens: short-lived access JWTs and opaque, hashed refresh tokens."""

import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt

from coral_api.core.config import AuthSettings
from coral_api.core.errors import UnauthorizedError

ACCESS_TOKEN_ALGORITHM = "HS256"  # noqa: S105 - algorithm name, not a secret


@dataclass(frozen=True)
class AccessToken:
    token: str
    expires_in: int


def create_access_token(user_id: uuid.UUID, settings: AuthSettings) -> AccessToken:
    now = datetime.now(UTC)
    claims = {
        "sub": str(user_id),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(seconds=settings.access_token_ttl_s),
        "jti": uuid.uuid4().hex,
        "typ": "access",
    }
    token = jwt.encode(
        claims, settings.jwt_secret.get_secret_value(), algorithm=ACCESS_TOKEN_ALGORITHM
    )
    return AccessToken(token=token, expires_in=settings.access_token_ttl_s)


def decode_access_token(token: str, settings: AuthSettings) -> uuid.UUID:
    """Return the user id of a valid access token, else raise UnauthorizedError."""
    try:
        claims = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[ACCESS_TOKEN_ALGORITHM],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            options={"require": ["sub", "exp", "iat", "iss", "aud"]},
            leeway=10,
        )
        if claims.get("typ") != "access":
            raise UnauthorizedError("Invalid token type")
        return uuid.UUID(claims["sub"])
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("Access token expired") from exc
    except (jwt.InvalidTokenError, ValueError) as exc:
        raise UnauthorizedError("Invalid access token") from exc


def new_refresh_token() -> tuple[str, str]:
    """Return (raw token for the client, SHA-256 hex to store)."""
    raw = secrets.token_urlsafe(48)
    return raw, hash_refresh_token(raw)


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
