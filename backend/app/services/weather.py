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
        "timezone": "auto"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            params=params,
            timeout=10
        )

    response.raise_for_status()

    data = response.json()
    current = data["current"]

    return {
        "location": {
            "latitude": latitude,
            "longitude": longitude
        },
        "weather": {
            "temperature": current["temperature_2m"],
            "humidity": current["relative_humidity_2m"],
            "wind_speed": current["wind_speed_10m"],
            "solar_radiation": current["shortwave_radiation"],
            "time": current["time"]
        },
        "forecast": {
            "dates": data["daily"]["time"],
            "max_temperature": data["daily"]["temperature_2m_max"],
            "min_temperature": data["daily"]["temperature_2m_min"]
        }
    }