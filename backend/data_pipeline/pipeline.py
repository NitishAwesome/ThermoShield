from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


DATA_FILE = Path(__file__).with_name("sample_weather_data.json")


@dataclass(frozen=True)
class WeatherRecord:
    """Canonical weather observation shared with downstream modules."""

    location: str
    ward: str
    temperature: float
    humidity: float
    wind_speed: float
    solar_radiation: float
    timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "location": self.location,
            "ward": self.ward,
            "temperature": round(self.temperature, 1),
            "humidity": round(self.humidity, 1),
            "wind_speed": round(self.wind_speed, 1),
            "solar_radiation": round(self.solar_radiation, 1),
            "timestamp": self.timestamp,
        }


_REQUIRED_FIELDS = (
    "location",
    "ward",
    "temperature",
    "humidity",
    "wind_speed",
    "solar_radiation",
    "timestamp",
)


def _coerce_float(value: Any, field_name: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Field '{field_name}' must be numeric.") from exc


def _clean_timestamp(value: Any) -> str:
    if value is None:
        raise ValueError("Field 'timestamp' is required.")

    text = str(value).strip()
    if not text:
        raise ValueError("Field 'timestamp' is required.")

    candidate = text.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError as exc:
        raise ValueError(
            "Field 'timestamp' must be ISO 8601, for example 2026-08-27T13:00:00+05:30."
        ) from exc

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed.isoformat()


def clean_weather_record(record: Dict[str, Any]) -> WeatherRecord:
    """Validate and normalize one raw weather observation."""

    missing = [field for field in _REQUIRED_FIELDS if field not in record]
    if missing:
        raise ValueError(f"Missing required field(s): {', '.join(missing)}")

    location = str(record["location"]).strip()
    ward = str(record["ward"]).strip()
    if not location:
        raise ValueError("Field 'location' cannot be empty.")
    if not ward:
        raise ValueError("Field 'ward' cannot be empty.")

    temperature = _coerce_float(record["temperature"], "temperature")
    humidity = _coerce_float(record["humidity"], "humidity")
    wind_speed = _coerce_float(record["wind_speed"], "wind_speed")
    solar_radiation = _coerce_float(record["solar_radiation"], "solar_radiation")

    # Basic cleaning suitable for the prototype demo.
    humidity = max(0.0, min(100.0, humidity))
    wind_speed = max(0.0, wind_speed)
    solar_radiation = max(0.0, solar_radiation)

    if not (-40.0 <= temperature <= 70.0):
        raise ValueError("Field 'temperature' is outside the prototype-safe range (-40 to 70 °C).")

    timestamp = _clean_timestamp(record["timestamp"])

    return WeatherRecord(
        location=location,
        ward=ward,
        temperature=temperature,
        humidity=humidity,
        wind_speed=wind_speed,
        solar_radiation=solar_radiation,
        timestamp=timestamp,
    )


def load_sample_weather_records(dataset_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Load the bundled sample dataset and return cleaned canonical records."""

    path = Path(dataset_path) if dataset_path else DATA_FILE
    with path.open("r", encoding="utf-8") as handle:
        raw_records = json.load(handle)

    if not isinstance(raw_records, list):
        raise ValueError("Sample weather dataset must be a JSON array of records.")

    return [clean_weather_record(item).to_dict() for item in raw_records]


def prepare_weather_dataset(records: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Clean a batch of raw records so downstream modules get one consistent contract."""

    return [clean_weather_record(record).to_dict() for record in records]


def get_weather_payload(
    location: str,
    ward: str,
    dataset_path: Optional[str] = None,
) -> Dict[str, Any]:
    """Return one cleaned weather observation for the requested location/ward pair."""

    records = load_sample_weather_records(dataset_path=dataset_path)
    normalized_location = location.strip().lower()
    normalized_ward = ward.strip().lower()

    for record in records:
        if (
            record["location"].strip().lower() == normalized_location
            and record["ward"].strip().lower() == normalized_ward
        ):
            return record

    raise KeyError(f"No weather record found for location='{location}' and ward='{ward}'.")
