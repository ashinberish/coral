"""Sign-in, token rotation and sign-out. Routers stay thin; rules live here."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from coral_api.core.config import AuthSettings
from coral_api.core.errors import UnauthorizedError
from coral_api.core.logging import get_logger
from coral_api.modules.auth.models import AuthIdentity, RefreshToken
from coral_api.modules.auth.providers import IdentityClaims
from coral_api.modules.auth.schemas import TokenPair
from coral_api.modules.auth.tokens import create_access_token, hash_refresh_token, new_refresh_token
from coral_api.modules.users.models import User

logger = get_logger(__name__)


@dataclass(frozen=True)
class SignInResult:
    user: User
    tokens: TokenPair
    is_new_user: bool


class AuthService:
    def __init__(self, session: AsyncSession, settings: AuthSettings) -> None:
        self.session = session
        self.settings = settings

    async def sign_in(
        self, claims: IdentityClaims, *, display_name: str | None, user_agent: str | None
    ) -> SignInResult:
        """Find or create the user behind a verified provider identity and issue tokens.

        Identities are matched only by (provider, subject). We deliberately do not merge
        accounts by email: Apple may hide the address behind a private relay, and
        auto-linking on email is an account-takeover vector.
        """
        identity = await self.session.scalar(
            select(AuthIdentity).where(
                AuthIdentity.provider == claims.provider,
                AuthIdentity.subject == claims.subject,
            )
        )
        is_new = identity is None
        now = datetime.now(UTC)
        if identity is None:
            user = User(
                display_name=display_name or claims.name,
                email=claims.email,
                email_verified=claims.email_verified,
            )
            self.session.add(user)
            await self.session.flush()
            identity = AuthIdentity(
                user_id=user.id,
                provider=claims.provider,
                subject=claims.subject,
                email=claims.email,
            )
            self.session.add(identity)
        else:
            user = await self.session.get_one(User, identity.user_id)
            identity.last_used_at = now
            if claims.email and claims.email != identity.email:
                identity.email = claims.email
            if not user.display_name and (display_name or claims.name):
                user.display_name = display_name or claims.name

        tokens = await self._issue(user.id, family_id=uuid.uuid4(), user_agent=user_agent)
        logger.info("sign_in", provider=claims.provider.value, user_id=str(user.id), new=is_new)
        return SignInResult(user=user, tokens=tokens, is_new_user=is_new)

    async def refresh(self, raw_token: str, *, user_agent: str | None) -> TokenPair:
        """Rotate a refresh token. Presenting an already-rotated token revokes its family."""
        current = await self.session.scalar(
            select(RefreshToken)
            .where(RefreshToken.token_hash == hash_refresh_token(raw_token))
            .with_for_update()
        )
        now = datetime.now(UTC)
        if current is None:
            raise UnauthorizedError("Invalid refresh token")
        if current.revoked_at is not None:
            await self._revoke_family(current.family_id, now)
            # Commit before raising: the request session rolls back on errors, which would
            # silently undo the revocation and defeat stolen-token detection.
            await self.session.commit()
            logger.warning(
                "refresh_token_reuse", user_id=str(current.user_id), family=str(current.family_id)
            )
            raise UnauthorizedError("Refresh token reuse detected; please sign in again")
        if current.expires_at <= now:
            raise UnauthorizedError("Refresh token expired")

        tokens = await self._issue(
            current.user_id, family_id=current.family_id, user_agent=user_agent, replaces=current
        )
        return tokens

    async def sign_out(self, raw_token: str) -> None:
        """Revoke the session (token family). Idempotent; unknown tokens are ignored."""
        token = await self.session.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw_token))
        )
        if token is not None:
            await self._revoke_family(token.family_id, datetime.now(UTC))

    async def _issue(
        self,
        user_id: uuid.UUID,
        *,
        family_id: uuid.UUID,
        user_agent: str | None,
        replaces: RefreshToken | None = None,
    ) -> TokenPair:
        now = datetime.now(UTC)
        ttl = timedelta(days=self.settings.refresh_token_ttl_days)
        raw, token_hash = new_refresh_token()
        refresh = RefreshToken(
            user_id=user_id,
            family_id=family_id,
            token_hash=token_hash,
            expires_at=now + ttl,
            user_agent=(user_agent or "")[:255] or None,
        )
        self.session.add(refresh)
        await self.session.flush()
        if replaces is not None:
            replaces.revoked_at = now
            replaces.replaced_by_id = refresh.id

        access = create_access_token(user_id, self.settings)
        return TokenPair(
            access_token=access.token,
            expires_in=access.expires_in,
            refresh_token=raw,
            refresh_expires_in=int(ttl.total_seconds()),
        )

    async def _revoke_family(self, family_id: uuid.UUID, now: datetime) -> None:
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
