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
    Generates actionable safety recommendations based on thermal risk level
    and environmental parameters.
    
    Disclaimer:
      These recommendations serve as operational early-warning guidance for civic
      authorities and the public, and do not constitute individual medical prescriptions.
    """
    level = risk.level
    advisories: List[str] = []

    if level == ThermalRiskLevel.EXTREME.value:
        advisories.append("[CRITICAL WARNING] Avoid non-essential outdoor exposure, especially between 11:00 AM and 4:30 PM.")
        advisories.append("[WORK SAFETY] Immediate suspension or mandatory shaded rest cycles recommended for outdoor and construction workers.")
        advisories.append("[HYDRATION & COOLING] Consume water and oral rehydration solutions (ORS/electrolytes) frequently; do not wait until thirsty.")
        advisories.append("[VULNERABLE POPULATIONS] Actively check on elderly individuals, children, pregnant women, and pets in non-air-conditioned spaces.")
        advisories.append("[EMERGENCY CARE] Watch for red-flag symptoms (dizziness, nausea, rapid pulse, lack of sweating) and seek urgent medical aid.")

    elif level == ThermalRiskLevel.HIGH.value:
        advisories.append("[HIGH HEAT STRESS] Reschedule intense outdoor sports and heavy physical labor to early morning or late evening.")
        advisories.append("[HYDRATION] Drink at least 250-300 ml of water every 30 minutes during outdoor activities.")
        advisories.append("[PROTECTION] Wear lightweight, loose, light-colored clothing, wide-brimmed hats, and UV sunglasses.")
        advisories.append("[REST CYCLES] Ensure access to shaded cooling zones and adequate ventilation at workplaces.")
        advisories.append("[VULNERABLE CARE] Ensure infants and elderly individuals stay in cool, shaded indoor rooms.")

    elif level == ThermalRiskLevel.MODERATE.value:
        advisories.append("[MODERATE CAUTION] Take regular hydration breaks if engaging in continuous physical work outdoors.")
        advisories.append("[SUN PROTECTION] Limit direct sunlight exposure during peak solar intensity hours.")
        advisories.append("[FLUID INTAKE] Maintain steady fluid intake; limit excessive consumption of caffeinated or sugary drinks.")

    else:  # LOW
        advisories.append("[NORMAL CONDITIONS] Standard environmental thermal conditions. Normal daily activities may proceed.")
        advisories.append("[HYDRATION] Maintain baseline healthy hydration during routine outdoor physical exercise.")

    # Contextual weather-specific advisories
    if weather.relative_humidity >= 75.0 and risk.level in (ThermalRiskLevel.HIGH.value, ThermalRiskLevel.EXTREME.value):
        advisories.append("[HIGH HUMIDITY ALERT] Sweat evaporation is severely impaired; convective cooling via electric fans or airflow is essential.")

    if weather.solar_radiation is not None and weather.solar_radiation >= 800.0:
        advisories.append("[INTENSE SOLAR LOAD] Direct solar irradiance is very high; seek shaded pathways when commuting.")

    return advisories
