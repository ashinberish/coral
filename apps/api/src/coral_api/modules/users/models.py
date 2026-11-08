from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from coral_api.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from coral_api.modules.hydration.models import DrinkLog


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("daily_goal_ml BETWEEN 500 AND 10000", name="daily_goal_range"),
    )

    display_name: Mapped[str | None] = mapped_column(String(80))
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    daily_goal_ml: Mapped[int] = mapped_column(default=2500)

    drink_logs: Mapped[list["DrinkLog"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
