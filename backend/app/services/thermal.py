from typing import Optional, Dict, Any

from backend.thermal_stress import (
    analyze_thermal_stress,
    calculate_heat_index as scientific_heat_index,
    classify_risk,
    ThermalIndices,
)


def calculate_thermal_stress(
    temperature: float,
    humidity: float,
    wind_speed: float = 1.0,
    solar_radiation: Optional[float] = None
) -> Dict[str, Any]:
    """
    Adapter function connecting FastAPI routes to the biometeorological
    thermal stress calculation engine.
    """
    result = analyze_thermal_stress(
        temperature=temperature,
        relative_humidity=humidity,
        wind_speed=wind_speed,
        solar_radiation=solar_radiation
    )
    return result.to_dict()


def calculate_heat_index(
    temperature: float,
    humidity: float
) -> Optional[float]:
    """
    Standalone Heat Index helper.
    """
    return scientific_heat_index(temperature, humidity)


def classify_heat_stress(
    wbgt: float,
    heat_index: Optional[float] = None
) -> str:
    """
    Standalone risk classification helper.
    """
    indices = ThermalIndices(
        wbgt_c=wbgt,
        heat_index_c=heat_index,
        apparent_temperature_c=wbgt,
        wet_bulb_temp_c=wbgt,
        vapor_pressure_kpa=1.0,
    )
    risk = classify_risk(indices=indices)
    return risk.level.value
