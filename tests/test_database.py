import os
import sys
import unittest
import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import inspect, text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.app.database.connection import engine, SessionLocal
from backend.app.database.models import User, Location, Risk, Alert, Intervention


class TestDatabaseFoundation(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()
        self.inspector = inspect(engine)

    def tearDown(self):
        self.db.close()

    # 1. Database Connection
    def test_01_database_connection(self):
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            self.assertEqual(result, 1)

    # 2. Required Tables
    def test_02_required_tables_exist(self):
        tables = self.inspector.get_table_names()
        expected = ["users", "locations", "risks", "alerts", "interventions", "alembic_version"]
        for tbl in expected:
            self.assertIn(tbl, tables, f"Expected table '{tbl}' not found in database.")

    # 3. Foreign Keys
    def test_03_foreign_keys_configured(self):
        # Risk -> Location
        risk_fks = self.inspector.get_foreign_keys("risks")
        risk_fk_tables = [fk["referred_table"] for fk in risk_fks]
        self.assertIn("locations", risk_fk_tables)

        # Alert -> User, Location
        alert_fks = self.inspector.get_foreign_keys("alerts")
        alert_fk_tables = [fk["referred_table"] for fk in alert_fks]
        self.assertIn("users", alert_fk_tables)
        self.assertIn("locations", alert_fk_tables)

        # Intervention -> Location, Risk
        interv_fks = self.inspector.get_foreign_keys("interventions")
        interv_fk_tables = [fk["referred_table"] for fk in interv_fks]
        self.assertIn("locations", interv_fk_tables)
        self.assertIn("risks", interv_fk_tables)

    # 4. password_hash Presence
    def test_04_user_password_hash_column_present(self):
        user_cols = [c["name"] for c in self.inspector.get_columns("users")]
        self.assertIn("password_hash", user_cols)
        self.assertIn("created_at", user_cols)
        self.assertIn("updated_at", user_cols)

    # 5. Migration Compatibility & Current Head
    def test_05_migration_compatibility(self):
        with engine.connect() as conn:
            rev = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).scalar()
        self.assertIsNotNone(rev)
        self.assertEqual(rev, "7c129e4a7d15")

    # 6. Risk Persistence
    def test_06_risk_persistence(self):
        unique_name = f"Test Location {uuid.uuid4().hex[:6]}"
        loc = Location(name=unique_name, latitude=18.5204, longitude=73.8567)
        self.db.add(loc)
        self.db.commit()
        self.db.refresh(loc)

        risk = Risk(
            location_id=loc.id,
            temperature_c=36.5,
            thermal_stress=68.2,
            heat_index=39.4,
            wbgt=30.1,
            predicted_health_impact_proxy=14.2,
            risk_score=72.5,
            risk_level="HIGH",
            created_at=datetime.utcnow()
        )
        self.db.add(risk)
        self.db.commit()
        self.db.refresh(risk)

        fetched = self.db.query(Risk).filter(Risk.id == risk.id).first()
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.location_id, loc.id)
        self.assertEqual(fetched.risk_level, "HIGH")
        self.assertAlmostEqual(fetched.risk_score, 72.5)

    # 7. Alert Persistence
    def test_07_alert_persistence(self):
        u_suffix = uuid.uuid4().hex[:6]
        user = User(
            name=f"Alert Test {u_suffix}",
            email=f"alert_{u_suffix}@example.com",
            phone_number=f"+9199{u_suffix}",
            role="user",
            password_hash="UNSET_PASSWORD_RESET_REQUIRED"
        )
        loc = Location(name=f"Alert Loc {u_suffix}", latitude=22.5726, longitude=88.3639)
        self.db.add(user)
        self.db.add(loc)
        self.db.commit()

        alert = Alert(
            user_id=user.id,
            location_id=loc.id,
            risk_level="EXTREME",
            risk_score=88.0,
            message="Extreme heat warning",
            status="PENDING",
            phone_number=user.phone_number,
            reference_id=f"REF-{u_suffix}"
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)

        fetched = self.db.query(Alert).filter(Alert.id == alert.id).first()
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.status, "PENDING")
        self.assertEqual(fetched.user_id, user.id)
        self.assertEqual(fetched.location_id, loc.id)

    # 8. Intervention Persistence
    def test_08_intervention_persistence(self):
        u_suffix = uuid.uuid4().hex[:6]
        loc = Location(name=f"Interv Loc {u_suffix}", latitude=26.9124, longitude=75.7873)
        self.db.add(loc)
        self.db.commit()

        risk = Risk(
            location_id=loc.id,
            temperature_c=41.0,
            thermal_stress=85.0,
            risk_score=80.0,
            risk_level="EXTREME"
        )
        self.db.add(risk)
        self.db.commit()

        interv = Intervention(
            location_id=loc.id,
            risk_id=risk.id,
            cooling_center=True,
            hydration_station=True,
            outdoor_work_restriction=True,
            before_risk_score=80.0,
            after_risk_score=55.0
        )
        self.db.add(interv)
        self.db.commit()
        self.db.refresh(interv)

        fetched = self.db.query(Intervention).filter(Intervention.id == interv.id).first()
        self.assertIsNotNone(fetched)
        self.assertTrue(fetched.cooling_center)
        self.assertTrue(fetched.hydration_station)
        self.assertEqual(fetched.before_risk_score, 80.0)
        self.assertEqual(fetched.after_risk_score, 55.0)

    # 9. Database Health Behavior
    def test_09_database_health_endpoint(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["status"], "healthy")
        self.assertIn(body["database"], ["sqlite", "postgresql"])

    # 10. Performance Indexes Verification
    def test_10_performance_indexes_exist(self):
        user_indexes = [i["name"] for i in self.inspector.get_indexes("users")]
        self.assertIn("ix_users_phone_number", user_indexes)

        location_indexes = [i["name"] for i in self.inspector.get_indexes("locations")]
        self.assertIn("ix_locations_name", location_indexes)

        risk_indexes = [i["name"] for i in self.inspector.get_indexes("risks")]
        self.assertIn("ix_risks_created_at", risk_indexes)
        self.assertIn("ix_risks_risk_level", risk_indexes)

        alert_indexes = [i["name"] for i in self.inspector.get_indexes("alerts")]
        self.assertIn("ix_alerts_created_at", alert_indexes)
        self.assertIn("ix_alerts_status", alert_indexes)

        interv_indexes = [i["name"] for i in self.inspector.get_indexes("interventions")]
        self.assertIn("ix_interventions_created_at", interv_indexes)


if __name__ == "__main__":
    unittest.main()
