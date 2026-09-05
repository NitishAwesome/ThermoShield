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
sqlite_path = backend_dir / "thermoshield.db"
sqlite_url = f"sqlite:///{sqlite_path.as_posix()}"

if not DATABASE_URL:
    DATABASE_URL = sqlite_url
    logger.info(f"DATABASE_URL not set; using default SQLite database: {DATABASE_URL}")
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
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    eng = create_engine(url, pool_pre_ping=True, connect_args=connect_args)
    # Test connection if remote database
    if not url.startswith("sqlite"):
        try:
            with eng.connect():
                logger.info(f"PostgreSQL connection verified successfully: {url.split('@')[-1]}")
        except Exception as err:
            logger.warning(
                f"PostgreSQL connection failed ({err}). "
                f"Falling back safely to local SQLite at {sqlite_url}"
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
# CREATE DATABASE TABLES SAFELY
# --------------------------------------------------
try:
    try:
        from backend.app.database import models  # noqa: F401
    except ImportError:
        from app.database import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
except Exception as e:
    logger.warning(f"Database initialization warning (tables not created automatically): {e}")