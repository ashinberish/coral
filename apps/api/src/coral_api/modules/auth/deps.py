from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from coral_api.api.deps import SessionDep, SettingsDep
from coral_api.core.errors import UnauthorizedError
from coral_api.modules.auth.providers import IdentityVerifier
from coral_api.modules.auth.service import AuthService
from coral_api.modules.auth.tokens import decode_access_token
from coral_api.modules.users.models import User

_bearer = HTTPBearer(auto_error=False, description="Access token from /v1/auth/*")


def get_identity_verifier(request: Request) -> IdentityVerifier:
    verifier: IdentityVerifier = request.app.state.identity_verifier
    return verifier


def get_auth_service(session: SessionDep, settings: SettingsDep) -> AuthService:
    return AuthService(session, settings.auth)


async def get_current_user(
    session: SessionDep,
    settings: SettingsDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Missing bearer token")
    user_id = decode_access_token(credentials.credentials, settings.auth)
    user = await session.get(User, user_id)
    if user is None:  # deleted account with a still-valid access token
        raise UnauthorizedError("Account no longer exists")
    return user


IdentityVerifierDep = Annotated[IdentityVerifier, Depends(get_identity_verifier)]
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
CurrentUser = Annotated[User, Depends(get_current_user)]
