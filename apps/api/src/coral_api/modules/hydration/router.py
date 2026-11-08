import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from coral_api.api.deps import SessionDep
from coral_api.core.errors import Problem
from coral_api.modules.auth.deps import CurrentUser
from coral_api.modules.hydration.repository import DrinkLogRepository
from coral_api.modules.hydration.schemas import (
    DaySummary,
    DrinkLogCreate,
    DrinkLogRead,
    validate_range,
)
from coral_api.modules.hydration.service import HydrationService

router = APIRouter(
    tags=["drinks"],
    responses={401: {"model": Problem, "description": "Not signed in"}},
)


def get_service(session: SessionDep) -> HydrationService:
    return HydrationService(session)


ServiceDep = Annotated[HydrationService, Depends(get_service)]
FromDay = Annotated[date, Query(description="First user-local day (inclusive).")]
ToDay = Annotated[date, Query(description="Last user-local day (inclusive).")]


@router.post(
    "/drinks",
    status_code=status.HTTP_201_CREATED,
    summary="Log a drink (idempotent when `id` is supplied)",
    responses={409: {"model": Problem}},
)
async def log_drink(body: DrinkLogCreate, user: CurrentUser, service: ServiceDep) -> DrinkLogRead:
    return DrinkLogRead.model_validate(await service.log_drink(user, body))


@router.get("/drinks", summary="Drink logs for a range of days")
async def list_drinks(
    user: CurrentUser, session: SessionDep, from_day: FromDay, to_day: ToDay
) -> list[DrinkLogRead]:
    validate_range(from_day, to_day)
    logs = await DrinkLogRepository(session).in_range(user.id, from_day, to_day)
    return [DrinkLogRead.model_validate(log) for log in logs]


@router.delete(
    "/drinks/{log_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a drink log (idempotent)",
)
async def delete_drink(log_id: uuid.UUID, user: CurrentUser, service: ServiceDep) -> None:
    await service.delete_drink(user, log_id)


@router.get("/days", summary="Daily totals for a range of days (days without drinks omitted)")
async def list_days(
    user: CurrentUser, session: SessionDep, from_day: FromDay, to_day: ToDay
) -> list[DaySummary]:
    validate_range(from_day, to_day)
    rows = await DrinkLogRepository(session).daily_totals(user.id, from_day, to_day)
    return [DaySummary(day_key=d, total_ml=t, drink_count=c) for d, t, c in rows]
