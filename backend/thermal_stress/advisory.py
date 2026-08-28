"""
backend/thermal_stress/advisory.py

Contextual Heat Stress Safety & Advisory Generation Engine.
Produces actionable, public health-aligned advisories for disaster management
and civic heatwave action plans (HAPs).
"""

from typing import List
from backend.thermal_stress.models import ThermalRiskLevel, RiskAssessment, WeatherInput


def generate_advisories(
    risk: RiskAssessment,
    weather: WeatherInput
) -> List[str]:
    """
    Generates actionable safety recommendations based on prototype thermal risk level
    and environmental parameters.
    
    Disclaimer:
      These recommendations serve as operational early-warning guidance for civic
      authorities and the public, and do not constitute individual medical prescriptions.
    """
    level = risk.level
    advisories: List[str] = []

    if level == ThermalRiskLevel.EXTREME.value:
        advisories.append("[CRITICAL ADVISORY] Avoid prolonged outdoor exposure, especially during peak afternoon hours.")
        advisories.append("[WORK SAFETY] Schedule heavy outdoor work during cooler periods and utilize shaded cooling areas.")
        advisories.append("[HYDRATION] Maintain frequent hydration with water and electrolyte solutions; do not wait until thirsty.")
        advisories.append("[VULNERABLE GROUPS] Pay special attention to vulnerable populations (elderly, children, outdoor workers).")
        advisories.append("[HEALTH MONITORING] Monitor for signs of severe heat distress and seek medical assistance if needed.")

    elif level == ThermalRiskLevel.HIGH.value:
        advisories.append("[HIGH HEAT STRESS] Reduce prolonged strenuous outdoor activity during peak sun hours.")
        advisories.append("[HYDRATION] Maintain frequent hydration and take regular fluid breaks.")
        advisories.append("[PROTECTION] Wear lightweight, light-colored clothing and use sun protection.")
        advisories.append("[REST & SHADE] Utilize shaded or well-ventilated cooling areas during rest breaks.")
        advisories.append("[VULNERABLE CARE] Monitor infants, the elderly, and outdoor laborers for heat fatigue.")

    elif level == ThermalRiskLevel.MODERATE.value:
        advisories.append("[MODERATE CAUTION] Maintain regular hydration if engaging in continuous physical work outdoors.")
        advisories.append("[SUN EXPOSURE] Limit direct sunlight exposure during peak solar intensity periods.")
        advisories.append("[FLUID INTAKE] Ensure steady fluid intake throughout the day.")

    else:  # LOW
        advisories.append("[NORMAL CONDITIONS] Standard environmental thermal conditions. Normal daily activities may proceed.")
        advisories.append("[HYDRATION] Maintain routine healthy hydration during outdoor physical activity.")

    # Contextual weather-specific advisories
    if weather.relative_humidity >= 75.0 and risk.level in (ThermalRiskLevel.HIGH.value, ThermalRiskLevel.EXTREME.value):
        advisories.append("[HIGH HUMIDITY] Impaired sweat evaporation; ensure active air circulation and ventilation.")

    if weather.solar_radiation is not None and weather.solar_radiation >= 800.0:
        advisories.append("[INTENSE SOLAR LOAD] High solar irradiance; prefer shaded routes when outdoors.")

    return advisories
