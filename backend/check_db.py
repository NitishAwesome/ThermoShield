import os
import sys
from pathlib import Path
from sqlalchemy import inspect, text

# Ensure backend and project root are in sys.path
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
for p in (str(project_root), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.database.connection import engine, DATABASE_URL


def get_sanitized_backend_info():
    url = str(engine.url)
    drivername = engine.url.drivername
    if "sqlite" in drivername:
        backend_type = "SQLite"
        database_target = Path(engine.url.database or "thermoshield.db").name
    elif "postgres" in drivername:
        backend_type = "PostgreSQL"
        database_target = f"{engine.url.host}:{engine.url.port or 5432}/{engine.url.database}"
    else:
        backend_type = drivername
        database_target = "configured_backend"
    return backend_type, database_target


def inspect_database():
    backend_type, database_target = get_sanitized_backend_info()
    print("=" * 50)
    print("THERMOSHIELD DATABASE DIAGNOSTIC UTILITY")
    print("=" * 50)
    print(f"Database backend : {backend_type} ({database_target})")

    # 1. Connection check
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Connection       : OK")
    except Exception as err:
        print(f"Connection       : FAILED ({err.__class__.__name__}: {err})")
        return False

    # 2. Alembic revision check
    alembic_rev = "Not found / Not initialized"
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).fetchone()
            if result:
                alembic_rev = result[0]
    except Exception:
        pass
    print(f"Alembic revision : {alembic_rev}")

    # 3. Tables and row counts
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    print("\nTables & Record Counts:")
    tracked_tables = ["users", "locations", "risks", "alerts", "interventions"]
    for t in tracked_tables:
        if t in table_names:
            try:
                with engine.connect() as conn:
                    count = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                print(f"  {t:<15}: {count}")
            except Exception as e:
                print(f"  {t:<15}: Error counting rows ({e})")
        else:
            print(f"  {t:<15}: [TABLE MISSING]")

    other_tables = [t for t in table_names if t not in tracked_tables and t != "alembic_version"]
    if other_tables:
        print("\nAdditional Tables:")
        for t in other_tables:
            with engine.connect() as conn:
                count = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            print(f"  {t:<15}: {count}")

    print("=" * 50)
    return True


if __name__ == "__main__":
    inspect_database()