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
        heat_index_status: Operational validity flag ("VALID", "OUTSIDE_VALIDATED_RANGE", "NOT_APPLICABLE_COOL").
    """
    wbgt_c: float
    heat_index_c: Optional[float]
    apparent_temperature_c: float
    wet_bulb_temp_c: float
    heat_index_status: str = "VALID"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "wbgt_c": round(self.wbgt_c, 1),
            "heat_index_c": round(self.heat_index_c, 1) if self.heat_index_c is not None else None,
            "apparent_temperature_c": round(self.apparent_temperature_c, 1),
            "wet_bulb_temp_c": round(self.wet_bulb_temp_c, 1),
            "heat_index_status": self.heat_index_status,
        }


@dataclass
class RiskAssessment:
    """
    Standardized prototype thermal risk assessment.
    
    Attributes:
        level: Prototype classification tier (LOW, MODERATE, HIGH, EXTREME).
        score: Thermal Stress Risk Score normalized to [0.00, 1.00].
               NOTE: This is a normalized biometeorological severity index, NOT a mortality
               probability, heat stroke probability, or clinical individual risk percentage.
        primary_index: Primary signal used for assessment ("WBGT").
        reason: Diagnostic summary explanation of thermal stress level.
        color_code: Hex color code for UI visual severity representation.
        alert_category: Visual severity tier (GREEN, YELLOW, ORANGE, RED).
        risk_basis: Direct biometeorological factors that determined the risk level.
        environmental_factors: Contextual environmental observations (humidity, wind, solar).
    """
    level: str  # LOW, MODERATE, HIGH, EXTREME
    score: float  # Thermal Stress Risk Score normalized to [0.00, 1.00]
    primary_index: str  # "WBGT"
    reason: str
    color_code: str  # Hex color for UI representation
    alert_category: str  # GREEN, YELLOW, ORANGE, RED
    risk_basis: List[str] = field(default_factory=list)
    environmental_factors: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.level,
            "score": round(self.score, 2),
            "primary_index": self.primary_index,
            "reason": self.reason,
            "color_code": self.color_code,
            "alert_category": self.alert_category,
            "risk_basis": self.risk_basis,
            "environmental_factors": self.environmental_factors,
        }


@dataclass
class HydrationGuidance:
    """
    Guideline-based occupational and civic heat-safety hydration guidance.
    
    Attributes:
        priority: Urgency tier ("LOW", "MODERATE", "HIGH", "CRITICAL").
        recommended_interval: Suggested drinking frequency (e.g. "Every 15–20 minutes").
        approximate_amount_ml: Suggested benchmark volume in mL per interval, or None for routine.
        water_ml_per_30_min: Backward-compatible alias for 30-min volume.
        electrolytes_recommended: Whether electrolytes/ORS are advised for prolonged sweating.
        guidance: Human-readable actionable advice.
        basis: Source framework reference (e.g. "NIOSH/OSHA occupational heat-safety guidance").
    """
    priority: str  # LOW, MODERATE, HIGH, CRITICAL
    recommended_interval: str
    approximate_amount_ml: Optional[int]
    electrolytes_recommended: bool
    guidance: str
    basis: str = "NIOSH/OSHA occupational heat-safety guidance"
    water_ml_per_30_min: Optional[int] = None

    def __post_init__(self):
        if self.water_ml_per_30_min is None and self.approximate_amount_ml is not None:
            self.water_ml_per_30_min = self.approximate_amount_ml

    def to_dict(self) -> Dict[str, Any]:
        return {
            "priority": self.priority,
            "recommended_interval": self.recommended_interval,
            "approximate_amount_ml": self.approximate_amount_ml,
            "water_ml_per_30_min": self.water_ml_per_30_min,
            "electrolytes_recommended": self.electrolytes_recommended,
            "guidance": self.guidance,
            "basis": self.basis,
        }


@dataclass
class ActivityGuidance:
    """
    Structured occupational and recreational activity guidance.
    """
    outdoor_activity: str
    heavy_physical_work: str
    rest_guidance: str
    peak_heat_hours: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "outdoor_activity": self.outdoor_activity,
            "heavy_physical_work": self.heavy_physical_work,
            "rest_guidance": self.rest_guidance,
            "peak_heat_hours": self.peak_heat_hours,
        }


@dataclass
class VulnerablePopulationGuidance:
    """
    Targeted demographic guidance for groups vulnerable to heat-related illness.
    """
    priority: bool
    groups: List[str]
    guidance: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "priority": self.priority,
            "groups": self.groups,
            "guidance": self.guidance,
        }


@dataclass
class ThermalStressResult:
    """
    Master response contract returned by the Thermal Stress module.
    Maintains 100% backward compatibility while providing structured SIH guidance.
    """
    indices: ThermalIndices
    risk_assessment: RiskAssessment
    advisories: List[str] = field(default_factory=list)
    hydration: Optional[HydrationGuidance] = None
    activity_guidance: Optional[ActivityGuidance] = None
    vulnerable_population: Optional[VulnerablePopulationGuidance] = None
    input_summary: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "indices": self.indices.to_dict(),
            "risk_assessment": self.risk_assessment.to_dict(),
            "advisories": self.advisories,
        }
        if self.hydration is not None:
            d["hydration"] = self.hydration.to_dict()
        if self.activity_guidance is not None:
            d["activity_guidance"] = self.activity_guidance.to_dict()
        if self.vulnerable_population is not None:
            d["vulnerable_population"] = self.vulnerable_population.to_dict()
        d["input_summary"] = self.input_summary
        return d
