"""
ThermoShield Database Migration Tool
Migrates data from local PostgreSQL or SQLite to a Cloud PostgreSQL database (Neon, Supabase, etc.)

Usage:
    python3 backend/migrate_to_cloud.py "postgresql://user:pass@ep-xyz.neon.tech/thermoshield?sslmode=require"
"""

import sys
import os
from pathlib import Path

# Ensure paths
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
for p in (str(project_root), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from app.database.models import Base, User, Location, Risk, Alert, Intervention

def main():
    if len(sys.argv) < 2:
        print("Error: Missing target cloud database URL.")
        print("Usage: python3 backend/migrate_to_cloud.py \"<CLOUD_DATABASE_URL>\"")
        sys.exit(1)

    target_url = sys.argv[1].strip()
    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql://", 1)

    # Source database
    load_dotenv(backend_dir / ".env")
    source_url = os.getenv("DATABASE_URL")
    if not source_url or "localhost" not in source_url:
        sqlite_file = backend_dir / "thermoshield.db"
        if sqlite_file.exists():
            source_url = f"sqlite:///{sqlite_file.resolve().as_posix()}"

    print(f"--> Source DB: {source_url.split('@')[-1] if '@' in source_url else source_url}")
    print(f"--> Target Cloud DB: {target_url.split('@')[-1]}")

    source_engine = create_engine(source_url)
    target_engine = create_engine(target_url)

    # 1. Create all tables on the target DB
    print("\n[1/3] Creating tables on cloud database...")
    Base.metadata.create_all(bind=target_engine)
    print("Tables created successfully.")

    SourceSession = sessionmaker(bind=source_engine)
    TargetSession = sessionmaker(bind=target_engine)

    src_db = SourceSession()
    tgt_db = TargetSession()

    try:
        print("\n[2/3] Migrating data...")

        # Users
        users = src_db.query(User).all()
        for u in users:
            if not tgt_db.query(User).filter(User.email == u.email).first():
                tgt_db.add(User(
                    id=u.id,
                    name=u.name,
                    phone_number=u.phone_number,
                    email=u.email,
                    role=u.role
                ))
        tgt_db.commit()
        print(f"  - Users migrated: {len(users)}")

        # Locations
        locations = src_db.query(Location).all()
        for loc in locations:
            if not tgt_db.query(Location).filter(Location.name == loc.name).first():
                tgt_db.add(Location(
                    id=loc.id,
                    name=loc.name,
                    latitude=loc.latitude,
                    longitude=loc.longitude
                ))
        tgt_db.commit()
        print(f"  - Locations migrated: {len(locations)}")

        # Risks
        risks = src_db.query(Risk).all()
        for r in risks:
            if not tgt_db.query(Risk).filter(Risk.id == r.id).first():
                tgt_db.add(Risk(
                    id=r.id,
                    location_id=r.location_id,
                    temperature_c=r.temperature_c,
                    thermal_stress=r.thermal_stress,
                    heat_index=r.heat_index,
                    wbgt=r.wbgt,
                    predicted_health_impact_proxy=r.predicted_health_impact_proxy,
                    risk_score=r.risk_score,
                    risk_level=r.risk_level,
                    created_at=r.created_at
                ))
        tgt_db.commit()
        print(f"  - Risks migrated: {len(risks)}")

        # Alerts
        alerts = src_db.query(Alert).all()
        for a in alerts:
            if not tgt_db.query(Alert).filter(Alert.id == a.id).first():
                tgt_db.add(Alert(
                    id=a.id,
                    user_id=a.user_id,
                    location_id=a.location_id,
                    risk_level=a.risk_level,
                    risk_score=a.risk_score,
                    message=a.message,
                    status=a.status,
                    phone_number=a.phone_number,
                    reference_id=a.reference_id,
                    created_at=a.created_at
                ))
        tgt_db.commit()
        print(f"  - Alerts migrated: {len(alerts)}")

        # Interventions
        interventions = src_db.query(Intervention).all()
        for i in interventions:
            if not tgt_db.query(Intervention).filter(Intervention.id == i.id).first():
                tgt_db.add(Intervention(
                    id=i.id,
                    location_id=i.location_id,
                    risk_id=i.risk_id,
                    cooling_center=i.cooling_center,
                    hydration_station=i.hydration_station,
                    outdoor_work_restriction=i.outdoor_work_restriction,
                    before_risk_score=i.before_risk_score,
                    after_risk_score=i.after_risk_score,
                    created_at=i.created_at
                ))
        tgt_db.commit()
        print(f"  - Interventions migrated: {len(interventions)}")

        # Sync PostgreSQL primary key sequences so future inserts never collide
        if target_engine.dialect.name == "postgresql":
            from sqlalchemy import text
            for table_name in ["users", "locations", "risks", "alerts", "interventions"]:
                try:
                    tgt_db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), COALESCE(max(id), 1)) FROM \"{table_name}\""))
                except Exception:
                    pass
            tgt_db.commit()

        print("\n[3/3] Migration completed successfully! All data is now live on the cloud database.")

    except Exception as e:
        tgt_db.rollback()
        print(f"\nMigration failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        src_db.close()
        tgt_db.close()

if __name__ == "__main__":
    main()
