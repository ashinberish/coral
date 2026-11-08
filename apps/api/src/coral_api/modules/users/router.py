from fastapi import APIRouter, status

from coral_api.api.deps import SessionDep
from coral_api.core.errors import Problem
from coral_api.modules.auth.deps import CurrentUser
from coral_api.modules.users.schemas import UserRead, UserUpdate

router = APIRouter(
    prefix="/me",
    tags=["me"],
    responses={401: {"model": Problem, "description": "Not signed in"}},
)


@router.get("", summary="The signed-in user")
async def get_me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)


@router.patch("", summary="Update profile and goal")
async def update_me(body: UserUpdate, user: CurrentUser, session: SessionDep) -> UserRead:
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(user, field, value)
    await session.flush()
    await session.refresh(user)
    return UserRead.model_validate(user)


@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete the account and all its data (App Store requirement)",
)
async def delete_me(user: CurrentUser, session: SessionDep) -> None:
    # Cascades to identities, refresh tokens and drink logs.
    await session.delete(user)
