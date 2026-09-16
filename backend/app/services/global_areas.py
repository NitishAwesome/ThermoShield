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


GLOBAL_AREAS: List[Dict[str, Any]] = [
    # --- Middle East & Arabian Peninsula (Extreme Thermal Desert & Humid Gulf) ---
    {
        "name": "Dubai",
        "state": "UAE",
        "region": "Middle East & Gulf",
        "latitude": 25.2048,
        "longitude": 55.2708,
        "vulnerability_index": 34.0,
        "historical_health_events": 16,
        "lag_health_events": 14,
        "vulnerability_tag": "Extreme Hyper-Arid Heat & Coastal Gulf Moisture Trapping",
        "default_temp": 41.5,
        "default_rh": 55.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Riyadh",
        "state": "Saudi Arabia",
        "region": "Middle East & Gulf",
        "latitude": 24.7136,
        "longitude": 46.6753,
        "vulnerability_index": 32.0,
        "historical_health_events": 14,
        "lag_health_events": 12,
        "vulnerability_tag": "Desert Continental Solar Radiative Flux & Peak Midday Extremes",
        "default_temp": 43.0,
        "default_rh": 18.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Kuwait City",
        "state": "Kuwait",
        "region": "Middle East & Gulf",
        "latitude": 29.3759,
        "longitude": 47.9774,
        "vulnerability_index": 35.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Planetary Heatwave Epicenter (Regular 50°C+ Ambient Highs)",
        "default_temp": 44.5,
        "default_rh": 22.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Doha",
        "state": "Qatar",
        "region": "Middle East & Gulf",
        "latitude": 25.2854,
        "longitude": 51.5310,
        "vulnerability_index": 33.0,
        "historical_health_events": 15,
        "lag_health_events": 13,
        "vulnerability_tag": "Severe Persian Gulf Dew Point & Marine Vapor Pressure",
        "default_temp": 41.0,
        "default_rh": 58.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Baghdad",
        "state": "Iraq",
        "region": "Middle East & Gulf",
        "latitude": 33.3152,
        "longitude": 44.3661,
        "vulnerability_index": 42.0,
        "historical_health_events": 22,
        "lag_health_events": 18,
        "vulnerability_tag": "Mesopotamian Arid Heat Corridor & Grid Power Outage Strain",
        "default_temp": 44.0,
        "default_rh": 20.0,
        "area_type": "global_hotspot",
    },

    # --- South Asia (Dense Population & Severe Wet-Bulb Heat Load) ---
    {
        "name": "Mumbai",
        "state": "India",
        "region": "South Asia",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "vulnerability_index": 35.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "High Coastal Humidity & Dense Informal Settlements",
        "default_temp": 33.5,
        "default_rh": 74.0,
        "area_type": "national_anchor",
    },
    {
        "name": "New Delhi",
        "state": "India",
        "region": "South Asia",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "vulnerability_index": 38.0,
        "historical_health_events": 20,
        "lag_health_events": 17,
        "vulnerability_tag": "Extreme Continental Heat Island & Outdoor Labor Burden",
        "default_temp": 39.0,
        "default_rh": 44.0,
        "area_type": "national_anchor",
    },
    {
        "name": "Jacobabad",
        "state": "Pakistan",
        "region": "South Asia",
        "latitude": 28.2810,
        "longitude": 68.4384,
        "vulnerability_index": 46.0,
        "historical_health_events": 26,
        "lag_health_events": 22,
        "vulnerability_tag": "Global Physiological Limit Warning (>35°C Wet-Bulb Breach)",
        "default_temp": 46.0,
        "default_rh": 38.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Karachi",
        "state": "Pakistan",
        "region": "South Asia",
        "latitude": 24.8607,
        "longitude": 67.0011,
        "vulnerability_index": 41.0,
        "historical_health_events": 24,
        "lag_health_events": 19,
        "vulnerability_tag": "Arabian Sea Moisture Inversion & Urban Microclimate Trap",
        "default_temp": 36.5,
        "default_rh": 72.0,
        "area_type": "global_megacity",
    },
    {
        "name": "Dhaka",
        "state": "Bangladesh",
        "region": "South Asia",
        "latitude": 23.8103,
        "longitude": 90.4125,
        "vulnerability_index": 43.0,
        "historical_health_events": 21,
        "lag_health_events": 17,
        "vulnerability_tag": "Deltaic Water Vapor Stagnation & Megacity Density",
        "default_temp": 35.0,
        "default_rh": 78.0,
        "area_type": "global_megacity",
    },

    # --- East & Southeast Asia (Tropical Humidity & High Density) ---
    {
        "name": "Bangkok",
        "state": "Thailand",
        "region": "East & SE Asia",
        "latitude": 13.7563,
        "longitude": 100.5018,
        "vulnerability_index": 36.0,
        "historical_health_events": 16,
        "lag_health_events": 14,
        "vulnerability_tag": "Monsoonal Moisture Saturation & High Radiant Surface Heat",
        "default_temp": 35.5,
        "default_rh": 70.0,
        "area_type": "global_megacity",
    },
    {
        "name": "Singapore",
        "state": "Singapore",
        "region": "East & SE Asia",
        "latitude": 1.3521,
        "longitude": 103.8198,
        "vulnerability_index": 24.0,
        "historical_health_events": 10,
        "lag_health_events": 8,
        "vulnerability_tag": "Perpetual Equatorial Heat Index & Urban Concrete Density",
        "default_temp": 32.0,
        "default_rh": 80.0,
        "area_type": "global_megacity",
    },
    {
        "name": "Tokyo",
        "state": "Japan",
        "region": "East & SE Asia",
        "latitude": 35.6762,
        "longitude": 139.6503,
        "vulnerability_index": 26.0,
        "historical_health_events": 14,
        "lag_health_events": 12,
        "vulnerability_tag": "Intense Summer Urban Heat Island & High Elderly Demographics",
        "default_temp": 33.0,
        "default_rh": 68.0,
        "area_type": "global_megacity",
    },
    {
        "name": "Beijing",
        "state": "China",
        "region": "East & SE Asia",
        "latitude": 39.9042,
        "longitude": 116.4074,
        "vulnerability_index": 30.0,
        "historical_health_events": 15,
        "lag_health_events": 13,
        "vulnerability_tag": "Continental Basin Thermal Stagnation & Rapid Summer Spikes",
        "default_temp": 36.0,
        "default_rh": 50.0,
        "area_type": "global_megacity",
    },
    {
        "name": "Manila",
        "state": "Philippines",
        "region": "East & SE Asia",
        "latitude": 14.5995,
        "longitude": 120.9842,
        "vulnerability_index": 39.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Maritime Humid Heat Stress & Dense Informal Settlements",
        "default_temp": 34.0,
        "default_rh": 76.0,
        "area_type": "global_megacity",
    },

    # --- North America (Desert Heatwaves & Urban Centers) ---
    {
        "name": "Phoenix",
        "state": "USA (Arizona)",
        "region": "North America",
        "latitude": 33.4484,
        "longitude": -112.0740,
        "vulnerability_index": 31.0,
        "historical_health_events": 17,
        "lag_health_events": 14,
        "vulnerability_tag": "Sonoran Desert Heat Dome & Elevated Nighttime Minimums",
        "default_temp": 44.0,
        "default_rh": 20.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Death Valley",
        "state": "USA (California)",
        "region": "North America",
        "latitude": 36.5323,
        "longitude": -116.9325,
        "vulnerability_index": 20.0,
        "historical_health_events": 12,
        "lag_health_events": 10,
        "vulnerability_tag": "Sub-Sea-Level Ambient Heat Crucible (World Record Temps)",
        "default_temp": 48.0,
        "default_rh": 10.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Houston",
        "state": "USA (Texas)",
        "region": "North America",
        "latitude": 29.7604,
        "longitude": -95.3698,
        "vulnerability_index": 33.0,
        "historical_health_events": 15,
        "lag_health_events": 13,
        "vulnerability_tag": "Gulf of Mexico Moisture Inflow & Humid Apparent Heat Spike",
        "default_temp": 37.0,
        "default_rh": 65.0,
        "area_type": "global_megacity",
    },
    {
        "name": "Las Vegas",
        "state": "USA (Nevada)",
        "region": "North America",
        "latitude": 36.1699,
        "longitude": -115.1398,
        "vulnerability_index": 29.0,
        "historical_health_events": 14,
        "lag_health_events": 11,
        "vulnerability_tag": "Mojave Desert Thermal Radiation & Tourism Footfall Exposure",
        "default_temp": 42.5,
        "default_rh": 16.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Mexicali",
        "state": "Mexico",
        "region": "North America",
        "latitude": 32.6245,
        "longitude": -115.4523,
        "vulnerability_index": 37.0,
        "historical_health_events": 18,
        "lag_health_events": 15,
        "vulnerability_tag": "Colorado Desert Basin Thermal Accumulation & Agrarian Workforce",
        "default_temp": 45.0,
        "default_rh": 22.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "New York City",
        "state": "USA (New York)",
        "region": "North America",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "vulnerability_index": 28.0,
        "historical_health_events": 14,
        "lag_health_events": 12,
        "vulnerability_tag": "High-Rise Dense Heat Trapping & Coastal Atlantic Humidity",
        "default_temp": 32.5,
        "default_rh": 62.0,
        "area_type": "global_megacity",
    },

    # --- Europe & Mediterranean (Rising Frequency of Severe Heatwaves) ---
    {
        "name": "Seville",
        "state": "Spain",
        "region": "Europe & Mediterranean",
        "latitude": 37.3891,
        "longitude": -5.9845,
        "vulnerability_index": 28.0,
        "historical_health_events": 15,
        "lag_health_events": 12,
        "vulnerability_tag": "Guadalquivir Valley Foehn Winds & Iberian Pan Heatwaves",
        "default_temp": 41.0,
        "default_rh": 28.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Athens",
        "state": "Greece",
        "region": "Europe & Mediterranean",
        "latitude": 37.9838,
        "longitude": 23.7275,
        "vulnerability_index": 30.0,
        "historical_health_events": 16,
        "lag_health_events": 13,
        "vulnerability_tag": "Attica Basin Thermal Stagnation & Wildfire Smoke Interaction",
        "default_temp": 39.5,
        "default_rh": 32.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Rome",
        "state": "Italy",
        "region": "Europe & Mediterranean",
        "latitude": 41.9028,
        "longitude": 12.4964,
        "vulnerability_index": 27.0,
        "historical_health_events": 14,
        "lag_health_events": 11,
        "vulnerability_tag": "Central Mediterranean Heat Dome & High Tourism Concentration",
        "default_temp": 36.0,
        "default_rh": 45.0,
        "area_type": "global_megacity",
    },
    {
        "name": "Madrid",
        "state": "Spain",
        "region": "Europe & Mediterranean",
        "latitude": 40.4168,
        "longitude": -3.7038,
        "vulnerability_index": 26.0,
        "historical_health_events": 13,
        "lag_health_events": 11,
        "vulnerability_tag": "High Meseta Plateau Solar Exposure & Dry Atmospheric Bursts",
        "default_temp": 38.0,
        "default_rh": 26.0,
        "area_type": "global_megacity",
    },
    {
        "name": "Paris",
        "state": "France",
        "region": "Europe & Mediterranean",
        "latitude": 48.8566,
        "longitude": 2.3522,
        "vulnerability_index": 25.0,
        "historical_health_events": 15,
        "lag_health_events": 12,
        "vulnerability_tag": "Historical Zinc Roofing Thermal Absorption & Low Residential AC",
        "default_temp": 33.0,
        "default_rh": 50.0,
        "area_type": "global_megacity",
    },
    {
        "name": "London",
        "state": "United Kingdom",
        "region": "Europe & Mediterranean",
        "latitude": 51.5074,
        "longitude": -0.1278,
        "vulnerability_index": 23.0,
        "historical_health_events": 12,
        "lag_health_events": 10,
        "vulnerability_tag": "Uninsulated Urban Infrastructure & Heat Acclimatization Deficit",
        "default_temp": 31.0,
        "default_rh": 52.0,
        "area_type": "global_megacity",
    },

    # --- Africa & Sahel (Sahara Margin, Hyper-Heat & Acute Vulnerability) ---
    {
        "name": "Cairo",
        "state": "Egypt",
        "region": "Africa & Sahel",
        "latitude": 30.0444,
        "longitude": 31.2357,
        "vulnerability_index": 40.0,
        "historical_health_events": 20,
        "lag_health_events": 16,
        "vulnerability_tag": "Nile Delta Thermal Radiation & Megacity Air Mass Stagnation",
        "default_temp": 39.5,
        "default_rh": 46.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Khartoum",
        "state": "Sudan",
        "region": "Africa & Sahel",
        "latitude": 15.5007,
        "longitude": 32.5599,
        "vulnerability_index": 48.0,
        "historical_health_events": 25,
        "lag_health_events": 21,
        "vulnerability_tag": "Sahel-Sahara Transition Scorching & Infrastructure Vulnerability",
        "default_temp": 43.5,
        "default_rh": 24.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Niamey",
        "state": "Niger",
        "region": "Africa & Sahel",
        "latitude": 13.5116,
        "longitude": 2.1254,
        "vulnerability_index": 47.0,
        "historical_health_events": 23,
        "lag_health_events": 19,
        "vulnerability_tag": "Sahelian Harmattan Dry Heat Front & Low Civic Cooling Access",
        "default_temp": 42.0,
        "default_rh": 28.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Marrakech",
        "state": "Morocco",
        "region": "Africa & Sahel",
        "latitude": 31.6295,
        "longitude": -7.9811,
        "vulnerability_index": 33.0,
        "historical_health_events": 15,
        "lag_health_events": 13,
        "vulnerability_tag": "Atlas Mountain Rain Shadow & Continental Saharan Winds (Chergui)",
        "default_temp": 41.5,
        "default_rh": 22.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Lagos",
        "state": "Nigeria",
        "region": "Africa & Sahel",
        "latitude": 6.5244,
        "longitude": 3.3792,
        "vulnerability_index": 44.0,
        "historical_health_events": 20,
        "lag_health_events": 17,
        "vulnerability_tag": "Equatorial Guinea Current Humidity & Extreme Population Density",
        "default_temp": 33.5,
        "default_rh": 84.0,
        "area_type": "global_megacity",
    },

    # --- Australia & South America (Southern Hemisphere Heatwaves) ---
    {
        "name": "Sydney",
        "state": "Australia",
        "region": "Australia & LatAm",
        "latitude": -33.8688,
        "longitude": 151.2093,
        "vulnerability_index": 25.0,
        "historical_health_events": 14,
        "lag_health_events": 11,
        "vulnerability_tag": "Western Sydney Urban Heat Basin & Inland Hot Air Westerlies",
        "default_temp": 35.0,
        "default_rh": 55.0,
        "area_type": "global_megacity",
    },
    {
        "name": "Perth",
        "state": "Australia",
        "region": "Australia & LatAm",
        "latitude": -31.9505,
        "longitude": 115.8605,
        "vulnerability_index": 26.0,
        "historical_health_events": 13,
        "lag_health_events": 11,
        "vulnerability_tag": "Desert Easterly Inflow & Multi-Day Heatwave Runs",
        "default_temp": 38.5,
        "default_rh": 28.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Alice Springs",
        "state": "Australia",
        "region": "Australia & LatAm",
        "latitude": -23.6980,
        "longitude": 133.8807,
        "vulnerability_index": 32.0,
        "historical_health_events": 15,
        "lag_health_events": 12,
        "vulnerability_tag": "Central Outback Radiative Plateau & Intense Solar Irradiance",
        "default_temp": 42.0,
        "default_rh": 18.0,
        "area_type": "global_hotspot",
    },
    {
        "name": "Rio de Janeiro",
        "state": "Brazil",
        "region": "Australia & LatAm",
        "latitude": -22.9068,
        "longitude": -43.1729,
        "vulnerability_index": 38.0,
        "historical_health_events": 19,
        "lag_health_events": 16,
        "vulnerability_tag": "Subtropical Coastal Heat Index (>50°C Apparent Temperature)",
        "default_temp": 38.0,
        "default_rh": 72.0,
        "area_type": "global_megacity",
    },
    {
        "name": "Buenos Aires",
        "state": "Argentina",
        "region": "Australia & LatAm",
        "latitude": -34.6037,
        "longitude": -58.3816,
        "vulnerability_index": 27.0,
        "historical_health_events": 14,
        "lag_health_events": 12,
        "vulnerability_tag": "Pampas Warm Air Advection & Megacity Heat Accumulation",
        "default_temp": 34.5,
        "default_rh": 60.0,
        "area_type": "global_megacity",
    },
]


_GLOBAL_AREAS_CACHE: Dict[str, Any] = {"data": None, "timestamp": 0.0}
GLOBAL_AREAS_CACHE_TTL = 180.0  # 3 minutes cache for global cities


async def _evaluate_single_global_area(area_cfg: Dict[str, Any]) -> Dict[str, Any]:
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

    raw_wbgt = thermal_result["indices"].get("wbgt_c")
    wbgt = round(raw_wbgt if raw_wbgt is not None else temp, 1)
    raw_hi = thermal_result["indices"].get("heat_index_c")
    heat_index = round(raw_hi if raw_hi is not None else (temp + 2.0), 1)
    raw_ts = thermal_result["risk_assessment"].get("score", 0.5)
    thermal_stress = round(raw_ts * 100, 2)

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
        advisory = "Severe heatwave alert: Activate municipal cooling shelters, limit outdoor activity."
    elif risk_level == "HIGH":
        advisory = "High physiological heat strain: Maintain active hydration, schedule shaded rests."
    elif risk_level == "MODERATE":
        advisory = "Moderate thermal load: Normal outdoor work with routine hydration pacing."
    else:
        advisory = "Low thermal stress: Atmospheric conditions within physiological tolerance."

    return {
        "name": area_cfg["name"],
        "state": area_cfg["state"],
        "zone": area_cfg["region"],
        "region": area_cfg["region"],
        "latitude": lat,
        "longitude": lon,
        "temperature_c": round(temp, 1),
        "humidity_pct": round(rh, 1),
        "wind_speed_mps": round(wind, 1),
        "wbgt_c": wbgt,
        "heat_index_c": heat_index,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "vulnerability_tag": area_cfg["vulnerability_tag"],
        "summary_advisory": advisory,
        "area_type": area_cfg["area_type"],
    }


async def get_all_global_areas_overview(region_filter: str | None = None) -> Dict[str, Any]:
    """
    Returns global heat-health risk intelligence across 40+ worldwide monitoring areas.
    Leverages in-memory caching for ultra-low latency.
    """
    now = time.time()
    if _GLOBAL_AREAS_CACHE["data"] and (now - _GLOBAL_AREAS_CACHE["timestamp"]) < GLOBAL_AREAS_CACHE_TTL:
        cached_data = _GLOBAL_AREAS_CACHE["data"]
        if region_filter and region_filter.lower() != "all":
            filtered = [a for a in cached_data["areas"] if a["region"].lower() == region_filter.lower()]
            return {**cached_data, "count": len(filtered), "areas": filtered}
        return cached_data

    # Sample areas asynchronously in chunks to prevent socket saturation
    chunk_size = 8
    results = []
    for i in range(0, len(GLOBAL_AREAS), chunk_size):
        chunk = GLOBAL_AREAS[i:i + chunk_size]
        tasks = [_evaluate_single_global_area(area) for area in chunk]
        chunk_res = await asyncio.gather(*tasks, return_exceptions=False)
        results.extend(chunk_res)

    response = {
        "count": len(results),
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "areas": results,
    }

    _GLOBAL_AREAS_CACHE["data"] = response
    _GLOBAL_AREAS_CACHE["timestamp"] = now

    if region_filter and region_filter.lower() != "all":
        filtered = [a for a in results if a["region"].lower() == region_filter.lower()]
        return {**response, "count": len(filtered), "areas": filtered}

    return response
