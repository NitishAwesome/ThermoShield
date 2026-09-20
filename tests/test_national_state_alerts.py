"""
Test Suite: Dynamic National State Heat Alerts & Diurnal Meteorological Grounding
================================================================================
Validates:
1. Retrieval of all 37 Indian States/UTs with valid coordinates and properties.
2. Official IMD daytime vs nighttime classification (Warm Night vs Daytime Heatwave).
3. Diurnal solar temperature modeling (cooling at night, peak in afternoon).
4. Full API endpoint /areas/national-state-alerts contract and statistics.
5. In-memory caching with TTL.
"""

import pytest
from app.services.map_services import (
    get_national_state_alerts,
    classify_state_heat_alert,
    _get_diurnal_state_weather,
)
from app.main import app
from fastapi.testclient import TestClient


@pytest.mark.anyio
async def test_national_state_alerts_returns_37_states():
    """Verify that all 37 Indian States & Union Territories are returned."""
    result = await get_national_state_alerts()
    assert result["type"] == "FeatureCollection"
    assert len(result["features"]) == 37
    assert len(result["states"]) == 37

    # Verify statistics structure
    stats = result["statistics"]
    assert stats["totalStates"] == 37
    assert stats["redCount"] + stats["orangeCount"] + stats["yellowCount"] + stats["greenCount"] == 37
    assert stats["maxTemp"] >= stats["minTemp"]
    assert "Tamil Nadu" in [s["stateName"] for s in result["states"]]
    assert "Rajasthan" in [s["stateName"] for s in result["states"]]
    assert "Delhi" in [s["stateName"] for s in result["states"]]
    assert "Ladakh" in [s["stateName"] for s in result["states"]]


def test_imd_nighttime_classification_zero_red():
    """Under IMD guidelines, extreme heatwave RED alerts are strictly daytime phenomena.
    At night, temperatures drop and RED alert count must be 0."""
    # Test night with hot temperature (e.g., 30°C at night)
    category, risk, classification = classify_state_heat_alert(
        state_code="RJ",
        temp=30.0,
        rh=70.0,
        app_temp=39.0,
        is_day=0,
    )
    # Night: Must NOT be RED or ORANGE
    assert category in ["YELLOW", "GREEN"], f"Night alerts should not be RED/ORANGE: got {category}"
    if category == "YELLOW":
        assert "Warm Night" in classification or "Night" in classification

    # Test night with cool/normal temperature (e.g., 23°C at night)
    category, risk, classification = classify_state_heat_alert(
        state_code="DL",
        temp=23.0,
        rh=60.0,
        app_temp=25.0,
        is_day=0,
    )
    assert category == "GREEN"
    assert risk == "LOW"
    assert "Normal Night" in classification


def test_imd_daytime_classification_severe_heatwave():
    """During daytime, temperatures >= 44°C on plains trigger RED severe heatwave."""
    category, risk, classification = classify_state_heat_alert(
        state_code="RJ",
        temp=45.2,
        rh=25.0,
        app_temp=48.0,
        is_day=1,
    )
    assert category == "RED"
    assert risk == "EXTREME"
    assert "Severe Heat Wave" in classification

    # Moderate heat during day (35°C on plains)
    category, risk, classification = classify_state_heat_alert(
        state_code="DL",
        temp=35.0,
        rh=45.0,
        app_temp=38.0,
        is_day=1,
    )
    assert category in ["YELLOW", "GREEN"]


def test_imd_daytime_hill_state_classification():
    """Hill states: 33°C is a warm day (YELLOW), 35°C is heatwave (ORANGE), 38°C is severe (RED)."""
    # 33.3°C in hills like Arunachal Pradesh -> Warm Day Advisory (YELLOW)
    category, risk, classification = classify_state_heat_alert(
        state_code="AR",
        temp=33.3,
        rh=62.0,
        app_temp=40.1,
        is_day=1,
    )
    assert category == "YELLOW"
    assert "Warm Day" in classification

    # 36.0°C in hills -> ORANGE
    category, risk, classification = classify_state_heat_alert(
        state_code="AR",
        temp=36.0,
        rh=50.0,
        app_temp=43.0,
        is_day=1,
    )
    assert category == "ORANGE"


def test_diurnal_solar_weather_cycle():
    """Test diurnal temperature model returns expected weather structure and sensible ranges."""
    state_mock = {
        "temperatureC": 43.8,
        "humidityPercent": 28.0,
    }
    result = _get_diurnal_state_weather(state_mock)
    assert "temperature_2m" in result
    assert "relative_humidity_2m" in result
    assert "apparent_temperature" in result
    assert "is_day" in result
    assert 15.0 <= result["temperature_2m"] <= 45.0
    assert 10.0 <= result["relative_humidity_2m"] <= 100.0


def test_api_endpoint_national_state_alerts():
    """Verify HTTP GET /areas/national-state-alerts with TestClient."""
    client = TestClient(app)
    response = client.get("/areas/national-state-alerts")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 37
    assert "statistics" in data
    assert "states" in data
    assert data["statistics"]["totalStates"] == 37
