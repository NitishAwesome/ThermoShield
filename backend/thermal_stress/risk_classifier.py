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
  - Thermal Stress Risk Score: Normalized prototype index [0.00 - 1.00] representing continuous
    biometeorological severity. It is NOT a mortality probability or clinical heat stroke probability.
  - Explainability: Explicitly separates direct 'risk_basis' from contextual 'environmental_factors'.
"""

from dataclasses import dataclass
from typing import Optional, List, Tuple
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
    Computes the Thermal Stress Risk Score (normalized prototype index between 0.00 and 1.00).
    Maps baseline comfortable conditions (20°C WBGT = 0.00) to critical thermal limits (35°C WBGT = 1.00).
    
    NOTE: This is a normalized biometeorological severity indicator, NOT a mortality probability,
    heat stroke probability, or clinical individual risk percentage.
    """
    score = (wbgt_c - min_wbgt) / (max_wbgt - min_wbgt)
    clamped_score = max(0.0, min(1.0, score))
    return round(clamped_score, 2)


def generate_explainability_factors(
    indices: ThermalIndices,
    weather: WeatherInput,
    risk_level: str,
    thresholds: RiskThresholds = DEFAULT_THRESHOLDS
) -> Tuple[List[str], List[str]]:
    """
    Separates:
      A. risk_basis: Factors that directly determined the risk classification.
      B. environmental_factors: Contextual meteorological observations.
    """
    risk_basis: List[str] = []
    environmental_factors: List[str] = []

    wbgt = indices.wbgt_c
    hi = indices.heat_index_c
    ta = weather.temperature
    rh = weather.relative_humidity
    wind = weather.wind_speed
    solar = weather.solar_radiation

    # 1. Determine Direct Risk Basis (Primary WBGT + Secondary Triggers)
    if risk_level == ThermalRiskLevel.EXTREME.value:
        if wbgt >= thresholds.wbgt_high_max:
            risk_basis.append(f"Estimated WBGT ({wbgt:.1f}°C) crossed the critical extreme threshold (≥{thresholds.wbgt_high_max:.1f}°C)")
        if ta >= thresholds.temp_extreme_alert:
            risk_basis.append(f"Ambient air temperature ({ta:.1f}°C) reached extreme thermal threshold (≥{thresholds.temp_extreme_alert:.1f}°C)")
        if hi is not None and hi >= thresholds.hi_extreme_threshold:
            risk_basis.append(f"NOAA Heat Index ({hi:.1f}°C) reached extreme danger threshold (≥{thresholds.hi_extreme_threshold:.1f}°C)")
    elif risk_level == ThermalRiskLevel.HIGH.value:
        if wbgt >= thresholds.wbgt_moderate_max:
            risk_basis.append(f"Estimated WBGT ({wbgt:.1f}°C) crossed the high-risk occupational threshold (≥{thresholds.wbgt_moderate_max:.1f}°C)")
        if hi is not None and hi >= thresholds.hi_danger_threshold:
            risk_basis.append(f"NOAA Heat Index ({hi:.1f}°C) indicates dangerous apparent thermal strain")
    elif risk_level == ThermalRiskLevel.MODERATE.value:
        if wbgt >= thresholds.wbgt_low_max:
            risk_basis.append(f"Estimated WBGT ({wbgt:.1f}°C) reached the moderate heat-strain caution zone (≥{thresholds.wbgt_low_max:.1f}°C)")
        if hi is not None and hi >= 32.0:
            risk_basis.append(f"NOAA Heat Index ({hi:.1f}°C) indicates moderate apparent warmth")
    else:  # LOW
        risk_basis.append(f"Estimated WBGT ({wbgt:.1f}°C) remains within the LOW prototype comfort range (<{thresholds.wbgt_low_max:.1f}°C)")

    # 2. Determine Contextual Environmental Observations
    # Humidity
    if rh >= 60.0:
        environmental_factors.append(f"Relative humidity ({rh:.1f}%) may reduce evaporative sweat cooling")
    elif rh <= 25.0 and ta >= 35.0:
        environmental_factors.append(f"Low relative humidity ({rh:.1f}%) in hot air accelerates bodily moisture loss")

    # Solar Radiation
    if solar is not None and solar >= 700.0:
        environmental_factors.append(f"Strong solar radiation ({solar:.0f} W/m²) generates high direct radiant heat load")
    elif solar is not None and 400.0 <= solar < 700.0:
        environmental_factors.append(f"Moderate solar radiation ({solar:.0f} W/m²) contributes to radiant heat burden")

    # Wind Airflow
    if wind < 1.0 and ta >= 30.0:
        environmental_factors.append(f"Low wind speed ({wind:.1f} m/s) restricts convective heat dissipation")
    elif wind >= 3.0:
        environmental_factors.append(f"Wind speed ({wind:.1f} m/s) provides substantial convective cooling")

    # Ambient Temperature & Heat Index Domain Note
    if ta >= 40.0:
        environmental_factors.append(f"Elevated air temperature ({ta:.1f}°C) increases direct ambient thermal load")
    if indices.heat_index_status == "OUTSIDE_VALIDATED_RANGE":
        environmental_factors.append("Extreme ambient heat and humidity co-occurrence exceeds NOAA Heat Index polynomial validation limits")

    return risk_basis, environmental_factors


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
        RiskAssessment containing level, score, primary_index, reason, color_code,
        alert_category, risk_basis, and environmental_factors.
    """
    wbgt = indices.wbgt_c
    hi: Optional[float] = indices.heat_index_c
    ta = weather.temperature

    score = calculate_normalized_risk_score(wbgt)

    # 1. EXTREME Level (Red Visual Severity)
    is_hi_extreme = (hi is not None) and (hi >= thresholds.hi_extreme_threshold)
    if wbgt >= thresholds.wbgt_high_max or is_hi_extreme or ta >= thresholds.temp_extreme_alert:
        level = ThermalRiskLevel.EXTREME.value
        adjusted_score = max(0.85, score)
        reason_hi_part = f", HI: {hi:.1f}°C" if hi is not None else ""
        reason = f"Critical thermal strain (Estimated WBGT: {wbgt:.1f}°C{reason_hi_part}). Imminent risk of heat stroke under physical exertion."
        color_code = "#E74C3C"
        alert_category = "RED"

    # 2. HIGH Level (Orange Visual Severity)
    elif wbgt >= thresholds.wbgt_moderate_max or ((hi is not None) and (hi >= thresholds.hi_danger_threshold)):
        level = ThermalRiskLevel.HIGH.value
        adjusted_score = max(0.65, score)
        reason_hi_part = f", HI: {hi:.1f}°C" if hi is not None else ""
        reason = f"Severe thermal stress (Estimated WBGT: {wbgt:.1f}°C{reason_hi_part}). Elevated risk of heat cramps, exhaustion, and dehydration."
        color_code = "#E67E22"
        alert_category = "ORANGE"

    # 3. MODERATE Level (Yellow Visual Severity)
    elif wbgt >= thresholds.wbgt_low_max or ((hi is not None) and (hi >= 32.0)):
        level = ThermalRiskLevel.MODERATE.value
        adjusted_score = max(0.35, score)
        reason = f"Moderate thermal discomfort (Estimated WBGT: {wbgt:.1f}°C). Prolonged physical exertion may cause fatigue."
        color_code = "#F1C40F"
        alert_category = "YELLOW"

    # 4. LOW Level (Green Visual Severity / Safe)
    else:
        level = ThermalRiskLevel.LOW.value
        adjusted_score = score
        reason = f"Normal thermal comfort range (Estimated WBGT: {wbgt:.1f}°C). Minimal heat-related physiological stress."
        color_code = "#2ECC71"
        alert_category = "GREEN"

    risk_basis, environmental_factors = generate_explainability_factors(
        indices=indices,
        weather=weather,
        risk_level=level,
        thresholds=thresholds
    )

    return RiskAssessment(
        level=level,
        score=adjusted_score,
        primary_index="WBGT",
        reason=reason,
        color_code=color_code,
        alert_category=alert_category,
        risk_basis=risk_basis,
        environmental_factors=environmental_factors,
    )
