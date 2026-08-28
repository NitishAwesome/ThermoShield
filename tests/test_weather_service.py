import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.services.weather import get_weather


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, response):
        self.response = response
        self.last_request = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, url, params=None, timeout=None):
        self.last_request = {
            "url": url,
            "params": params,
            "timeout": timeout,
        }
        return self.response


class TestWeatherService(unittest.IsolatedAsyncioTestCase):
    async def test_get_weather_returns_canonical_contract(self):
        payload = {
            "current": {
                "temperature_2m": 39.5,
                "relative_humidity_2m": 48.0,
                "wind_speed_10m": 14.4,
                "shortwave_radiation": 850.0,
                "time": "2026-08-27T11:00:00+05:30",
            },
            "current_units": {"wind_speed_10m": "kmh"},
            "daily": {
                "time": ["2026-08-27", "2026-08-28"],
                "temperature_2m_max": [41.0, 40.0],
                "temperature_2m_min": [29.0, 28.5],
            },
        }
        fake_client = FakeAsyncClient(FakeResponse(payload))

        with patch("backend.app.services.weather.httpx.AsyncClient", return_value=fake_client):
            result = await get_weather(13.0827, 80.2707)

        self.assertEqual(result["location"]["latitude"], 13.0827)
        self.assertEqual(result["location"]["longitude"], 80.2707)
        self.assertEqual(result["weather"]["temperature"], 39.5)
        self.assertEqual(result["weather"]["wind_speed"], 14.4)
        self.assertIn("forecast", result)
        self.assertEqual(
            fake_client.last_request["params"]["wind_speed_unit"],
            "ms",
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
