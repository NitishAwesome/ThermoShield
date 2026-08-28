import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.weather_contract import (
    canonicalize_open_meteo_payload,
    demo_observation_for_scenario,
    load_demo_observations,
    validate_canonical_weather,
)


class TestWeatherContract(unittest.TestCase):
    def test_validate_canonical_weather(self):
        payload = {
            "location": "Ward 22, Chennai, Tamil Nadu",
            "ward": "Ward-22",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "timestamp": "2026-08-27T10:30:00+05:30",
            "temperature_c": 34.8,
            "relative_humidity_pct": 56.0,
            "wind_speed_mps": 1.9,
            "solar_radiation_wm2": 620.0,
        }
        obs = validate_canonical_weather(payload)
        self.assertEqual(obs.ward, "Ward-22")
        self.assertEqual(obs.to_dict()["timestamp"], "2026-08-27T10:30:00+05:30")

    def test_validation_rejects_relative_humidity_out_of_range(self):
        payload = {
            "location": "Ward 22, Chennai, Tamil Nadu",
            "ward": "Ward-22",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "timestamp": "2026-08-27T10:30:00+05:30",
            "temperature_c": 34.8,
            "relative_humidity_pct": 120.0,
            "wind_speed_mps": 1.9,
            "solar_radiation_wm2": 620.0,
        }
        with self.assertRaises(ValueError):
            validate_canonical_weather(payload)

    def test_validation_rejects_invalid_coordinates(self):
        payload = {
            "location": "Ward 22, Chennai, Tamil Nadu",
            "ward": "Ward-22",
            "latitude": 113.0,
            "longitude": 80.2707,
            "timestamp": "2026-08-27T10:30:00+05:30",
            "temperature_c": 34.8,
            "relative_humidity_pct": 56.0,
            "wind_speed_mps": 1.9,
            "solar_radiation_wm2": 620.0,
        }
        with self.assertRaises(ValueError):
            validate_canonical_weather(payload)

    def test_validation_rejects_negative_wind_speed(self):
        payload = {
            "location": "Ward 22, Chennai, Tamil Nadu",
            "ward": "Ward-22",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "timestamp": "2026-08-27T10:30:00+05:30",
            "temperature_c": 34.8,
            "relative_humidity_pct": 56.0,
            "wind_speed_mps": -1.0,
            "solar_radiation_wm2": 620.0,
        }
        with self.assertRaises(ValueError):
            validate_canonical_weather(payload)

    def test_validation_rejects_negative_solar_radiation(self):
        payload = {
            "location": "Ward 22, Chennai, Tamil Nadu",
            "ward": "Ward-22",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "timestamp": "2026-08-27T10:30:00+05:30",
            "temperature_c": 34.8,
            "relative_humidity_pct": 56.0,
            "wind_speed_mps": 1.9,
            "solar_radiation_wm2": -1.0,
        }
        with self.assertRaises(ValueError):
            validate_canonical_weather(payload)

    def test_validation_rejects_missing_fields(self):
        payload = {
            "location": "Ward 22, Chennai, Tamil Nadu",
            "ward": "Ward-22",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "timestamp": "2026-08-27T10:30:00+05:30",
            "temperature_c": 34.8,
            "relative_humidity_pct": 56.0,
            "wind_speed_mps": 1.9,
        }
        with self.assertRaises(ValueError):
            validate_canonical_weather(payload)

    def test_validation_rejects_naive_timestamp(self):
        payload = {
            "location": "Ward 22, Chennai, Tamil Nadu",
            "ward": "Ward-22",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "timestamp": "2026-08-27T10:30:00",
            "temperature_c": 34.8,
            "relative_humidity_pct": 56.0,
            "wind_speed_mps": 1.9,
            "solar_radiation_wm2": 620.0,
        }
        with self.assertRaises(ValueError):
            validate_canonical_weather(payload)

    def test_validation_accepts_timezone_aware_timestamp(self):
        payload = {
            "location": "Ward 22, Chennai, Tamil Nadu",
            "ward": "Ward-22",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "timestamp": "2026-08-27T10:30:00+05:30",
            "temperature_c": 34.8,
            "relative_humidity_pct": 56.0,
            "wind_speed_mps": 1.9,
            "solar_radiation_wm2": 620.0,
        }
        obs = validate_canonical_weather(payload)
        self.assertEqual(obs.to_dict()["timestamp"], "2026-08-27T10:30:00+05:30")

    def test_load_demo_observations(self):
        records = load_demo_observations(include_scenario=True)
        scenarios = {record["scenario"] for record in records}
        self.assertEqual(scenarios, {"LOW", "MODERATE", "HIGH", "EXTREME"})

    def test_demo_observation_for_scenario(self):
        record = demo_observation_for_scenario("extreme")
        self.assertEqual(record["ward"], "Ward-08")
        self.assertGreaterEqual(record["temperature_c"], 40.0)

    def test_correct_wind_speed_units_from_open_meteo_kmh(self):
        payload = {
            "current": {
                "temperature_2m": 36.0,
                "relative_humidity_2m": 55.0,
                "wind_speed_10m": 18.0,
                "shortwave_radiation": 700.0,
                "time": "2026-08-27T10:30:00+05:30",
            },
            "current_units": {
                "wind_speed_10m": "kmh",
            },
        }
        obs = canonicalize_open_meteo_payload(
            payload,
            location="Test City",
            ward="Ward-1",
            latitude=13.0,
            longitude=80.0,
        )
        self.assertAlmostEqual(obs.wind_speed_mps, 5.0, places=3)


if __name__ == "__main__":
    unittest.main(verbosity=2)
