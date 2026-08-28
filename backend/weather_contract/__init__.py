"""Canonical weather contract for ThermoShield prototype."""

from .schema import (
    CanonicalWeatherObservation,
    WeatherContractError,
    canonicalize_open_meteo_payload,
    demo_observation_for_scenario,
    load_demo_observations,
    validate_canonical_weather,
)

__all__ = [
    "CanonicalWeatherObservation",
    "WeatherContractError",
    "canonicalize_open_meteo_payload",
    "demo_observation_for_scenario",
    "load_demo_observations",
    "validate_canonical_weather",
]
