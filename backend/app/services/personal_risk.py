from typing import List, Dict, Any, Optional


def calculate_personal_risk(
    age: int,
    smoking: bool = False,
    health_conditions: Optional[List[str]] = None,
    physical_activity: str = "moderate",
    is_pregnant: bool = False,
    hydration_status: str = "moderate",
    outdoor_exposure_hours: float = 1.0,
    clothing_type: str = "standard",
    temperature_c: Optional[float] = None,
    humidity_pct: Optional[float] = None,
    wbgt_c: Optional[float] = None,
    solar_radiation: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Computes an individual physiological heat health risk assessment.
    Combines personal biometrics, chronic health vulnerabilities, occupational
    physical intensity, protective clothing, and environmental thermal stress (WBGT/Temp).
    """
    if health_conditions is None:
        health_conditions = []

    breakdown: List[Dict[str, Any]] = []
    total_score = 0.0

    # 1. AGE FACTOR
    age_points = 0.0
    age_desc = "Normal physiological thermoregulation"
    if age >= 75:
        age_points = 28.0
        age_desc = "Age ≥ 75: Severe vulnerability, impaired autonomic thermoregulation & blunted thirst"
    elif age >= 65:
        age_points = 22.0
        age_desc = "Age 65-74: Significantly reduced skin blood flow and sweating latency"
    elif age >= 50:
        age_points = 12.0
        age_desc = "Age 50-64: Moderate age-related cardiovascular stress"
    elif age <= 5:
        age_points = 25.0
        age_desc = "Age ≤ 5: Immature thermoregulatory mechanisms and rapid dehydration rate"
    elif age <= 12:
        age_points = 14.0
        age_desc = "Age 6-12: Elevated surface area-to-mass ratio and lower sweat output"
    elif age >= 35:
        age_points = 5.0
        age_desc = "Age 35-49: Baseline adult profile"
    else:
        age_points = 0.0
        age_desc = "Age 13-34: Optimal physiological resilience baseline"

    total_score += age_points
    breakdown.append({
        "factor": f"Age ({age} yrs)",
        "contribution": round(age_points, 1),
        "category": "Biometrics",
        "description": age_desc
    })

    # 2. PREGNANCY FACTOR
    if is_pregnant:
        preg_points = 20.0
        total_score += preg_points
        breakdown.append({
            "factor": "Pregnancy",
            "contribution": preg_points,
            "category": "Physiology",
            "description": "Elevated basal metabolic rate, increased circulatory load and fetal thermal vulnerability"
        })

    # 3. SMOKING / NICOTINE FACTOR
    if smoking:
        smoke_points = 12.0
        total_score += smoke_points
        breakdown.append({
            "factor": "Smoking / Tobacco",
            "contribution": smoke_points,
            "category": "Lifestyle",
            "description": "Peripheral vasoconstriction and reduced cardiovascular reserve during heat dissipation"
        })

    # 4. CHRONIC HEALTH CONDITIONS
    condition_weights = {
        "heart_disease": (24.0, "Cardiovascular disease: Reduced stroke volume capacity during heat vasodilation"),
        "cardiovascular": (24.0, "Cardiovascular disease: High strain on cardiac output under heat stress"),
        "kidney_disease": (22.0, "Renal condition: Prone to acute kidney injury (AKI) from thermal dehydration"),
        "renal": (22.0, "Renal condition: Vulnerable to rhabdomyolysis and electrolyte imbalance"),
        "diabetes": (18.0, "Diabetes: Microvascular impairment impairs cutaneous sweat gland activation"),
        "asthma": (16.0, "Asthma / COPD: Hot air and humidity trigger airway bronchospasms"),
        "copd": (18.0, "COPD: Severe respiratory limitation under humid thermal stress"),
        "hypertension": (14.0, "Hypertension: Blood pressure medications (beta blockers, diuretics) impede cooling"),
        "neurological": (15.0, "Neurological condition: Impaired central thermal sensing and behavioral response"),
    }

    cond_total = 0.0
    for cond in health_conditions:
        norm_cond = cond.lower().strip().replace(" ", "_")
        weight, desc = condition_weights.get(norm_cond, (10.0, f"Chronic condition ({cond}) adds physiological strain"))
        cond_total += weight
        breakdown.append({
            "factor": cond.replace("_", " ").title(),
            "contribution": round(weight, 1),
            "category": "Medical History",
            "description": desc
        })
    total_score += cond_total

    # 5. PHYSICAL ACTIVITY & METABOLIC LOAD
    act_weights = {
        "sedentary": (0.0, "Sedentary / Resting: Minimal internal metabolic heat generation (<100 W)"),
        "light": (6.0, "Light activity: Low metabolic heat burden (~150 W)"),
        "moderate": (14.0, "Moderate exertion: Active labor generates ~250-350 W internal heat"),
        "heavy": (24.0, "Heavy physical labor / athletics: Intense internal heat buildup (400-600 W)"),
    }
    act_pts, act_desc = act_weights.get(physical_activity.lower(), (12.0, "Active exertion"))
    total_score += act_pts
    breakdown.append({
        "factor": f"Activity: {physical_activity.capitalize()}",
        "contribution": act_pts,
        "category": "Exertion",
        "description": act_desc
    })

    # 6. HYDRATION STATUS
    hyd_weights = {
        "well_hydrated": (-5.0, "Well Hydrated: Optimal blood plasma volume promotes sweat cooling"),
        "moderate": (6.0, "Adequate baseline: Needs consistent fluid replacement"),
        "dehydrated": (22.0, "Dehydrated / Fasting: Severe risk! Core temperature rises +0.2°C per 1% fluid deficit"),
    }
    hyd_pts, hyd_desc = hyd_weights.get(hydration_status.lower(), (6.0, "Normal hydration"))
    total_score += hyd_pts
    breakdown.append({
        "factor": f"Hydration: {hydration_status.replace('_', ' ').capitalize()}",
        "contribution": hyd_pts,
        "category": "Fluid Balance",
        "description": hyd_desc
    })

    # 7. OUTDOOR EXPOSURE TIME
    exp_pts = 0.0
    if outdoor_exposure_hours >= 6.0:
        exp_pts = 16.0
        exp_desc = f"{outdoor_exposure_hours}h outside: Continuous unmitigated radiant & ambient heat absorption"
    elif outdoor_exposure_hours >= 3.0:
        exp_pts = 10.0
        exp_desc = f"{outdoor_exposure_hours}h outside: Sustained thermal accumulation"
    elif outdoor_exposure_hours >= 1.0:
        exp_pts = 5.0
        exp_desc = f"{outdoor_exposure_hours}h outside: Moderate daytime exposure"
    else:
        exp_pts = 0.0
        exp_desc = "<1h outside: Brief outdoor exposure"
    total_score += exp_pts
    breakdown.append({
        "factor": f"Outdoor Exposure ({outdoor_exposure_hours} hrs)",
        "contribution": exp_pts,
        "category": "Environmental Exposure",
        "description": exp_desc
    })

    # 8. CLOTHING / PPE
    cloth_weights = {
        "light": (0.0, "Light breathable cotton: Optimal sweat evaporation (~0.3 clo)"),
        "standard": (6.0, "Standard workwear: Mild thermal trapping (~0.7 clo)"),
        "heavy_protective": (18.0, "Heavy PPE / Uniform: Impedes convective & evaporative cooling (~1.8 clo)"),
    }
    cloth_pts, cloth_desc = cloth_weights.get(clothing_type.lower(), (6.0, "Standard clothing"))
    total_score += cloth_pts
    breakdown.append({
        "factor": f"Clothing: {clothing_type.replace('_', ' ').capitalize()}",
        "contribution": cloth_pts,
        "category": "Thermal Trapping",
        "description": cloth_desc
    })

    # 9. ENVIRONMENTAL CONDITIONS (WBGT or Temperature)
    env_pts = 0.0
    if wbgt_c is not None:
        if wbgt_c >= 32.0:
            env_pts = 35.0
            env_desc = f"Extreme Environmental WBGT {wbgt_c:.1f}°C: Approaching human physiological cooling threshold"
        elif wbgt_c >= 29.0:
            env_pts = 26.0
            env_desc = f"High Environmental WBGT {wbgt_c:.1f}°C: Evaporative cooling heavily restricted"
        elif wbgt_c >= 26.0:
            env_pts = 18.0
            env_desc = f"Moderate Environmental WBGT {wbgt_c:.1f}°C: Noticeable thermal strain"
        else:
            env_pts = 8.0
            env_desc = f"Mild Environmental WBGT {wbgt_c:.1f}°C"
    elif temperature_c is not None:
        if temperature_c >= 42.0:
            env_pts = 35.0
            env_desc = f"Severe Ambient Temperature {temperature_c:.1f}°C: Intense convective heating"
        elif temperature_c >= 38.0:
            env_pts = 28.0
            env_desc = f"High Ambient Temperature {temperature_c:.1f}°C: Sustained thermal challenge"
        elif temperature_c >= 33.0:
            env_pts = 18.0
            env_desc = f"Elevated Ambient Temperature {temperature_c:.1f}°C"
        else:
            env_pts = 8.0
            env_desc = f"Moderate Ambient Temperature {temperature_c:.1f}°C"
    else:
        env_pts = 10.0
        env_desc = "Standard nominal ambient baseline (unspecified weather)"

    total_score += env_pts
    breakdown.append({
        "factor": "Ambient Thermal Load",
        "contribution": env_pts,
        "category": "Weather",
        "description": env_desc
    })

    # Normalize total score smoothly to 0 - 100
    risk_score = round(max(0.0, min(100.0, total_score)), 1)

    # Determine risk level
    if risk_score >= 85:
        risk_level = "CRITICAL"
        heat_strain_level = "Dangerous Physiological Strain"
        water_intake_ml_hr = 1100
        work_rest_cycle = "15 min work / 45 min rest per hour in air-conditioned space"
        alert = "CRITICAL: Immediate danger of heat stroke and cardiovascular collapse. Cease intense labor."
    elif risk_score >= 70:
        risk_level = "EXTREME"
        heat_strain_level = "Severe Physiological Strain"
        water_intake_ml_hr = 950
        work_rest_cycle = "25 min work / 35 min rest per hour in cooled shade"
        alert = "EXTREME: High susceptibility to heat exhaustion. Strict cooling and hydration protocols required."
    elif risk_score >= 50:
        risk_level = "HIGH"
        heat_strain_level = "Elevated Physiological Strain"
        water_intake_ml_hr = 750
        work_rest_cycle = "40 min work / 20 min rest per hour in shade"
        alert = "HIGH: Thermal stress causes rapid fatigue. Increase electrolyte hydration and enforce pacing."
    elif risk_score >= 30:
        risk_level = "MODERATE"
        heat_strain_level = "Mild-to-Moderate Physiological Strain"
        water_intake_ml_hr = 550
        work_rest_cycle = "50 min work / 10 min rest per hour"
        alert = "MODERATE: Moderate heat burden. Maintain steady fluid consumption and avoid direct solar midday peak."
    else:
        risk_level = "LOW"
        heat_strain_level = "Minimal Strain"
        water_intake_ml_hr = 350
        work_rest_cycle = "Normal activity; routine 10 min hydration pause every 2 hours"
        alert = "LOW: Low personal heat-health risk. Continue standard hydration practices."

    # Safety Recommendations
    recommendations: List[str] = []
    recommendations.append(f"Drink at least {water_intake_ml_hr} mL of water per hour (small sips every 15-20 minutes).")

    if risk_score >= 50 or is_pregnant or "kidney_disease" in [c.lower() for c in health_conditions]:
        recommendations.append("Incorporate Oral Rehydration Salts (ORS), coconut water, or electrolyte-replenishing drinks.")

    recommendations.append(f"Follow work-rest cycle: {work_rest_cycle}.")

    if outdoor_exposure_hours > 2.0:
        recommendations.append("Wear UV-blocking wide-brim headgear, light-colored breathable clothing, and apply SPF 30+ sunscreen.")

    if health_conditions:
        recommendations.append("If taking diuretics, beta-blockers, or antihistamines, consult your healthcare provider regarding dosage during heatwaves.")

    if age >= 65 or age <= 5 or is_pregnant:
        recommendations.append("Ensure access to active indoor cooling (fans, evaporative cooler, or air conditioning) between 12:00 PM and 4:00 PM.")

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "heat_strain_level": heat_strain_level,
        "alert": alert,
        "recommended_water_intake_ml_hr": water_intake_ml_hr,
        "work_rest_cycle": work_rest_cycle,
        "risk_factors_breakdown": breakdown,
        "safety_recommendations": recommendations,
    }