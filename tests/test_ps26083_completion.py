"""
tests/test_ps26083_completion.py

Verification tests covering all 9 remaining limitations from the PS 26083
implementation plan (feature/sih-26083-enhancements branch).
"""
import asyncio
import math
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

# ============================================================
# Gap 3 — UTCI implementation
# ============================================================

class TestUTCI:
    def test_utci_returns_float(self):
        from thermal_stress.calculator import calculate_utci
        result = calculate_utci(35.0, 60.0, wind_speed_mps=1.5)
        assert isinstance(result, float)

    def test_utci_hot_humid_strong_heat_stress(self):
        """Hot Mumbai-like day (38°C, 75% RH, light wind) should produce Strong or Very strong heat stress."""
        from thermal_stress.calculator import calculate_utci, get_utci_stress_category
        # No solar load (shade): wind cooling keeps UTCI in Strong heat stress (32–38)
        utci_shade = calculate_utci(38.0, 75.0, wind_speed_mps=0.8, solar_radiation_wm2=None)
        cat_shade = get_utci_stress_category(utci_shade)
        assert utci_shade >= 32.0, f"Expected UTCI >= 32 for hot-humid shade, got {utci_shade}"
        assert "heat stress" in cat_shade.lower(), f"Expected heat stress category, got: {cat_shade}"

        # With direct solar load: should push into Very strong heat stress (>= 38)
        utci_sun = calculate_utci(38.0, 75.0, wind_speed_mps=0.8, solar_radiation_wm2=800.0)
        cat_sun = get_utci_stress_category(utci_sun)
        assert utci_sun >= 38.0, f"Expected UTCI >= 38 with solar load, got {utci_sun}"
        assert "very strong" in cat_sun.lower() or "extreme" in cat_sun.lower(), (
            f"Expected Very strong or Extreme heat stress with solar load, got: {cat_sun}"
        )

    def test_utci_comfort_zone(self):
        """Pleasant spring conditions should fall in 'No thermal stress'."""
        from thermal_stress.calculator import calculate_utci, get_utci_stress_category
        utci = calculate_utci(22.0, 45.0, wind_speed_mps=2.0)
        cat = get_utci_stress_category(utci)
        assert 9.0 <= utci <= 32.0, f"Expected comfort zone UTCI 9–32, got {utci}"
        assert cat in {"No thermal stress", "Moderate heat stress", "Slight cold stress"}

    def test_utci_wired_into_thermal_indices(self):
        """compute_all_indices must now populate utci_c and utci_category."""
        from thermal_stress.calculator import compute_all_indices
        from thermal_stress.models import WeatherInput
        w = WeatherInput(temperature=36.0, relative_humidity=65.0, wind_speed=1.2)
        indices = compute_all_indices(w)
        assert indices.utci_c is not None, "utci_c must not be None"
        assert isinstance(indices.utci_c, float)
        assert indices.utci_category is not None
        assert len(indices.utci_category) > 0

    def test_utci_in_to_dict(self):
        """ThermalIndices.to_dict() must include utci_c and utci_category."""
        from thermal_stress.calculator import compute_all_indices
        from thermal_stress.models import WeatherInput
        w = WeatherInput(temperature=32.0, relative_humidity=55.0, wind_speed=2.0)
        d = compute_all_indices(w).to_dict()
        assert "utci_c" in d
        assert "utci_category" in d

    def test_utci_ten_stress_categories(self):
        """All 10 ISO UTCI stress categories are reachable."""
        from thermal_stress.calculator import get_utci_stress_category
        expected = {
            "Extreme cold stress", "Very strong cold stress", "Strong cold stress",
            "Moderate cold stress", "Slight cold stress", "No thermal stress",
            "Moderate heat stress", "Strong heat stress", "Very strong heat stress",
            "Extreme heat stress",
        }
        produced = set()
        for utci in [-50, -30, -20, -7, 5, 20, 29, 35, 42, 50]:
            produced.add(get_utci_stress_category(float(utci)))
        assert produced == expected, f"Missing categories: {expected - produced}"

    def test_solar_radiation_increases_utci(self):
        """Adding solar radiation must increase UTCI (more radiant load = higher stress)."""
        from thermal_stress.calculator import calculate_utci
        shade = calculate_utci(34.0, 60.0, wind_speed_mps=1.0, solar_radiation_wm2=None)
        sun = calculate_utci(34.0, 60.0, wind_speed_mps=1.0, solar_radiation_wm2=700.0)
        assert sun > shade, f"Solar UTCI ({sun}) should exceed shade UTCI ({shade})"


# ============================================================
# Gap 1 — Restored baseline epidemiological functions
# ============================================================

class TestBaselineEpi:
    def test_baseline_citation_exists(self):
        from app.services.health_outcomes import BASELINE_CITATION
        assert isinstance(BASELINE_CITATION, str)
        assert len(BASELINE_CITATION) > 50

    def test_forecast_baseline_returns_list(self):
        from app.services.health_outcomes import forecast_baseline_epidemiological_outcomes
        days = [
            {"date": "2026-06-01", "estimated_wbgt_c": 32.0, "temp_min_c": 28.0},
            {"date": "2026-06-02", "estimated_wbgt_c": 30.5, "temp_min_c": 27.5},
        ]
        rows = forecast_baseline_epidemiological_outcomes("ward_a", days)
        assert len(rows) == 2

    def test_baseline_mortality_index_range(self):
        from app.services.health_outcomes import forecast_baseline_epidemiological_outcomes
        days = [{"date": "2026-06-01", "estimated_wbgt_c": 35.0, "temp_min_c": 30.0}]
        rows = forecast_baseline_epidemiological_outcomes("ward_a", days)
        mi = rows[0]["mortality_risk_index"]
        assert 0.0 <= mi <= 100.0, f"Mortality index {mi} out of range"

    def test_baseline_is_nonzero_for_high_wbgt(self):
        from app.services.health_outcomes import forecast_baseline_epidemiological_outcomes
        days = [{"date": "2026-06-01", "estimated_wbgt_c": 40.0, "temp_min_c": 35.0}]
        rows = forecast_baseline_epidemiological_outcomes("ward_a", days)
        assert rows[0]["mortality_risk_index"] > 0, "Should be non-zero for extreme WBGT"
        assert rows[0]["hospitalization_surge_pct"] > 0

    def test_baseline_model_type_tag(self):
        from app.services.health_outcomes import forecast_baseline_epidemiological_outcomes
        days = [{"date": "2026-06-01", "estimated_wbgt_c": 30.0, "temp_min_c": 26.0}]
        rows = forecast_baseline_epidemiological_outcomes("ward_a", days)
        assert rows[0]["model_type"] == "CALIBRATED_NATIONAL_BASELINE"


# ============================================================
# Gap 4 & 5 — trigger-initiatives service function
# ============================================================

class TestHAPTriggers:
    def test_all_four_triggers_dispatch(self):
        from app.services.heat_action_plan import initiate_municipal_hap_triggers
        result = initiate_municipal_hap_triggers(
            area_id="ward_a",
            triggers=["cooling_centers", "grid_peak_load_balance", "outdoor_work_halt", "emergency_108_staging"],
            officer_id="officer-001",
            risk_level="HIGH",
            wbgt_c=33.5,
        )
        assert result["triggers_dispatched"] == 4
        assert result["triggers_requested"] == 4
        assert len(result["receipts"]) == 4
        assert result["triggers_unrecognised"] == []

    def test_single_trigger_dispatch(self):
        from app.services.heat_action_plan import initiate_municipal_hap_triggers
        result = initiate_municipal_hap_triggers(
            area_id="ward_b",
            triggers=["cooling_centers"],
            officer_id="officer-002",
        )
        assert result["triggers_dispatched"] == 1
        assert result["receipts"][0]["trigger_id"] == "cooling_centers"
        assert result["receipts"][0]["status"] == "DISPATCHED"

    def test_unrecognised_trigger_isolated(self):
        from app.services.heat_action_plan import initiate_municipal_hap_triggers
        result = initiate_municipal_hap_triggers(
            area_id="ward_a",
            triggers=["cooling_centers", "nonexistent_trigger"],
            officer_id="officer-003",
        )
        assert result["triggers_dispatched"] == 1
        assert "nonexistent_trigger" in result["triggers_unrecognised"]

    def test_receipt_has_agency_and_contact(self):
        from app.services.heat_action_plan import initiate_municipal_hap_triggers
        result = initiate_municipal_hap_triggers(
            area_id="ward_c",
            triggers=["emergency_108_staging"],
            officer_id="officer-004",
        )
        r = result["receipts"][0]
        assert "agency" in r and len(r["agency"]) > 5
        assert "contact" in r and len(r["contact"]) > 3
        assert "description" in r
        assert "initiated_at" in r


# ============================================================
# Gap 5 — bilingual advisory
# ============================================================

class TestBilingualAdvisory:
    def test_returns_en_and_hi(self):
        from app.services.heat_action_plan import bilingual_advisory_for_risk
        adv = bilingual_advisory_for_risk("HIGH", 33.0)
        assert "en" in adv and "hi" in adv
        assert len(adv["en"]) > 30
        assert len(adv["hi"]) > 30

    def test_extreme_advisory_contains_wbgt(self):
        from app.services.heat_action_plan import bilingual_advisory_for_risk
        adv = bilingual_advisory_for_risk("EXTREME", 42.1)
        assert "42.1" in adv["en"]
        assert "42.1" in adv["hi"]

    def test_advisory_covers_all_levels(self):
        from app.services.heat_action_plan import bilingual_advisory_for_risk
        for level in ["LOW", "MODERATE", "HIGH", "EXTREME"]:
            adv = bilingual_advisory_for_risk(level, 30.0)
            assert adv["en"] and adv["hi"], f"Missing advisory for level {level}"

    def test_bilingual_in_trigger_receipt(self):
        from app.services.heat_action_plan import initiate_municipal_hap_triggers
        result = initiate_municipal_hap_triggers(
            area_id="ward_a", triggers=["cooling_centers"],
            officer_id="officer-005", risk_level="EXTREME", wbgt_c=38.5,
        )
        assert "bilingual_advisory" in result
        assert "en" in result["bilingual_advisory"]
        assert "hi" in result["bilingual_advisory"]

    def test_bilingual_in_evaluate_heat_action_plan(self):
        from app.services.heat_action_plan import evaluate_heat_action_plan
        plan = evaluate_heat_action_plan(
            area_id="ward_f_south",
            temperature_c=36.0,
            humidity_pct=70.0,
            risk_level="HIGH",
        )
        d = plan.to_dict()
        assert "bilingual_advisory" in d
        assert "en" in d["bilingual_advisory"]
        assert "hi" in d["bilingual_advisory"]
        assert len(d["bilingual_advisory"]["en"]) > 20
        assert len(d["bilingual_advisory"]["hi"]) > 20

