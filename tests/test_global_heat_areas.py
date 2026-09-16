import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.global_areas import (
    GLOBAL_AREAS,
    get_all_global_areas_overview,
)

client = TestClient(app)


def test_global_areas_catalog_completeness():
    """Verify that global areas cover multi-continental zones and have valid coordinates."""
    assert len(GLOBAL_AREAS) >= 35, "Expected at least 35 global areas"
    
    regions = {h["region"] for h in GLOBAL_AREAS}
    expected_regions = {
        "Middle East & Gulf",
        "South Asia",
        "North America",
        "Europe & Mediterranean",
        "Africa & Sahel",
        "East & SE Asia",
    }
    for er in expected_regions:
        assert er in regions, f"Expected region {er} to be present in global areas catalog"

    for area in GLOBAL_AREAS:
        assert -90 <= area["latitude"] <= 90, f"Invalid latitude for {area['name']}: {area['latitude']}"
        assert -180 <= area["longitude"] <= 180, f"Invalid longitude for {area['name']}: {area['longitude']}"
        assert area["default_temp"] > 0, f"Expected positive temperature for {area['name']}"
        assert 0 <= area["default_rh"] <= 100, f"Invalid humidity for {area['name']}"
        assert "vulnerability_tag" in area


def test_global_areas_risk_overview_api():
    """Test the /areas/global-risk-overview endpoint."""
    response = client.get("/areas/global-risk-overview")
    assert response.status_code == 200
    data = response.json()
    assert "areas" in data
    assert "count" in data
    assert data["count"] >= 35
    assert len(data["areas"]) == data["count"]

    # Verify first item structure
    first = data["areas"][0]
    assert "name" in first
    assert "state" in first
    assert "region" in first
    assert "latitude" in first
    assert "longitude" in first
    assert "temperature_c" in first
    assert "wbgt_c" in first
    assert "risk_level" in first
    assert "risk_score" in first


def test_global_areas_risk_overview_filtered():
    """Test the /areas/global-risk-overview endpoint with region filter."""
    response = client.get("/areas/global-risk-overview?region=South%20Asia")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 5
    for area in data["areas"]:
        assert area["region"] == "South Asia"
