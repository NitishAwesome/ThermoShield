from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from thermal_stress.models import WeatherInput

DATA_FILE = Path(__file__).with_name("demo_fallback.json")


class WeatherContractError(ValueError):
    """Raised when a canonical weather observation fails validation."""


def _coerce_float(value: Any, field_name: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise WeatherContractError(f"Field '{field_name}' must be numeric.") from exc


def _clean_nonempty_text(value: Any, field_name: str) -> str:
    text = str(value).strip()
    if not text:
        raise WeatherContractError(f"Field '{field_name}' cannot be empty.")
    return text


def _parse_timestamp(value: Any) -> datetime:
    if value is None:
        raise WeatherContractError("Field 'timestamp' is required.")

    text = str(value).strip()
    if not text:
        raise WeatherContractError("Field 'timestamp' is required.")

    candidate = text.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError as exc:
        raise WeatherContractError(
            "Field 'timestamp' must be ISO 8601 and timezone-aware."
        ) from exc

    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise WeatherContractError("Field 'timestamp' must be timezone-aware.")

    return parsed


@dataclass(frozen=True)
class CanonicalWeatherObservation:
    location: str
    ward: str
    latitude: float
    longitude: float
    timestamp: datetime
    temperature_c: float
    relative_humidity_pct: float
    wind_speed_mps: float
    solar_radiation_wm2: float

    def __post_init__(self) -> None:
        location = _clean_nonempty_text(self.location, "location")
        ward = _clean_nonempty_text(self.ward, "ward")
        latitude = _coerce_float(self.latitude, "latitude")
        longitude = _coerce_float(self.longitude, "longitude")
        timestamp = _parse_timestamp(self.timestamp)
        temperature_c = _coerce_float(self.temperature_c, "temperature_c")
        relative_humidity_pct = _coerce_float(self.relative_humidity_pct, "relative_humidity_pct")
        wind_speed_mps = _coerce_float(self.wind_speed_mps, "wind_speed_mps")
        solar_radiation_wm2 = _coerce_float(self.solar_radiation_wm2, "solar_radiation_wm2")

        if not (-90.0 <= latitude <= 90.0):
            raise WeatherContractError("Field 'latitude' must be between -90 and 90.")
        if not (-180.0 <= longitude <= 180.0):
            raise WeatherContractError("Field 'longitude' must be between -180 and 180.")
        if not (-40.0 <= temperature_c <= 70.0):
            raise WeatherContractError("Field 'temperature_c' is outside the prototype-safe range (-40 to 70 °C).")
        if not (0.0 <= relative_humidity_pct <= 100.0):
            raise WeatherContractError("Field 'relative_humidity_pct' must be between 0 and 100.")
        if wind_speed_mps < 0.0:
            raise WeatherContractError("Field 'wind_speed_mps' cannot be negative.")
        if solar_radiation_wm2 < 0.0:
            raise WeatherContractError("Field 'solar_radiation_wm2' cannot be negative.")

        object.__setattr__(self, "location", location)
        object.__setattr__(self, "ward", ward)
        object.__setattr__(self, "latitude", latitude)
        object.__setattr__(self, "longitude", longitude)
        object.__setattr__(self, "timestamp", timestamp)
        object.__setattr__(self, "temperature_c", temperature_c)
        object.__setattr__(self, "relative_humidity_pct", relative_humidity_pct)
        object.__setattr__(self, "wind_speed_mps", wind_speed_mps)
        object.__setattr__(self, "solar_radiation_wm2", solar_radiation_wm2)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "location": self.location,
            "ward": self.ward,
            "latitude": round(self.latitude, 4),
            "longitude": round(self.longitude, 4),
            "timestamp": self.timestamp.isoformat(),
            "temperature_c": round(self.temperature_c, 1),
            "relative_humidity_pct": round(self.relative_humidity_pct, 1),
            "wind_speed_mps": round(self.wind_speed_mps, 1),
            "solar_radiation_wm2": round(self.solar_radiation_wm2, 1),
        }

    def to_weather_input(self) -> WeatherInput:
        return WeatherInput(
            temperature=self.temperature_c,
            relative_humidity=self.relative_humidity_pct,
            wind_speed=self.wind_speed_mps,
            solar_radiation=self.solar_radiation_wm2,
        )


def _extract_field(data: Dict[str, Any], *names: str) -> Any:
    for name in names:
        if name in data and data[name] is not None:
            return data[name]
    raise WeatherContractError(f"Missing required field(s): {', '.join(names)}")


def _normalize_wind_speed(value: Any, unit: Optional[str]) -> float:
    speed = _coerce_float(value, "wind_speed_mps")
    normalized_unit = (unit or "ms").strip().lower()
    if normalized_unit in {"kmh", "km/h", "kph", "kmph"}:
        return speed / 3.6
    return speed


def validate_canonical_weather(data: Dict[str, Any] | CanonicalWeatherObservation) -> CanonicalWeatherObservation:
    if isinstance(data, CanonicalWeatherObservation):
        return data
    if not isinstance(data, dict):
        raise WeatherContractError("Canonical weather payload must be a dictionary.")

    required = [
        "location",
        "ward",
        "latitude",
        "longitude",
        "timestamp",
        "temperature_c",
        "relative_humidity_pct",
        "wind_speed_mps",
        "solar_radiation_wm2",
    ]
    missing = [field for field in required if field not in data]
    if missing:
        raise WeatherContractError(f"Missing required field(s): {', '.join(missing)}")

    return CanonicalWeatherObservation(
        location=data["location"],
        ward=data["ward"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        timestamp=data["timestamp"],
        temperature_c=data["temperature_c"],
        relative_humidity_pct=data["relative_humidity_pct"],
        wind_speed_mps=data["wind_speed_mps"],
        solar_radiation_wm2=data["solar_radiation_wm2"],
    )


def canonicalize_open_meteo_payload(
    payload: Dict[str, Any],
    *,
    location: str,
    ward: str,
    latitude: float,
    longitude: float,
) -> CanonicalWeatherObservation:
    """Convert an Open-Meteo response into ThermoShield's canonical contract."""

    if not isinstance(payload, dict):
        raise WeatherContractError("Open-Meteo payload must be a dictionary.")

    current = payload.get("current") if isinstance(payload.get("current"), dict) else payload
    current_units = payload.get("current_units") if isinstance(payload.get("current_units"), dict) else {}

    temperature_c = _coerce_float(
        _extract_field(current, "temperature_2m", "temperature_c", "temperature"),
        "temperature_c",
    )
    relative_humidity_pct = _coerce_float(
        _extract_field(current, "relative_humidity_2m", "relative_humidity_pct", "humidity"),
        "relative_humidity_pct",
    )
    wind_speed_mps = _normalize_wind_speed(
        _extract_field(current, "wind_speed_10m", "wind_speed_mps", "wind_speed"),
        current_units.get("wind_speed_10m") or current_units.get("wind_speed") or payload.get("wind_speed_unit"),
    )
    solar_radiation_wm2 = _coerce_float(
        _extract_field(current, "shortwave_radiation", "solar_radiation_wm2", "solar_radiation"),
        "solar_radiation_wm2",
    )
    timestamp = _parse_timestamp(_extract_field(current, "time", "timestamp"))

    return CanonicalWeatherObservation(
        location=location,
        ward=ward,
        latitude=latitude,
        longitude=longitude,
        timestamp=timestamp,
        temperature_c=temperature_c,
        relative_humidity_pct=relative_humidity_pct,
        wind_speed_mps=wind_speed_mps,
        solar_radiation_wm2=solar_radiation_wm2,
    )


def load_demo_observations(
    dataset_path: Optional[str] = None,
    include_scenario: bool = False,
) -> List[Dict[str, Any]]:
    path = Path(dataset_path) if dataset_path else DATA_FILE
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise WeatherContractError("Demo fallback dataset must be a JSON array of records.")

    cleaned: List[Dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            raise WeatherContractError("Demo fallback dataset entries must be objects.")
        scenario = item.get("scenario")
        record = validate_canonical_weather(item).to_dict()
        if include_scenario and scenario is not None:
            record = {"scenario": scenario, **record}
        cleaned.append(record)
    return cleaned


def demo_observation_for_scenario(
    scenario: str,
    dataset_path: Optional[str] = None,
    include_scenario: bool = False,
) -> Dict[str, Any]:
    normalized = scenario.strip().upper()
    path = Path(dataset_path) if dataset_path else DATA_FILE
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise WeatherContractError("Demo fallback dataset must be a JSON array of records.")

    for item in raw:
        if isinstance(item, dict) and str(item.get("scenario", "")).strip().upper() == normalized:
            validated = validate_canonical_weather(item).to_dict()
            if include_scenario:
                return {"scenario": item["scenario"], **validated}
            return validated

    raise KeyError(f"Scenario '{scenario}' not found in demo fallback dataset.")
