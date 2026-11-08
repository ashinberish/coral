"""Verification of Apple / Google ID tokens (OpenID Connect, RS256 via provider JWKS)."""

import hashlib
import hmac
from dataclasses import dataclass
from typing import Any, Protocol

import anyio
import jwt
from jwt import PyJWKClient

from coral_api.core.config import AuthSettings
from coral_api.core.errors import ServiceUnavailableError, UnauthorizedError
from coral_api.core.logging import get_logger
from coral_api.modules.auth.models import AuthProvider

logger = get_logger(__name__)


@dataclass(frozen=True)
class IdentityClaims:
    provider: AuthProvider
    subject: str
    email: str | None
    email_verified: bool
    name: str | None = None


class IdentityVerifier(Protocol):
    async def verify_apple(self, id_token: str, raw_nonce: str) -> IdentityClaims: ...

    async def verify_google(self, id_token: str) -> IdentityClaims: ...


def _as_bool(value: Any) -> bool:
    # Apple sends booleans as strings ("true"); Google as JSON booleans.
    return value is True or (isinstance(value, str) and value.lower() == "true")


def nonce_matches(raw_nonce: str, claim: object) -> bool:
    """Apple embeds SHA-256(raw nonce) as hex; the app sends us the raw value."""
    expected = hashlib.sha256(raw_nonce.encode()).hexdigest()
    return isinstance(claim, str) and hmac.compare_digest(expected, claim)


class JwksIdentityVerifier:
    """Production verifier. Signing keys are fetched from the providers' JWKS endpoints
    and cached in-process (PyJWKClient), so warm instances verify without network calls."""

    def __init__(self, settings: AuthSettings) -> None:
        self._settings = settings
        self._apple_keys = PyJWKClient(settings.apple_jwks_url, cache_keys=True, lifespan=3600)
        self._google_keys = PyJWKClient(settings.google_jwks_url, cache_keys=True, lifespan=3600)

    async def _signing_key(self, client: PyJWKClient, token: str) -> Any:
        try:
            # PyJWKClient does blocking HTTP on cache miss; keep it off the event loop.
            return (await anyio.to_thread.run_sync(client.get_signing_key_from_jwt, token)).key
        except jwt.PyJWKClientConnectionError as exc:
            logger.warning("jwks_fetch_failed", error=repr(exc))
            raise ServiceUnavailableError("Could not reach the identity provider") from exc
        except jwt.PyJWKClientError as exc:
            raise UnauthorizedError("Unknown signing key") from exc
        except jwt.DecodeError as exc:
            raise UnauthorizedError("Malformed ID token") from exc

    async def verify_apple(self, id_token: str, raw_nonce: str) -> IdentityClaims:
        key = await self._signing_key(self._apple_keys, id_token)
        claims = _decode(
            id_token,
            key,
            audience=self._settings.apple_audiences,
            issuer=self._settings.apple_issuer,
        )
        if not nonce_matches(raw_nonce, claims.get("nonce")):
            raise UnauthorizedError("Nonce mismatch")
        return IdentityClaims(
            provider=AuthProvider.APPLE,
            subject=str(claims["sub"]),
            email=claims.get("email"),
            email_verified=_as_bool(claims.get("email_verified")),
        )

    async def verify_google(self, id_token: str) -> IdentityClaims:
        if not self._settings.google_audiences:
            raise ServiceUnavailableError("Google sign-in is not configured")
        key = await self._signing_key(self._google_keys, id_token)
        claims = _decode(
            id_token,
            key,
            audience=self._settings.google_audiences,
            issuer=self._settings.google_issuers,
        )
        return IdentityClaims(
            provider=AuthProvider.GOOGLE,
            subject=str(claims["sub"]),
            email=claims.get("email"),
            email_verified=_as_bool(claims.get("email_verified")),
            name=claims.get("name"),
        )


def _decode(
    token: str, key: Any, *, audience: list[str], issuer: str | list[str]
) -> dict[str, Any]:
    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=audience,
            issuer=issuer,
            options={"require": ["sub", "exp", "iat", "iss", "aud"]},
            leeway=30,
        )
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("ID token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError(f"Invalid ID token: {exc}") from exc
    return claims
