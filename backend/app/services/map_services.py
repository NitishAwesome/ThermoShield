import asyncio
import time
from typing import List, Dict, Any

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
        "vulnerability_tag": "Industrial Workforce Concentration & Maritime Humidity",
        "default_temp": 34.0,
        "default_rh": 70.0,
    },
]

_AREAS_CACHE: Dict[str, Any] = {"data": None, "timestamp": 0.0}
AREAS_CACHE_TTL = 120.0  # 2 minutes cache


async def get_location_risk(
    lat: float,
    lon: float,
    vulnerability_index: float = 30.0,
    historical_health_events: int = 17,
    lag_health_events: int = 15
):
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
        historical_health_events=18,
        lag_health_events=15
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
        "wbgt_c": wbgt,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "vulnerability_tag": area_cfg["vulnerability_tag"],
        "summary_advisory": summary_advisory,
    }


async def get_all_areas_risk_overview() -> Dict[str, Any]:
    """
    Returns heat-health risk overview across major monitored areas in India.
    Leverages in-memory caching for zero latency on subsequent calls.
    """
    now = time.time()
    if _AREAS_CACHE["data"] and (now - _AREAS_CACHE["timestamp"]) < AREAS_CACHE_TTL:
        return _AREAS_CACHE["data"]

    tasks = [_evaluate_single_area(area) for area in MAJOR_AREAS]
    results = await asyncio.gather(*tasks, return_exceptions=False)

    response = {
        "count": len(results),
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "areas": results,
    }

    _AREAS_CACHE["data"] = response
    _AREAS_CACHE["timestamp"] = now

    return response