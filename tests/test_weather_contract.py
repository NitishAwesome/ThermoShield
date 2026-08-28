import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.weather_contract import (
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

    def test_load_demo_observations(self):
        records = load_demo_observations(include_scenario=True)
        scenarios = {record["scenario"] for record in records}
        self.assertEqual(scenarios, {"LOW", "MODERATE", "HIGH", "EXTREME"})

    def test_demo_observation_for_scenario(self):
        record = demo_observation_for_scenario("extreme")
        self.assertEqual(record["ward"], "Ward-08")
        self.assertGreaterEqual(record["temperature_c"], 40.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
