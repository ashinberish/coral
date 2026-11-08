from pydantic import BaseModel, Field

from coral_api.modules.users.schemas import UserRead


class AppleSignIn(BaseModel):
    id_token: str = Field(min_length=20, description="`identityToken` from Sign in with Apple.")
    nonce: str = Field(min_length=16, max_length=256, description="The raw (unhashed) nonce.")
    # Apple only shares the name on the very first authorization.
    given_name: str | None = Field(default=None, max_length=80)
    family_name: str | None = Field(default=None, max_length=80)


class GoogleSignIn(BaseModel):
    id_token: str = Field(min_length=20, description="`idToken` from Google Sign-In.")


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=200)


class TokenPair(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105 - OAuth token type, not a secret
    expires_in: int = Field(description="Access token lifetime in seconds.")
    refresh_token: str
    refresh_expires_in: int = Field(description="Refresh token lifetime in seconds.")


class SignInResponse(TokenPair):
    user: UserRead
    is_new_user: bool
