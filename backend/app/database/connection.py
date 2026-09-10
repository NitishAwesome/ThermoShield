import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

# Ensure paths
backend_dir = Path(__file__).resolve().parent.parent.parent
project_root = backend_dir.parent
for p in (str(project_root), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

load_dotenv()

# --------------------------------------------------
# DATABASE URL CONFIGURATION
# --------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or DATABASE_URL.strip() == "":
    sqlite_path = backend_dir / "thermoshield.db"
    DATABASE_URL = f"sqlite:///{sqlite_path.as_posix()}"
    logger.info(f"DATABASE_URL not set in environment; defaulting to local SQLite database: {DATABASE_URL}")
elif DATABASE_URL.startswith("postgres://"):
    # SQLAlchemy 2.0 requires postgresql:// instead of legacy postgres://
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
elif DATABASE_URL.startswith("sqlite:///") and not DATABASE_URL.startswith("sqlite:////"):
    # Normalize relative sqlite path so it resolves reliably regardless of launch cwd
    rel_path = DATABASE_URL[len("sqlite:///"):]
    if (backend_dir / rel_path).exists():
        DATABASE_URL = f"sqlite:///{(backend_dir / rel_path).resolve().as_posix()}"
    elif (project_root / rel_path).exists():
        DATABASE_URL = f"sqlite:///{(project_root / rel_path).resolve().as_posix()}"
    else:
        DATABASE_URL = f"sqlite:///{(backend_dir / rel_path).resolve().as_posix()}"


def _create_database_engine(url: str):
    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
    is_sqlite = url.startswith("sqlite")

    if is_sqlite:
        connect_args = {"check_same_thread": False}
        return create_engine(url, pool_pre_ping=True, connect_args=connect_args)

    # PostgreSQL / Remote relational database connection
    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "20")),
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "1800")),
    }
    eng = create_engine(url, **engine_kwargs)

    try:
        with eng.connect():
            sanitized_target = url.split("@")[-1] if "@" in url else "postgres"
            logger.info(f"PostgreSQL connection verified successfully ({sanitized_target})")
    except Exception as err:
        if is_prod or os.getenv("ALLOW_SQLITE_FALLBACK", "false" if is_prod else "true").lower() not in ("true", "1", "yes"):
            raise RuntimeError(
                f"CRITICAL: Failed to connect to PostgreSQL database in production ({err}). "
                "Silent SQLite fallback is disabled in production to prevent ephemeral data loss on Render."
            )
        sqlite_url = os.getenv("SQLITE_FALLBACK_URL", "sqlite:///./thermoshield.db")
        logger.warning(
            f"PostgreSQL connection failed ({err}). "
            f"Development mode: Falling back to local SQLite at {sqlite_url}"
        )
        eng = create_engine(sqlite_url, pool_pre_ping=True, connect_args={"check_same_thread": False})

    return eng


# --------------------------------------------------
# SQLALCHEMY ENGINE & SESSION
# --------------------------------------------------
engine = _create_database_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# --------------------------------------------------
# BASE MODEL & DEPENDENCY
# --------------------------------------------------
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------
# DATABASE INITIALIZATION
# --------------------------------------------------
def init_db_schema():
    """
    Ensure all required database tables exist across all environments.
    SQLAlchemy's create_all creates tables with 'CREATE TABLE IF NOT EXISTS'
    so it is completely idempotent, non-destructive, and guarantees essential tables
    exist immediately on server boot.
    """
    try:
        try:
            from app.database import models  # noqa: F401
        except ImportError:
            from backend.app.database import models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema tables verified via create_all().")
    except Exception as e:
        logger.warning(f"Database initialization warning: {e}")

init_db = init_db_schema