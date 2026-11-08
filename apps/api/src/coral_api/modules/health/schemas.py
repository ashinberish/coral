from typing import Literal

from pydantic import BaseModel


class Liveness(BaseModel):
    status: Literal["ok"] = "ok"


class Readiness(BaseModel):
    status: Literal["ok", "unavailable"]
    checks: dict[str, Literal["ok", "fail"]]


class Meta(BaseModel):
    name: str
    version: str
    environment: str
