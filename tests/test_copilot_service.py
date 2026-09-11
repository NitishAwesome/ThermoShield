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
        self.assertEqual(data["safety_tier"], "EXTREME")
        self.assertIn("ORS", data["reply"].upper())

    def test_copilot_emergency_heat_stroke(self):
        payload = {
            "message": "Someone collapsed with high body temperature and confusion, what is the emergency first aid?",
            "temperature_c": 41.0,
            "user_role": "citizen"
        }
        res = self.client.post("/copilot/chat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("108", data["reply"])
        self.assertEqual(data["safety_tier"], "EMERGENCY")

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
        self.assertIn("WBGT", data["reply"].upper())

    def test_copilot_empty_message_rejected(self):
        res = self.client.post("/copilot/chat", json={"message": "   "})
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
