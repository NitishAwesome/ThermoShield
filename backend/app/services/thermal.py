"""
backend/app/services/thermal.py

Adapter service bridging Ronit's API layer with Nitish's scientific
Human Thermal Stress engine (backend.thermal_stress).
"""

from typing import Optional, Dict, Any

from backend.thermal_stress.models import (
    WeatherInput,
    ThermalIndices,
    RiskAssessment,
    ThermalStressResult,
    ThermalRiskLevel,
)
from backend.thermal_stress.calculator import (
    calculate_wbgt,
    calculate_heat_index as scientific_heat_index,
    calculate_apparent_temperature,
    calculate_stull_wet_bulb,
    compute_all_indices,
)
from backend.thermal_stress.risk_classifier import (
    classify_risk,
    RiskThresholds,
    DEFAULT_THRESHOLDS,
)
from backend.thermal_stress.advisory import generate_advisories


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
      4. Generates contextual actionable advisories
      5. Returns a JSON-serializable dictionary
    """
    # 1. Create validated WeatherInput
    weather = WeatherInput(
        temperature=temperature,
        relative_humidity=humidity,
        wind_speed=wind_speed,
        solar_radiation=solar_radiation,
    )

    # 2. Compute all scientific indices
    indices = compute_all_indices(weather)

    # 3. Classify thermal risk using WBGT as primary signal
    risk = classify_risk(indices=indices, weather=weather, thresholds=thresholds)

    # 4. Generate actionable advisories
    advisories = generate_advisories(risk=risk, weather=weather)

    # 5. Package as ThermalStressResult and serialize to dict
    result = ThermalStressResult(
        indices=indices,
        risk_assessment=risk,
        advisories=advisories,
        input_summary=weather.to_dict(),
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