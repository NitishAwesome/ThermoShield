"""
SIH-25: Runtime Reality, Reliability & Production Hardening Test Suite
Targets Failure-Injection Tests A through L:
A. Open-Meteo 429 (Rate Limit) Handling
B. Open-Meteo Timeout Handling
C. Stale-Cache Fallback & Age Exposure
D. No-Cache Weather Upstream Failure
E. One Ward Forecast Partial Failure in 24-Ward Batch
F. SMTP Auth Failure Handling
G. SMS Provider Demo Mode Truthfulness
H. Gemini Failure / Missing Key Graceful RAG Fallback
I. Health & Readiness Probe Non-Leaking Verification
J. Monitoring Daemon Iteration Resilience
K. Database Production Safety (SQLite Fallback Blocked in Prod)
L. Geocoder Failure Multi-Tier Fallback
"""

import os
import sys
import time
import asyncio
import smtplib
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import httpx
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.weather import (
    get_weather,
    _CACHE,
    _INFLIGHT_REQUESTS,
    _execute_fetch_and_resolve,
    get_cached_weather,
    FRESH_TTL_SECONDS,
    STALE_TTL_SECONDS,
)
from backend.app.services.health_forecast import get_all_wards_forecast_summary
from backend.app.services.email import send_notification_email
from backend.app.services.sms import DemoSMSProvider, TwilioSMSProvider
from backend.app.services.rag_service import rag_engine
from backend.app.services.copilot_service import copilot_engine
from backend.app.services.monitor import BackgroundMonitorDaemon, MONITORED_MUNICIPAL_AREAS
from backend.app.services.location import search_location, reverse_location, POPULAR_INDIAN_CITIES
from backend.app.database.connection import _create_database_engine


class TestSIH25RuntimeHardening(unittest.IsolatedAsyncioTestCase):

    # ==============================================================================
    # TEST A: Open-Meteo HTTP 429 Rate Limit Handling
    # ==============================================================================
    async def test_a_open_meteo_429_graceful_handling(self):
        lat, lon = 19.1234, 72.8567
        key = (round(lat, 4), round(lon, 4))
        
        # Pre-seed a known cached state
        _CACHE[key] = {
            "data": {
                "location": {"latitude": lat, "longitude": lon},
                "weather": {"temperature": 33.5, "humidity": 65.0, "source_status": "LIVE"},
                "forecast": {"dates": ["2026-09-16"]},
                "source_status": "LIVE"
            },
            "timestamp": time.time() - 120.0  # 2 minutes old (stale)
        }

        mock_resp = MagicMock()
        mock_resp.status_code = 429
        mock_resp.headers = {"Retry-After": "1"}
        http_error = httpx.HTTPStatusError("429 Too Many Requests", request=MagicMock(), response=mock_resp)

        with patch("backend.app.services.weather._fetch_from_open_meteo", side_effect=http_error):
            loop = asyncio.get_running_loop()
            future = loop.create_future()
            await _execute_fetch_and_resolve(key, lat, lon, future)
            result = await future

            self.assertIsNotNone(result)
            self.assertEqual(result["source_status"], "STALE_CACHED")
            self.assertTrue(result["is_fallback"])
            self.assertIn("cache_age_seconds", result)
            self.assertGreaterEqual(result["cache_age_seconds"], 120.0)

    # ==============================================================================
    # TEST B: Open-Meteo Timeout Handling
    # ==============================================================================
    async def test_b_open_meteo_timeout_graceful_handling(self):
        lat, lon = 19.9999, 73.0001
        key = (round(lat, 4), round(lon, 4))
        _CACHE.pop(key, None)

        timeout_error = httpx.TimeoutException("Connection timed out after 12.0s")

        with patch("backend.app.services.weather._fetch_from_open_meteo", side_effect=timeout_error):
            loop = asyncio.get_running_loop()
            future = loop.create_future()
            await _execute_fetch_and_resolve(key, lat, lon, future)
            result = await future

            self.assertIsNotNone(result)
            self.assertEqual(result["source_status"], "OFFLINE_FALLBACK")
            self.assertTrue(result["is_fallback"])
            self.assertGreater(result["weather"]["temperature"], 0)

    # ==============================================================================
    # TEST C: Stale-Cache Fallback & Age Exposure
    # ==============================================================================
    def test_c_stale_cache_metadata_exposure(self):
        key = (18.9999, 72.8888)
        cached_timestamp = time.time() - 450.0  # 7.5 minutes old
        _CACHE[key] = {
            "data": {
                "location": {"latitude": key[0], "longitude": key[1]},
                "weather": {"temperature": 32.0, "humidity": 70.0, "source_status": "LIVE"},
                "forecast": {"dates": ["2026-09-16"]},
                "source_status": "LIVE"
            },
            "timestamp": cached_timestamp
        }

        # Fresh lookup without allow_stale should return None
        self.assertIsNone(get_cached_weather(key, allow_stale=False))

        # Stale lookup with allow_stale=True should return annotated stale data
        stale_data = get_cached_weather(key, allow_stale=True)
        self.assertIsNotNone(stale_data)
        self.assertEqual(stale_data["source_status"], "STALE_CACHED")
        self.assertIn("cache_age_seconds", stale_data)
        self.assertTrue(445.0 <= stale_data["cache_age_seconds"] <= 460.0)
        self.assertIn("data_timestamp", stale_data)
        self.assertEqual(stale_data["weather"]["source_status"], "STALE_CACHED")

    # ==============================================================================
    # TEST D: No-Cache Weather Upstream Failure
    # ==============================================================================
    async def test_d_no_cache_weather_upstream_failure(self):
        lat, lon = 24.5000, 78.5000  # Non-seeded coordinate
        key = (round(lat, 4), round(lon, 4))
        _CACHE.pop(key, None)

        network_error = httpx.ConnectError("Network unreachable")

        with patch("backend.app.services.weather._fetch_from_open_meteo", side_effect=network_error):
            loop = asyncio.get_running_loop()
            future = loop.create_future()
            await _execute_fetch_and_resolve(key, lat, lon, future)
            result = await future

            self.assertIsNotNone(result)
            self.assertEqual(result["source_status"], "OFFLINE_FALLBACK")
            self.assertTrue(result["is_fallback"])
            self.assertIn("weather", result)
            self.assertIn("forecast", result)

    # ==============================================================================
    # TEST E: One Ward Forecast Partial Failure in 24-Ward Batch
    # ==============================================================================
    async def test_e_one_ward_forecast_failure_preserves_all_24_wards(self):
        # Simulate ward 'D' failing while all other 23 wards succeed
        async def mock_get_weather(lat, lon):
            if abs(lat - 18.9552) < 0.01 and abs(lon - 72.8083) < 0.01:
                raise RuntimeError("Temporary Open-Meteo timeout on Ward D")
            return {
                "source_status": "LIVE",
                "source_name": "Open-Meteo Global API",
                "is_fallback": False,
                "weather": {"temperature": 33.0, "humidity": 65.0, "wind_speed": 2.5, "solar_radiation": 400.0},
                "forecast": {
                    "dates": ["2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20"],
                    "max_temperature": [34.0, 34.5, 35.0, 33.5, 33.0],
                    "min_temperature": [26.0, 26.5, 27.0, 26.0, 25.5],
                }
            }

        from backend.app.services.health_forecast import clear_wards_forecast_cache
        clear_wards_forecast_cache()
        with patch("backend.app.services.health_forecast.get_weather", side_effect=mock_get_weather):
            results = await get_all_wards_forecast_summary()
            self.assertEqual(len(results), 24)

            # Verify Ward D is retained via synthetic fallback and not dropped
            ward_d = next((w for w in results if w["ward_code"] == "D"), None)
            self.assertIsNotNone(ward_d, "Ward D was silently removed!")
            self.assertEqual(ward_d["forecast_status"], "SYNTHETIC_FALLBACK")
            self.assertTrue(ward_d["fallback_active"])

    # ==============================================================================
    # TEST F: SMTP Auth Failure Handling
    # ==============================================================================
    def test_f_smtp_auth_failure_handling(self):
        with patch("smtplib.SMTP") as mock_smtp:
            mock_instance = MagicMock()
            mock_instance.login.side_effect = smtplib.SMTPAuthenticationError(535, b"Authentication failed")
            mock_smtp.return_value.__enter__.return_value = mock_instance

            with patch("os.getenv") as mock_env:
                mock_env.side_effect = lambda k, default="": {
                    "MAIL_USERNAME": "test@domain.com",
                    "MAIL_PASSWORD": "secretpassword123",
                    "MAIL_SERVER": "smtp.domain.com",
                    "MAIL_PORT": "587",
                }.get(k, default)

                res = send_notification_email("citizen@example.com", "Test", "Body")
                self.assertIn(res["status"], ("FAILED", "error"))
                self.assertIn("failed", res["message"].lower())
                # Ensure password was not leaked in output
                self.assertNotIn("secretpassword123", str(res))

    # ==============================================================================
    # TEST G: SMS Provider Demo Mode Truthfulness
    # ==============================================================================
    async def test_g_sms_demo_provider_truthfulness(self):
        provider = DemoSMSProvider()
        res = await provider.send_sms("+919876543210", "Heat advisory test")
        
        # Must report SIMULATED, mode DEMO, never falsely claiming SENT
        self.assertEqual(res.status, "SIMULATED")
        self.assertEqual(res.mode, "DEMO")
        self.assertTrue(res.success)
        self.assertNotEqual(res.status, "SENT")


    # ==============================================================================
    # TEST H: Gemini Failure / Missing Key Graceful RAG Fallback
    # ==============================================================================
    async def test_h_gemini_failure_graceful_rag_fallback(self):
        query = "What should outdoor workers do during extreme heat?"
        chunks = rag_engine.retrieve_relevant_chunks(query, top_k=2)
        self.assertGreater(len(chunks), 0)

        # 1. Test autonomous deterministic RAG synthesizer directly
        rag_res = rag_engine.synthesize_rag_response(
            query=query,
            location="Mumbai, India",
            temp=35.0,
            humidity=65.0,
            risk_level="HIGH",
            chunks=chunks
        )
        self.assertIsNotNone(rag_res)
        reply = rag_res["reply"]
        self.assertGreater(len(reply), 50)
        self.assertNotIn("Traceback", reply)
        self.assertTrue("hydration" in reply.lower() or "water" in reply.lower() or "rest" in reply.lower())
        self.assertFalse(rag_res["is_gemini"])

        # 2. Test Copilot orchestrator with Gemini API key missing or failing
        with patch("os.getenv", return_value=""):
            copilot_res = await copilot_engine.get_copilot_response(
                query=query,
                location="Mumbai, India",
                temperature_c=35.0,
                humidity=65.0,
                risk_level="HIGH",
                api_key=None
            )
            self.assertIsNotNone(copilot_res)
            self.assertIn("reply", copilot_res)
            self.assertFalse(copilot_res.get("is_gemini", True))
            self.assertNotIn("Traceback", copilot_res["reply"])

    # ==============================================================================
    # TEST I: Health & Readiness Probe Non-Leaking Verification (SIH-25C schema)
    # ==============================================================================
    def test_i_health_endpoints_and_secret_protection(self):
        client = TestClient(app)

        # 1. Liveness probe /health — process is alive, no db call
        live_resp = client.get("/health")
        self.assertEqual(live_resp.status_code, 200)
        live_data = live_resp.json()
        self.assertEqual(live_data["status"], "healthy")
        self.assertIn("timestamp", live_data)
        self.assertIn("database_engine", live_data)   # SIH-25C: renamed from "database"
        self.assertNotIn("database_url", str(live_data).lower())  # no connection string

        # 2. Readiness probe /health/ready — new critical/optional schema
        ready_resp = client.get("/health/ready")
        # In test env (SQLite, no SMTP), DB is operational → HTTP 200
        self.assertIn(ready_resp.status_code, [200, 503])
        ready_data = ready_resp.json()

        # Status is one of the three defined values
        self.assertIn(ready_data["status"], [
            "READY",
            "READY_WITH_DEGRADED_OPTIONAL_SERVICES",
            "NOT_READY",
        ])

        # Critical and optional service keys must be present
        self.assertIn("critical_dependencies", ready_data)
        self.assertIn("database", ready_data["critical_dependencies"])
        self.assertIn("optional_services", ready_data)
        optional = ready_data["optional_services"]
        for key in ["weather_cache", "email", "sms", "copilot", "daemon"]:
            self.assertIn(key, optional, f"Missing optional_services key: {key}")

        # DB must report is_critical=True
        self.assertTrue(ready_data["critical_dependencies"]["database"]["is_critical"])

        # All optional services must carry classification=OPTIONAL
        for key, svc in optional.items():
            self.assertEqual(svc.get("classification"), "OPTIONAL",
                             f"optional_services.{key} missing classification=OPTIONAL")

        # 3. /ready alias must mirror /health/ready
        alias_resp = client.get("/ready")
        self.assertIn(alias_resp.status_code, [200, 503])
        alias_data = alias_resp.json()
        self.assertEqual(alias_data["status"], ready_data["status"])

        # 4. Secret non-leakage check
        ready_text = ready_resp.text
        for secret_keyword in ["password", "secret", "private_key", "DATABASE_URL", "api_key"]:
            self.assertNotIn(secret_keyword.lower(), ready_text.lower(),
                             f"Potential secret keyword '{secret_keyword}' found in /health/ready response")

        # 5. /copilot/provenance must return a corpus summary with classifications
        prov_resp = client.get("/copilot/provenance")
        self.assertEqual(prov_resp.status_code, 200)
        prov_data = prov_resp.json()
        self.assertIn("corpus_summary", prov_data)
        self.assertGreater(prov_data["corpus_summary"]["total_chunks"], 0)
        self.assertIn("chunks", prov_data)
        for chunk in prov_data["chunks"]:
            self.assertIn(chunk["provenance_class"],
                          ["VERIFIED_PUBLIC_SOURCE", "INTERNAL_SUMMARY", "NOT_VERIFIED"],
                          f"Unexpected provenance_class on chunk: {chunk['chunk_id']}")

    # ==============================================================================
    # TEST J: Monitoring Daemon Iteration Resilience
    # ==============================================================================
    async def test_j_monitoring_daemon_cycle_resilience(self):
        daemon = BackgroundMonitorDaemon()
        
        # Simulate single area evaluation throwing an unhandled exception
        with patch.object(daemon, "evaluate_single_location", side_effect=Exception("Simulated sensor failure")):
            results = await daemon.run_evaluation_cycle()
            # Even when evaluations fail, cycle completes without crashing
            self.assertEqual(len(results), len(MONITORED_MUNICIPAL_AREAS))
            self.assertEqual(daemon.total_cycles, 1)
            self.assertIsNotNone(daemon.last_run_time)

    # ==============================================================================
    # TEST K: Database Production Safety (SQLite Fallback Blocked in Prod)
    # ==============================================================================
    def test_k_db_production_safety_blocks_sqlite(self):
        # In production with failed postgres connection, it must NOT silently fall back to SQLite
        with patch("os.getenv") as mock_env:
            mock_env.side_effect = lambda k, default="": {
                "ENVIRONMENT": "production",
                "ALLOW_SQLITE_FALLBACK": "false",
            }.get(k, default)
            
            with patch("backend.app.database.connection.create_engine") as mock_engine_create:
                mock_eng_instance = MagicMock()
                mock_eng_instance.connect.side_effect = Exception("PostgreSQL connect timed out")
                mock_engine_create.return_value = mock_eng_instance
                
                with self.assertRaises(RuntimeError) as ctx:
                    _create_database_engine("postgresql://user:pass@render-postgres:5432/db")
                self.assertIn("Failed to connect to PostgreSQL database in production", str(ctx.exception))
                self.assertIn("Silent SQLite fallback is disabled in production", str(ctx.exception))

    # ==============================================================================
    # TEST L: Geocoder Failure Multi-Tier Fallback
    # ==============================================================================
    async def test_l_geocoder_failure_returns_fallback_cities(self):
        # Simulate Open-Meteo geocoding and Nominatim both failing
        network_error = httpx.ConnectError("Geocoder network timeout")
        with patch("httpx.AsyncClient.get", side_effect=network_error):
            # Querying a popular Indian city like "Mumbai" should hit the tertiary built-in fallback
            results = await search_location("Mumbai")
            self.assertGreater(len(results), 0)
            self.assertIn("Mumbai", results[0]["name"])
            self.assertGreater(results[0]["latitude"], 0)
            
            # Reverse location should return clean coordinate point fallback instead of crashing
            rev = await reverse_location(19.0760, 72.8777)
            self.assertIsNotNone(rev)
            self.assertIn("name", rev)
            self.assertEqual(rev["latitude"], 19.0760)


if __name__ == "__main__":
    unittest.main()
