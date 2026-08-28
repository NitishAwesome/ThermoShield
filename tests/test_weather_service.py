import os
import sys
import time
import unittest
from unittest.mock import AsyncMock, patch
import httpx
from fastapi import HTTPException

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.services.weather import get_weather, _CACHE


class FakeResponse:
    def __init__(self, payload, status_code=200, headers=None):
        self._payload = payload
        self.status_code = status_code
        self.headers = headers or {}
        self.request = httpx.Request("GET", "https://api.open-meteo.com/v1/forecast")

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(
                f"HTTP {self.status_code}",
                request=self.request,
                response=self,
            )
        return None

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, response):
        self.response = response
        self.last_request = None
        self.call_count = 0

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, url, params=None, timeout=None, headers=None):
        self.call_count += 1
        self.last_request = {
            "url": url,
            "params": params,
            "timeout": timeout,
            "headers": headers,
        }
        return self.response


class TestWeatherService(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        _CACHE.clear()

    async def test_get_weather_returns_canonical_contract(self):
        payload = {
            "current": {
                "temperature_2m": 39.5,
                "relative_humidity_2m": 48.0,
                "wind_speed_10m": 14.4,
                "shortwave_radiation": 850.0,
                "time": "2026-08-27T11:00:00+05:30",
            },
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

    async def test_caching_prevents_duplicate_calls(self):
        payload = {
            "current": {
                "temperature_2m": 32.0,
                "relative_humidity_2m": 60.0,
                "wind_speed_10m": 3.0,
                "shortwave_radiation": 400.0,
                "time": "2026-08-28T12:00:00",
            },
            "daily": {
                "time": ["2026-08-28"],
                "temperature_2m_max": [35.0],
                "temperature_2m_min": [25.0],
            },
        }
        fake_client = FakeAsyncClient(FakeResponse(payload))

        with patch("backend.app.services.weather.httpx.AsyncClient", return_value=fake_client):
            # First call fetches from upstream
            res1 = await get_weather(19.0760, 72.8777)
            # Subsequent calls hit cache
            res2 = await get_weather(19.0760, 72.8777)
            res3 = await get_weather(19.0760, 72.8777)

        self.assertEqual(fake_client.call_count, 1)
        self.assertEqual(res1["weather"]["temperature"], 32.0)
        self.assertEqual(res2["weather"]["temperature"], 32.0)
        self.assertEqual(res3["weather"]["temperature"], 32.0)

    async def test_429_uses_stale_cache_fallback(self):
        coord_key = (19.0760, 72.8777)
        # Pre-seed stale cache (timestamp > 60s ago but < 600s)
        stale_payload = {
            "location": {"latitude": 19.0760, "longitude": 72.8777},
            "weather": {"temperature": 31.5, "humidity": 65.0, "wind_speed": 2.5, "solar_radiation": 350.0, "time": ""},
            "forecast": {"dates": ["2026-08-28"], "max_temperature": [34.0], "min_temperature": [24.0]}
        }
        _CACHE[coord_key] = {
            "data": stale_payload,
            "timestamp": time.time() - 120.0  # 2 minutes old
        }

        # Simulate Open-Meteo 429
        fake_client = FakeAsyncClient(FakeResponse({}, status_code=429, headers={"Retry-After": "1"}))

        with patch("backend.app.services.weather.httpx.AsyncClient", return_value=fake_client):
            result = await get_weather(19.0760, 72.8777)

        # Should successfully return stale cached data without crashing
        self.assertEqual(result["weather"]["temperature"], 31.5)

    async def test_429_empty_cache_raises_503(self):
        # Empty cache + 429 upstream
        fake_client = FakeAsyncClient(FakeResponse({}, status_code=429))

        with patch("backend.app.services.weather.httpx.AsyncClient", return_value=fake_client):
            with self.assertRaises(HTTPException) as cm:
                await get_weather(28.6139, 77.2090)

        self.assertEqual(cm.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main(verbosity=2)
