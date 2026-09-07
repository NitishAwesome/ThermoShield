"""
tests/test_api_integration.py

Integration verification for FastAPI /thermal endpoint and extreme heat scenario.
"""

import sys
import os
import json
import asyncio
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.app.services.thermal import calculate_thermal_stress
from httpx import AsyncClient, ASGITransport


class TestFastAPIIntegration(unittest.TestCase):

    def test_thermal_endpoint_mumbai(self):
        """Test GET /thermal with Mumbai coordinates (lat=19.0760, lon=72.8777)."""
        async def run_req():
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/thermal", params={"lat": 19.0760, "lon": 72.8777})
                return response

        res = asyncio.run(run_req())
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("location", data)
        self.assertIn("weather", data)
        self.assertIn("thermal", data)
        self.assertIn("indices", data["thermal"])
        self.assertIn("wbgt_c", data["thermal"]["indices"])
        self.assertIn("hydration", data["thermal"])
        self.assertIn("basis", data["thermal"]["hydration"])
        self.assertIn("activity_guidance", data["thermal"])
        self.assertIn("vulnerable_population", data["thermal"])
        self.assertIn("risk_basis", data["thermal"]["risk_assessment"])
        self.assertIn("environmental_factors", data["thermal"]["risk_assessment"])

    def test_extreme_heatwave_scenario(self):
        """Test calculation with Extreme Heat Scenario (45°C, 58% RH, 0.9 m/s wind, 950 W/m² solar)."""
        result = calculate_thermal_stress(
            temperature=45.0,
            humidity=58.0,
            wind_speed=0.9,
            solar_radiation=950.0,
        )

        self.assertEqual(result["risk_assessment"]["level"], "EXTREME")
        self.assertEqual(result["indices"]["heat_index_status"], "OUTSIDE_VALIDATED_RANGE")
        self.assertIsNone(result["indices"]["heat_index_c"])
        self.assertEqual(result["hydration"]["priority"], "CRITICAL")
        self.assertEqual(result["hydration"]["approximate_amount_ml"], 240)
        self.assertTrue(result["hydration"]["electrolytes_recommended"])
        self.assertIn("NIOSH/OSHA", result["hydration"]["basis"])
        self.assertTrue(result["vulnerable_population"]["priority"])
        self.assertTrue(len(result["risk_assessment"]["risk_basis"]) >= 1)
        self.assertTrue(len(result["risk_assessment"]["environmental_factors"]) >= 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
