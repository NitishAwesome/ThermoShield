import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.personal_risk import calculate_personal_risk


class TestPersonalRisk(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_calculate_personal_risk_baseline_healthy(self):
        # 25-year-old, non-smoking, sedentary, no conditions, well hydrated
        result = calculate_personal_risk(
            age=25,
            smoking=False,
            health_conditions=[],
            physical_activity="sedentary",
            is_pregnant=False,
            hydration_status="well_hydrated",
            outdoor_exposure_hours=0.5,
            clothing_type="light",
            wbgt_c=22.0
        )
        self.assertIn("risk_score", result)
        self.assertIn("risk_level", result)
        self.assertIn("recommended_water_intake_ml_hr", result)
        self.assertIn("work_rest_cycle", result)
        self.assertIn("risk_factors_breakdown", result)
        self.assertIn("safety_recommendations", result)
        # Should be LOW risk
        self.assertEqual(result["risk_level"], "LOW")
        self.assertLessEqual(result["risk_score"], 30.0)

    def test_calculate_personal_risk_elderly_chronic(self):
        # 76-year-old with heart disease and kidney disease, high outdoor exposure
        result = calculate_personal_risk(
            age=76,
            smoking=True,
            health_conditions=["heart_disease", "kidney_disease"],
            physical_activity="moderate",
            is_pregnant=False,
            hydration_status="dehydrated",
            outdoor_exposure_hours=4.0,
            clothing_type="standard",
            wbgt_c=31.5
        )
        self.assertIn(result["risk_level"], ["EXTREME", "CRITICAL"])
        self.assertGreaterEqual(result["risk_score"], 70.0)
        self.assertGreaterEqual(result["recommended_water_intake_ml_hr"], 900)

    def test_calculate_personal_risk_pregnancy_and_heat(self):
        result = calculate_personal_risk(
            age=30,
            smoking=False,
            health_conditions=["asthma"],
            physical_activity="light",
            is_pregnant=True,
            hydration_status="moderate",
            outdoor_exposure_hours=2.0,
            wbgt_c=29.0
        )
        self.assertGreater(result["risk_score"], 40.0)
        # Check that pregnancy factor is in breakdown
        factors = [f["factor"] for f in result["risk_factors_breakdown"]]
        self.assertIn("Pregnancy", factors)

    def test_api_personal_risk_endpoint(self):
        payload = {
            "age": 45,
            "smoking": False,
            "health_conditions": ["hypertension", "diabetes"],
            "physical_activity": "heavy",
            "is_pregnant": False,
            "hydration_status": "moderate",
            "outdoor_exposure_hours": 3.0,
            "clothing_type": "standard",
            "temperature_c": 37.0,
            "wbgt_c": 28.5
        }
        res = self.client.post("/personal-risk/calculate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("risk_score", data)
        self.assertIn("risk_level", data)
        self.assertIn("recommended_water_intake_ml_hr", data)
        self.assertIn("work_rest_cycle", data)
        self.assertIsInstance(data["risk_factors_breakdown"], list)
        self.assertIsInstance(data["safety_recommendations"], list)

    def test_api_areas_risk_overview_endpoint(self):
        res = self.client.get("/areas/risk-overview")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("count", data)
        self.assertIn("areas", data)
        self.assertGreaterEqual(data["count"], 10)
        first_area = data["areas"][0]
        self.assertIn("name", first_area)
        self.assertIn("state", first_area)
        self.assertIn("zone", first_area)
        self.assertIn("temperature_c", first_area)
        self.assertIn("wbgt_c", first_area)
        self.assertIn("risk_score", first_area)
        self.assertIn("risk_level", first_area)
        self.assertIn("vulnerability_tag", first_area)


if __name__ == "__main__":
    unittest.main()
