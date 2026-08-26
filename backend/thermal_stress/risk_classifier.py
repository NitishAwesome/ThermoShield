"""
backend/thermal_stress/risk_classifier.py

Prototype Human Thermal Stress Risk Classification Engine.
Maps computed biometeorological indices (Estimated WBGT, Heat Index) to a 4-tier prototype classification:
  - LOW (Green visual severity)
  - MODERATE (Yellow visual severity)
  - HIGH (Orange visual severity)
  - EXTREME (Red visual severity)

Scientific Basis & Assumptions:
  - Primary metric: Estimated Wet-Bulb Globe Temperature (WBGT in °C).
  - WBGT thresholds are derived from standard occupational safety guidelines (ACGIH, ISO 7243)
    and sports medicine acclimatization screening thresholds (ACSM).
  - IMPORTANT DISCLAIMER: These are simplified prototype screening bands. Official occupational
    WBGT guidance depends on metabolic workload, acclimatization, clothing/PPE, and individual physiology.
    These bands are NOT official IMD alert thresholds.
  - Secondary supporting signals: Valid NOAA Heat Index (when available within validated domain)
    or extreme ambient temperature (Ta >= 45°C as a prototype safety rule).
  - Risk score is a normalized prototype metric [0.00 - 1.00] representing physiological heat strain.
"""

from dataclasses import dataclass
from typing import Optional
from backend.thermal_stress.models import ThermalRiskLevel, RiskAssessment, ThermalIndices, WeatherInput


@dataclass
class RiskThresholds:
    """
    Configurable prototype thermal stress threshold definitions.
    Enables customization for regional screening and testing.
    """
    wbgt_low_max: float = 28.0       # < 28.0 °C: Low thermal strain
    wbgt_moderate_max: float = 31.0  # 28.0 - 31.0 °C: Moderate heat stress (caution)
    wbgt_high_max: float = 33.0      # 31.0 - 33.0 °C: High heat stress (severe risk)
    # >= 33.0 °C: Extreme heat stress (critical risk / heat stroke danger)

    hi_danger_threshold: float = 41.0   # NOAA Heat Index Danger threshold (°C)
    hi_extreme_threshold: float = 54.0  # NOAA Heat Index Extreme Danger threshold (°C)
    temp_extreme_alert: float = 45.0    # Ambient air temperature prototype screening threshold (°C)


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
    Classifies human thermal stress into 4 prototype screening tiers.
    
    WBGT is the primary signal. If Heat Index is unavailable (None),
    risk classification is safely determined by WBGT and ambient temperature.
    
    Returns:
        RiskAssessment containing level, score, primary_index, reason, color_code, and alert_category.
    """
    wbgt = indices.wbgt_c
    hi: Optional[float] = indices.heat_index_c
    ta = weather.temperature

    score = calculate_normalized_risk_score(wbgt)

    # 1. EXTREME Level (Red Visual Severity)
    is_hi_extreme = (hi is not None) and (hi >= thresholds.hi_extreme_threshold)
    if wbgt >= thresholds.wbgt_high_max or is_hi_extreme or ta >= thresholds.temp_extreme_alert:
        reason_hi_part = f", HI: {hi:.1f}°C" if hi is not None else ""
        return RiskAssessment(
            level=ThermalRiskLevel.EXTREME.value,
            score=max(0.85, score),
            primary_index="WBGT",
            reason=f"Critical thermal strain (Estimated WBGT: {wbgt:.1f}°C{reason_hi_part}). Imminent risk of heat stroke under physical exertion.",
            color_code="#E74C3C",  # Red
            alert_category="RED",
        )

    # 2. HIGH Level (Orange Visual Severity)
    is_hi_danger = (hi is not None) and (hi >= thresholds.hi_danger_threshold)
    if wbgt >= thresholds.wbgt_moderate_max or is_hi_danger:
        reason_hi_part = f", HI: {hi:.1f}°C" if hi is not None else ""
        return RiskAssessment(
            level=ThermalRiskLevel.HIGH.value,
            score=max(0.65, score),
            primary_index="WBGT",
            reason=f"Severe thermal stress (Estimated WBGT: {wbgt:.1f}°C{reason_hi_part}). Elevated risk of heat cramps, exhaustion, and dehydration.",
            color_code="#E67E22",  # Orange
            alert_category="ORANGE",
        )

    # 3. MODERATE Level (Yellow Visual Severity)
    is_hi_moderate = (hi is not None) and (hi >= 32.0)
    if wbgt >= thresholds.wbgt_low_max or is_hi_moderate:
        return RiskAssessment(
            level=ThermalRiskLevel.MODERATE.value,
            score=max(0.35, score),
            primary_index="WBGT",
            reason=f"Moderate thermal discomfort (Estimated WBGT: {wbgt:.1f}°C). Prolonged physical exertion may cause fatigue.",
            color_code="#F1C40F",  # Amber/Yellow
            alert_category="YELLOW",
        )

    # 4. LOW Level (Green Visual Severity / Safe)
    return RiskAssessment(
        level=ThermalRiskLevel.LOW.value,
        score=score,
        primary_index="WBGT",
        reason=f"Normal thermal comfort range (Estimated WBGT: {wbgt:.1f}°C). Minimal heat-related physiological stress.",
        color_code="#2ECC71",  # Green
        alert_category="GREEN",
    )
