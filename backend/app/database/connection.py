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

if not DATABASE_URL:
    # Safe default SQLite for local development / testing when PostgreSQL is not configured
    sqlite_path = backend_dir / "thermoshield.db"
    DATABASE_URL = f"sqlite:///{sqlite_path.as_posix()}"
    logger.info(f"DATABASE_URL not set; using default SQLite database: {DATABASE_URL}")

# SQLAlchemy connect arguments
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# --------------------------------------------------
# SQLALCHEMY ENGINE & SESSION
# --------------------------------------------------
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args=connect_args,
)

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