"""
backend/thermal_stress/risk_classifier.py

Human Thermal Stress Risk Classification Engine.
Maps computed biometeorological indices (WBGT, Heat Index) to a 4-tier risk classification:
  - LOW (Green)
  - MODERATE (Yellow)
  - HIGH (Orange)
  - EXTREME (Red)

Scientific Basis & Assumptions:
  - Primary metric: Wet-Bulb Globe Temperature (WBGT in °C).
  - WBGT thresholds are derived from standard occupational safety guidelines (ACGIH, ISO 7243)
    and sports medicine acclimatization thresholds (ACSM).
  - Secondary failsafe: Extreme NOAA Heat Index (HI >= 54°C) or absolute temperature (Ta >= 45°C)
    triggers escalation to EXTREME risk.
  - Risk score is a normalized prototype metric [0.00 - 1.00] representing physiological heat strain.
"""

from dataclasses import dataclass
from backend.thermal_stress.models import ThermalRiskLevel, RiskAssessment, ThermalIndices, WeatherInput


@dataclass
class RiskThresholds:
    """
    Configurable thermal stress threshold definitions.
    Enables customization for regional acclimatization (e.g. tropical vs temperate).
    """
    wbgt_low_max: float = 28.0       # < 28.0 °C: Low thermal strain
    wbgt_moderate_max: float = 31.0  # 28.0 - 31.0 °C: Moderate heat stress (caution)
    wbgt_high_max: float = 33.0      # 31.0 - 33.0 °C: High heat stress (severe risk)
    # >= 33.0 °C: Extreme heat stress (critical risk / heat stroke danger)

    hi_danger_threshold: float = 41.0   # NOAA Heat Index Danger threshold (°C)
    hi_extreme_threshold: float = 54.0  # NOAA Heat Index Extreme Danger threshold (°C)
    temp_extreme_alert: float = 45.0    # Absolute air temperature triggering IMD Red Alert (°C)


DEFAULT_THRESHOLDS = RiskThresholds()


def calculate_normalized_risk_score(wbgt_c: float, min_wbgt: float = 20.0, max_wbgt: float = 35.0) -> float:
    """
    Computes a continuous normalized risk score between 0.00 and 1.00.
    Maps baseline comfortable conditions (20°C WBGT = 0.00) to critical thermal limits (35°C WBGT = 1.00).
    """
    score = (wbgt_c - min_wbgt) / (max_wbgt - min_wbgt)
    clamped_score = max(0.0, min(1.0, score))
    return round(clamped_score, 2)


def classify_risk(
    indices: ThermalIndices,
    weather: WeatherInput,
    thresholds: RiskThresholds = DEFAULT_THRESHOLDS
) -> RiskAssessment:
    """
    Classifies human thermal stress into 4 standardized tiers.
    
    Returns:
        RiskAssessment containing level, score, primary_index, reason, color_code, and alert_category.
    """
    wbgt = indices.wbgt_c
    hi = indices.heat_index_c
    ta = weather.temperature

    score = calculate_normalized_risk_score(wbgt)

    # 1. EXTREME Level (Red Alert)
    if wbgt >= thresholds.wbgt_high_max or hi >= thresholds.hi_extreme_threshold or ta >= thresholds.temp_extreme_alert:
        return RiskAssessment(
            level=ThermalRiskLevel.EXTREME.value,
            score=max(0.85, score),
            primary_index="WBGT",
            reason=f"Critical thermal strain (WBGT: {wbgt:.1f}°C, HI: {hi:.1f}°C). Imminent risk of heat stroke under physical exertion.",
            color_code="#E74C3C",  # Vibrant Red
            alert_category="RED",
        )

    # 2. HIGH Level (Orange Alert)
    if wbgt >= thresholds.wbgt_moderate_max or hi >= thresholds.hi_danger_threshold:
        return RiskAssessment(
            level=ThermalRiskLevel.HIGH.value,
            score=max(0.65, score),
            primary_index="WBGT",
            reason=f"Severe thermal stress (WBGT: {wbgt:.1f}°C, HI: {hi:.1f}°C). Elevated risk of heat cramps, exhaustion, and dehydration.",
            color_code="#E67E22",  # Vibrant Orange
            alert_category="ORANGE",
        )

    # 3. MODERATE Level (Yellow Alert)
    if wbgt >= thresholds.wbgt_low_max or hi >= 32.0:
        return RiskAssessment(
            level=ThermalRiskLevel.MODERATE.value,
            score=max(0.35, score),
            primary_index="WBGT",
            reason=f"Moderate thermal discomfort (WBGT: {wbgt:.1f}°C). Prolonged physical exertion may cause fatigue.",
            color_code="#F1C40F",  # Amber/Yellow
            alert_category="YELLOW",
        )

    # 4. LOW Level (Green / Safe)
    return RiskAssessment(
        level=ThermalRiskLevel.LOW.value,
        score=score,
        primary_index="WBGT",
        reason=f"Normal thermal comfort range (WBGT: {wbgt:.1f}°C). Minimal heat-related physiological stress.",
        color_code="#2ECC71",  # Vibrant Green
        alert_category="GREEN",
    )
