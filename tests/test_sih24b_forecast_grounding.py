"""
SIH-24B: Real Forecast Grounding & Synthetic GIS Forecast Removal
Comprehensive Test Suite (Tests A - J)

Verifies:
A: Ward forecast does NOT use synthetic multipliers in live mode
B: Ward forecast invokes get_weather() with ward's real coordinates
C: Day 2 temperature differs from Day 0 based on real forecast data, not fixed multipliers
D: Forecast humidity comes from hourly data, not 68.0 - ... formula
E: Forecast wind comes from hourly wind_speed_10m, not hardcoded 2.5 m/s
F: Forecast radiation comes from hourly shortwave_radiation when available
G: Fallback is explicitly classified when weather API fails
H: GIS forecast returns different risk levels across 5 days when forecast data varies
I: HAP trigger state is derived from calculated risk_level, not baseline assumption
J: No citizen view contains deaths, mortality, hospital admissions expected
"""

import asyncio
import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.services.health_forecast import (
    generate_health_impact_forecast,
    get_all_wards_forecast_summary,
    _extract_daily_peak_from_hourly,
    _synthetic_ward_fallback_forecast,
    ML_TRANSPARENCY_DISCLAIMER,
    PROTOTYPE_SEED_NOTE,
)
from backend.app.services.heat_action_plan import (
    MUNICIPAL_WARD_REGISTRY,
    TRIGGER_ACTION_NOW,
    TRIGGER_PREPARE_24H,
    TRIGGER_PREPARE_3D,
    TRIGGER_BASELINE,
)


def _build_mock_weather(
    lat: float,
    lon: float,
    max_temps=None,
    hourly_temps=None,
    hourly_rhs=None,
    hourly_winds=None,
    hourly_solars=None,
    is_fallback=False,
    source_status="LIVE"
):
    if max_temps is None:
        max_temps = [33.0, 36.5, 31.0, 32.5, 30.0]
    dates = ["2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20"]
    times = []
    temps = []
    rhs = []
    winds = []
    solars = []
    app_temps = []
    uvs = []
    is_days = []

    for day_idx, d_str in enumerate(dates):
        t_day = max_temps[day_idx]
        for h in range(24):
            times.append(f"{d_str}T{h:02d}:00")
            is_d = 1 if 6 <= h <= 18 else 0
            is_days.append(is_d)
            uvs.append(8.0 if is_d else 0.0)

            # Custom or default hourly parameters
            t_val = hourly_temps[day_idx] if hourly_temps and day_idx < len(hourly_temps) else (t_day if h == 14 else t_day - 5.0)
            temps.append(t_val)
            rh_val = hourly_rhs[day_idx] if hourly_rhs and day_idx < len(hourly_rhs) else (42.0 if h == 14 else 75.0)
            rhs.append(rh_val)
            w_val = hourly_winds[day_idx] if hourly_winds and day_idx < len(hourly_winds) else 4.8
            winds.append(w_val)
            s_val = (hourly_solars[day_idx] if h == 14 else 0.0) if hourly_solars and day_idx < len(hourly_solars) else (820.0 if h == 14 else 0.0)
            solars.append(s_val)
            app_temps.append(t_val + 3.5)

    return {
        "location": {"latitude": lat, "longitude": lon},
        "weather": {
            "temperature": temps[12],
            "humidity": rhs[12],
            "wind_speed": winds[12],
            "solar_radiation": solars[12],
            "is_day": 1,
            "source_status": source_status,
            "is_fallback": is_fallback,
        },
        "forecast": {
            "dates": dates,
            "max_temperature": max_temps,
            "min_temperature": [25.0, 26.0, 24.0, 25.0, 23.0],
            "apparent_temperature_max": [m + 4.0 for m in max_temps],
            "uv_index_max": [8.5, 9.0, 7.8, 8.0, 7.5],
            "hourly": {
                "time": times,
                "temperature": temps,
                "relative_humidity_2m": rhs,
                "humidity": rhs,
                "apparent_temperature": app_temps,
                "wind_speed": winds,
                "shortwave_radiation": solars,
                "uv_index": uvs,
                "is_day": is_days,
            }
        },
        "source_status": source_status,
        "is_fallback": is_fallback,
    }


class TestSIH24BForecastGrounding(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        from backend.app.services.health_forecast import clear_wards_forecast_cache
        clear_wards_forecast_cache()

    def tearDown(self):
        from backend.app.services.health_forecast import clear_wards_forecast_cache
        clear_wards_forecast_cache()

    async def test_a_ward_forecast_no_synthetic_multipliers_in_live_mode(self):
        """Test A: Ward forecast does NOT use synthetic multipliers (1.02, 1.04, etc.) in live mode."""
        custom_max = [33.0, 36.5, 31.0, 32.5, 30.0]

        async def mock_gw(lat, lon):
            return _build_mock_weather(lat, lon, max_temps=custom_max)

        with patch("backend.app.services.health_forecast.get_weather", side_effect=mock_gw):
            wards = await get_all_wards_forecast_summary()

        self.assertEqual(len(wards), len(MUNICIPAL_WARD_REGISTRY))
        self.assertGreaterEqual(len(wards), 10)
        for ward in wards:
            day0_t = ward["forecast_days"][0]["temperature_c"]
            day2_t = ward["forecast_days"][2]["temperature_c"]
            # Synthetic multiplier was base_t * 1.04 (which would be higher than Day 0)
            # In our mock, Day 2 has max temp 31.0 which is LOWER than Day 0 (33.0)
            self.assertEqual(day0_t, 33.0)
            self.assertEqual(day2_t, 31.0)
            self.assertNotEqual(day2_t, round(day0_t * 1.04, 1))
            self.assertEqual(ward["forecast_source_classification"]["weather_classification"], "REAL_FORECAST")
            self.assertFalse(ward["forecast_source_classification"]["fallback_active"])

    async def test_b_ward_forecast_invokes_get_weather_with_real_coordinates(self):
        """Test B: Ward forecast calls get_weather() using official coordinates from MUNICIPAL_WARD_REGISTRY."""
        called_coords = []

        async def mock_gw(lat, lon):
            called_coords.append((round(lat, 4), round(lon, 4)))
            return _build_mock_weather(lat, lon)

        with patch("backend.app.services.health_forecast.get_weather", side_effect=mock_gw):
            await get_all_wards_forecast_summary()

        self.assertEqual(len(called_coords), len(MUNICIPAL_WARD_REGISTRY))
        for _, profile in MUNICIPAL_WARD_REGISTRY.items():
            expected = (round(profile["latitude"], 4), round(profile["longitude"], 4))
            self.assertIn(expected, called_coords)

    async def test_c_day2_temp_differs_based_on_real_forecast_data(self):
        """Test C: Day 2 temperature differs from Day 0 based on real forecast data, not fixed multipliers."""
        async def mock_gw(lat, lon):
            # Day 2 is noticeably cooler (28.0) than Day 0 (35.0)
            return _build_mock_weather(lat, lon, max_temps=[35.0, 34.0, 28.0, 29.0, 30.0])

        with patch("backend.app.services.health_forecast.get_weather", side_effect=mock_gw):
            wards = await get_all_wards_forecast_summary()

        ward_a = next(w for w in wards if w["ward_id"] == "ward_a")
        self.assertEqual(ward_a["forecast_days"][0]["temperature_c"], 35.0)
        self.assertEqual(ward_a["forecast_days"][2]["temperature_c"], 28.0)

    async def test_d_forecast_humidity_comes_from_hourly_data(self):
        """Test D: Forecast humidity comes from hourly data, not 68.0 - (t_max - 32.0)*3.5 formula."""
        # Hourly peak has 42.0% humidity
        custom_rhs = [42.0, 40.0, 55.0, 48.0, 50.0]
        async def mock_gw(lat, lon):
            return _build_mock_weather(lat, lon, max_temps=[34.0]*5, hourly_rhs=custom_rhs)

        with patch("backend.app.services.health_forecast.get_weather", side_effect=mock_gw):
            res = await generate_health_impact_forecast(19.0760, 72.8777)

        day0 = res["forecast_days"][0]
        # Old formula at 34.0°C would have been: 68.0 - (34.0 - 32.0) * 3.5 = 61.0%
        self.assertEqual(day0["peak_hour_humidity"], 42.0)
        self.assertNotEqual(day0["peak_hour_humidity"], 61.0)
        self.assertTrue(day0["is_real_hourly"])

    async def test_e_forecast_wind_comes_from_hourly_wind_speed(self):
        """Test E: Forecast wind comes from hourly wind_speed_10m, not hardcoded 2.5 m/s."""
        custom_winds = [5.6, 6.2, 4.0, 5.0, 3.8]
        async def mock_gw(lat, lon):
            return _build_mock_weather(lat, lon, hourly_winds=custom_winds)

        with patch("backend.app.services.health_forecast.get_weather", side_effect=mock_gw):
            res = await generate_health_impact_forecast(19.0760, 72.8777)

        day0 = res["forecast_days"][0]
        self.assertEqual(day0["peak_hour_wind_speed_ms"], 5.6)
        self.assertNotEqual(day0["peak_hour_wind_speed_ms"], 2.5)

    async def test_f_forecast_radiation_comes_from_hourly_shortwave_radiation(self):
        """Test F: Forecast radiation comes from hourly shortwave_radiation, not max(400, uv*85)."""
        custom_solars = [850.0, 920.0, 710.0, 780.0, 650.0]
        async def mock_gw(lat, lon):
            return _build_mock_weather(lat, lon, hourly_solars=custom_solars)

        with patch("backend.app.services.health_forecast.get_weather", side_effect=mock_gw):
            res = await generate_health_impact_forecast(19.0760, 72.8777)

        day0 = res["forecast_days"][0]
        self.assertEqual(day0["peak_hour_solar_radiation_wm2"], 850.0)

    async def test_g_fallback_explicitly_classified_when_weather_fails(self):
        """Test G: Fallback is explicitly classified as SYNTHETIC_FALLBACK when weather API fails."""
        async def mock_gw_fail(lat, lon):
            return _build_mock_weather(lat, lon, is_fallback=True, source_status="OFFLINE_FALLBACK")

        with patch("backend.app.services.health_forecast.get_weather", side_effect=mock_gw_fail):
            res = await generate_health_impact_forecast(19.0760, 72.8777)
            wards = await get_all_wards_forecast_summary()

        # Check per-coordinate health forecast classification
        fc_meta = res["forecast_source_classification"]
        self.assertEqual(fc_meta["weather_classification"], "SYNTHETIC_FALLBACK")
        self.assertTrue(fc_meta["fallback_active"])

        # Check GIS ward forecast classification
        for w in wards:
            w_meta = w["forecast_source_classification"]
            self.assertEqual(w_meta["weather_classification"], "SYNTHETIC_FALLBACK")
            self.assertTrue(w_meta["fallback_active"])

    async def test_h_gis_forecast_returns_different_risk_levels_across_5_days(self):
        """Test H: GIS forecast returns different risk levels across 5 days when forecast data varies."""
        # Extreme on Day 1, Moderate on Day 3
        temps = [32.0, 42.0, 36.0, 27.0, 28.0]
        solars = [500.0, 950.0, 700.0, 200.0, 250.0]
        winds = [2.0, 1.0, 2.0, 5.0, 4.5]

        async def mock_gw(lat, lon):
            return _build_mock_weather(lat, lon, max_temps=temps, hourly_solars=solars, hourly_winds=winds)

        with patch("backend.app.services.health_forecast.get_weather", side_effect=mock_gw):
            wards = await get_all_wards_forecast_summary()

        ward_g = next(w for w in wards if w["ward_id"] == "ward_g_north")
        g_levels = [d["risk_level"] for d in ward_g["forecast_days"]]
        # Day 1 (42°C, solar 950 W/m², low wind, vuln 88) must reach EXTREME, while Day 3 (27°C) is LOW/baseline
        self.assertIn("EXTREME", g_levels)
        self.assertIn("LOW", g_levels)
        self.assertNotEqual(g_levels[1], g_levels[3])

        ward_a = next(w for w in wards if w["ward_id"] == "ward_a")
        a_levels = [d["risk_level"] for d in ward_a["forecast_days"]]
        self.assertNotEqual(a_levels[1], a_levels[3])

    async def test_i_hap_trigger_state_derived_from_calculated_risk_level(self):
        """Test I: HAP trigger state is derived from calculated risk_level, not baseline assumption."""
        # Day 0 Extreme -> TRIGGER_ACTION_NOW
        # Day 1 Extreme -> TRIGGER_PREPARE_24H
        # Day 2 Extreme -> TRIGGER_PREPARE_3D
        # Day 3 Low -> TRIGGER_BASELINE
        temps = [41.0, 41.0, 41.0, 26.0, 26.0]
        solars = [950.0, 950.0, 950.0, 200.0, 200.0]
        winds = [1.0, 1.0, 1.0, 5.0, 5.0]

        async def mock_gw(lat, lon):
            return _build_mock_weather(lat, lon, max_temps=temps, hourly_solars=solars, hourly_winds=winds)

        with patch("backend.app.services.health_forecast.get_weather", side_effect=mock_gw):
            res = await generate_health_impact_forecast(19.0760, 72.8777, vulnerability_score=80.0)

        days = res["forecast_days"]
        self.assertEqual(days[0]["trigger_state"], TRIGGER_ACTION_NOW)
        self.assertEqual(days[1]["trigger_state"], TRIGGER_PREPARE_24H)
        self.assertEqual(days[2]["trigger_state"], TRIGGER_PREPARE_3D)
        self.assertEqual(days[3]["trigger_state"], TRIGGER_BASELINE)

    async def test_j_no_citizen_view_contains_deaths_mortality_hospital_admissions(self):
        """Test J: Strictly verify no citizen view contains 'deaths', 'mortality', 'hospital admissions expected'."""
        async def mock_gw(lat, lon):
            return _build_mock_weather(lat, lon)

        with patch("backend.app.services.health_forecast.get_weather", side_effect=mock_gw):
            res = await generate_health_impact_forecast(19.0760, 72.8777)

        res_str = str(res).lower()
        self.assertNotIn("deaths", res_str)
        self.assertNotIn("hospital admissions expected", res_str)
        self.assertNotIn("casualties", res_str)
        # Note: "mortality" should only ever appear in disclaimers saying it is NEVER predicted, if at all
        for day in res["forecast_days"]:
            day_str = str(day).lower()
            self.assertNotIn("mortality", day_str)
            self.assertNotIn("deaths", day_str)
            self.assertNotIn("hospital", day_str)


if __name__ == "__main__":
    unittest.main(verbosity=2)
