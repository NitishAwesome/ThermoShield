import asyncio
import time
import math
import json
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
import httpx

logger = logging.getLogger(__name__)

try:
    from app.services.weather import get_weather
    from app.services.thermal import calculate_thermal_stress
    from app.services.risk import predict_risk
except ImportError:
    from app.services.weather import get_weather
    from app.services.thermal import calculate_thermal_stress
    from app.services.risk import predict_risk


MAJOR_AREAS = [
    {
        "name": "Mumbai",
        "state": "Maharashtra",
        "zone": "Western Coastal",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "vulnerability_index": 35.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "High Coastal Humidity & Dense Informal Settlements",
        "default_temp": 33.5,
        "default_rh": 74.0,
    },
    {
        "name": "New Delhi",
        "state": "Delhi NCR",
        "zone": "Northern Plains",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "vulnerability_index": 38.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Extreme Continental Heat Island & Outdoor Labor",
        "default_temp": 38.5,
        "default_rh": 42.0,
    },
    {
        "name": "Ahmedabad",
        "state": "Gujarat",
        "zone": "Western Arid",
        "latitude": 23.0225,
        "longitude": 72.5714,
        "vulnerability_index": 34.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Intense Dry Heat & High Radiative Solar Index",
        "default_temp": 39.0,
        "default_rh": 36.0,
    },
    {
        "name": "Nagpur",
        "state": "Maharashtra",
        "zone": "Central Plateau",
        "latitude": 21.1458,
        "longitude": 79.0882,
        "vulnerability_index": 32.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Central Heatwave Corridor & Prolonged Daytime Highs",
        "default_temp": 39.5,
        "default_rh": 35.0,
    },
    {
        "name": "Chennai",
        "state": "Tamil Nadu",
        "zone": "Southern Coastal",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "vulnerability_index": 30.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Continuous Tropical Dew Point & Moisture Trapping",
        "default_temp": 34.0,
        "default_rh": 76.0,
    },
    {
        "name": "Kolkata",
        "state": "West Bengal",
        "zone": "Eastern Delta",
        "latitude": 22.5726,
        "longitude": 88.3639,
        "vulnerability_index": 36.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Severe Wet-Bulb Heat Load & Gangetic Delta Humidity",
        "default_temp": 35.0,
        "default_rh": 72.0,
    },
    {
        "name": "Jaipur",
        "state": "Rajasthan",
        "zone": "North-Western",
        "latitude": 26.9124,
        "longitude": 75.7873,
        "vulnerability_index": 31.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Thar Desert Border Thermal Waves & High Sun Exposure",
        "default_temp": 38.0,
        "default_rh": 32.0,
    },
    {
        "name": "Hyderabad",
        "state": "Telangana",
        "zone": "Deccan Plateau",
        "latitude": 17.3850,
        "longitude": 78.4867,
        "vulnerability_index": 28.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Rapid Urbanization & Afternoon Thermal Peaks",
        "default_temp": 36.0,
        "default_rh": 48.0,
    },
    {
        "name": "Bengaluru",
        "state": "Karnataka",
        "zone": "Southern Plateau",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "vulnerability_index": 22.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Microclimate Urban Density & Rising Summer Anomalies",
        "default_temp": 30.0,
        "default_rh": 55.0,
    },
    {
        "name": "Lucknow",
        "state": "Uttar Pradesh",
        "zone": "Gangetic Plains",
        "latitude": 26.8467,
        "longitude": 80.9462,
        "vulnerability_index": 37.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "High Agricultural & Outdoor Construction Worker Ratio",
        "default_temp": 37.5,
        "default_rh": 52.0,
    },
    {
        "name": "Patna",
        "state": "Bihar",
        "zone": "Eastern Gangetic",
        "latitude": 25.5941,
        "longitude": 85.1376,
        "vulnerability_index": 40.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Elevated Healthcare Sensitivity & Humid Heat Spells",
        "default_temp": 36.5,
        "default_rh": 60.0,
    },
    {
        "name": "Surat",
        "state": "Gujarat",
        "zone": "Western Coastal",
        "latitude": 21.1702,
        "longitude": 72.8311,
        "vulnerability_index": 33.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Industrial Workforce Concentration & Maritime Humidity",
        "default_temp": 34.0,
        "default_rh": 70.0,
    },
]

def get_area_profile_for_coordinates(
    lat: float,
    lon: float,
    tolerance: float = 0.01,
) -> Dict[str, Any] | None:
    """
    Return the monitored-area profile matching the given coordinates.

    A small coordinate tolerance allows frontend-selected coordinates
    to match the corresponding monitored city without treating arbitrary
    nearby locations as the same area.
    """
    for area in MAJOR_AREAS:
        if (
            abs(float(lat) - float(area["latitude"])) <= tolerance
            and abs(float(lon) - float(area["longitude"])) <= tolerance
        ):
            return area

    return None

AREAS_CACHE_TTL = 600.0  # 10 minutes cache
_AREAS_CACHE: Dict[str, Any] = {"data": None, "timestamp": 0.0}
_AREAS_LOCK: Optional[asyncio.Lock] = None


async def get_location_risk(
    lat: float,
    lon: float,
    vulnerability_index: float | None = None,
    historical_health_events: int | None = None,
    lag_health_events: int | None = None,
):
    area_profile = get_area_profile_for_coordinates(lat, lon)
    if area_profile:
        vulnerability_index = (
            vulnerability_index
            if vulnerability_index is not None
            else float(area_profile["vulnerability_index"])
        )
        historical_health_events = (
            historical_health_events
            if historical_health_events is not None
            else int(area_profile["historical_health_events"])
        )
        lag_health_events = (
            lag_health_events
            if lag_health_events is not None
            else int(area_profile["lag_health_events"])
        )
    else:
        vulnerability_index = (
            vulnerability_index
            if vulnerability_index is not None
            else 30.0
        )
        historical_health_events = (
            historical_health_events
            if historical_health_events is not None
            else 17
        )
        lag_health_events = (
            lag_health_events
            if lag_health_events is not None
            else 15
        )
    """
    Computes unified ML health risk for a geographic coordinate.
    Uses the authoritative thermal stress engine and ML prediction model.
    """
    weather_data = await get_weather(lat, lon)
    weather = weather_data["weather"]

    thermal_result = calculate_thermal_stress(
        temperature=weather["temperature"],
        humidity=weather["humidity"],
        wind_speed=weather.get("wind_speed", 1.0),
        solar_radiation=weather.get("solar_radiation")
    )

    thermal_stress = round(
        thermal_result["risk_assessment"]["score"] * 100,
        2
    )

    risk_result = predict_risk(
        temperature_c=weather["temperature"],
        thermal_stress=thermal_stress,
        vulnerability_index=vulnerability_index,
        historical_health_events=historical_health_events,
        lag_health_events=lag_health_events
    )

    return {
        "latitude": lat,
        "longitude": lon,
        "risk_score": risk_result["risk_score"],
        "risk_level": risk_result["risk_level"]
    }


async def _evaluate_single_area(area_cfg: Dict[str, Any]) -> Dict[str, Any]:
    lat = area_cfg["latitude"]
    lon = area_cfg["longitude"]

    try:
        weather_data = await get_weather(lat, lon)
        weather = weather_data["weather"]
        temp = float(weather.get("temperature", area_cfg["default_temp"]))
        rh = float(weather.get("humidity", area_cfg["default_rh"]))
        wind = float(weather.get("wind_speed", 2.0))
        solar = weather.get("solar_radiation")
    except Exception:
        temp = area_cfg["default_temp"]
        rh = area_cfg["default_rh"]
        wind = 2.0
        solar = None

    thermal_result = calculate_thermal_stress(
        temperature=temp,
        humidity=rh,
        wind_speed=wind,
        solar_radiation=solar
    )

    wbgt = round(thermal_result["indices"]["wbgt_c"], 1)
    thermal_stress = round(thermal_result["risk_assessment"]["score"] * 100, 2)

    risk_result = predict_risk(
        temperature_c=temp,
        thermal_stress=thermal_stress,
        vulnerability_index=area_cfg["vulnerability_index"],
        historical_health_events=area_cfg["historical_health_events"],
        lag_health_events=area_cfg["lag_health_events"],
    )

    risk_level = risk_result["risk_level"]
    risk_score = round(risk_result["risk_score"], 1)

    # Advisory summary
    if risk_level in ["EXTREME", "CRITICAL"]:
        summary_advisory = "Extreme thermal caution: Activate municipal cooling centers and restrict outdoor work 12-4 PM."
    elif risk_level == "HIGH":
        summary_advisory = "High physiological heat strain: Increase hydration points and advise vulnerable citizens."
    elif risk_level == "MODERATE":
        summary_advisory = "Moderate thermal load: Maintain routine hydration and shade access during peak hours."
    else:
        summary_advisory = "Low heat strain: Normal civic activities with baseline hydration."

    return {
        "name": area_cfg["name"],
        "state": area_cfg["state"],
        "zone": area_cfg["zone"],
        "latitude": lat,
        "longitude": lon,
        "temperature_c": round(temp, 1),
        "humidity_pct": round(rh, 1),
        "wind_speed_mps": round(wind, 1),
        "wbgt_c": wbgt,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "vulnerability_tag": area_cfg["vulnerability_tag"],
        "summary_advisory": summary_advisory,
        "area_type": area_cfg.get("area_type", "regional_centroid"),
    }


def _evaluate_single_area_baseline(area_cfg: Dict[str, Any]) -> Dict[str, Any]:
    lat = area_cfg["latitude"]
    lon = area_cfg["longitude"]
    temp = float(area_cfg.get("default_temp", 34.0))
    rh = float(area_cfg.get("default_rh", 60.0))
    wind = 2.0
    solar = 500.0

    thermal_result = calculate_thermal_stress(
        temperature=temp,
        humidity=rh,
        wind_speed=wind,
        solar_radiation=solar
    )
    wbgt = round(thermal_result["indices"]["wbgt_c"], 1)
    thermal_stress = round(thermal_result["risk_assessment"]["score"] * 100, 2)

    risk_result = predict_risk(
        temperature_c=temp,
        thermal_stress=thermal_stress,
        vulnerability_index=area_cfg["vulnerability_index"],
        historical_health_events=area_cfg["historical_health_events"],
        lag_health_events=area_cfg["lag_health_events"],
    )
    risk_level = risk_result["risk_level"]
    risk_score = round(risk_result["risk_score"], 1)

    if risk_level in ["EXTREME", "CRITICAL"]:
        summary_advisory = "Extreme thermal caution: Activate municipal cooling centers and restrict outdoor work 12-4 PM."
    elif risk_level == "HIGH":
        summary_advisory = "High physiological heat strain: Increase hydration points and advise vulnerable citizens."
    elif risk_level == "MODERATE":
        summary_advisory = "Moderate thermal load: Maintain routine hydration and shade access during peak hours."
    else:
        summary_advisory = "Low heat strain: Normal civic activities with baseline hydration."

    return {
        "name": area_cfg["name"],
        "state": area_cfg["state"],
        "zone": area_cfg["zone"],
        "latitude": lat,
        "longitude": lon,
        "temperature_c": round(temp, 1),
        "humidity_pct": round(rh, 1),
        "wind_speed_mps": round(wind, 1),
        "wbgt_c": wbgt,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "vulnerability_tag": area_cfg["vulnerability_tag"],
        "summary_advisory": summary_advisory,
        "area_type": area_cfg.get("area_type", "regional_centroid"),
    }


# Pre-seed cache with baseline evaluations so cold starts never block for 11 seconds
try:
    _AREAS_CACHE["data"] = {
        "count": len(MAJOR_AREAS),
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "areas": [_evaluate_single_area_baseline(area) for area in MAJOR_AREAS]
    }
    _AREAS_CACHE["timestamp"] = time.time()
except Exception:
    pass


def _get_areas_lock() -> asyncio.Lock:
    global _AREAS_LOCK
    if _AREAS_LOCK is None:
        _AREAS_LOCK = asyncio.Lock()
    return _AREAS_LOCK


async def get_all_areas_risk_overview() -> Dict[str, Any]:
    """
    Returns heat-health risk overview across major monitored areas in India.
    Leverages in-memory caching for zero latency on subsequent calls.
    """
    now = time.time()
    if _AREAS_CACHE["data"] and (now - _AREAS_CACHE["timestamp"]) < AREAS_CACHE_TTL:
        return _AREAS_CACHE["data"]

    lock = _get_areas_lock()
    async with lock:
        if _AREAS_CACHE["data"] and (time.time() - _AREAS_CACHE["timestamp"]) < AREAS_CACHE_TTL:
            return _AREAS_CACHE["data"]

        tasks = [_evaluate_single_area(area) for area in MAJOR_AREAS]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        response = {
            "count": len(results),
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "areas": results,
        }

        _AREAS_CACHE["data"] = response
        _AREAS_CACHE["timestamp"] = time.time()

        return response


# ─────────────────────────────────────────────────────────
# NATIONAL 37-STATE IMD HEAT ALERTS & DIURNAL TELEMETRY
# ─────────────────────────────────────────────────────────

HILL_STATE_CODES = {"HP", "UK", "SK", "AR", "MN", "ML", "MZ", "NL", "LA", "JK"}
COASTAL_STATE_CODES = {"MH", "GA", "KA", "KL", "TN", "AP", "OD", "WB", "AN", "LD", "DD", "DN"}

STATE_ALERTS_CACHE_TTL = 600.0  # 10 minutes cache
_STATE_ALERTS_CACHE: Dict[str, Any] = {"data": None, "timestamp": 0.0}
_STATE_ALERTS_LOCK: Optional[asyncio.Lock] = None


def _calc_wet_bulb(temp_c: float, rh: float) -> float:
    """Stull formula for wet-bulb temperature (°C)."""
    return round(
        temp_c * math.atan(0.151977 * math.sqrt(rh + 8.313659))
        + math.atan(temp_c + rh)
        - math.atan(rh - 1.676331)
        + 0.00391838 * (rh ** 1.5) * math.atan(0.023101 * rh)
        - 4.686035,
        1,
    )


def _calc_wbgt_est(temp_c: float, rh: float) -> float:
    """Estimated wet-bulb globe temperature (°C)."""
    tw = _calc_wet_bulb(temp_c, rh)
    return round(0.7 * tw + 0.3 * temp_c, 1)


def _calc_heat_index(temp_c: float, rh: float) -> float:
    """Steadman / Rothfusz heat index in °C."""
    if temp_c < 26.0:
        return round(temp_c, 1)
    tf = temp_c * 9.0 / 5.0 + 32.0
    hi_f = (
        -42.379
        + 2.04901523 * tf
        + 10.14333127 * rh
        - 0.22475541 * tf * rh
        - 0.00683783 * tf * tf
        - 0.05481717 * rh * rh
        + 0.00122874 * tf * tf * rh
        + 0.00085282 * tf * rh * rh
        - 0.00000199 * tf * tf * rh * rh
    )
    return round((hi_f - 32.0) * 5.0 / 9.0, 1)


def _get_diurnal_state_weather(state_p: Dict[str, Any]) -> Dict[str, Any]:
    """
    Astronomical solar diurnal temperature model based on Indian Standard Time (IST).
    Prevents daytime heatwave values from persisting into the night if network is offline.
    """
    now_utc = datetime.now(timezone.utc)
    ist_time = now_utc + timedelta(hours=5, minutes=30)
    hour_float = ist_time.hour + ist_time.minute / 60.0

    is_day = 1 if 6.0 <= hour_float <= 18.5 else 0
    base_temp = float(state_p.get("temperatureC", 35.0))
    min_temp = max(18.0, base_temp - 12.0)

    # Diurnal variation: lowest at 05:00, highest at 15:00
    if 5.0 <= hour_float <= 15.0:
        factor = math.sin(((hour_float - 5.0) / 10.0) * (math.pi / 2.0))
        cur_temp = min_temp + (base_temp - min_temp) * factor
    elif 15.0 < hour_float <= 24.0:
        factor = math.cos(((hour_float - 15.0) / 9.0) * (math.pi / 2.0))
        cur_temp = min_temp + (base_temp - min_temp) * factor * 0.82
    else:  # 00:00 to 05:00
        factor = math.cos(((hour_float + 9.0) / 14.0) * (math.pi / 2.0))
        cur_temp = min_temp + (base_temp - min_temp) * factor * 0.25

    cur_temp = round(cur_temp, 1)
    base_rh = float(state_p.get("humidityPercent", 60.0))
    cur_rh = min(95.0, max(25.0, round(base_rh + (base_temp - cur_temp) * 1.5, 1)))

    return {
        "temperature_2m": cur_temp,
        "relative_humidity_2m": cur_rh,
        "apparent_temperature": _calc_heat_index(cur_temp, cur_rh),
        "wind_speed_10m": 2.2,
        "is_day": is_day,
    }


def classify_state_heat_alert(
    state_code: str, temp: float, rh: float, app_temp: float, is_day: int
) -> Tuple[str, str, str]:
    """
    Classifies alert category and risk based on IMD heatwave thresholds and diurnal cycle.
    Returns: (alertCategory, riskLevel, imdClassification)
    """
    code = state_code.upper()
    is_hill = code in HILL_STATE_CODES
    is_coastal = code in COASTAL_STATE_CODES

    if not is_day:
        # IMD Night criteria: Extreme heatwave warnings are NOT active at night.
        # Warm Night is only declared when night minimum remains very high with humidity.
        if temp >= 29.0 and app_temp >= 38.0:
            return "YELLOW", "MODERATE", "Warm Night Advisory"
        elif temp >= 27.5 and rh >= 75.0:
            return "YELLOW", "MODERATE", "Humid Night Advisory"
        else:
            return "GREEN", "LOW", "Normal Night Conditions"

    # Daytime Criteria (Official IMD Guidelines)
    if is_hill:
        if temp >= 38.0 or (temp >= 35.0 and app_temp >= 44.0):
            return "RED", "EXTREME", "Severe Heatwave in Hilly Region"
        elif temp >= 35.0 or (temp >= 33.0 and app_temp >= 42.0):
            return "ORANGE", "HIGH", "Heatwave Condition in Hills"
        elif temp >= 30.0 or app_temp >= 38.0:
            return "YELLOW", "MODERATE", "Warm Day Advisory in Mountain Zones"
        else:
            return "GREEN", "LOW", "Normal Mountain Meteorological Conditions"

    if is_coastal:
        if temp >= 39.0 or app_temp >= 48.0:
            return "RED", "EXTREME", "Severe Coastal Heat Stress"
        elif temp >= 37.0 or app_temp >= 43.0:
            return "ORANGE", "HIGH", "Coastal Heatwave Condition"
        elif temp >= 34.0 or app_temp >= 39.0:
            return "YELLOW", "MODERATE", "Humid Heat Advisory"
        else:
            return "GREEN", "LOW", "Normal Coastal Meteorological Conditions"

    # Plains & Continental Interior
    if temp >= 44.0 or (temp >= 42.0 and app_temp >= 48.0):
        return "RED", "EXTREME", "Severe Heat Wave Condition"
    elif temp >= 40.0 or (temp >= 38.0 and app_temp >= 44.0):
        return "ORANGE", "HIGH", "Heat Wave Condition"
    elif temp >= 35.0 or app_temp >= 40.0:
        return "YELLOW", "MODERATE", "Hot Day Advisory"
    else:
        return "GREEN", "LOW", "Normal Meteorological Conditions"


def _get_state_alerts_lock() -> asyncio.Lock:
    global _STATE_ALERTS_LOCK
    if _STATE_ALERTS_LOCK is None:
        _STATE_ALERTS_LOCK = asyncio.Lock()
    return _STATE_ALERTS_LOCK


async def get_national_state_alerts() -> Dict[str, Any]:
    """
    Returns live dynamic IMD state-wise heat alerts and thermal risk for all 37 Indian States/UTs.
    Batches Open-Meteo current telemetry across all 37 centroids in a single HTTP request,
    with in-memory caching and diurnal fallback.
    """
    now = time.time()
    if _STATE_ALERTS_CACHE["data"] and (now - _STATE_ALERTS_CACHE["timestamp"]) < STATE_ALERTS_CACHE_TTL:
        return _STATE_ALERTS_CACHE["data"]

    lock = _get_state_alerts_lock()
    async with lock:
        if _STATE_ALERTS_CACHE["data"] and (time.time() - _STATE_ALERTS_CACHE["timestamp"]) < STATE_ALERTS_CACHE_TTL:
            return _STATE_ALERTS_CACHE["data"]

        # 1. Locate and load base GeoJSON template
        json_candidates = [
            Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "src" / "data" / "india_state_heat_alerts.json",
            Path(__file__).resolve().parent.parent / "data" / "india_state_heat_alerts.json",
            Path("frontend/src/data/india_state_heat_alerts.json"),
        ]
        geojson_data = None
        for p in json_candidates:
            if p.exists():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        geojson_data = json.load(f)
                    break
                except Exception:
                    continue

        if not geojson_data or "features" not in geojson_data:
            return {"error": "GeoJSON state template not found", "states": [], "statistics": {}}

        features = geojson_data["features"]
        lats = [str(round(f["properties"]["centroid"][1], 3)) for f in features]
        lons = [str(round(f["properties"]["centroid"][0], 3)) for f in features]

        # 2. Query Open-Meteo in a single batch GET request
        batch_url = f"https://api.open-meteo.com/v1/forecast?latitude={','.join(lats)}&longitude={','.join(lons)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,is_day"
        weather_items = None
        is_live = False

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(batch_url)
                if resp.status_code == 200:
                    resp_json = resp.json()
                    if isinstance(resp_json, list) and len(resp_json) == len(features):
                        weather_items = resp_json
                        is_live = True
        except Exception as e:
            logger.warning(f"Open-Meteo batch state alerts fetch failed, falling back to diurnal solar model: {e}")

        # 3. Process each state feature
        processed_states = []
        updated_features = []
        sum_temp = 0.0
        max_temp = -999.0
        max_temp_state = ""
        min_temp = 999.0
        min_temp_state = ""
        pop_under_alert = 0.0
        red_count = 0
        orange_count = 0
        yellow_count = 0
        green_count = 0
        night_count = 0

        for i, feat in enumerate(features):
            p = dict(feat["properties"])
            state_code = p.get("stateCode", "")

            if weather_items and i < len(weather_items):
                curr = weather_items[i].get("current", {})
                temp = float(curr.get("temperature_2m", p.get("temperatureC", 32.0)))
                rh = float(curr.get("relative_humidity_2m", p.get("humidityPercent", 60.0)))
                app_temp = float(curr.get("apparent_temperature", temp))
                is_day = int(curr.get("is_day", 1))
            else:
                diurnal = _get_diurnal_state_weather(p)
                temp = diurnal["temperature_2m"]
                rh = diurnal["relative_humidity_2m"]
                app_temp = diurnal["apparent_temperature"]
                is_day = diurnal["is_day"]

            if not is_day:
                night_count += 1

            wb = _calc_wet_bulb(temp, rh)
            wbgt = _calc_wbgt_est(temp, rh)
            cat, level, classification = classify_state_heat_alert(state_code, temp, rh, app_temp, is_day)

            if cat == "RED":
                red_count += 1
                pop_under_alert += float(p.get("affectedPopulationMillion", 0.0))
                risk_score = min(99, max(82, int(temp * 1.8 + app_temp * 0.4)))
            elif cat == "ORANGE":
                orange_count += 1
                pop_under_alert += float(p.get("affectedPopulationMillion", 0.0))
                risk_score = min(81, max(65, int(temp * 1.6 + app_temp * 0.3)))
            elif cat == "YELLOW":
                yellow_count += 1
                risk_score = min(64, max(42, int(temp * 1.3 + app_temp * 0.2)))
            else:
                green_count += 1
                risk_score = min(41, max(12, int(temp * 0.9 + (1 if not is_day else 5))))

            sum_temp += temp
            if temp > max_temp:
                max_temp = temp
                max_temp_state = p.get("stateName", "")
            if temp < min_temp:
                min_temp = temp
                min_temp_state = p.get("stateName", "")

            # Update property dict
            p["temperatureC"] = round(temp, 1)
            p["humidityPercent"] = round(rh, 1)
            p["apparentTemperatureC"] = round(app_temp, 1)
            p["wetBulbC"] = wb
            p["wbgtC"] = wbgt
            p["alertCategory"] = cat
            p["riskLevel"] = level
            p["imdClassification"] = classification
            p["riskScore"] = risk_score
            p["isDay"] = is_day
            p["alertTitle"] = f"{cat} ALERT: {classification.upper()} in {p.get('stateName')}"
            p["alertHeadline"] = f"{'Night' if not is_day else 'Current'} Temp reaches {temp:.1f}°C with Heat Index of {app_temp:.1f}°C."
            p["issuedAt"] = datetime.now(timezone.utc).isoformat()
            p["validUntil"] = (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat()

            processed_states.append(p)
            updated_features.append({
                "type": "Feature",
                "properties": p,
                "geometry": feat.get("geometry", {}),
            })

        stats = {
            "totalStates": len(features),
            "redCount": red_count,
            "orangeCount": orange_count,
            "yellowCount": yellow_count,
            "greenCount": green_count,
            "maxTemp": round(max_temp, 1),
            "maxTempState": max_temp_state,
            "minTemp": round(min_temp, 1),
            "minTempState": min_temp_state,
            "avgTemp": round(sum_temp / len(features), 1),
            "totalPopulationUnderAlertMillion": round(pop_under_alert),
            "isNight": night_count > (len(features) / 2),
            "isLive": is_live,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }

        response = {
            "type": "FeatureCollection",
            "crs": geojson_data.get("crs", {}),
            "features": updated_features,
            "states": processed_states,
            "statistics": stats,
        }

        _STATE_ALERTS_CACHE["data"] = response
        _STATE_ALERTS_CACHE["timestamp"] = time.time()
        return response