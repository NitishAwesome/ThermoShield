"""
tests/test_thermal_stress.py

Comprehensive scientific test suite for the ThermoShield Human Thermal Stress Module (Nitish).
Covers:
  - Input validation & physical constraints
  - Mathematical index calculations & Heat Index validity envelope
  - Primary WBGT signal dominance across all 4 risk tiers
  - Guideline-based hydration guidance (LOW, MODERATE, HIGH, EXTREME) with source basis
  - Explainability separation: risk_basis vs environmental_factors
  - Thermal Stress Risk Score bounds [0.00, 1.00] and normalized severity documentation
  - Structured activity and vulnerable population guidance
  - Backward compatibility & dictionary serialization
"""

import sys
import os
import unittest

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.thermal_stress import (
    analyze_thermal_stress,
    WeatherInput,
    ThermalIndices,
    RiskAssessment,
    HydrationGuidance,
    ActivityGuidance,
    VulnerablePopulationGuidance,
    ThermalStressResult,
    ThermalRiskLevel,
    calculate_wbgt,
    calculate_heat_index,
    get_heat_index_status,
    calculate_apparent_temperature,
    calculate_stull_wet_bulb,
    classify_risk,
    generate_advisories,
    generate_hydration_guidance,
    generate_activity_guidance,
    generate_vulnerable_population_guidance,
)


class TestThermalStressModule(unittest.TestCase):

    # -------------------------------------------------------------
    # 1. Input Validation & Physical Bounds
    # -------------------------------------------------------------
    def test_01_valid_normal_input(self):
        """Test standard normal day inputs."""
        weather = WeatherInput(temperature=28.0, relative_humidity=50.0, wind_speed=2.0, solar_radiation=400.0)
        self.assertEqual(weather.temperature, 28.0)
        self.assertEqual(weather.relative_humidity, 50.0)
        self.assertEqual(weather.wind_speed, 2.0)
        self.assertEqual(weather.solar_radiation, 400.0)

    def test_02_invalid_humidity_bounds(self):
        """Test rejection of relative humidity < 0% or > 100%."""
        with self.assertRaises(ValueError):
            WeatherInput(temperature=30.0, relative_humidity=-5.0)
        with self.assertRaises(ValueError):
            WeatherInput(temperature=30.0, relative_humidity=105.0)

    def test_03_invalid_negative_wind_or_solar(self):
        """Test rejection of negative wind speed and negative solar radiation."""
        with self.assertRaises(ValueError):
            WeatherInput(temperature=30.0, relative_humidity=50.0, wind_speed=-2.0)
        with self.assertRaises(ValueError):
            WeatherInput(temperature=30.0, relative_humidity=50.0, solar_radiation=-10.0)

    def test_04_unrealistic_temperature_bounds(self):
        """Test rejection of physiologically impossible terrestrial temperatures."""
        with self.assertRaises(ValueError):
            WeatherInput(temperature=85.0, relative_humidity=50.0)
        with self.assertRaises(ValueError):
            WeatherInput(temperature=-60.0, relative_humidity=50.0)

    def test_05_optional_solar_radiation_none(self):
        """Test that solar_radiation can be omitted / None (shaded/indoor assumption)."""
        result = analyze_thermal_stress(temperature=30.0, relative_humidity=50.0, wind_speed=1.5, solar_radiation=None)
        self.assertIsNotNone(result.indices.wbgt_c)
        self.assertIsNone(result.input_summary["solar_radiation_wm2"])

    # -------------------------------------------------------------
    # 2. Biometeorological Calculations & Heat Index Validity Envelope
    # -------------------------------------------------------------
    def test_06_stull_wet_bulb_calculation(self):
        """Test Stull wet-bulb formula against known meteorological baseline."""
        tw = calculate_stull_wet_bulb(temperature_c=30.0, relative_humidity_pct=50.0)
        self.assertTrue(21.5 <= tw <= 23.5, f"Tw {tw} out of expected range")

    def test_07_wbgt_outdoor_vs_indoor(self):
        """Test that outdoor estimated WBGT with solar load is higher than shaded WBGT."""
        wbgt_indoor = calculate_wbgt(temperature_c=35.0, relative_humidity_pct=60.0, solar_radiation_wm2=None)
        wbgt_outdoor = calculate_wbgt(temperature_c=35.0, relative_humidity_pct=60.0, wind_speed_mps=1.0, solar_radiation_wm2=800.0)
        self.assertGreater(wbgt_outdoor, wbgt_indoor, "Solar load should increase estimated WBGT")

    def test_08_heat_index_valid_range(self):
        """Test NOAA Heat Index within valid domain produces accurate metric and VALID status."""
        hi = calculate_heat_index(temperature_c=35.0, relative_humidity_pct=60.0)
        status = get_heat_index_status(temperature_c=35.0, relative_humidity_pct=60.0)
        self.assertIsNotNone(hi)
        self.assertEqual(status, "VALID")
        self.assertTrue(45.0 <= hi <= 49.0, f"HI {hi} out of expected range")

    def test_09_heat_index_cool_temperature_cutoff(self):
        """Test that Heat Index returns None when T < 20°C with NOT_APPLICABLE_COOL status."""
        hi = calculate_heat_index(temperature_c=16.0, relative_humidity_pct=80.0)
        status = get_heat_index_status(temperature_c=16.0, relative_humidity_pct=80.0)
        self.assertIsNone(hi)
        self.assertEqual(status, "NOT_APPLICABLE_COOL")

    def test_10_heat_index_outside_validated_range_extreme(self):
        """Test that extreme co-occurrences (e.g. 45°C + 58% RH) return None with OUTSIDE_VALIDATED_RANGE status."""
        hi = calculate_heat_index(temperature_c=45.0, relative_humidity_pct=58.0)
        status = get_heat_index_status(temperature_c=45.0, relative_humidity_pct=58.0)
        self.assertIsNone(hi)
        self.assertEqual(status, "OUTSIDE_VALIDATED_RANGE")

    def test_11_apparent_temperature_wind_cooling(self):
        """Test that higher wind speed reduces Apparent Temperature."""
        at_low_wind = calculate_apparent_temperature(temperature_c=32.0, relative_humidity_pct=50.0, wind_speed_mps=0.5)
        at_high_wind = calculate_apparent_temperature(temperature_c=32.0, relative_humidity_pct=50.0, wind_speed_mps=5.0)
        self.assertGreater(at_low_wind, at_high_wind, "Higher wind should enhance convective cooling")

    # -------------------------------------------------------------
    # 3. Primary WBGT Signal Dominance & Risk Score Properties
    # -------------------------------------------------------------
    def test_12_wbgt_remains_primary_signal_all_tiers(self):
        """Test that WBGT drives the primary classification across all 4 tiers."""
        low_res = analyze_thermal_stress(temperature=24.0, relative_humidity=40.0, wind_speed=2.0)
        mod_res = analyze_thermal_stress(temperature=34.0, relative_humidity=35.0, wind_speed=2.2, solar_radiation=550.0)
        high_res = analyze_thermal_stress(temperature=36.0, relative_humidity=60.0, wind_speed=2.0, solar_radiation=600.0)
        ext_res = analyze_thermal_stress(temperature=45.0, relative_humidity=58.0, wind_speed=0.9, solar_radiation=950.0)

        self.assertEqual(low_res.risk_assessment.level, "LOW")
        self.assertEqual(mod_res.risk_assessment.level, "MODERATE")
        self.assertEqual(high_res.risk_assessment.level, "HIGH")
        self.assertEqual(ext_res.risk_assessment.level, "EXTREME")

        for res in [low_res, mod_res, high_res, ext_res]:
            self.assertEqual(res.risk_assessment.primary_index, "WBGT")
            self.assertTrue(0.0 <= res.risk_assessment.score <= 1.0)

    # -------------------------------------------------------------
    # 4. Guideline-Based Hydration Guidance & Basis Verification
    # -------------------------------------------------------------
    def test_13_hydration_guidance_low_risk(self):
        """Test LOW risk hydration: general public health guidance, no forced quota."""
        result = analyze_thermal_stress(temperature=24.0, relative_humidity=40.0, wind_speed=2.0)
        h = result.hydration
        self.assertIsNotNone(h)
        self.assertEqual(h.priority, "LOW")
        self.assertIsNone(h.approximate_amount_ml)
        self.assertFalse(h.electrolytes_recommended)
        self.assertIn("General", h.basis)
        self.assertIn("baseline", h.guidance.lower())

    def test_14_hydration_guidance_moderate_risk(self):
        """Test MODERATE risk hydration: planned fluid intake with NIOSH/OSHA basis."""
        result = analyze_thermal_stress(temperature=34.0, relative_humidity=35.0, wind_speed=2.2, solar_radiation=550.0)
        h = result.hydration
        self.assertIsNotNone(h)
        self.assertEqual(h.priority, "MODERATE")
        self.assertEqual(h.approximate_amount_ml, 150)
        self.assertIn("NIOSH/OSHA", h.basis)

    def test_15_hydration_guidance_high_risk(self):
        """Test HIGH risk hydration: ~240 mL every 15-20 min, electrolytes recommended."""
        result = analyze_thermal_stress(temperature=36.0, relative_humidity=60.0, wind_speed=2.0, solar_radiation=600.0)
        h = result.hydration
        self.assertIsNotNone(h)
        self.assertEqual(h.priority, "HIGH")
        self.assertEqual(h.approximate_amount_ml, 240)
        self.assertTrue(h.electrolytes_recommended)
        self.assertIn("NIOSH/OSHA", h.basis)
        self.assertIn("15–20 minutes", h.recommended_interval)

    def test_16_hydration_guidance_extreme_risk(self):
        """Test EXTREME risk hydration: ~240 mL every 15-20 min, electrolytes, excessive intake warning."""
        result = analyze_thermal_stress(temperature=45.0, relative_humidity=58.0, wind_speed=0.9, solar_radiation=950.0)
        h = result.hydration
        self.assertIsNotNone(h)
        self.assertEqual(h.priority, "CRITICAL")
        self.assertEqual(h.approximate_amount_ml, 240)
        self.assertTrue(h.electrolytes_recommended)
        self.assertIn("NIOSH/OSHA", h.basis)
        self.assertIn("1.4 l", h.guidance.lower())  # Hyponatremia safety warning

    def test_17_hydration_does_not_claim_individual_calculated_needs(self):
        """Test that guidance notes individual variance rather than calculated mathematical prescription."""
        result = analyze_thermal_stress(temperature=42.0, relative_humidity=60.0, wind_speed=1.5, solar_radiation=800.0)
        self.assertIn("individual", result.hydration.guidance.lower())

    # -------------------------------------------------------------
    # 5. Explainability: Separation of risk_basis & environmental_factors
    # -------------------------------------------------------------
    def test_18_low_response_environmental_factors_not_blamed_as_risk_basis(self):
        """Test that LOW response lists humidity as an observation without claiming it drove high risk."""
        result = analyze_thermal_stress(temperature=24.0, relative_humidity=85.0, wind_speed=3.5, solar_radiation=300.0)
        self.assertEqual(result.risk_assessment.level, "LOW")

        # risk_basis states WBGT is within LOW comfort range
        self.assertTrue(any("LOW" in b for b in result.risk_assessment.risk_basis))

        # environmental_factors mentions humidity observation
        env_text = " ".join(result.risk_assessment.environmental_factors).lower()
        self.assertIn("humidity", env_text)

    def test_19_high_response_identifies_wbgt_as_primary_risk_basis(self):
        """Test that HIGH response explicitly attributes risk basis to WBGT threshold."""
        result = analyze_thermal_stress(temperature=36.0, relative_humidity=60.0, wind_speed=2.0, solar_radiation=600.0)
        self.assertEqual(result.risk_assessment.level, "HIGH")

        basis_text = " ".join(result.risk_assessment.risk_basis).lower()
        self.assertIn("wbgt", basis_text)
        self.assertIn("high-risk", basis_text)

    def test_20_extreme_response_identifies_solar_wind_temperature(self):
        """Test that EXTREME response identifies solar load, stagnant wind, and high air temp."""
        result = analyze_thermal_stress(temperature=45.0, relative_humidity=58.0, wind_speed=0.9, solar_radiation=950.0)
        self.assertEqual(result.risk_assessment.level, "EXTREME")

        all_explain = " ".join(result.risk_assessment.risk_basis + result.risk_assessment.environmental_factors).lower()
        self.assertIn("wbgt", all_explain)
        self.assertIn("solar", all_explain)
        self.assertIn("wind", all_explain)
        self.assertIn("temperature", all_explain)

    # -------------------------------------------------------------
    # 6. Activity & Vulnerable Population Guidance
    # -------------------------------------------------------------
    def test_21_activity_guidance_adapts_to_risk(self):
        """Test that activity guidance scales work/rest cycles according to risk tier."""
        low_res = analyze_thermal_stress(temperature=24.0, relative_humidity=40.0)
        ext_res = analyze_thermal_stress(temperature=45.0, relative_humidity=58.0, solar_radiation=900.0)

        self.assertIn("normal", low_res.activity_guidance.outdoor_activity.lower())
        self.assertIn("avoid", ext_res.activity_guidance.outdoor_activity.lower())
        self.assertIn("suspension", ext_res.activity_guidance.heavy_physical_work.lower())

    def test_22_vulnerable_population_prioritization(self):
        """Test vulnerable population priority flag and target groups."""
        low_res = analyze_thermal_stress(temperature=24.0, relative_humidity=40.0)
        ext_res = analyze_thermal_stress(temperature=45.0, relative_humidity=58.0, solar_radiation=900.0)

        self.assertFalse(low_res.vulnerable_population.priority)
        self.assertTrue(ext_res.vulnerable_population.priority)
        self.assertTrue(any("elderly" in g for g in ext_res.vulnerable_population.groups))

    # -------------------------------------------------------------
    # 7. Serialization & API Contract Backward Compatibility
    # -------------------------------------------------------------
    def test_23_serialization_contains_all_root_and_nested_keys(self):
        """Test that to_dict includes all existing and new structured keys."""
        result = analyze_thermal_stress(temperature=36.0, relative_humidity=60.0, wind_speed=2.0, solar_radiation=600.0)
        d = result.to_dict()

        # Root keys
        self.assertIn("indices", d)
        self.assertIn("risk_assessment", d)
        self.assertIn("advisories", d)
        self.assertIn("hydration", d)
        self.assertIn("activity_guidance", d)
        self.assertIn("vulnerable_population", d)
        self.assertIn("input_summary", d)

        # Risk assessment subkeys
        self.assertIn("risk_basis", d["risk_assessment"])
        self.assertIn("environmental_factors", d["risk_assessment"])
        self.assertIn("score", d["risk_assessment"])

        # Hydration subkeys
        self.assertIn("basis", d["hydration"])
        self.assertIn("recommended_interval", d["hydration"])
        self.assertIn("approximate_amount_ml", d["hydration"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
