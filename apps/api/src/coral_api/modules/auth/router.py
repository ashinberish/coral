from fastapi import APIRouter, Header, status

from coral_api.core.errors import Problem
from coral_api.modules.auth.deps import AuthServiceDep, IdentityVerifierDep
from coral_api.modules.auth.schemas import (
    AppleSignIn,
    GoogleSignIn,
    RefreshRequest,
    SignInResponse,
    TokenPair,
)
from coral_api.modules.auth.service import SignInResult
from coral_api.modules.users.schemas import UserRead

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={401: {"model": Problem, "description": "Invalid credentials"}},
)


def _response(result: SignInResult) -> SignInResponse:
    return SignInResponse(
        **result.tokens.model_dump(),
        user=UserRead.model_validate(result.user),
        is_new_user=result.is_new_user,
    )


@router.post("/apple", summary="Sign in with Apple")
async def sign_in_with_apple(
    body: AppleSignIn,
    verifier: IdentityVerifierDep,
    service: AuthServiceDep,
    user_agent: str | None = Header(default=None),
) -> SignInResponse:
    claims = await verifier.verify_apple(body.id_token, body.nonce)
    name = " ".join(p for p in (body.given_name, body.family_name) if p) or None
    result = await service.sign_in(claims, display_name=name, user_agent=user_agent)
    return _response(result)


@router.post("/google", summary="Sign in with Google")
async def sign_in_with_google(
    body: GoogleSignIn,
    verifier: IdentityVerifierDep,
    service: AuthServiceDep,
    user_agent: str | None = Header(default=None),
) -> SignInResponse:
    claims = await verifier.verify_google(body.id_token)
    result = await service.sign_in(claims, display_name=None, user_agent=user_agent)
    return _response(result)


@router.post("/refresh", summary="Rotate the refresh token and get a new access token")
async def refresh(
    body: RefreshRequest,
    service: AuthServiceDep,
    user_agent: str | None = Header(default=None),
) -> TokenPair:
    return await service.refresh(body.refresh_token, user_agent=user_agent)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Sign out this session")
async def logout(body: RefreshRequest, service: AuthServiceDep) -> None:
    await service.sign_out(body.refresh_token)
