import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.data_pipeline import clean_weather_record, get_weather_payload, load_sample_weather_records, prepare_weather_dataset


class TestWeatherPipeline(unittest.TestCase):
    def test_load_sample_weather_records(self):
        records = load_sample_weather_records()
        self.assertEqual(len(records), 4)
        self.assertIn("temperature", records[0])
        self.assertIn("timestamp", records[0])

    def test_clean_weather_record_normalizes_values(self):
        raw = {
            "location": "  Sample City  ",
            "ward": " Ward-01 ",
            "temperature": "39.2",
            "humidity": 120,
            "wind_speed": -3,
            "solar_radiation": -50,
            "timestamp": "2026-08-27T09:15:00+05:30",
        }
        cleaned = clean_weather_record(raw)
        self.assertEqual(cleaned.location, "Sample City")
        self.assertEqual(cleaned.ward, "Ward-01")
        self.assertEqual(cleaned.humidity, 100.0)
        self.assertEqual(cleaned.wind_speed, 0.0)
        self.assertEqual(cleaned.solar_radiation, 0.0)

    def test_prepare_weather_dataset(self):
        cleaned = prepare_weather_dataset([
            {
                "location": "City A",
                "ward": "Ward-02",
                "temperature": 35,
                "humidity": 60,
                "wind_speed": 1.5,
                "solar_radiation": 780,
                "timestamp": "2026-08-27T12:00:00+05:30",
            }
        ])
        self.assertEqual(cleaned[0]["ward"], "Ward-02")
        self.assertEqual(cleaned[0]["temperature"], 35.0)

    def test_get_weather_payload(self):
        payload = get_weather_payload("Chennai, Tamil Nadu", "Ward-50")
        self.assertEqual(payload["location"], "Chennai, Tamil Nadu")
        self.assertEqual(payload["ward"], "Ward-50")
        self.assertIn("solar_radiation", payload)

    def test_get_weather_payload_missing_record(self):
        with self.assertRaises(KeyError):
            get_weather_payload("Nowhere", "Ward-99")


if __name__ == "__main__":
    unittest.main(verbosity=2)
