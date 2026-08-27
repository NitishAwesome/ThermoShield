"""
backend/thermal_stress

ThermoShield Human Thermal Stress & Biometeorological Intelligence Module.
SIH 2026 Problem Statement: SIH26083

Exports:
  - analyze_thermal_stress: Primary unified pipeline function
  - Data models: WeatherInput, ThermalIndices, RiskAssessment, HydrationGuidance,
                 ActivityGuidance, VulnerablePopulationGuidance, ThermalStressResult, ThermalRiskLevel
  - Calculation functions: calculate_wbgt, calculate_heat_index, calculate_apparent_temperature,
                           calculate_stull_wet_bulb, calculate_vapor_pressure, compute_all_indices,
                           get_heat_index_status
  - Risk engine: classify_risk, calculate_normalized_risk_score, generate_explainability_factors
  - Advisory engine: generate_advisories, generate_hydration_guidance, generate_activity_guidance,
                     generate_vulnerable_population_guidance
"""

from typing import Optional, Union, Dict, Any
from backend.thermal_stress.models import (
    WeatherInput,
    ThermalIndices,
    RiskAssessment,
    HydrationGuidance,
    ActivityGuidance,
    VulnerablePopulationGuidance,
    ThermalStressResult,
    ThermalRiskLevel,
)
from backend.thermal_stress.calculator import (
    calculate_wbgt,
    calculate_heat_index,
    get_heat_index_status,
    calculate_apparent_temperature,
    calculate_stull_wet_bulb,
    calculate_vapor_pressure,
    compute_all_indices,
)
from backend.thermal_stress.risk_classifier import (
    classify_risk,
    calculate_normalized_risk_score,
    generate_explainability_factors,
    RiskThresholds,
    DEFAULT_THRESHOLDS,
)
from backend.thermal_stress.advisory import (
    generate_advisories,
    generate_hydration_guidance,
    generate_activity_guidance,
    generate_vulnerable_population_guidance,
)


def analyze_thermal_stress(
    temperature: float,
    relative_humidity: float,
    wind_speed: float = 1.0,
    solar_radiation: Optional[float] = None,
    thresholds: RiskThresholds = DEFAULT_THRESHOLDS,
) -> ThermalStressResult:
    """
    Unified entry-point for the Human Thermal Stress module.
    
    Accepts raw meteorological inputs (from Zuhaib's Data Pipeline or Sumit's AI predictions)
    and returns a structured, presentation-ready ThermalStressResult.

    Args:
        temperature: Dry-bulb ambient air temperature in °C.
        relative_humidity: Relative humidity percentage in [0.0, 100.0] %.
        wind_speed: Wind speed in m/s (default 1.0 m/s).
        solar_radiation: Solar irradiance in W/m² (optional).
        thresholds: Configurable RiskThresholds instance.

    Returns:
        ThermalStressResult containing numerical indices, risk assessment with explainability factors,
        human-readable advisories, structured hydration guidance, activity guidance,
        vulnerable population guidance, and input summary.
    """
    # 1. Validate & structure input
    weather = WeatherInput(
        temperature=temperature,
        relative_humidity=relative_humidity,
        wind_speed=wind_speed,
        solar_radiation=solar_radiation,
    )

    # 2. Compute thermal indices (WBGT, Heat Index, Apparent Temp, Wet Bulb)
    indices = compute_all_indices(weather)

    # 3. Classify thermal risk level, score & explainability factors
    risk = classify_risk(indices=indices, weather=weather, thresholds=thresholds)

    # 4. Generate contextual health advisories & structured guidance
    advisories = generate_advisories(risk=risk, weather=weather)
    hydration = generate_hydration_guidance(risk=risk, weather=weather)
    activity_guidance = generate_activity_guidance(risk=risk, weather=weather)
    vulnerable_population = generate_vulnerable_population_guidance(risk=risk, weather=weather)

    # 5. Return unified response contract
    return ThermalStressResult(
        indices=indices,
        risk_assessment=risk,
        advisories=advisories,
        hydration=hydration,
        activity_guidance=activity_guidance,
        vulnerable_population=vulnerable_population,
        input_summary=weather.to_dict(),
    )


__all__ = [
    "analyze_thermal_stress",
    "WeatherInput",
    "ThermalIndices",
    "RiskAssessment",
    "HydrationGuidance",
    "ActivityGuidance",
    "VulnerablePopulationGuidance",
    "ThermalStressResult",
    "ThermalRiskLevel",
    "RiskThresholds",
    "DEFAULT_THRESHOLDS",
    "calculate_wbgt",
    "calculate_heat_index",
    "get_heat_index_status",
    "calculate_apparent_temperature",
    "calculate_stull_wet_bulb",
    "calculate_vapor_pressure",
    "compute_all_indices",
    "classify_risk",
    "calculate_normalized_risk_score",
    "generate_explainability_factors",
    "generate_advisories",
    "generate_hydration_guidance",
    "generate_activity_guidance",
    "generate_vulnerable_population_guidance",
]
