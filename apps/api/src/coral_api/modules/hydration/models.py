import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from coral_api.db.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from coral_api.modules.users.models import User


class DrinkType(enum.StrEnum):
    WATER = "water"
    TEA = "tea"
    COFFEE = "coffee"
    OTHER = "other"


class DrinkLog(UUIDPrimaryKeyMixin, Base):
    """One drink. ``day_key`` is the user's *local* calendar day, fixed at log
    time, so streaks survive travel and DST changes."""

    __tablename__ = "drink_logs"
    __table_args__ = (
        CheckConstraint("amount_ml BETWEEN 1 AND 5000", name="amount_range"),
        Index("ix_drink_logs_user_day", "user_id", "day_key"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    amount_ml: Mapped[int]
    drink_type: Mapped[DrinkType] = mapped_column(
        Enum(
            DrinkType,
            name="drink_type",
            native_enum=False,
            create_constraint=True,
            length=16,
            values_callable=lambda e: [m.value for m in e],
        ),
        default=DrinkType.WATER,
    )
    logged_at: Mapped[datetime]
    day_key: Mapped[date]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), sort_order=100)

    user: Mapped["User"] = relationship(back_populates="drink_logs")
