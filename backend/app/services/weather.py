from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from backend.weather_contract import canonicalize_open_meteo_payload


async def get_weather(
    latitude: float,
    longitude: float,
    location: Optional[str] = None,
    ward: Optional[str] = None,
) -> Dict[str, Any]:
    """Fetch live Open-Meteo data and return ThermoShield's canonical weather observation."""

    url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "wind_speed_10m,"
            "shortwave_radiation"
        ),
        "daily": (
            "temperature_2m_max,"
            "temperature_2m_min"
        ),
        "forecast_days": 5,
        "temperature_unit": "celsius",
        "wind_speed_unit": "ms",
        "timeformat": "iso8601",
        "timezone": "auto",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, timeout=10)

    response.raise_for_status()
    data = response.json()

    canonical = canonicalize_open_meteo_payload(
        data,
        location=location or f"{latitude:.4f}, {longitude:.4f}",
        ward=ward or "UNASSIGNED",
        latitude=latitude,
        longitude=longitude,
    ).to_dict()

    return {
        **canonical,
        "forecast": {
            "dates": data.get("daily", {}).get("time", []),
            "max_temperature": data.get("daily", {}).get("temperature_2m_max", []),
            "min_temperature": data.get("daily", {}).get("temperature_2m_min", []),
        },
        "source": "open-meteo",
    }
