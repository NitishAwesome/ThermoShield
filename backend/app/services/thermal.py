"""
backend/app/services/thermal.py

Adapter service bridging Ronit's API layer with Nitish's scientific
Human Thermal Stress engine (backend.thermal_stress).
"""

from typing import Optional, Dict, Any

from backend.thermal_stress import (
    analyze_thermal_stress,
    calculate_heat_index as scientific_heat_index,
    RiskThresholds,
    DEFAULT_THRESHOLDS,
)


def calculate_thermal_stress(
    temperature: float,
    humidity: float,
    wind_speed: float = 1.0,
    solar_radiation: Optional[float] = None,
    thresholds: RiskThresholds = DEFAULT_THRESHOLDS,
) -> Dict[str, Any]:
    """
    Adapter endpoint for FastAPI to compute complete human thermal stress diagnostics.
    
    Delegates calculation to backend.thermal_stress modules:
      1. Validates and structures input via WeatherInput
      2. Computes biometeorological indices (WBGT, Heat Index, Apparent Temp, Stull Wet-Bulb)
      3. Performs 4-tier prototype risk classification (driven primarily by WBGT)
      4. Generates actionable advisories, structured hydration, activity, and vulnerable population guidance
      5. Returns a JSON-serializable dictionary
    """
    result = analyze_thermal_stress(
        temperature=temperature,
        relative_humidity=humidity,
        wind_speed=wind_speed,
        solar_radiation=solar_radiation,
        thresholds=thresholds,
    )
    return result.to_dict()


def calculate_heat_index(temp_c: float, humidity: float) -> Optional[float]:
    """
    Backwards-compatible helper for existing API services (e.g. risk/map services).
    Delegates directly to the validated scientific Heat Index implementation.
    """
    return scientific_heat_index(temp_c, humidity)


def classify_heat_stress(heat_index: Optional[float]) -> str:
    """
    Backwards-compatible legacy helper.
    """
    if heat_index is None:
        return "LOW"
    if heat_index < 27:
        return "LOW"
    if heat_index < 32:
        return "MODERATE"
    if heat_index < 41:
        return "HIGH"
    return "EXTREME"