"""
ThermoShield Localized Heat Action Plan (HAP) Trigger Engine & City Administration Decision Service

Strict Architectural Boundary:
- This service is the operational decision engine for municipal authorities to initiate Heat Action Plans.
- It operates strictly on current and forecast biometeorological data and socio-demographic vulnerability.
- It is COMPLETELY INDEPENDENT of the Intervention Simulator (which is for hypothetical 'what-if' policy testing).
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)

# Official 5 Municipal Action Categories required by SIH26083
CATEGORY_COOLING = "COOLING"
CATEGORY_OUTDOOR_WORK = "OUTDOOR_WORK"
CATEGORY_HYDRATION = "HYDRATION"
CATEGORY_HEALTH = "HEALTH_PREPAREDNESS"
CATEGORY_INFRASTRUCTURE = "INFRASTRUCTURE"

# Trigger States
TRIGGER_ACTION_NOW = "ACTION_REVIEW_REQUIRED_NOW"
TRIGGER_PREPARE_24H = "PREPARE_WITHIN_24_HOURS"
TRIGGER_PREPARE_3D = "PREPARE_WITHIN_3_DAYS"
TRIGGER_BASELINE = "MONITOR_NORMAL_BASELINE"


@dataclass
class HeatActionItem:
    category: str
    action: str
    title: str
    description: str
    priority: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    status: str = "RECOMMENDED_FOR_REVIEW"
    justification: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "category": self.category,
            "action": self.action,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "status": self.status,
            "justification": self.justification,
        }


@dataclass
class HeatActionPlanResult:
    area_id: str
    area_name: str
    risk_level: str
    risk_score: float
    trigger_state: str
    trigger_reasons: List[str]
    recommended_actions: List[HeatActionItem]
    evaluated_telemetry: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "area_id": self.area_id,
            "area_name": self.area_name,
            "risk_level": self.risk_level,
            "risk_score": round(self.risk_score, 1),
            "trigger_state": self.trigger_state,
            "trigger_reasons": self.trigger_reasons,
            "action_count": len(self.recommended_actions),
            "recommended_actions": [a.to_dict() for a in self.recommended_actions],
            "evaluated_telemetry": self.evaluated_telemetry,
        }


# Curated Administrative Ward Profiles for BMC Wards & Major Indian Municipalities
MUNICIPAL_WARD_REGISTRY: Dict[str, Dict[str, Any]] = {
    # Key BMC Administrative Wards
    "ward_g_north": {
        "name": "Ward G/North (Dharavi, Dadar West, Mahim)",
        "district": "Mumbai City",
        "latitude": 19.0434,
        "longitude": 72.8526,
        "vulnerability_score": 88.0,
        "population_density": "Very High (Dense settlements & cottage industries)",
        "baseline_temp": 35.5,
        "wbgt_offset": 1.2,
    },
    "ward_f_south": {
        "name": "Ward F/South (Parel, Sewri, Naigaon)",
        "district": "Mumbai City",
        "latitude": 19.0048,
        "longitude": 72.8428,
        "vulnerability_score": 75.0,
        "population_density": "High (Former mill clusters & transit corridors)",
        "baseline_temp": 34.8,
        "wbgt_offset": 0.8,
    },
    "ward_m_east": {
        "name": "Ward M/East (Govandi, Mankhurd, Deonar)",
        "district": "Eastern Suburbs",
        "latitude": 19.0558,
        "longitude": 72.9312,
        "vulnerability_score": 85.0,
        "population_density": "Very High (Informal labor concentration)",
        "baseline_temp": 35.8,
        "wbgt_offset": 1.4,
    },
    "ward_k_west": {
        "name": "Ward K/West (Andheri West, Juhu, Versova)",
        "district": "Western Suburbs",
        "latitude": 19.1205,
        "longitude": 72.8347,
        "vulnerability_score": 45.0,
        "population_density": "Moderate-High (Commercial & residential coast)",
        "baseline_temp": 33.8,
        "wbgt_offset": 0.4,
    },
    "ward_k_east": {
        "name": "Ward K/East (Andheri East, Jogeshwari East)",
        "district": "Western Suburbs",
        "latitude": 19.1172,
        "longitude": 72.8682,
        "vulnerability_score": 68.0,
        "population_density": "High (MIDC industrial workforce & transport hubs)",
        "baseline_temp": 35.0,
        "wbgt_offset": 0.9,
    },
    "ward_a": {
        "name": "Ward A (Colaba, Fort, Nariman Point)",
        "district": "South Mumbai",
        "latitude": 18.9220,
        "longitude": 72.8346,
        "vulnerability_score": 25.0,
        "population_density": "Moderate (Commercial administrative center)",
        "baseline_temp": 32.5,
        "wbgt_offset": 0.0,
    },
    "ward_e": {
        "name": "Ward E (Byculla, Mazgaon, Kamathipura)",
        "district": "South Mumbai",
        "latitude": 18.9734,
        "longitude": 72.8340,
        "vulnerability_score": 78.0,
        "population_density": "Very High (Old tenements & narrow corridors)",
        "baseline_temp": 34.6,
        "wbgt_offset": 0.7,
    },
    "ward_l": {
        "name": "Ward L (Kurla, Chunabhatti, Sakinaka)",
        "district": "Eastern Suburbs",
        "latitude": 19.0688,
        "longitude": 72.8856,
        "vulnerability_score": 82.0,
        "population_density": "Very High (Transit junctions & crowded markets)",
        "baseline_temp": 35.4,
        "wbgt_offset": 1.1,
    },
    "ward_c": {
        "name": "Ward C (Chandanwadi, Bhuleshwar, Kalbadevi)",
        "district": "South Mumbai",
        "latitude": 18.9515,
        "longitude": 72.8258,
        "vulnerability_score": 72.0,
        "population_density": "Extreme (Wholesale trading markets)",
        "baseline_temp": 34.4,
        "wbgt_offset": 0.6,
    },
    "ward_h_east": {
        "name": "Ward H/East (Bandra East, Khar East, Santacruz East)",
        "district": "Western Suburbs",
        "latitude": 19.0700,
        "longitude": 72.8450,
        "vulnerability_score": 62.0,
        "population_density": "High (BKC commercial outskirts & transit links)",
        "baseline_temp": 34.5,
        "wbgt_offset": 0.6,
    },
}


def evaluate_heat_action_plan(
    area_id: str,
    area_name: Optional[str] = None,
    temperature_c: float = 34.0,
    humidity_pct: float = 65.0,
    wbgt_c: Optional[float] = None,
    heat_index_c: Optional[float] = None,
    solar_radiation: Optional[float] = None,
    wind_speed: Optional[float] = None,
    vulnerability_score: Optional[float] = None,
    risk_level: Optional[str] = None,
    risk_score: Optional[float] = None,
    forecast_max_risk: Optional[str] = None,
    forecast_trend: Optional[str] = "STEADY",
    forecast_lead_time_hours: Optional[int] = None,
    alert_state: Optional[str] = None,
) -> HeatActionPlanResult:
    """
    Evaluates current and upcoming thermal strain to produce machine-readable,
    rule-transparent Heat Action Plan recommendations for civic disaster managers.
    """
    clean_area_id = (area_id or "general_area").strip().lower()
    reg_entry = MUNICIPAL_WARD_REGISTRY.get(clean_area_id, {})

    effective_name = area_name or reg_entry.get("name") or clean_area_id.replace("_", " ").title()
    effective_vuln = (
        vulnerability_score
        if vulnerability_score is not None
        else float(reg_entry.get("vulnerability_score", 50.0))
    )

    # Calculate WBGT if not passed
    effective_wbgt = wbgt_c
    if effective_wbgt is None:
        effective_wbgt = round(temperature_c * 0.7 + (humidity_pct / 100.0) * 10.0 + 4.0, 1)

    effective_heat_index = heat_index_c
    if effective_heat_index is None:
        effective_heat_index = round(temperature_c + 0.55 * (1 - (humidity_pct / 100)) * (temperature_c - 14.5), 1)

    # Determine risk level & score if missing
    if risk_score is None:
        raw_score = (effective_wbgt - 25.0) * 8.0 + (effective_vuln * 0.4)
        risk_score = max(5.0, min(99.0, raw_score))

    norm_risk = (risk_level or ("EXTREME" if risk_score >= 75 else "HIGH" if risk_score >= 50 else "MODERATE" if risk_score >= 30 else "LOW")).upper().strip()
    norm_fc_risk = (forecast_max_risk or norm_risk).upper().strip()

    # -------------------------------------------------------------
    # 1. TRIGGER STATE DETERMINATION (Rule-Based & Scientifically Grounded)
    # -------------------------------------------------------------
    trigger_reasons: List[str] = []
    trigger_state = TRIGGER_BASELINE

    is_severe_now = norm_risk in ["HIGH", "EXTREME"] or effective_wbgt >= 30.0 or effective_heat_index >= 41.0
    is_severe_24h = norm_fc_risk in ["HIGH", "EXTREME"] and (forecast_lead_time_hours is not None and forecast_lead_time_hours <= 24)
    is_severe_3d = norm_fc_risk in ["HIGH", "EXTREME"] and (forecast_lead_time_hours is not None and 24 < forecast_lead_time_hours <= 72)

    if is_severe_now:
        trigger_state = TRIGGER_ACTION_NOW
        if effective_wbgt >= 30.0:
            trigger_reasons.append(f"Derived Wet-Bulb Globe Temp ({effective_wbgt:.1f}°C) exceeds critical civic safety threshold (30.0°C).")
        if norm_risk == "EXTREME":
            trigger_reasons.append("Current biometeorological risk level has reached EXTREME thermal stress.")
        elif norm_risk == "HIGH":
            trigger_reasons.append("Elevated afternoon thermal stress warrants immediate proactive civic controls.")
        if effective_vuln >= 70.0:
            trigger_reasons.append(f"High local socio-demographic vulnerability score ({effective_vuln:.0f}/100) intensifies community exposure.")
    elif is_severe_24h:
        trigger_state = TRIGGER_PREPARE_24H
        trigger_reasons.append(f"Forecast models indicate {norm_fc_risk} heat conditions will emerge within {forecast_lead_time_hours} hours.")
        trigger_reasons.append("Municipal teams must pre-stage cooling shelters and hydration infrastructure before peak solar radiation.")
    elif is_severe_3d:
        trigger_state = TRIGGER_PREPARE_3D
        trigger_reasons.append(f"Early-warning forecast models project rising thermal stress reaching {norm_fc_risk} within 48 to 72 hours.")
        trigger_reasons.append("City departments should initiate inter-agency coordination and review power grid reserves.")
    else:
        trigger_state = TRIGGER_BASELINE
        trigger_reasons.append("Current and 72-hour forecast conditions remain within manageable seasonal baseline limits.")
        trigger_reasons.append("Routine civic monitoring and public health observation remain active.")

    # -------------------------------------------------------------
    # 2. GENERATE RECOMMENDED ACTIONS ACROSS 5 OFFICIAL CATEGORIES
    # -------------------------------------------------------------
    actions: List[HeatActionItem] = []

    # Category 1: COOLING
    if trigger_state == TRIGGER_ACTION_NOW:
        priority = "CRITICAL" if norm_risk == "EXTREME" else "HIGH"
        actions.append(HeatActionItem(
            category=CATEGORY_COOLING,
            action="review_cooling_center_readiness",
            title="Review Cooling-Center & Respite Hall Readiness",
            description="Verify immediate operational readiness of designated municipal air-cooled shelters, community halls, and primary health centers. Ensure extended operational hours during peak sunlight.",
            priority=priority,
            justification=f"Triggered because current risk is {norm_risk} (WBGT: {effective_wbgt:.1f}°C). Vulnerable urban residents require air-conditioned respite to arrest core temperature buildup."
        ))
        actions.append(HeatActionItem(
            category=CATEGORY_COOLING,
            action="review_shaded_recovery_access",
            title="Review Shaded Recovery & Transit Canopy Access",
            description="Erect temporary shaded awnings and misting fans at crowded bus terminuses, railway concourses, and outdoor vegetable market clusters.",
            priority="HIGH",
            justification=f"Solar radiation load ({solar_radiation or 550:.0f} W/m²) combined with high ambient heat creates acute surface thermal islanding in open pedestrian zones."
        ))
    elif trigger_state in [TRIGGER_PREPARE_24H, TRIGGER_PREPARE_3D]:
        actions.append(HeatActionItem(
            category=CATEGORY_COOLING,
            action="review_cooling_center_readiness",
            title="Pre-Stage Municipal Cooling Centers",
            description="Inspect ventilation, water chilling capacity, and emergency staffing at designated municipal respite facilities ahead of the forecast surge.",
            priority="MEDIUM",
            justification=f"Forecast risk projects {norm_fc_risk} conditions approaching within {forecast_lead_time_hours or 48} hours. Proactive facility checks prevent day-of bottlenecks."
        ))

    # Category 2: OUTDOOR WORK
    if trigger_state == TRIGGER_ACTION_NOW:
        priority = "CRITICAL" if (norm_risk == "EXTREME" or effective_wbgt >= 31.0) else "HIGH"
        actions.append(HeatActionItem(
            category=CATEGORY_OUTDOOR_WORK,
            action="review_work_restrictions",
            title="Enforce Mandatory Work-Rest Cycles",
            description="Issue municipal labor directive halting unshaded heavy manual labor (construction, road resurfacing, cart-pulling) between 12:00 PM and 3:00 PM. Mandate 15-45 minute hourly rest rotations.",
            priority=priority,
            justification=f"High wet-bulb globe temperature ({effective_wbgt:.1f}°C) severely impairs physiological evaporative cooling during strenuous exertion, drastically elevating exertional heatstroke hazard."
        ))
        actions.append(HeatActionItem(
            category=CATEGORY_OUTDOOR_WORK,
            action="review_schedule_shifts",
            title="Shift Civic Worker Shift Schedules",
            description="Reschedule municipal sanitation workers, sweepers, and delivery fleets to split shifts (early morning 06:00–10:30 and evening 17:00–20:30).",
            priority="HIGH",
            justification="Mitigates occupational heat morbidity without disrupting critical civic municipal hygiene services."
        ))
    elif trigger_state == TRIGGER_PREPARE_24H:
        actions.append(HeatActionItem(
            category=CATEGORY_OUTDOOR_WORK,
            action="review_work_restrictions",
            title="Issue Advance Contractor & Employer Advisory",
            description="Notify local construction contractors and informal labor employers of upcoming mandatory afternoon work pauses for tomorrow.",
            priority="HIGH",
            justification="Gives commercial and public works supervisors operational lead time to re-plan concrete pours and shift allocations."
        ))

    # Category 3: HYDRATION
    if trigger_state == TRIGGER_ACTION_NOW:
        actions.append(HeatActionItem(
            category=CATEGORY_HYDRATION,
            action="review_hydration_station_deployment",
            title="Deploy Mobile Hydration Tankers & ORS Kiosks",
            description="Dispatch civic water tankers equipped with clean drinking water and oral rehydration solution (ORS) packets to major transit bottlenecks, traffic signals, and market yards.",
            priority="CRITICAL" if norm_risk == "EXTREME" else "HIGH",
            justification=f"Thermal index indicates rapid dehydration rate (>1.0 L/hour fluid loss for outdoor individuals). Accessible public hydration prevents hypovolemic heat collapse."
        ))
        if effective_vuln >= 60.0:
            actions.append(HeatActionItem(
                category=CATEGORY_HYDRATION,
                action="review_water_distribution_support",
                title="Prioritize Potable Water Supply in High-Density Tenements",
                description="Coordinate with municipal hydraulic engineers to maintain continuous pipeline pressure and tanker frequency in informal settlement clusters.",
                priority="HIGH",
                justification=f"High vulnerability sector ({effective_vuln:.0f}/100) exhibits limited indoor piped storage. Uninterrupted community water access is vital for home cooling and hydration."
            ))
    elif trigger_state in [TRIGGER_PREPARE_24H, TRIGGER_PREPARE_3D]:
        actions.append(HeatActionItem(
            category=CATEGORY_HYDRATION,
            action="review_hydration_station_deployment",
            title="Inventory ORS Supplies & Tanker Readiness",
            description="Audit municipal tanker fleets and ensure adequate buffer stock of WHO-formula ORS sachets at civic ward offices.",
            priority="MEDIUM",
            justification=f"Precautionary logistics preparation in advance of {norm_fc_risk} forecast."
        ))

    # Category 4: HEALTH PREPAREDNESS
    if trigger_state == TRIGGER_ACTION_NOW:
        priority = "CRITICAL" if norm_risk == "EXTREME" else "HIGH"
        actions.append(HeatActionItem(
            category=CATEGORY_HEALTH,
            action="review_health_facility_readiness",
            title="Activate Hospital & Clinic Heatstroke Protocols",
            description="Ensure primary healthcare dispensaries have designated ice-bath immersion tubs, IV fluids, and dedicated heatstroke stabilization beds staffed by trained paramedics.",
            priority=priority,
            justification=f"Emergency department thermal surge probability is elevated under {norm_risk} conditions. Rapid immersion cooling within 30 minutes is the clinical gold standard for exertional heatstroke survival."
        ))
        actions.append(HeatActionItem(
            category=CATEGORY_HEALTH,
            action="review_vulnerable_population_outreach",
            title="Mobilize Community Health Workers (ASHA/Civic Teams)",
            description="Deploy field health workers to conduct door-to-door welfare checks on isolated elderly residents, chronically ill citizens, and pregnant mothers.",
            priority="HIGH",
            justification=f"Socio-demographic vulnerability analysis indicates heightened risk of unobserved domestic heat stress among homebound elderly and young children."
        ))
    elif trigger_state in [TRIGGER_PREPARE_24H, TRIGGER_PREPARE_3D]:
        actions.append(HeatActionItem(
            category=CATEGORY_HEALTH,
            action="review_health_facility_readiness",
            title="Alert Hospital Surge Teams & Emergency Services",
            description="Issue preliminary health advisory to 108 emergency ambulance services and municipal medical superintendents to anticipate heat-related call volumes.",
            priority="MEDIUM",
            justification="Ensures paramedic staffing aligns with the forecast diurnal thermal peak."
        ))

    # Category 5: INFRASTRUCTURE
    if trigger_state == TRIGGER_ACTION_NOW:
        actions.append(HeatActionItem(
            category=CATEGORY_INFRASTRUCTURE,
            action="review_peak_electricity_demand_preparedness",
            title="Review Peak Electricity Grid & Substation Capacity",
            description="Coordinate with regional power distribution utilities (Discoms) to monitor distribution transformer loads and prevent brownouts caused by surging refrigeration/AC demand.",
            priority="HIGH",
            justification="Grid transformer overtemperature failures during severe heatwaves compound civilian mortality by disabling domestic fans and refrigeration."
        ))
        actions.append(HeatActionItem(
            category=CATEGORY_INFRASTRUCTURE,
            action="review_critical_cooling_infrastructure",
            title="Secure Backup Power for Healthcare & Pumping Stations",
            description="Verify fuel supplies and automatic transfer switches for diesel backup generators at civic hospitals, blood banks, and municipal water pumping stations.",
            priority="HIGH",
            justification="Guarantees uninterrupted patient cooling and municipal water delivery even under grid strain."
        ))
    elif trigger_state in [TRIGGER_PREPARE_24H, TRIGGER_PREPARE_3D]:
        actions.append(HeatActionItem(
            category=CATEGORY_INFRASTRUCTURE,
            action="review_peak_electricity_demand_preparedness",
            title="Review Grid Reserves Ahead of Heatwave Influx",
            description="Request transmission load balancing and defer scheduled maintenance on critical 33kV urban feeders until the forecast heat spell subsides.",
            priority="MEDIUM",
            justification="Preemptive grid scheduling prevents transmission bottlenecks during forecast extreme demand windows."
        ))

    # Fallback for normal baseline
    if not actions:
        actions.append(HeatActionItem(
            category=CATEGORY_COOLING,
            action="routine_facility_inspection",
            title="Maintain Routine Facility Readiness",
            description="Conduct standard seasonal audits of cooling assets and public water dispensers.",
            priority="LOW",
            justification="Current conditions are within baseline thresholds. Routine preparedness ensures long-term operational resilience."
        ))
        actions.append(HeatActionItem(
            category=CATEGORY_HEALTH,
            action="routine_public_health_surveillance",
            title="Maintain Public Health Surveillance",
            description="Track baseline syndromic notifications and monitor weather forecasts for upcoming shifts.",
            priority="LOW",
            justification="Standard civic health vigilance during seasonal weather conditions."
        ))

    return HeatActionPlanResult(
        area_id=clean_area_id,
        area_name=effective_name,
        risk_level=norm_risk,
        risk_score=risk_score,
        trigger_state=trigger_state,
        trigger_reasons=trigger_reasons,
        recommended_actions=actions,
        evaluated_telemetry={
            "temperature_c": temperature_c,
            "humidity_pct": humidity_pct,
            "wbgt_c": effective_wbgt,
            "heat_index_c": effective_heat_index,
            "vulnerability_score": effective_vuln,
            "forecast_trend": forecast_trend or "STEADY",
            "forecast_lead_time_hours": forecast_lead_time_hours,
        }
    )


def get_all_wards_heat_action_overview() -> List[Dict[str, Any]]:
    """
    Returns pre-computed Heat Action Plan trigger statuses across all official administrative wards
    for municipal command dashboards and GIS overview layers.
    """
    results = []
    for ward_id, profile in MUNICIPAL_WARD_REGISTRY.items():
        base_t = profile.get("baseline_temp", 34.0)
        wbgt_off = profile.get("wbgt_offset", 0.0)
        vuln = profile.get("vulnerability_score", 50.0)

        # Realistic diurnal thermal profile
        calc_wbgt = round(28.0 + wbgt_off + (vuln / 100.0) * 3.0, 1)
        raw_score = (calc_wbgt - 25.0) * 8.0 + (vuln * 0.4)
        r_score = max(10.0, min(95.0, raw_score))
        r_level = "EXTREME" if r_score >= 75 else "HIGH" if r_score >= 50 else "MODERATE" if r_score >= 30 else "LOW"

        plan = evaluate_heat_action_plan(
            area_id=ward_id,
            area_name=profile["name"],
            temperature_c=base_t,
            humidity_pct=68.0,
            wbgt_c=calc_wbgt,
            vulnerability_score=vuln,
            risk_level=r_level,
            risk_score=r_score,
            forecast_max_risk=r_level,
            forecast_lead_time_hours=12 if r_level in ["HIGH", "EXTREME"] else 48,
        )
        results.append(plan.to_dict())

    return results
