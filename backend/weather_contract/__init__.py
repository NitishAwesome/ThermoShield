"""Canonical weather contract for ThermoShield prototype."""

from .schema import (
    CanonicalWeatherObservation,
    WeatherContractError,
    demo_observation_for_scenario,
    load_demo_observations,
    validate_canonical_weather,
)

__all__ = [
    "CanonicalWeatherObservation",
    "WeatherContractError",
    "demo_observation_for_scenario",
    "load_demo_observations",
    "validate_canonical_weather",
]
