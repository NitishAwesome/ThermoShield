import sys
import unittest
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from fastapi.testclient import TestClient
from app.main import app


class TestCopilotService(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_copilot_health(self):
        res = self.client.get("/copilot/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("engine", data)

    def test_copilot_chat_citizen_hydration(self):
        payload = {
            "message": "How much water should I drink in this 40 degree heat?",
            "location": "Panvel Heat Zone",
            "temperature_c": 40.2,
            "humidity": 65.0,
            "risk_level": "EXTREME",
            "risk_score": 92.0,
            "user_role": "citizen"
        }
        res = self.client.post("/copilot/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("reply", data)
        self.assertTrue(len(data["reply"]) > 50)
        self.assertIn("suggested_questions", data)
        self.assertTrue(len(data["suggested_questions"]) > 0)
        self.assertTrue(
            any(w in data["reply"].upper() for w in ["ORS", "ELECTROLYTE", "WATER", "HYDRAT", "FLUID", "LITER", "DRINK", "ML"])
            or any(w in data["reply"] for w in ["पानी", "तरल", "लीटर", "पीने", "गर्मी", "ओआरएस"])
        )

    def test_copilot_emergency_heat_stroke(self):
        payload = {
            "message": "Someone collapsed with high body temperature and confusion, what is the emergency first aid?",
            "temperature_c": 41.0,
            "user_role": "citizen"
        }
        res = self.client.post("/copilot/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(any(w in data["reply"].lower() for w in ["108", "112", "emergency", "ambulance", "medical"]))
        self.assertEqual(data["safety_tier"], "EMERGENCY")
        self.assertTrue(data.get("emergency_call"))

    def test_copilot_occupational_work_cycle(self):
        payload = {
            "message": "What is the recommended work rest cycle for outdoor construction labor?",
            "temperature_c": 37.0,
            "risk_level": "HIGH",
            "user_role": "official"
        }
        res = self.client.post("/copilot/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(any(w in data["reply"].upper() for w in ["WBGT", "WORK-REST", "REST", "BREAK", "CYCLE", "WRC"]))

    def test_copilot_hinglish_query(self):
        payload = {
            "message": "garmi me loo se bachne ke liye kya piye?",
            "temperature_c": 40.0,
            "user_role": "citizen"
        }
        res = self.client.post("/copilot/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("reply", data)
        self.assertTrue(len(data["reply"]) > 50)

    def test_copilot_empty_message_rejected(self):
        res = self.client.post("/copilot/chat", json={"message": "   "})
        self.assertEqual(res.status_code, 400)

    def test_copilot_city_detection_delhi(self):
        payload = {
            "message": "Delhi ka weather kaisa hai?",
            "location": "Mumbai, Maharashtra, India",
            "temperature_c": 36.5,
            "humidity": 58.0
        }
        res = self.client.post("/copilot/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("reply", data)
        self.assertTrue("Delhi" in data["reply"] or "दिल्ली" in data["reply"] or "Delhi" in data.get("resolved_location", ""))
        self.assertIn("Delhi", data.get("resolved_location", ""))
        self.assertIsNotNone(data.get("resolved_telemetry"))
        self.assertTrue(data["resolved_telemetry"]["is_query_location"])

    def test_copilot_city_detection_jaipur(self):
        payload = {
            "message": "What is the temperature and forecast in Jaipur?",
            "location": "Mumbai, Maharashtra, India",
            "temperature_c": 36.5,
            "humidity": 58.0
        }
        res = self.client.post("/copilot/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("reply", data)
        self.assertTrue("Jaipur" in data["reply"] or "जयपुर" in data["reply"] or "Jaipur" in data.get("resolved_location", ""))
        self.assertIn("Jaipur", data.get("resolved_location", ""))
        self.assertIsNotNone(data.get("resolved_telemetry"))
        self.assertTrue(data["resolved_telemetry"]["is_query_location"])


if __name__ == "__main__":
    unittest.main()
