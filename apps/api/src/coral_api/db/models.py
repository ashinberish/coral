"""Import every ORM model here so ``Base.metadata`` is complete for Alembic."""

from coral_api.db.base import Base
from coral_api.modules.hydration.models import DrinkLog
from coral_api.modules.users.models import User

__all__ = ["Base", "DrinkLog", "User"]
