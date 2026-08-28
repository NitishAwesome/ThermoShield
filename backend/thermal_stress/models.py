"""
backend/thermal_stress/models.py

Data contracts and validation models for the Human Thermal Stress module.
Designed for zero-dependency compatibility across the ThermoShield architecture.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any


class ThermalRiskLevel(str, Enum):
    """
    Four-tier prototype thermal stress classification.
    Used for screening and early warning categorization.
    """
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    EXTREME = "EXTREME"


@dataclass
class WeatherInput:
    """
    Standardized meteorological input contract.
    Provided by Zuhaib's Data Ingestion Pipeline or Sumit's Prediction Models.

    Attributes:
        temperature: Dry-bulb ambient air temperature in degrees Celsius (°C).
        relative_humidity: Relative humidity percentage in range [0.0, 100.0] (%).
        wind_speed: Wind speed at 2m/10m height in meters per second (m/s).
        solar_radiation: Optional direct + diffuse solar irradiance in Watts per square meter (W/m²).
                         If None or 0, indoor / shaded conditions are assumed for WBGT.
    """
    temperature: float
    relative_humidity: float
    wind_speed: float = 1.0
    solar_radiation: Optional[float] = None

    def __post_init__(self):
        # Type coercion & sanity validations
        self.temperature = float(self.temperature)
        self.relative_humidity = float(self.relative_humidity)
        self.wind_speed = float(self.wind_speed)
        if self.solar_radiation is not None:
            self.solar_radiation = float(self.solar_radiation)

        # Validation rules
        if not (-40.0 <= self.temperature <= 70.0):
            raise ValueError(f"Temperature {self.temperature}°C is outside realistic terrestrial bounds (-40°C to 70°C).")

        if not (0.0 <= self.relative_humidity <= 100.0):
            raise ValueError(f"Relative humidity {self.relative_humidity}% must be between 0 and 100%.")

        if self.wind_speed < 0.0:
            raise ValueError(f"Wind speed {self.wind_speed} m/s cannot be negative.")

        if self.solar_radiation is not None and self.solar_radiation < 0.0:
            raise ValueError(f"Solar radiation {self.solar_radiation} W/m² cannot be negative.")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "temperature_c": round(self.temperature, 2),
            "relative_humidity_pct": round(self.relative_humidity, 2),
            "wind_speed_mps": round(self.wind_speed, 2),
            "solar_radiation_wm2": round(self.solar_radiation, 2) if self.solar_radiation is not None else None,
        }


@dataclass
class ThermalIndices:
    """
    Computed biometeorological thermal stress indices.
    
    Attributes:
        wbgt_c: Estimated Wet-Bulb Globe Temperature (°C) from meteorological data.
        heat_index_c: NOAA Heat Index (°C), or None if outside the validated domain.
        apparent_temperature_c: Australian Apparent Temperature (°C).
        wet_bulb_temp_c: Estimated Natural Wet-Bulb Temperature (°C) via Stull formula.
    """
    wbgt_c: float
    heat_index_c: Optional[float]
    apparent_temperature_c: float
    wet_bulb_temp_c: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "wbgt_c": round(self.wbgt_c, 1),
            "heat_index_c": round(self.heat_index_c, 1) if self.heat_index_c is not None else None,
            "apparent_temperature_c": round(self.apparent_temperature_c, 1),
            "wet_bulb_temp_c": round(self.wet_bulb_temp_c, 1),
        }


@dataclass
class RiskAssessment:
    """
    Standardized prototype thermal risk assessment.
    
    Attributes:
        level: Prototype classification tier (LOW, MODERATE, HIGH, EXTREME).
        score: Continuous thermal strain score normalized to [0.00, 1.00].
        primary_index: Primary signal used for assessment ("WBGT").
        reason: Diagnostic explanation of thermal stress drivers.
        color_code: Hex color code for UI visual severity representation.
        alert_category: Visual severity tier (GREEN, YELLOW, ORANGE, RED).
    """
    level: str  # LOW, MODERATE, HIGH, EXTREME
    score: float  # Continuous index normalized to [0.00, 1.00]
    primary_index: str  # "WBGT"
    reason: str
    color_code: str  # Hex color for UI representation
    alert_category: str  # GREEN, YELLOW, ORANGE, RED

    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.level,
            "score": round(self.score, 2),
            "primary_index": self.primary_index,
            "reason": self.reason,
            "color_code": self.color_code,
            "alert_category": self.alert_category,
        }


@dataclass
class ThermalStressResult:
    """
    Master response contract returned by the Thermal Stress module.
    Ready for serialization by Ronit's backend and consumption by Sreethu's frontend.
    """
    indices: ThermalIndices
    risk_assessment: RiskAssessment
    advisories: List[str] = field(default_factory=list)
    input_summary: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "indices": self.indices.to_dict(),
            "risk_assessment": self.risk_assessment.to_dict(),
            "advisories": self.advisories,
            "input_summary": self.input_summary,
        }
