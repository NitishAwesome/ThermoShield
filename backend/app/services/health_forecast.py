"""
ThermoShield 3–5 Day Human Health Impact Forecast & Predictive Early Warning Engine

Scientific & Operational Principles:
1. Translates forecast meteorological data into human biometeorological metrics (estimated WBGT, Heat Index).
2. Uses real hourly forecast parameters (temperature, relative humidity, wind speed, shortwave radiation)
   to determine the daily peak thermal stress hour rather than synthetic multipliers.
3. Predicts comparative civic health pressure using ThermoShield's ML health-impact proxy.
4. STRICT SCIENTIFIC HONESTY: NEVER outputs fabricated death counts or hospital admission figures.
   Instead reports 'Projected Health Impact Proxy' and 'Expected Civic Health Concern' with full transparency.
5. Generates multi-day forecast risk levels across all 24 BMC administrative wards for GIS dynamic recoloring
   using real ward-specific meteorological forecast data.
"""

import math
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
import logging

from app.services.weather import get_weather
from app.services.thermal import calculate_thermal_stress
from app.services.risk import predict_risk
from app.services.heat_action_plan import (
    evaluate_heat_action_plan,
    MUNICIPAL_WARD_REGISTRY,
    TRIGGER_ACTION_NOW,
    TRIGGER_PREPARE_24H,
    TRIGGER_PREPARE_3D,
    TRIGGER_BASELINE,
)

logger = logging.getLogger(__name__)

PROTOTYPE_SEED_NOTE = (
    "Historical (18) and lag (15) health events are fixed prototype baseline seeds in this version "
    "(calibrated to standard Mumbai ward surveillance averages). Future production versions will bind "
    "to live municipal health surveillance registries (HMIS/IDSP)."
)

ML_TRANSPARENCY_DISCLAIMER = (
    "Forecast health concern uses ThermoShield's prototype ML health-impact proxy trained on synthetic "
    "epidemiological and microclimate data. It is intended for comparative civic planning and early-warning "
    "prioritization, not clinical prediction or casualty counting. "
    + PROTOTYPE_SEED_NOTE
)


def _classify_health_concern(proxy_score: float) -> Dict[str, str]:
    """
    Translates synthetic ML proxy score (0-100) into an honest civic concern level.
    """
    if proxy_score >= 80.0:
        return {
            "level": "CRITICAL",
            "label": "Critical Health Concern",
            "color": "#EF4444",
            "description": "Severe thermal strain; acute dehydration and exertional heatstroke risk across vulnerable demographics."
        }
    if proxy_score >= 65.0:
        return {
            "level": "SEVERE",
            "label": "Severe Heat Stress",
            "color": "#F97316",
            "description": "High probability of heat exhaustion among outdoor workers; primary care hydration surge likely."
        }
    if proxy_score >= 45.0:
        return {
            "level": "HIGH",
            "label": "Elevated Civic Concern",
            "color": "#F59E0B",
            "description": "Noticeable afternoon thermal discomfort; prolonged outdoor exertion requires scheduled breaks."
        }
    if proxy_score >= 30.0:
        return {
            "level": "MODERATE",
            "label": "Moderate Health Concern",
            "color": "#3B82F6",
            "description": "Manageable thermal load within typical seasonal thresholds; routine vigilance advised."
        }
    return {
        "level": "LOW",
        "label": "Low Baseline Concern",
        "color": "#10B981",
        "description": "Minimal civic thermal stress; favorable meteorological recovery window."
    }


def _extract_daily_peak_from_hourly(
    hourly: Optional[Dict[str, Any]],
    day_idx: int,
    target_date: Optional[str] = None,
    t_max_fallback: float = 34.0,
    t_min_fallback: float = 26.0,
    uv_max_fallback: float = 8.0,
) -> Dict[str, Any]:
    """
    Extracts the peak thermal stress hour for a specific forecast day from hourly data.
    If hourly data is absent or lacks sufficient hours, falls back to diurnal models
    and flags is_real_hourly=False.
    """
    if not hourly or not isinstance(hourly, dict) or not hourly.get("time"):
        # Modelled fallback
        est_rh = max(45.0, min(80.0, 68.0 - (t_max_fallback - 32.0) * 3.5))
        return {
            "temperature": t_max_fallback,
            "humidity": est_rh,
            "wind_speed": 2.5,
            "solar_radiation": max(400.0, uv_max_fallback * 85.0),
            "apparent_temperature": t_max_fallback + 4.0,
            "is_real_hourly": False,
            "peak_time": None,
        }

    times = hourly.get("time", [])
    temps = hourly.get("temperature", [])
    rhs = hourly.get("humidity", [])
    app_temps = hourly.get("apparent_temperature", [])
    winds = hourly.get("wind_speed", [])
    solars = hourly.get("shortwave_radiation", [])
    is_days = hourly.get("is_day", [])

    # Find matching hourly indices for target_date or 24-hour block
    matching_indices: List[int] = []
    if target_date:
        prefix = target_date[:10]
        matching_indices = [i for i, t_str in enumerate(times) if str(t_str).startswith(prefix)]

    if not matching_indices:
        start_i = day_idx * 24
        end_i = min(len(times), (day_idx + 1) * 24)
        if start_i < len(times):
            matching_indices = list(range(start_i, end_i))

    if not matching_indices:
        est_rh = max(45.0, min(80.0, 68.0 - (t_max_fallback - 32.0) * 3.5))
        return {
            "temperature": t_max_fallback,
            "humidity": est_rh,
            "wind_speed": 2.5,
            "solar_radiation": max(400.0, uv_max_fallback * 85.0),
            "apparent_temperature": t_max_fallback + 4.0,
            "is_real_hourly": False,
            "peak_time": None,
        }

    # Find the hour with peak thermal stress
    # Evaluates biometeorological Estimated WBGT for each eligible hourly record and selects the peak thermal strain hour
    def _peak_thermal_stress_key(idx: int) -> Tuple[float, float, float]:
        is_d = is_days[idx] if idx < len(is_days) else 1
        t = float(temps[idx]) if idx < len(temps) else t_max_fallback
        rh = float(rhs[idx]) if idx < len(rhs) else 50.0
        w = float(winds[idx]) if idx < len(winds) else 2.5
        sol = float(solars[idx]) if (idx < len(solars) and is_d == 1) else (uv_max_fallback * 85.0 if is_d == 1 else 0.0)
        at = float(app_temps[idx]) if idx < len(app_temps) else t + 2.0

        thermal = calculate_thermal_stress(
            temperature=t,
            humidity=rh,
            wind_speed=w,
            solar_radiation=sol,
        )
        wbgt = float(thermal.get("indices", {}).get("wbgt_c", 0.0))
        # Primary sort: peak Estimated WBGT; secondary tie-breakers: apparent temp, dry-bulb temp
        return (wbgt, at, t)

    best_idx = max(matching_indices, key=_peak_thermal_stress_key)

    is_d_best = is_days[best_idx] if best_idx < len(is_days) else 1
    eff_temp = float(temps[best_idx]) if best_idx < len(temps) else t_max_fallback
    eff_rh = float(rhs[best_idx]) if best_idx < len(rhs) else 50.0
    eff_at = float(app_temps[best_idx]) if best_idx < len(app_temps) else eff_temp + 3.0
    eff_wind = float(winds[best_idx]) if best_idx < len(winds) else 2.5
    eff_solar = float(solars[best_idx]) if (best_idx < len(solars) and is_d_best == 1) else (max(400.0, uv_max_fallback * 85.0) if is_d_best == 1 else 0.0)

    return {
        "temperature": round(eff_temp, 1),
        "humidity": round(eff_rh, 1),
        "wind_speed": round(eff_wind, 2),
        "solar_radiation": round(eff_solar, 1),
        "apparent_temperature": round(eff_at, 1),
        "is_real_hourly": True,
        "peak_time": times[best_idx] if best_idx < len(times) else None,
    }


def _synthetic_ward_fallback_forecast(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Explicit fallback pipeline used ONLY when live meteorological forecast queries fail
    for an administrative ward. Applies calibrated diurnal adjustments to baseline profiles.
    Never used in normal operation.
    """
    forecast_progression = [
        {"day_idx": 0, "label": "Now (Live)", "temp_factor": 1.0, "wbgt_factor": 1.0},
        {"day_idx": 1, "label": "Tomorrow (+1d)", "temp_factor": 1.02, "wbgt_factor": 1.03},
        {"day_idx": 2, "label": "Day 2 (+2d)", "temp_factor": 1.04, "wbgt_factor": 1.06},
        {"day_idx": 3, "label": "Day 3 (+3d)", "temp_factor": 1.01, "wbgt_factor": 1.02},
        {"day_idx": 4, "label": "Day 4 (+4d)", "temp_factor": 0.98, "wbgt_factor": 0.97},
    ]
    base_t = profile.get("baseline_temp", 34.0)
    wbgt_off = profile.get("wbgt_offset", 0.0)
    vuln = profile.get("vulnerability_score", 50.0)

    ward_forecast = []
    for p in forecast_progression:
        calc_t = round(base_t * p["temp_factor"], 1)
        calc_wbgt = round((28.0 + wbgt_off + (vuln / 100.0) * 3.0) * p["wbgt_factor"], 1)
        raw_score = (calc_wbgt - 25.0) * 8.0 + (vuln * 0.4)
        r_score = max(10.0, min(98.0, raw_score))
        r_level = "EXTREME" if r_score >= 75 else "HIGH" if r_score >= 50 else "MODERATE" if r_score >= 30 else "LOW"
        concern_meta = _classify_health_concern(r_score)

        ward_forecast.append({
            "day_index": p["day_idx"],
            "day_label": p["label"],
            "date": None,
            "temperature_c": calc_t,
            "humidity": 60.0,
            "wind_speed_ms": 2.5,
            "solar_radiation_wm2": 500.0,
            "wbgt_c": calc_wbgt,
            "risk_level": r_level,
            "risk_score": round(r_score, 1),
            "health_concern": concern_meta["level"],
            "health_concern_color": concern_meta["color"],
        })
    return ward_forecast


async def generate_health_impact_forecast(
    latitude: float,
    longitude: float,
    area_name: Optional[str] = None,
    area_id: Optional[str] = None,
    vulnerability_score: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Generates a scientifically grounded 5-day human health impact forecast.
    Integrates weather forecast, hourly biometeorological WBGT, socio-demographic vulnerability,
    and ML health proxy predictions.
    """
    weather_data = await get_weather(latitude, longitude)
    raw_forecast = weather_data.get("forecast", {})
    weather = weather_data.get("weather", {})
    hourly = raw_forecast.get("hourly", {})

    is_fallback = bool(
        weather_data.get("is_fallback", False) or
        weather_data.get("source_status") == "OFFLINE_FALLBACK" or
        weather.get("is_fallback", False)
    )

    # Extract forecast lists
    dates = raw_forecast.get("dates") or [
        (datetime.utcnow().date() + timedelta(days=i)).isoformat() for i in range(5)
    ]
    max_temps = raw_forecast.get("max_temperature") or [34.0, 35.0, 35.5, 34.5, 33.5]
    min_temps = raw_forecast.get("min_temperature") or [26.0, 26.5, 27.0, 26.5, 25.5]
    app_max = raw_forecast.get("apparent_temperature_max") or [38.0, 39.5, 40.5, 38.5, 37.0]
    uv_max = raw_forecast.get("uv_index_max") or [8.5, 9.0, 8.8, 8.2, 7.8]

    # Resolve vulnerability
    clean_id = (area_id or "").strip().lower()
    reg_entry = MUNICIPAL_WARD_REGISTRY.get(clean_id, {})
    eff_name = area_name or reg_entry.get("name") or weather_data.get("location", {}).get("name") or "Monitored Sector"
    eff_vuln = (
        vulnerability_score
        if vulnerability_score is not None
        else float(reg_entry.get("vulnerability_score", 55.0))
    )

    daily_outlooks = []
    first_high_day: Optional[str] = None
    first_extreme_day: Optional[str] = None
    first_severe_lead_hours: Optional[int] = None
    peak_score = -1.0
    peak_day_label = ""
    peak_date = ""

    day_labels = ["Today", "Tomorrow (+1d)", "Day 2 (+2d)", "Day 3 (+3d)", "Day 4 (+4d)"]

    for idx in range(min(5, len(dates))):
        t_max = max_temps[idx] if idx < len(max_temps) else 34.0
        t_min = min_temps[idx] if idx < len(min_temps) else 26.0
        app_t = app_max[idx] if idx < len(app_max) else t_max + 4.0
        uv = uv_max[idx] if idx < len(uv_max) else 8.0
        d_str = dates[idx]

        # Extract peak thermal-stress hour from real hourly forecast data
        peak = _extract_daily_peak_from_hourly(
            hourly=hourly,
            day_idx=idx,
            target_date=d_str,
            t_max_fallback=t_max,
            t_min_fallback=t_min,
            uv_max_fallback=uv,
        )

        eff_temp = peak["temperature"]
        eff_rh = peak["humidity"]
        eff_wind = peak["wind_speed"]
        eff_solar = peak["solar_radiation"]

        # Calculate thermal stress metrics using peak hour inputs
        thermal_res = calculate_thermal_stress(
            temperature=eff_temp,
            humidity=eff_rh,
            wind_speed=eff_wind,
            solar_radiation=eff_solar
        )
        indices = thermal_res.get("indices", {})
        wbgt = round(indices.get("wbgt_c", eff_temp * 0.7 + (eff_rh / 100.0) * 10.0 + 3.5), 1)
        heat_index = round(indices.get("heat_index_c", app_t), 1)
        thermal_score = round(thermal_res.get("risk_assessment", {}).get("score", 0.6) * 100.0, 1)

        # Predict ML health proxy (historical=18, lag=15 prototype baseline seeds)
        ml_res = predict_risk(
            temperature_c=eff_temp,
            thermal_stress=thermal_score,
            vulnerability_index=eff_vuln,
            historical_health_events=18,
            lag_health_events=15
        )
        risk_score = ml_res.get("risk_score", 50.0)
        risk_level = ml_res.get("risk_level", "HIGH")
        proxy_value = ml_res.get("predicted_health_impact_proxy", risk_score * 0.22 + 5.0)

        # Scale proxy to a 0-100 civic health pressure index
        civic_health_index = min(99.0, max(10.0, (proxy_value / 25.0) * 70.0 + (risk_score * 0.3)))
        concern_meta = _classify_health_concern(civic_health_index)

        # Track peak concern day
        if civic_health_index > peak_score:
            peak_score = civic_health_index
            peak_day_label = day_labels[idx]
            peak_date = d_str

        # Track lead time
        lead_hours = idx * 24
        if risk_level == "HIGH" and first_high_day is None:
            first_high_day = day_labels[idx]
            if first_severe_lead_hours is None:
                first_severe_lead_hours = max(4, lead_hours)
        if risk_level == "EXTREME" and first_extreme_day is None:
            first_extreme_day = day_labels[idx]
            first_severe_lead_hours = max(4, lead_hours)

        # Determine trigger state for this day
        if idx == 0:
            trig_state = TRIGGER_ACTION_NOW if risk_level in ["HIGH", "EXTREME"] else TRIGGER_BASELINE
        elif idx == 1:
            trig_state = TRIGGER_PREPARE_24H if risk_level in ["HIGH", "EXTREME"] else TRIGGER_BASELINE
        elif idx in [2, 3]:
            trig_state = TRIGGER_PREPARE_3D if risk_level in ["HIGH", "EXTREME"] else TRIGGER_BASELINE
        else:
            trig_state = TRIGGER_BASELINE

        daily_outlooks.append({
            "day_index": idx,
            "day_label": day_labels[idx],
            "date": d_str,
            "temp_max_c": round(t_max, 1),
            "temp_min_c": round(t_min, 1),
            "peak_hour_temp_c": round(eff_temp, 1),
            "peak_hour_humidity": round(eff_rh, 1),
            "peak_hour_wind_speed_ms": round(eff_wind, 2),
            "peak_hour_solar_radiation_wm2": round(eff_solar, 1),
            "apparent_temp_max_c": round(app_t, 1),
            "estimated_wbgt_c": wbgt,
            "heat_index_c": heat_index,
            "uv_index_max": round(uv, 1),
            "thermal_risk_level": risk_level,
            "thermal_risk_score": round(risk_score, 1),
            "vulnerability_score": round(eff_vuln, 1),
            "projected_health_impact_proxy": round(civic_health_index, 1),
            "civic_health_concern": concern_meta["level"],
            "civic_health_label": concern_meta["label"],
            "civic_health_description": concern_meta["description"],
            "civic_health_color": concern_meta["color"],
            "trigger_state": trig_state,
            "is_real_hourly": peak.get("is_real_hourly", False),
        })

    # Find expected relief day (first day after peak where risk drops)
    relief_day: Optional[str] = None
    for item in daily_outlooks:
        if item["projected_health_impact_proxy"] < peak_score - 15.0 and item["day_index"] > 1:
            relief_day = item["day_label"]
            break

    # Construct human-readable lead time summary
    if first_extreme_day:
        lead_summary = f"EXTREME heat conditions forecast for {first_extreme_day} (in approx. {first_severe_lead_hours}h). Pre-stage civic emergency cooling centers now."
    elif first_high_day:
        lead_summary = f"HIGH heat stress emerging on {first_high_day}. Prepare outdoor worker rest pacing and hydration support."
    else:
        lead_summary = "Thermal conditions are projected to remain within baseline thresholds across the 5-day forecast horizon."

    has_real_hourly = any(d.get("is_real_hourly", False) for d in daily_outlooks)
    source_classification = {
        "weather_classification": "SYNTHETIC_FALLBACK" if is_fallback else "REAL_FORECAST",
        "thermal_classification": "CALCULATED_FROM_FORECAST" if (not is_fallback and has_real_hourly) else "CALCULATED_FROM_MODELLED_INPUTS",
        "health_classification": "MODELLED_PROTOTYPE",
        "fallback_active": is_fallback,
    }

    return {
        "area_id": clean_id,
        "area_name": eff_name,
        "coordinates": {"latitude": latitude, "longitude": longitude},
        "days_count": len(daily_outlooks),
        "forecast_days": daily_outlooks,
        "lead_time_intelligence": {
            "first_high_risk_day": first_high_day,
            "first_extreme_risk_day": first_extreme_day,
            "lead_time_hours": first_severe_lead_hours,
            "peak_concern_day": peak_day_label,
            "peak_concern_date": peak_date,
            "peak_concern_score": round(peak_score, 1),
            "relief_day": relief_day or "Following cycle",
            "summary_directive": lead_summary,
        },
        "ml_transparency_disclaimer": ML_TRANSPARENCY_DISCLAIMER,
        "prototype_seed_note": PROTOTYPE_SEED_NOTE,
        "forecast_source_classification": source_classification,
        "source_status": weather_data.get("source_status", "LIVE"),
        "source_name": weather_data.get("source_name", "Open-Meteo Global API + ThermoShield ML Engine"),
    }


async def get_all_wards_forecast_summary() -> List[Dict[str, Any]]:
    """
    Generates 5-day risk level projections across all 24 Mumbai administrative ward references
    using representative ward coordinates derived from the current administrative ward geometry dataset.
    Uses REAL per-ward Open-Meteo forecasts and hourly biometeorological modeling.
    Fires asynchronous requests across all ward coordinates in parallel.
    """
    ward_items = list(MUNICIPAL_WARD_REGISTRY.items())

    # Bounded concurrency limiter to protect upstream APIs and prevent socket exhaustion
    sem = asyncio.Semaphore(10)

    async def _fetch_ward_weather(lat: float, lon: float):
        async with sem:
            return await get_weather(lat, lon)

    # Fire async weather fetches with bounded concurrency for all 24 Mumbai administrative ward references
    tasks = [
        _fetch_ward_weather(profile["latitude"], profile["longitude"])
        for _, profile in ward_items
    ]
    weather_results = await asyncio.gather(*tasks, return_exceptions=True)

    results = []
    day_labels = ["Now (Live)", "Tomorrow (+1d)", "Day 2 (+2d)", "Day 3 (+3d)", "Day 4 (+4d)"]

    for (ward_id, profile), weather_or_exc in zip(ward_items, weather_results):
        vuln = float(profile.get("vulnerability_score", 50.0))
        ward_code = profile.get("ward_code", ward_id.replace("ward_", "").upper())

        # If weather fetch raised an exception or failed unexpectedly
        if isinstance(weather_or_exc, Exception) or not isinstance(weather_or_exc, dict):
            logger.warning(f"Weather fetch failed for ward {ward_id} ({ward_code}): {weather_or_exc}. Using fallback.")
            fallback_forecast = _synthetic_ward_fallback_forecast(profile)
            results.append({
                "ward_id": ward_id,
                "area_id": ward_id,
                "ward_code": ward_code,
                "ward_name": profile["name"],
                "area_name": profile["name"],
                "district": profile.get("district", "Mumbai"),
                "latitude": profile["latitude"],
                "longitude": profile["longitude"],
                "vulnerability_score": vuln,
                "forecast_days": fallback_forecast,
                "forecast_status": "SYNTHETIC_FALLBACK",
                "fallback_active": True,
                "forecast_source_classification": {
                    "weather_classification": "SYNTHETIC_FALLBACK",
                    "thermal_classification": "CALCULATED_FROM_MODELLED_INPUTS",
                    "health_classification": "MODELLED_PROTOTYPE",
                    "fallback_active": True,
                },
                "source_status": "OFFLINE_FALLBACK",
                "source_name": "Regional Baseline Fallback",
            })
            continue

        try:
            weather_data = weather_or_exc
            is_fallback = bool(
                weather_data.get("is_fallback", False) or
                weather_data.get("source_status") == "OFFLINE_FALLBACK"
            )
            raw_forecast = weather_data.get("forecast", {})
            dates = raw_forecast.get("dates") or [
                (datetime.utcnow().date() + timedelta(days=i)).isoformat() for i in range(5)
            ]
            max_temps = raw_forecast.get("max_temperature") or [34.0, 34.5, 34.0, 33.5, 34.0]
            min_temps = raw_forecast.get("min_temperature") or [26.0, 26.5, 26.0, 25.5, 26.0]
            uv_max = raw_forecast.get("uv_index_max") or [8.5, 8.8, 8.6, 8.2, 8.4]
            hourly = raw_forecast.get("hourly", {})

            ward_forecast = []
            for day_idx in range(min(5, len(dates))):
                t_max_fb = max_temps[day_idx] if day_idx < len(max_temps) else 34.0
                uv_fb = uv_max[day_idx] if day_idx < len(uv_max) else 8.0
                d_str = dates[day_idx] if day_idx < len(dates) else None

                peak = _extract_daily_peak_from_hourly(
                    hourly=hourly,
                    day_idx=day_idx,
                    target_date=d_str,
                    t_max_fallback=t_max_fb,
                    uv_max_fallback=uv_fb,
                )

                # Compute biometeorological WBGT and Heat Index from real hourly peak
                thermal_res = calculate_thermal_stress(
                    temperature=peak["temperature"],
                    humidity=peak["humidity"],
                    wind_speed=peak["wind_speed"],
                    solar_radiation=peak["solar_radiation"]
                )
                indices = thermal_res.get("indices", {})
                wbgt = round(indices.get("wbgt_c", 28.0), 1)
                thermal_score = round(thermal_res.get("risk_assessment", {}).get("score", 0.6) * 100.0, 1)

                # Predict ML risk score & level
                ml_res = predict_risk(
                    temperature_c=peak["temperature"],
                    thermal_stress=thermal_score,
                    vulnerability_index=vuln,
                    historical_health_events=18,
                    lag_health_events=15
                )
                risk_score = ml_res.get("risk_score", 50.0)
                risk_level = ml_res.get("risk_level", "HIGH")
                proxy_value = ml_res.get("predicted_health_impact_proxy", risk_score * 0.22 + 5.0)

                # Civic concern mapping
                civic_health_index = min(99.0, max(10.0, (proxy_value / 25.0) * 70.0 + (risk_score * 0.3)))
                concern_meta = _classify_health_concern(civic_health_index)

                ward_forecast.append({
                    "day_index": day_idx,
                    "day_label": day_labels[day_idx] if day_idx < len(day_labels) else f"Day {day_idx}",
                    "date": d_str,
                    "temperature_c": round(peak["temperature"], 1),
                    "humidity": round(peak["humidity"], 1),
                    "wind_speed_ms": round(peak["wind_speed"], 2),
                    "solar_radiation_wm2": round(peak["solar_radiation"], 1),
                    "wbgt_c": wbgt,
                    "risk_level": risk_level,
                    "risk_score": round(risk_score, 1),
                    "health_concern": concern_meta["level"],
                    "health_concern_color": concern_meta["color"],
                })

            results.append({
                "ward_id": ward_id,
                "area_id": ward_id,
                "ward_code": ward_code,
                "ward_name": profile["name"],
                "area_name": profile["name"],
                "district": profile.get("district", "Mumbai"),
                "latitude": profile["latitude"],
                "longitude": profile["longitude"],
                "vulnerability_score": vuln,
                "forecast_days": ward_forecast,
                "forecast_status": "SYNTHETIC_FALLBACK" if is_fallback else "REAL_FORECAST",
                "fallback_active": is_fallback,
                "forecast_source_classification": {
                    "weather_classification": "SYNTHETIC_FALLBACK" if is_fallback else "REAL_FORECAST",
                    "thermal_classification": "CALCULATED_FROM_MODELLED_INPUTS" if is_fallback else "CALCULATED_FROM_FORECAST",
                    "health_classification": "MODELLED_PROTOTYPE",
                    "fallback_active": is_fallback,
                },
                "source_status": weather_data.get("source_status", "LIVE"),
                "source_name": weather_data.get("source_name", "Open-Meteo Global API"),
            })
        except Exception as inner_exc:
            logger.error(f"Error processing forecast for ward {ward_id} ({ward_code}): {inner_exc}. Preserving ward via fallback.")
            fallback_forecast = _synthetic_ward_fallback_forecast(profile)
            results.append({
                "ward_id": ward_id,
                "area_id": ward_id,
                "ward_code": ward_code,
                "ward_name": profile["name"],
                "area_name": profile["name"],
                "district": profile.get("district", "Mumbai"),
                "latitude": profile["latitude"],
                "longitude": profile["longitude"],
                "vulnerability_score": vuln,
                "forecast_days": fallback_forecast,
                "forecast_status": "SYNTHETIC_FALLBACK",
                "fallback_active": True,
                "forecast_source_classification": {
                    "weather_classification": "SYNTHETIC_FALLBACK",
                    "thermal_classification": "CALCULATED_FROM_MODELLED_INPUTS",
                    "health_classification": "MODELLED_PROTOTYPE",
                    "fallback_active": True,
                },
                "source_status": "OFFLINE_FALLBACK",
                "source_name": "Regional Baseline Fallback",
            })

    return results


def get_all_wards_forecast_summary_sync() -> List[Dict[str, Any]]:
    """
    Synchronous compatibility wrapper for get_all_wards_forecast_summary.
    """
    return asyncio.run(get_all_wards_forecast_summary())
