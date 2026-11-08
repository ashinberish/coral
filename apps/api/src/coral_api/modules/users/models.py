from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, String, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from coral_api.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from coral_api.modules.auth.models import AuthIdentity
    from coral_api.modules.hydration.models import DrinkLog


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("daily_goal_ml BETWEEN 500 AND 10000", name="daily_goal_range"),
    )

    display_name: Mapped[str | None] = mapped_column(String(80))
    email: Mapped[str | None] = mapped_column(String(320))
    email_verified: Mapped[bool] = mapped_column(default=False, server_default=false())
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    daily_goal_ml: Mapped[int] = mapped_column(default=2500)

    identities: Mapped[list["AuthIdentity"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    drink_logs: Mapped[list["DrinkLog"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
