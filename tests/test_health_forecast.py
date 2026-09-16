import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.health_forecast import (
    generate_health_impact_forecast,
    get_all_wards_forecast_summary,
    ML_TRANSPARENCY_DISCLAIMER,
)

client = TestClient(app)


import asyncio


def test_generate_health_impact_forecast_structure():
    """Verify 5-day health forecast produces valid thermal and health proxy metrics."""
    res = asyncio.run(generate_health_impact_forecast(
        latitude=19.0760,
        longitude=72.8777,
        area_name="Ward F/South",
        area_id="ward_f_south",
        vulnerability_score=75.0
    ))

    assert res["area_id"] == "ward_f_south"
    assert res["days_count"] == 5
    assert len(res["forecast_days"]) == 5

    # STRICT SCIENTIFIC HONESTY: Verify no fake death or hospital casualty figures appear in keys
    raw_str = str(res).lower()
    assert "deaths" not in raw_str
    assert "hospital admissions expected" not in raw_str
    assert "casualties" not in raw_str

    # Verify each day has biometeorological & honest proxy outputs
    for day in res["forecast_days"]:
        assert "estimated_wbgt_c" in day
        assert "heat_index_c" in day
        assert "projected_health_impact_proxy" in day
        assert "civic_health_concern" in day
        assert day["civic_health_concern"] in ["LOW", "MODERATE", "HIGH", "SEVERE", "CRITICAL"]
        assert 0.0 <= day["projected_health_impact_proxy"] <= 100.0

    # Lead time intelligence
    lead = res["lead_time_intelligence"]
    assert "peak_concern_day" in lead
    assert "summary_directive" in lead
    assert len(lead["summary_directive"]) > 10

    # ML disclaimer present
    assert res["ml_transparency_disclaimer"] == ML_TRANSPARENCY_DISCLAIMER


def test_get_all_wards_forecast_summary():
    """Verify multi-day forecast risk summary across all administrative wards for GIS recoloring."""
    wards = asyncio.run(get_all_wards_forecast_summary())
    assert len(wards) >= 5

    for ward in wards:
        assert "ward_id" in ward
        assert "ward_name" in ward
        assert "latitude" in ward
        assert "longitude" in ward
        assert len(ward["forecast_days"]) == 5
        for fd in ward["forecast_days"]:
            assert "day_index" in fd
            assert "risk_level" in fd
            assert "health_concern" in fd
            assert "health_concern_color" in fd


def test_api_forecast_health_impact_endpoints():
    """Verify GET /api/forecast/health-impact and /api/forecast/wards-summary."""
    # 1. Health impact forecast endpoint
    res = client.get("/api/forecast/health-impact?area_id=ward_f_south")
    assert res.status_code == 200
    data = res.json()
    assert data["area_id"] == "ward_f_south"
    assert len(data["forecast_days"]) == 5
    assert "lead_time_intelligence" in data

    # 2. Wards summary endpoint
    res_wards = client.get("/api/forecast/wards-summary")
    assert res_wards.status_code == 200
    data_wards = res_wards.json()
    assert data_wards["count"] >= 5
    assert len(data_wards["wards"]) >= 5
