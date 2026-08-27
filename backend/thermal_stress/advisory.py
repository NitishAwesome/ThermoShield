"""
backend/thermal_stress/advisory.py

Contextual Heat Stress Safety & Advisory Generation Engine.
Produces actionable, public health-aligned advisories, structured hydration rules,
activity limitations, and vulnerable population guidance for disaster management
and civic heatwave action plans (HAPs).
"""

from typing import List
from backend.thermal_stress.models import (
    ThermalRiskLevel,
    RiskAssessment,
    WeatherInput,
    HydrationGuidance,
    ActivityGuidance,
    VulnerablePopulationGuidance,
)


def generate_hydration_guidance(
    risk: RiskAssessment,
    weather: WeatherInput
) -> HydrationGuidance:
    """
    Generates guideline-based occupational and civic heat-safety hydration guidance.
    
    IMPORTANT SCIENTIFIC BASIS:
      - This guidance is derived from recognized occupational heat-safety standards
        (NIOSH / OSHA / CDC Heat Safety Guidelines) for physical activity in heat.
      - It is NOT mathematically calculated as an individualized physiological quota from WBGT.
      - Emphasizes planned, frequent drinking rather than thirst-only drinking.
      - Advises ~1 cup (240 mL) every 15–20 minutes during work in heat, with warnings against
        excessive fluid intake (>1.4 L/hour) which can cause water toxicity/hyponatremia.
    """
    level = risk.level

    if level == ThermalRiskLevel.EXTREME.value:
        return HydrationGuidance(
            priority="CRITICAL",
            recommended_interval="Every 15–20 minutes during any necessary work",
            approximate_amount_ml=240,
            electrolytes_recommended=True,
            guidance=(
                "Maintain frequent access to cool drinking water. Occupational heat-safety guidelines "
                "recommend ~240 mL (1 cup) every 15–20 minutes during necessary exertion. "
                "Supplement with oral rehydration solutions (ORS) or electrolyte beverages for prolonged sweating. "
                "Warning: Individual fluid requirements vary; do not exceed 1.4 L (48 oz) per hour to avoid hyponatremia."
            ),
            basis="NIOSH/OSHA occupational heat-safety guidance",
        )

    if level == ThermalRiskLevel.HIGH.value:
        return HydrationGuidance(
            priority="HIGH",
            recommended_interval="Every 15–20 minutes during work",
            approximate_amount_ml=240,
            electrolytes_recommended=True,
            guidance=(
                "For active outdoor work, drink approximately 1 cup (240 mL) of water every 15–20 minutes. "
                "For continuous sweating exceeding 2 hours, supplement with balanced electrolyte solutions or ORS. "
                "Note: Individual requirements vary; do not drink more than 1.4 L per hour."
            ),
            basis="NIOSH/OSHA occupational heat-safety guidance",
        )

    if level == ThermalRiskLevel.MODERATE.value:
        return HydrationGuidance(
            priority="MODERATE",
            recommended_interval="Every 20–30 minutes during physical activity",
            approximate_amount_ml=150,
            electrolytes_recommended=False,
            guidance=(
                "Drink water regularly during outdoor physical activity. Emphasize planned, frequent fluid intake "
                "rather than relying solely on thirst. Balanced electrolyte fluids may be beneficial during prolonged heavy sweating."
            ),
            basis="NIOSH/OSHA occupational heat-safety guidance",
        )

    # LOW Level
    return HydrationGuidance(
        priority="LOW",
        recommended_interval="Routine intervals / before and after activity",
        approximate_amount_ml=None,
        electrolytes_recommended=False,
        guidance=(
            "Maintain baseline daily fluid intake (~2.0–2.5 L daily for adults). "
            "Drink water before, during, and after routine physical exercise. "
            "Fixed worksite fluid quotas are not required under normal thermal conditions."
        ),
        basis="General public health and hydration guidance",
    )


def generate_activity_guidance(
    risk: RiskAssessment,
    weather: WeatherInput
) -> ActivityGuidance:
    """
    Generates structured occupational work/rest cycles and outdoor activity guidance.
    """
    level = risk.level

    if level == ThermalRiskLevel.EXTREME.value:
        return ActivityGuidance(
            outdoor_activity="Avoid non-essential outdoor exposure. Suspend all outdoor athletic and public events.",
            heavy_physical_work="Immediate suspension of heavy manual labor during peak heat, or enforce mandatory 30-45 minute shaded rest per hour.",
            rest_guidance="Mandatory access to active cooling zones (air-conditioned spaces, misting fans, shaded shelters).",
            peak_heat_hours="11:00 AM - 5:00 PM (Strictly avoid unshaded physical exertion).",
        )

    if level == ThermalRiskLevel.HIGH.value:
        return ActivityGuidance(
            outdoor_activity="Reschedule intense recreational sports and exercise to early morning (<8:30 AM) or evening (>6:00 PM).",
            heavy_physical_work="Reduce physical exertion intensity. Enforce 15-20 minute shaded rest breaks for every 45-60 minutes of labor.",
            rest_guidance="Rest in well-ventilated, shaded cooling zones equipped with drinking water.",
            peak_heat_hours="11:30 AM - 4:30 PM (Minimize direct sun exposure).",
        )

    if level == ThermalRiskLevel.MODERATE.value:
        return ActivityGuidance(
            outdoor_activity="Outdoor activities permissible with periodic rest intervals in shaded areas.",
            heavy_physical_work="Pace continuous physical labor. Take 10-minute rest breaks every hour in shade.",
            rest_guidance="Take rest breaks in shaded areas when experiencing early fatigue or warmth.",
            peak_heat_hours="12:00 PM - 3:30 PM (Limit prolonged direct sun exposure).",
        )

    # LOW Level
    return ActivityGuidance(
        outdoor_activity="Normal outdoor recreation, sports, and daily activities may proceed without restriction.",
        heavy_physical_work="Standard occupational pacing and routine break schedules.",
        rest_guidance="Standard scheduled rest intervals.",
        peak_heat_hours="12:00 PM - 3:00 PM (Standard routine sun protection).",
    )


def generate_vulnerable_population_guidance(
    risk: RiskAssessment,
    weather: WeatherInput
) -> VulnerablePopulationGuidance:
    """
    Generates targeted demographic guidance for groups vulnerable to heat-related illness.
    """
    level = risk.level

    if level == ThermalRiskLevel.EXTREME.value:
        return VulnerablePopulationGuidance(
            priority=True,
            groups=[
                "elderly (65+)",
                "outdoor construction laborers",
                "infants & children (<5)",
                "street vendors & delivery workers",
                "individuals with cardiovascular, respiratory, or renal disease",
                "homeless populations",
            ],
            guidance=(
                "CRITICAL VULNERABILITY ALERT: Extreme risk of rapid heat exhaustion and fatal heat stroke. "
                "Open and publicize community cooling centers. Proactively check on isolated elderly and homebound citizens. "
                "Ensure shaded rest and potable water are immediately available for civic outdoor staff."
            ),
        )

    if level == ThermalRiskLevel.HIGH.value:
        return VulnerablePopulationGuidance(
            priority=True,
            groups=[
                "outdoor laborers & farmers",
                "street vendors",
                "elderly individuals",
                "infants & young children",
                "pregnant women",
                "patients on diuretic/hypertension medication",
            ],
            guidance=(
                "HIGH VULNERABILITY ALERT: Elevated risk of dehydration and heat syncope. Ensure outdoor laborers have "
                "mandatory shaded stations. Vulnerable individuals should remain indoors in cool, well-ventilated rooms."
            ),
        )

    if level == ThermalRiskLevel.MODERATE.value:
        return VulnerablePopulationGuidance(
            priority=False,
            groups=[
                "unacclimatized individuals",
                "outdoor workers",
                "elderly",
                "infants",
            ],
            guidance=(
                "Monitor individuals with pre-existing cardiovascular or respiratory conditions. "
                "Ensure infants and elderly stay in well-ventilated indoor spaces."
            ),
        )

    # LOW Level
    return VulnerablePopulationGuidance(
        priority=False,
        groups=[
            "general public",
            "children",
            "elderly",
        ],
        guidance=(
            "Standard baseline health precautions. Ensure children and elderly maintain routine healthy hydration."
        ),
    )


def generate_advisories(
    risk: RiskAssessment,
    weather: WeatherInput
) -> List[str]:
    """
    Generates human-readable string advisories (maintains full backward compatibility).
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
