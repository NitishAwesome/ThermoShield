"""
tests/test_thermal_stress.py

Unit test suite for the ThermoShield Human Thermal Stress Module (Nitish).
Covers:
  - Input validation & boundary constraints (humidity, wind speed, temperature bounds)
  - Mathematical index calculations (WBGT, Heat Index, Apparent Temp, Stull Wet-Bulb)
  - Risk classification tiers (LOW, MODERATE, HIGH, EXTREME)
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
    # 2. Biometeorological Index Calculations
    # -------------------------------------------------------------
    def test_08_stull_wet_bulb_calculation(self):
        """Test Stull wet-bulb formula against known meteorological baseline."""
        # At 30°C and 50% RH, wet-bulb is approx 22.0°C - 23.0°C
        tw = calculate_stull_wet_bulb(temperature_c=30.0, relative_humidity_pct=50.0)
        self.assertTrue(21.5 <= tw <= 23.5, f"Tw {tw} out of expected range")

    def test_09_wbgt_outdoor_vs_indoor(self):
        """Test that outdoor WBGT with solar load is higher than shaded WBGT."""
        wbgt_indoor = calculate_wbgt(temperature_c=35.0, relative_humidity_pct=60.0, solar_radiation_wm2=None)
        wbgt_outdoor = calculate_wbgt(temperature_c=35.0, relative_humidity_pct=60.0, wind_speed_mps=1.0, solar_radiation_wm2=800.0)
        self.assertGreater(wbgt_outdoor, wbgt_indoor, "Solar load should increase WBGT")

    def test_10_heat_index_calculation_moderate(self):
        """Test NOAA Heat Index for standard hot/humid condition."""
        # At 35°C (95°F) and 60% RH, NOAA Heat Index is approx 45°C - 48°C (114°F - 118°F)
        hi = calculate_heat_index(temperature_c=35.0, relative_humidity_pct=60.0)
        self.assertTrue(44.0 <= hi <= 49.0, f"HI {hi} out of expected range")

    def test_11_heat_index_cool_temperature_fallback(self):
        """Test that Heat Index safely falls back to ambient temp when T < 20°C."""
        hi = calculate_heat_index(temperature_c=16.0, relative_humidity_pct=80.0)
        self.assertEqual(hi, 16.0)

    def test_12_apparent_temperature_wind_cooling(self):
        """Test that higher wind speed reduces Apparent Temperature."""
        at_low_wind = calculate_apparent_temperature(temperature_c=32.0, relative_humidity_pct=50.0, wind_speed_mps=0.5)
        at_high_wind = calculate_apparent_temperature(temperature_c=32.0, relative_humidity_pct=50.0, wind_speed_mps=5.0)
        self.assertGreater(at_low_wind, at_high_wind, "Higher wind should enhance convective cooling")

    # -------------------------------------------------------------
    # 3. Risk Classification & Tiers
    # -------------------------------------------------------------
    def test_13_risk_classification_low(self):
        """Test LOW risk tier for comfortable weather."""
        result = analyze_thermal_stress(temperature=24.0, relative_humidity=40.0, wind_speed=2.0, solar_radiation=200.0)
        self.assertEqual(result.risk_assessment.level, ThermalRiskLevel.LOW.value)
        self.assertEqual(result.risk_assessment.alert_category, "GREEN")
        self.assertLess(result.risk_assessment.score, 0.40)

    def test_14_risk_classification_moderate(self):
        """Test MODERATE risk tier for warm condition."""
        result = analyze_thermal_stress(temperature=33.0, relative_humidity=45.0, wind_speed=2.0, solar_radiation=500.0)
        self.assertEqual(result.risk_assessment.level, ThermalRiskLevel.MODERATE.value)
        self.assertEqual(result.risk_assessment.alert_category, "YELLOW")

    def test_15_risk_classification_high(self):
        """Test HIGH risk tier for muggy hot condition."""
        result = analyze_thermal_stress(temperature=36.0, relative_humidity=60.0, wind_speed=2.0, solar_radiation=600.0)
        self.assertEqual(result.risk_assessment.level, ThermalRiskLevel.HIGH.value)
        self.assertEqual(result.risk_assessment.alert_category, "ORANGE")

    def test_16_risk_classification_extreme(self):
        """Test EXTREME risk tier for severe heatwave emergency."""
        result = analyze_thermal_stress(temperature=45.0, relative_humidity=65.0, wind_speed=0.8, solar_radiation=900.0)
        self.assertEqual(result.risk_assessment.level, ThermalRiskLevel.EXTREME.value)
        self.assertEqual(result.risk_assessment.alert_category, "RED")
        self.assertGreaterEqual(result.risk_assessment.score, 0.85)

    # -------------------------------------------------------------
    # 4. Advisories & Data Contracts
    # -------------------------------------------------------------
    def test_17_advisory_generation_exists(self):
        """Test that advisories are non-empty and relevant."""
        result = analyze_thermal_stress(temperature=42.0, relative_humidity=60.0, wind_speed=1.0, solar_radiation=850.0)
        self.assertIsInstance(result.advisories, list)
        self.assertGreaterEqual(len(result.advisories), 3)

    def test_18_serialization_to_dict(self):
        """Test that to_dict produces valid dictionary structure for Ronit's API."""
        result = analyze_thermal_stress(temperature=38.0, relative_humidity=55.0, wind_speed=2.0, solar_radiation=700.0)
        d = result.to_dict()
        self.assertIn("indices", d)
        self.assertIn("risk_assessment", d)
        self.assertIn("advisories", d)
        self.assertIn("input_summary", d)
        self.assertIn("wbgt_c", d["indices"])
        self.assertIn("heat_index_c", d["indices"])
        self.assertIn("score", d["risk_assessment"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
