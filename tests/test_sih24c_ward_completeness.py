import math
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.heat_action_plan import MUNICIPAL_WARD_REGISTRY
from backend.app.services.health_forecast import (
    get_all_wards_forecast_summary,
    _extract_daily_peak_from_hourly,
)
from backend.thermal_stress.calculator import calculate_wbgt, calculate_stull_wet_bulb
from backend.app.services.thermal import calculate_thermal_stress


EXPECTED_24_BMC_WARDS = {
    "A", "B", "C", "D", "E", "F/N", "F/S", "G/N", "G/S", "H/E", "H/W",
    "K/E", "K/W", "L", "M/E", "M/W", "N", "P/N", "P/S", "R/C", "R/N",
    "R/S", "S", "T"
}


# ==============================================================================
# TEST A: Ward registry contains exactly 24 unique BMC ward codes
# ==============================================================================
def test_ward_registry_has_exactly_24_bmc_wards():
    assert len(MUNICIPAL_WARD_REGISTRY) == 24, f"Expected 24 wards, got {len(MUNICIPAL_WARD_REGISTRY)}"
    actual_codes = {profile["ward_code"] for profile in MUNICIPAL_WARD_REGISTRY.values()}
    assert actual_codes == EXPECTED_24_BMC_WARDS, f"Ward code mismatch: missing {EXPECTED_24_BMC_WARDS - actual_codes}"
    for ward_id, profile in MUNICIPAL_WARD_REGISTRY.items():
        assert "latitude" in profile and "longitude" in profile
        assert 18.8 <= profile["latitude"] <= 19.4, f"Invalid latitude for {ward_id}"
        assert 72.7 <= profile["longitude"] <= 73.1, f"Invalid longitude for {ward_id}"


# ==============================================================================
# TEST B: /api/forecast/wards-summary returns 24 ward entries in normal conditions
# ==============================================================================
def test_wards_summary_endpoint_returns_24_wards():
    client = TestClient(app)
    mock_weather = {
        "source_status": "LIVE",
        "source_name": "Open-Meteo Global API",
        "is_fallback": False,
        "forecast": {
            "dates": ["2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20"],
            "max_temperature": [34.0, 34.5, 35.0, 33.5, 33.0],
            "min_temperature": [26.0, 26.5, 27.0, 26.0, 25.5],
            "apparent_temperature_max": [38.0, 39.0, 40.0, 37.5, 37.0],
            "uv_index_max": [8.5, 8.8, 8.6, 8.2, 8.0],
            "hourly": {
                "time": [f"2026-09-16T{h:02d}:00" for h in range(24)],
                "temperature": [26.0 + 8.0 * math.sin(h / 24 * math.pi) for h in range(24)],
                "humidity": [70.0 - 20.0 * math.sin(h / 24 * math.pi) for h in range(24)],
                "apparent_temperature": [28.0 + 10.0 * math.sin(h / 24 * math.pi) for h in range(24)],
                "wind_speed": [2.5] * 24,
                "shortwave_radiation": [max(0.0, 700.0 * math.sin(h / 24 * math.pi)) for h in range(24)],
                "uv_index": [max(0.0, 8.5 * math.sin(h / 24 * math.pi)) for h in range(24)],
                "is_day": [1 if 6 <= h <= 18 else 0 for h in range(24)],
            }
        }
    }

    with patch("backend.app.services.health_forecast.get_weather", new_callable=AsyncMock) as mock_get_weather, \
         patch("app.services.health_forecast.get_weather", new_callable=AsyncMock) as mock_get_weather2:
        mock_get_weather.return_value = mock_weather
        mock_get_weather2.return_value = mock_weather
        response = client.get("/api/forecast/wards-summary")

    assert response.status_code == 200
    data = response.json()
    assert data["total_wards"] == 24
    assert data["count"] == 24
    assert len(data["wards"]) == 24
    assert data["real_forecast_wards"] == 24
    assert data["fallback_wards"] == 0
    assert data["unavailable_wards"] == 0

    returned_codes = {w.get("ward_code") for w in data["wards"]}
    assert returned_codes == EXPECTED_24_BMC_WARDS


# ==============================================================================
# TEST C & D: Failure for one or more wards preserves 24 entries with explicit fallback
# ==============================================================================
def test_single_ward_failure_resilience_and_accounting():
    async def _run_test():
        async def mock_selective_weather(lat, lon):
            # Fail specifically for Ward A (18.9220, 72.8346)
            if round(lat, 2) == 18.92:
                raise RuntimeError("Upstream 503 Service Unavailable")
            return {
                "source_status": "LIVE",
                "source_name": "Open-Meteo Global API",
                "is_fallback": False,
                "forecast": {
                    "dates": ["2026-09-16"],
                    "max_temperature": [34.0],
                    "min_temperature": [26.0],
                    "uv_index_max": [8.0],
                    "hourly": {},
                }
            }

        with patch("backend.app.services.health_forecast.get_weather", side_effect=mock_selective_weather), \
             patch("app.services.health_forecast.get_weather", side_effect=mock_selective_weather):
            results = await get_all_wards_forecast_summary()

        assert len(results) == 24, "Ward count must remain exactly 24 even if one ward fails"

        ward_a_entry = next((w for w in results if w["ward_code"] == "A"), None)
        assert ward_a_entry is not None
        assert ward_a_entry["fallback_active"] is True
        assert ward_a_entry["forecast_status"] == "SYNTHETIC_FALLBACK"
        assert ward_a_entry["source_status"] == "OFFLINE_FALLBACK"
        assert ward_a_entry["forecast_source_classification"]["fallback_active"] is True

        # Other wards remain real forecast
        ward_t_entry = next((w for w in results if w["ward_code"] == "T"), None)
        assert ward_t_entry is not None
        assert ward_t_entry["fallback_active"] is False

    import asyncio
    asyncio.run(_run_test())


# ==============================================================================
# TEST E: No [:10] or debug subset is used in production path
# ==============================================================================
def test_no_slicing_in_codebase():
    with open("backend/app/services/health_forecast.py", "r", encoding="utf-8") as f:
        content = f.read()
    assert "ward_items[:" not in content, "Found ward_items slicing in health_forecast.py"
    assert "MUNICIPAL_WARD_REGISTRY[:" not in content, "Found registry slicing in health_forecast.py"
    assert "results[:" not in content, "Found results slicing in health_forecast.py"
    assert "summaries[:" not in content, "Found summaries slicing in health_forecast.py"


# ==============================================================================
# TEST F: WBGT calculation function identity and formula preservation
# ==============================================================================
def test_wbgt_formula_preservation():
    """
    Verifies that calculate_wbgt implements Stull Tw + empirical black-globe model
    (0.7·Tw + 0.2·Tg + 0.1·Ta) exactly and was not replaced by an unverified formula.
    """
    ta = 35.0
    rh = 60.0
    wind = 2.0
    solar = 700.0

    tw = calculate_stull_wet_bulb(ta, rh)
    effective_wind = max(wind, 0.5)
    tg = ta + (solar / 100.0) * (1.0 / math.sqrt(effective_wind))
    expected_wbgt = 0.7 * tw + 0.2 * tg + 0.1 * ta

    actual_wbgt = calculate_wbgt(
        temperature_c=ta,
        relative_humidity_pct=rh,
        wind_speed_mps=wind,
        solar_radiation_wm2=solar
    )

    assert abs(actual_wbgt - expected_wbgt) < 1e-6
    # In shade (solar <= 0), WBGT = 0.7*Tw + 0.3*Ta
    shade_wbgt = calculate_wbgt(ta, rh, wind, solar_radiation_wm2=0.0)
    assert abs(shade_wbgt - (0.7 * tw + 0.3 * ta)) < 1e-6


# ==============================================================================
# TEST G: Shortwave radiation unit handling (W/m²)
# ==============================================================================
def test_shortwave_radiation_unit_handling():
    """
    Confirms that shortwave radiation of 700 W/m² produces realistic daytime outdoor thermal stress,
    not astronomical values that would occur if J/m² were passed (e.g. 2,500,000 J/m²).
    """
    res = calculate_thermal_stress(
        temperature=35.0,
        humidity=60.0,
        wind_speed=2.5,
        solar_radiation=700.0  # W/m²
    )
    wbgt = res["indices"]["wbgt_c"]
    assert 28.0 <= wbgt <= 38.0, f"Unrealistic WBGT for 700 W/m²: {wbgt}"

    # If someone passed J/m² (e.g., 2,500,000), it would be caught or unphysical
    res_zero = calculate_thermal_stress(
        temperature=35.0,
        humidity=60.0,
        wind_speed=2.5,
        solar_radiation=0.0
    )
    assert res["indices"]["wbgt_c"] > res_zero["indices"]["wbgt_c"]


# ==============================================================================
# TEST H: Wind-speed unit handling (m/s)
# ==============================================================================
def test_wind_speed_unit_handling():
    """
    Verifies higher wind speed (in m/s) increases convective cooling, reducing Tg and WBGT under solar load.
    """
    wbgt_low_wind = calculate_wbgt(35.0, 60.0, wind_speed_mps=1.0, solar_radiation_wm2=600.0)
    wbgt_high_wind = calculate_wbgt(35.0, 60.0, wind_speed_mps=5.0, solar_radiation_wm2=600.0)

    assert wbgt_high_wind < wbgt_low_wind, "Higher wind speed must reduce outdoor radiative WBGT via convective cooling"


# ==============================================================================
# TEST I: Day/hour timestamps alignment
# ==============================================================================
def test_timestamp_day_alignment():
    hourly = {
        "time": [
            "2026-09-16T10:00", "2026-09-16T11:00", "2026-09-16T12:00", "2026-09-16T13:00",
            "2026-09-17T10:00", "2026-09-17T11:00", "2026-09-17T12:00", "2026-09-17T13:00",
        ],
        "temperature": [32.0, 34.0, 36.0, 35.0, 31.0, 33.0, 35.0, 34.0],
        "humidity": [65.0, 60.0, 55.0, 58.0, 68.0, 62.0, 58.0, 60.0],
        "apparent_temperature": [37.0, 40.0, 42.0, 41.0, 36.0, 39.0, 41.0, 40.0],
        "wind_speed": [2.0, 2.2, 2.5, 2.8, 2.0, 2.2, 2.5, 2.8],
        "shortwave_radiation": [500.0, 650.0, 800.0, 750.0, 480.0, 630.0, 780.0, 720.0],
        "is_day": [1, 1, 1, 1, 1, 1, 1, 1],
    }

    peak_day1 = _extract_daily_peak_from_hourly(hourly, day_idx=0, target_date="2026-09-16")
    # Four supplied hours can identify a sample peak, but cannot claim a complete daily peak.
    assert peak_day1["is_real_hourly"] is False
    assert peak_day1["peak_time"].startswith("2026-09-16")

    peak_day2 = _extract_daily_peak_from_hourly(hourly, day_idx=1, target_date="2026-09-17")
    assert peak_day2["is_real_hourly"] is False
    assert peak_day2["peak_time"].startswith("2026-09-17")


# ==============================================================================
# TEST J: Peak-hour selection optimizes peak Estimated WBGT
# ==============================================================================
def test_peak_hour_selection_optimizes_thermal_stress():
    """
    Tests a scenario where Hour A has higher dry-bulb temperature (37°C) but lower humidity (30%) & zero solar,
    while Hour B has moderate temperature (34°C) but extreme humidity (85%) & high solar radiation (800 W/m²).
    Hour B generates significantly higher WBGT and must be selected as the peak thermal strain hour.
    """
    hourly = {
        "time": ["2026-09-16T12:00", "2026-09-16T14:00"],
        "temperature": [37.0, 34.0],
        "humidity": [30.0, 85.0],
        "apparent_temperature": [38.0, 44.0],
        "wind_speed": [3.0, 1.5],
        "shortwave_radiation": [100.0, 800.0],
        "is_day": [1, 1],
    }

    peak = _extract_daily_peak_from_hourly(hourly, day_idx=0, target_date="2026-09-16")
    assert peak["peak_time"] == "2026-09-16T14:00", "Must select 14:00 due to higher biometeorological WBGT"
    assert peak["temperature"] == 34.0
    assert peak["humidity"] == 85.0
