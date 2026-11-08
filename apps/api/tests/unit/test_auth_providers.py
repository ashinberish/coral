"""ID-token verification with locally generated RSA keys (no network)."""

import hashlib
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from coral_api.core.config import AuthSettings
from coral_api.core.errors import ServiceUnavailableError, UnauthorizedError
from coral_api.modules.auth.models import AuthProvider
from coral_api.modules.auth.providers import JwksIdentityVerifier, nonce_matches

KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
RAW_NONCE = "a" * 32


def make_verifier(**overrides: Any) -> JwksIdentityVerifier:
    settings = AuthSettings(google_audiences=["web-client.apps.googleusercontent.com"], **overrides)
    verifier = JwksIdentityVerifier(settings)

    async def signing_key(_client: object, _token: str) -> Any:
        return KEY.public_key()

    verifier._signing_key = signing_key  # type: ignore[method-assign,assignment]
    return verifier


def sign(claims: dict[str, Any], key: rsa.RSAPrivateKey = KEY) -> str:
    now = datetime.now(UTC)
    payload = {"iat": now, "exp": now + timedelta(minutes=10), **claims}
    return jwt.encode(payload, key, algorithm="RS256", headers={"kid": "test"})


def apple_claims(**overrides: Any) -> dict[str, Any]:
    return {
        "iss": "https://appleid.apple.com",
        "aud": "app.coral.hydration",
        "sub": "001234.apple-user",
        "email": "abc@privaterelay.appleid.com",
        "email_verified": "true",
        "nonce": hashlib.sha256(RAW_NONCE.encode()).hexdigest(),
        **overrides,
    }


async def test_valid_apple_token() -> None:
    claims = await make_verifier().verify_apple(sign(apple_claims()), RAW_NONCE)
    assert claims.provider is AuthProvider.APPLE
    assert claims.subject == "001234.apple-user"
    assert claims.email_verified is True


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"aud": "com.someone.else"}, "Invalid ID token"),
        ({"iss": "https://evil.example"}, "Invalid ID token"),
        ({"nonce": "not-the-hash"}, "Nonce mismatch"),
        ({"exp": datetime.now(UTC) - timedelta(minutes=5)}, "expired"),
    ],
)
async def test_invalid_apple_tokens(overrides: dict[str, Any], message: str) -> None:
    with pytest.raises(UnauthorizedError, match=message):
        await make_verifier().verify_apple(sign(apple_claims(**overrides)), RAW_NONCE)


async def test_apple_token_signed_by_wrong_key() -> None:
    with pytest.raises(UnauthorizedError, match="Invalid ID token"):
        await make_verifier().verify_apple(sign(apple_claims(), OTHER_KEY), RAW_NONCE)


async def test_valid_google_token() -> None:
    token = sign(
        {
            "iss": "https://accounts.google.com",
            "aud": "web-client.apps.googleusercontent.com",
            "sub": "1098765",
            "email": "sam@example.com",
            "email_verified": True,
            "name": "Sam",
        }
    )
    claims = await make_verifier().verify_google(token)
    assert (claims.provider, claims.subject, claims.name) == (AuthProvider.GOOGLE, "1098765", "Sam")


async def test_google_requires_configured_audience() -> None:
    verifier = JwksIdentityVerifier(AuthSettings())
    with pytest.raises(ServiceUnavailableError, match="not configured"):
        await verifier.verify_google("x" * 40)


def test_nonce_matching() -> None:
    assert nonce_matches(RAW_NONCE, hashlib.sha256(RAW_NONCE.encode()).hexdigest())
    assert not nonce_matches(RAW_NONCE, RAW_NONCE)
    assert not nonce_matches(RAW_NONCE, None)
