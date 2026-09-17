"""
ThermoShield Test Suite Global Fixture Configuration.
Enforces test environment isolation:
- ENVIRONMENT=test
- EMAIL_DELIVERY_MODE=test
- DISABLE_BACKGROUND_MONITOR=true
Guarantees real SMTP network calls are never dispatched and background daemons
are not started during test execution.
"""

import os
import sys
import tempfile
from pathlib import Path
import pytest

# Set explicit test environment variables before anything else imports or runs
os.environ["ENVIRONMENT"] = "test"
os.environ["EMAIL_DELIVERY_MODE"] = "test"
os.environ["DISABLE_BACKGROUND_MONITOR"] = "true"
os.environ["REGIONAL_DELIVERY_MODE"] = "demo"
# Never read/write a developer's local or cloud database during tests.
_test_database_dir = tempfile.TemporaryDirectory(prefix="thermoshield-tests-", ignore_cleanup_errors=True)
os.environ["DATABASE_URL"] = "sqlite:///" + (Path(_test_database_dir.name) / "tests.db").as_posix()
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = ""
os.environ["ENABLE_DEMO_ACCOUNTS"] = "true"


@pytest.fixture(scope="session", autouse=True)
def isolated_database_schema():
    # Legacy tests construct TestClient without entering its lifespan context.
    from app.database.connection import init_db_schema
    from app.main import _seed_demo_accounts_if_needed
    from alembic import command
    from alembic.config import Config
    config = Config(str(Path(__file__).resolve().parents[1] / "backend" / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "backend" / "alembic"))
    command.upgrade(config, "head")
    init_db_schema()
    _seed_demo_accounts_if_needed()
    yield
    for name in ("app.database.connection", "backend.app.database.connection"):
        module = sys.modules.get(name)
        if module:
            module.engine.dispose()
