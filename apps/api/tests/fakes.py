"""Test doubles."""

from coral_api.core.errors import UnauthorizedError
from coral_api.modules.auth.models import AuthProvider
from coral_api.modules.auth.providers import IdentityClaims


class FakeIdentityVerifier:
    """Accepts tokens shaped like ``"<provider>|<subject>|<email>"`` (min 20 chars total
    after padding) instead of real provider JWTs."""

    async def verify_apple(self, id_token: str, raw_nonce: str) -> IdentityClaims:
        return self._parse(id_token, AuthProvider.APPLE)

    async def verify_google(self, id_token: str) -> IdentityClaims:
        return self._parse(id_token, AuthProvider.GOOGLE)

    @staticmethod
    def _parse(id_token: str, provider: AuthProvider) -> IdentityClaims:
        parts = id_token.rstrip(".").split("|")
        if len(parts) != 3 or parts[0] != provider.value:
            raise UnauthorizedError("Invalid ID token")
        return IdentityClaims(
            provider=provider, subject=parts[1], email=parts[2] or None, email_verified=True
        )


def fake_token(provider: str, subject: str, email: str = "") -> str:
    return f"{provider}|{subject}|{email}".ljust(24, ".")
