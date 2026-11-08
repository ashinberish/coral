import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from coral_api.core.config import AuthSettings
from coral_api.core.errors import UnauthorizedError
from coral_api.modules.auth.tokens import (
    create_access_token,
    decode_access_token,
    hash_refresh_token,
    new_refresh_token,
)

SETTINGS = AuthSettings(jwt_secret="x" * 40)  # type: ignore[arg-type]


def test_access_token_round_trip() -> None:
    user_id = uuid.uuid4()
    token = create_access_token(user_id, SETTINGS)
    assert token.expires_in == 900
    assert decode_access_token(token.token, SETTINGS) == user_id


def test_rejects_token_signed_with_another_secret() -> None:
    token = create_access_token(uuid.uuid4(), AuthSettings(jwt_secret="y" * 40))  # type: ignore[arg-type]
    with pytest.raises(UnauthorizedError, match="Invalid access token"):
        decode_access_token(token.token, SETTINGS)


def test_rejects_expired_token() -> None:
    past = datetime.now(UTC) - timedelta(hours=1)
    token = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "iss": "coral-api",
            "aud": "coral-app",
            "iat": past,
            "exp": past + timedelta(minutes=5),
            "typ": "access",
        },
        "x" * 40,
        algorithm="HS256",
    )
    with pytest.raises(UnauthorizedError, match="expired"):
        decode_access_token(token, SETTINGS)


def test_rejects_non_access_token_type() -> None:
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "iss": "coral-api",
            "aud": "coral-app",
            "iat": now,
            "exp": now + timedelta(minutes=5),
            "typ": "refresh",
        },
        "x" * 40,
        algorithm="HS256",
    )
    with pytest.raises(UnauthorizedError):
        decode_access_token(token, SETTINGS)


def test_refresh_tokens_are_random_and_only_hash_is_stored() -> None:
    raw1, hash1 = new_refresh_token()
    raw2, _ = new_refresh_token()
    assert raw1 != raw2
    assert len(raw1) >= 60
    assert hash1 == hash_refresh_token(raw1)
    assert raw1 not in hash1
