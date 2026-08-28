import httpx


async def get_weather(latitude: float, longitude: float):
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
        "wind_speed_unit": "ms",
        "timezone": "auto"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            params=params,
            timeout=15.0
        )

    response.raise_for_status()

    data = response.json()
    current = data.get("current", {})
    daily = data.get("daily", {})

    return {
        "location": {
            "latitude": latitude,
            "longitude": longitude
        },
        "weather": {
            "temperature": current.get("temperature_2m", 25.0),
            "humidity": current.get("relative_humidity_2m", 50.0),
            "wind_speed": current.get("wind_speed_10m", 1.0),
            "solar_radiation": current.get("shortwave_radiation", 0.0) or 0.0,
            "time": current.get("time", "")
        },
        "forecast": {
            "dates": daily.get("time", []),
            "max_temperature": daily.get("temperature_2m_max", []),
            "min_temperature": daily.get("temperature_2m_min", [])
        }
    }