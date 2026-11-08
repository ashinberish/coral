import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from coral_api.db.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from coral_api.modules.users.models import User


class AuthProvider(enum.StrEnum):
    APPLE = "apple"
    GOOGLE = "google"


class AuthIdentity(UUIDPrimaryKeyMixin, Base):
    """A provider account (Apple `sub` / Google `sub`) linked to one Coral user."""

    __tablename__ = "auth_identities"
    __table_args__ = (UniqueConstraint("provider", "subject"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[AuthProvider] = mapped_column(
        Enum(
            AuthProvider,
            name="auth_provider",
            native_enum=False,
            create_constraint=True,
            length=16,
            values_callable=lambda e: [m.value for m in e],
        )
    )
    subject: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(320))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), sort_order=100)
    last_used_at: Mapped[datetime] = mapped_column(server_default=func.now(), sort_order=100)

    user: Mapped["User"] = relationship(back_populates="identities")


class RefreshToken(UUIDPrimaryKeyMixin, Base):
    """Opaque refresh token (only its SHA-256 is stored). Tokens rotate on every use;
    all tokens descending from one sign-in share a `family_id`, so reuse of a rotated
    token revokes the whole family (stolen-token detection)."""

    __tablename__ = "refresh_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    family_id: Mapped[uuid.UUID] = mapped_column(index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime]
    revoked_at: Mapped[datetime | None]
    replaced_by_id: Mapped[uuid.UUID | None]
    user_agent: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), sort_order=100)
