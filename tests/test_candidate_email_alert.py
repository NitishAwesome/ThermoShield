import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from fastapi.testclient import TestClient
from app.main import app


class TestCandidateEmailAlert(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("app.main.send_notification_email")
    def test_send_alert_email_direct_api(self, mock_send_email):
        mock_send_email.return_value = {
            "status": "success",
            "message": "Email alert sent successfully",
            "recipient": "candidate.test@example.com",
            "sender": "ronit.jagdale.39@gmail.com"
        }

        payload = {
            "email": "candidate.test@example.com",
            "location_name": "Bengaluru Tech Hub",
            "lat": 12.9716,
            "lon": 77.5946,
            "risk_level": "HIGH",
            "risk_score": 80.0,
            "temperature_c": 36.5,
            "interventions": ["Drink hydration salts", "Take cooling breaks"]
        }

        response = self.client.post("/alerts/send-email", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["recipient"], "candidate.test@example.com")
        self.assertIn("ronit.jagdale.39@gmail.com", data["sender"])
        mock_send_email.assert_called_once()
        call_kwargs = mock_send_email.call_args[1]
        self.assertEqual(call_kwargs["to_email"], "candidate.test@example.com")
        self.assertIn("HIGH", call_kwargs["subject"])

    @patch("app.main.send_notification_email")
    def test_risk_endpoint_with_candidate_email(self, mock_send_email):
        mock_send_email.return_value = {
            "status": "success",
            "message": "Email queued",
            "recipient": "evaluator.candidate@gmail.com",
            "sender": "ronit.jagdale.39@gmail.com"
        }

        response = self.client.get("/risk", params={
            "lat": 19.0760,
            "lon": 72.8777,
            "email": "evaluator.candidate@gmail.com"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("risk", data)

    def test_subscribe_citizen_alerts(self):
        payload = {
            "email": "auto.citizen@example.com",
            "name": "Auto Citizen",
            "location_name": "Panvel Heat Zone",
            "lat": 18.9894,
            "lon": 73.1175
        }
        response = self.client.post("/alerts/subscribe", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["email"], "auto.citizen@example.com")
        self.assertTrue(data["auto_alert_active"])

if __name__ == "__main__":
    unittest.main()

