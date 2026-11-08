from coral_api.db.repository import Repository
from coral_api.modules.users.models import User


class UserRepository(Repository[User]):
    model = User
