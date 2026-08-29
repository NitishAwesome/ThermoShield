"""
tests/test_thermal_stress.py

Unit test suite for the ThermoShield Human Thermal Stress Module (Nitish).
Covers:
  - Input validation & boundary constraints (humidity, wind speed, temperature bounds)
  - Mathematical index calculations (WBGT, Heat Index with domain validation, Apparent Temp, Stull Wet-Bulb)
  - Prototype Risk classification tiers (LOW, MODERATE, HIGH, EXTREME) when HI is present or None
  - Advisory generation logic
  - Serialization contracts for Ronit's backend
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
    ThermalStressResult,
    ThermalRiskLevel,
    calculate_wbgt,
    calculate_heat_index,
    calculate_apparent_temperature,
    calculate_stull_wet_bulb,
    classify_risk,
    generate_advisories,
)


class TestThermalStressModule(unittest.TestCase):

    # -------------------------------------------------------------
    # 1. Input Validation & Edge Cases
    # -------------------------------------------------------------
    def test_01_valid_normal_input(self):
        """Test standard normal day inputs."""
        weather = WeatherInput(temperature=28.0, relative_humidity=50.0, wind_speed=2.0, solar_radiation=400.0)
        self.assertEqual(weather.temperature, 28.0)
        self.assertEqual(weather.relative_humidity, 50.0)
        self.assertEqual(weather.wind_speed, 2.0)
        self.assertEqual(weather.solar_radiation, 400.0)

    def test_02_invalid_humidity_below_zero(self):
        """Test rejection of relative humidity < 0%."""
        with self.assertRaises(ValueError):
            WeatherInput(temperature=30.0, relative_humidity=-5.0)

    def test_03_invalid_humidity_above_100(self):
        """Test rejection of relative humidity > 100%."""
        with self.assertRaises(ValueError):
            WeatherInput(temperature=30.0, relative_humidity=105.0)

    def test_04_negative_wind_speed(self):
        """Test rejection of negative wind speed."""
        with self.assertRaises(ValueError):
            WeatherInput(temperature=30.0, relative_humidity=50.0, wind_speed=-2.0)

    def test_05_negative_solar_radiation(self):
        """Test rejection of negative solar radiation."""
        with self.assertRaises(ValueError):
            WeatherInput(temperature=30.0, relative_humidity=50.0, solar_radiation=-10.0)

    def test_06_unrealistic_temperature_bounds(self):
        """Test rejection of physiologically impossible terrestrial temperatures."""
        with self.assertRaises(ValueError):
            WeatherInput(temperature=85.0, relative_humidity=50.0)
        with self.assertRaises(ValueError):
            WeatherInput(temperature=-60.0, relative_humidity=50.0)

    def test_07_optional_solar_radiation_none(self):
        """Test that solar_radiation can be omitted / None (defaults to shaded/indoor)."""
        result = analyze_thermal_stress(temperature=30.0, relative_humidity=50.0, wind_speed=1.5, solar_radiation=None)
        self.assertIsNotNone(result.indices.wbgt_c)
        self.assertIsNone(result.input_summary["solar_radiation_wm2"])

    # -------------------------------------------------------------
    # 2. Biometeorological Index Calculations & Domain Validity
    # -------------------------------------------------------------
    def test_08_stull_wet_bulb_calculation(self):
        """Test Stull wet-bulb formula against known meteorological baseline."""
        # At 30°C and 50% RH, wet-bulb is approx 22.0°C - 23.0°C
        tw = calculate_stull_wet_bulb(temperature_c=30.0, relative_humidity_pct=50.0)
        self.assertTrue(21.5 <= tw <= 23.5, f"Tw {tw} out of expected range")

    def test_09_wbgt_outdoor_vs_indoor(self):
        """Test that outdoor estimated WBGT with solar load is higher than shaded WBGT."""
        wbgt_indoor = calculate_wbgt(temperature_c=35.0, relative_humidity_pct=60.0, solar_radiation_wm2=None)
        wbgt_outdoor = calculate_wbgt(temperature_c=35.0, relative_humidity_pct=60.0, wind_speed_mps=1.0, solar_radiation_wm2=800.0)
        self.assertGreater(wbgt_outdoor, wbgt_indoor, "Solar load should increase estimated WBGT")

    def test_10_heat_index_calculation_valid_moderate(self):
        """Test NOAA Heat Index within valid domain produces accurate metric."""
        # At 35°C (95°F) and 60% RH, NOAA Heat Index is approx 45°C - 49°C
        hi = calculate_heat_index(temperature_c=35.0, relative_humidity_pct=60.0)
        self.assertIsNotNone(hi)
        self.assertTrue(45.0 <= hi <= 49.0, f"HI {hi} out of expected range")

    def test_11_heat_index_cool_temperature_returns_none(self):
        """Test that Heat Index returns None when T < 20°C (inactive domain)."""
        hi = calculate_heat_index(temperature_c=16.0, relative_humidity_pct=80.0)
        self.assertIsNone(hi)

    def test_12_heat_index_extreme_out_of_domain_returns_none(self):
        """Test that extreme co-occurrences (e.g. 45°C + 58% RH) return None rather than misleading runaway values."""
        hi = calculate_heat_index(temperature_c=45.0, relative_humidity_pct=58.0)
        self.assertIsNone(hi)

    def test_13_apparent_temperature_wind_cooling(self):
        """Test that higher wind speed reduces Apparent Temperature."""
        at_low_wind = calculate_apparent_temperature(temperature_c=32.0, relative_humidity_pct=50.0, wind_speed_mps=0.5)
        at_high_wind = calculate_apparent_temperature(temperature_c=32.0, relative_humidity_pct=50.0, wind_speed_mps=5.0)
        self.assertGreater(at_low_wind, at_high_wind, "Higher wind should enhance convective cooling")

    # -------------------------------------------------------------
    # 3. Risk Classification & Tiers
    # -------------------------------------------------------------
    def test_14_risk_classification_low(self):
        """Test LOW risk tier for comfortable weather."""
        result = analyze_thermal_stress(temperature=24.0, relative_humidity=40.0, wind_speed=2.0, solar_radiation=200.0)
        self.assertEqual(result.risk_assessment.level, ThermalRiskLevel.LOW.value)
        self.assertEqual(result.risk_assessment.alert_category, "GREEN")
        self.assertLess(result.risk_assessment.score, 0.40)

    def test_15_risk_classification_moderate(self):
        """Test MODERATE risk tier for warm condition."""
        result = analyze_thermal_stress(temperature=34.0, relative_humidity=35.0, wind_speed=2.2, solar_radiation=550.0)
        self.assertEqual(result.risk_assessment.level, ThermalRiskLevel.MODERATE.value)
        self.assertEqual(result.risk_assessment.alert_category, "YELLOW")

    def test_16_risk_classification_high(self):
        """Test HIGH risk tier for humid hot condition."""
        result = analyze_thermal_stress(temperature=36.0, relative_humidity=60.0, wind_speed=2.0, solar_radiation=600.0)
        self.assertEqual(result.risk_assessment.level, ThermalRiskLevel.HIGH.value)
        self.assertEqual(result.risk_assessment.alert_category, "ORANGE")

    def test_17_risk_classification_extreme_with_none_heat_index(self):
        """Test EXTREME risk tier functions reliably when Heat Index is None (driven by WBGT and ambient temp)."""
        result = analyze_thermal_stress(temperature=45.0, relative_humidity=58.0, wind_speed=0.9, solar_radiation=950.0)
        self.assertEqual(result.risk_assessment.level, ThermalRiskLevel.EXTREME.value)
        self.assertEqual(result.risk_assessment.alert_category, "RED")
        self.assertIsNone(result.indices.heat_index_c)
        self.assertGreaterEqual(result.risk_assessment.score, 0.85)

    # -------------------------------------------------------------
    # 4. Advisories & Data Serialization
    # -------------------------------------------------------------
    def test_18_advisory_generation_exists(self):
        """Test that advisories are non-empty and relevant."""
        result = analyze_thermal_stress(temperature=42.0, relative_humidity=60.0, wind_speed=1.0, solar_radiation=850.0)
        self.assertIsInstance(result.advisories, list)
        self.assertGreaterEqual(len(result.advisories), 3)

    def test_19_serialization_to_dict_handles_none(self):
        """Test that to_dict produces valid dictionary structure with null heat_index_c when out of domain."""
        result = analyze_thermal_stress(temperature=45.0, relative_humidity=60.0, wind_speed=1.0, solar_radiation=800.0)
        d = result.to_dict()
        self.assertIn("indices", d)
        self.assertIn("risk_assessment", d)
        self.assertIn("advisories", d)
        self.assertIn("input_summary", d)
        self.assertIn("wbgt_c", d["indices"])
        self.assertIn("heat_index_c", d["indices"])
        self.assertIsNone(d["indices"]["heat_index_c"])
        self.assertIn("score", d["risk_assessment"])

    def test_20_nighttime_zero_solar_wbgt_and_explainability(self):
        """Test that zero solar radiation produces indoor/shaded WBGT and no false radiant heat factors."""
        result = analyze_thermal_stress(temperature=28.0, relative_humidity=75.0, wind_speed=3.0, solar_radiation=0.0)
        # With solar = 0.0, WBGT = 0.7 * Tw + 0.3 * Ta
        tw = calculate_stull_wet_bulb(28.0, 75.0)
        expected_wbgt = 0.7 * tw + 0.3 * 28.0
        self.assertAlmostEqual(result.indices.wbgt_c, expected_wbgt, places=2)
        # Environmental factors must NOT mention radiant heat load
        for factor in result.risk_assessment.environmental_factors:
            self.assertNotIn("solar radiation", factor.lower())
            self.assertNotIn("radiant heat burden", factor.lower())

    def test_21_daytime_vs_nighttime_wbgt_differential(self):
        """Test that adding solar radiation strictly increases WBGT due to radiant solar load on the black globe."""
        night = analyze_thermal_stress(temperature=32.0, relative_humidity=60.0, wind_speed=2.0, solar_radiation=0.0)
        day = analyze_thermal_stress(temperature=32.0, relative_humidity=60.0, wind_speed=2.0, solar_radiation=750.0)
        self.assertGreater(day.indices.wbgt_c, night.indices.wbgt_c)


if __name__ == "__main__":
    unittest.main(verbosity=2)
