from app.services.weather import get_weather
from app.services.thermal import calculate_heat_index
from app.services.risk import predict_risk


async def get_location_risk(lat: float, lon: float):

    weather_data = await get_weather(lat, lon)

    heat_index = calculate_heat_index(
        weather_data["temperature_c"],
        weather_data["relative_humidity_pct"]
    )

    score, level = predict_risk(
        temperature=weather_data["temperature_c"],
        humidity=weather_data["relative_humidity_pct"],
        wind_speed=weather_data["wind_speed_mps"],
        heat_index=heat_index if heat_index is not None else weather_data["temperature_c"]
    )

    return {
        "latitude": lat,
        "longitude": lon,
        "risk_score": score,
        "risk_level": level
    }
