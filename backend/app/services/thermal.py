from typing import Optional, Dict, Any

from thermal_stress.models import (
    WeatherInput,
    ThermalStressResult,
)

from thermal_stress.calculator import (
    calculate_heat_index as scientific_heat_index,
    compute_all_indices,
)

from thermal_stress.risk_classifier import (
    classify_risk,
    RiskThresholds,
    DEFAULT_THRESHOLDS,
)

from thermal_stress.advisory import generate_advisories


def calculate_thermal_stress(
    temperature: float,
    humidity: float,
    wind_speed: float = 1.0,
    solar_radiation: Optional[float] = None,
    thresholds: RiskThresholds = DEFAULT_THRESHOLDS,
) -> Dict[str, Any]:
    """
    Calculate complete human thermal stress diagnostics
    using the scientific thermal stress engine.
    """

    # 1. Validate and structure weather input
    weather = WeatherInput(
        temperature=temperature,
        relative_humidity=humidity,
        wind_speed=wind_speed,
        solar_radiation=solar_radiation,
    )

    # 2. Calculate thermal indices
    indices = compute_all_indices(weather)

    # 3. Classify thermal risk
    risk = classify_risk(
        indices=indices,
        weather=weather,
        thresholds=thresholds,
    )

    # 4. Generate heat-stress advisories
    advisories = generate_advisories(
        risk=risk,
        weather=weather,
    )

    # 5. Create final thermal result
    result = ThermalStressResult(
        indices=indices,
        risk_assessment=risk,
        advisories=advisories,
        input_summary=weather.to_dict(),
    )

    return result.to_dict()


def calculate_heat_index(
    temp_c: float,
    humidity: float
) -> Optional[float]:
    """
    Backwards-compatible Heat Index helper.
    """

    return scientific_heat_index(
        temp_c,
        humidity
    )


def classify_heat_stress(
    heat_index: Optional[float]
) -> str:
    """
    Legacy heat-stress classification helper.
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
