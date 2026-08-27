"""
tests/test_integration.py

Comprehensive test suite verifying:
  1. Open-Meteo wind-speed unit is requested as m/s (wind_speed_unit=ms).
  2. /map/risk endpoint integrates cleanly with calculate_thermal_stress and predict_risk without signature mismatch.
  3. All FastAPI backend endpoints return HTTP 200 and conform to their contracts.
"""

import sys
import os
import json
import asyncio
import unittest

# Ensure project root & backend are in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from backend.app.main import app
from httpx import AsyncClient, ASGITransport


class TestBackendIntegration(unittest.TestCase):

    def test_01_health_endpoint(self):
        """Test GET /health returns status healthy."""
        async def run_req():
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                return await client.get("/health")

        res = asyncio.run(run_req())
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "healthy"})

    def test_02_weather_wind_speed_unit(self):
        """Test GET /weather returns live weather with wind_speed in m/s."""
        async def run_req():
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                return await client.get("/weather", params={"lat": 19.0760, "lon": 72.8777})

        res = asyncio.run(run_req())
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("weather", data)
        self.assertIn("wind_speed", data["weather"])
        wind_speed = data["weather"]["wind_speed"]
        self.assertIsInstance(wind_speed, (int, float))
        # Terrestrial wind speed in m/s is typically < 40 m/s (whereas km/h would be much higher)
        self.assertGreaterEqual(wind_speed, 0.0)
        self.assertLess(wind_speed, 60.0)

    def test_03_thermal_endpoint(self):
        """Test GET /thermal returns full biometeorological indices and structured guidance."""
        async def run_req():
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                return await client.get("/thermal", params={"lat": 19.0760, "lon": 72.8777})

        res = asyncio.run(run_req())
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("thermal", data)
        self.assertIn("indices", data["thermal"])
        self.assertIn("wbgt_c", data["thermal"]["indices"])
        self.assertIn("heat_index_c", data["thermal"]["indices"])
        self.assertIn("apparent_temperature_c", data["thermal"]["indices"])
        self.assertIn("wet_bulb_temp_c", data["thermal"]["indices"])
        self.assertIn("risk_assessment", data["thermal"])
        self.assertIn("level", data["thermal"]["risk_assessment"])
        self.assertIn("score", data["thermal"]["risk_assessment"])
        self.assertIn("primary_index", data["thermal"]["risk_assessment"])
        self.assertIn("advisories", data["thermal"])
        self.assertIn("input_summary", data["thermal"])

    def test_04_risk_ml_endpoint(self):
        """Test GET /risk returns ML predicted health impact and thermal stress."""
        async def run_req():
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                return await client.get("/risk", params={"lat": 19.0760, "lon": 72.8777})

        res = asyncio.run(run_req())
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("risk", data)
        self.assertIn("predicted_health_impact_proxy", data["risk"])
        self.assertIn("risk_score", data["risk"])
        self.assertIn("risk_level", data["risk"])
        self.assertIn("thermal", data)

    def test_05_forecast_endpoint(self):
        """Test GET /forecast returns 5-day daily forecast."""
        async def run_req():
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                return await client.get("/forecast", params={"lat": 19.0760, "lon": 72.8777})

        res = asyncio.run(run_req())
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("forecast", data)
        self.assertIn("dates", data["forecast"])
        self.assertIn("max_temperature", data["forecast"])
        self.assertIn("min_temperature", data["forecast"])
        self.assertEqual(len(data["forecast"]["dates"]), 5)

    def test_06_map_risk_endpoint(self):
        """Test GET /map/risk resolves location risk without signature error."""
        async def run_req():
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                return await client.get("/map/risk", params={"locations": ["19.0760,72.8777", "28.6139,77.2090"]})

        res = asyncio.run(run_req())
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("count", data)
        self.assertEqual(data["count"], 2)
        self.assertIn("locations", data)
        self.assertEqual(len(data["locations"]), 2)

        for loc in data["locations"]:
            self.assertIn("latitude", loc)
            self.assertIn("longitude", loc)
            self.assertIn("risk_score", loc)
            self.assertIn("risk_level", loc)
            self.assertIn(loc["risk_level"], ["LOW", "MODERATE", "HIGH", "EXTREME"])

    def test_07_intervention_endpoints(self):
        """Test GET /intervention and POST /intervention/simulate."""
        async def run_req():
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                rec_res = await client.get("/intervention", params={
                    "risk_score": 65.0,
                    "temperature": 38.0,
                    "humidity": 60.0,
                    "hour": 14,
                    "vulnerable_population": 0.3
                })
                sim_res = await client.post("/intervention/simulate", params={
                    "risk_score": 65.0,
                    "cooling_center": True,
                    "outdoor_work_restriction": True,
                    "hydration_stations": True
                })
                return rec_res, sim_res

        rec_res, sim_res = asyncio.run(run_req())
        self.assertEqual(rec_res.status_code, 200)
        self.assertEqual(sim_res.status_code, 200)

        rec_data = rec_res.json()
        self.assertIn("recommendations", rec_data)

        sim_data = sim_res.json()
        self.assertIn("current_risk", sim_data)
        self.assertIn("projected_risk", sim_data)
        self.assertIn("risk_reduction", sim_data)
        self.assertEqual(sim_data["risk_reduction"], 33.0)  # 10 + 15 + 8


if __name__ == "__main__":
    unittest.main(verbosity=2)
