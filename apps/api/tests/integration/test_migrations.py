import pytest
from alembic import command
from alembic.script import ScriptDirectory

from tests.conftest import alembic_config

pytestmark = pytest.mark.db


def test_single_head(migrated_db: str) -> None:
    script = ScriptDirectory.from_config(alembic_config(migrated_db))
    assert len(script.get_heads()) == 1


def test_models_match_migrations(migrated_db: str) -> None:
    """Fails if someone changed a model without writing a migration."""
    command.check(alembic_config(migrated_db))
