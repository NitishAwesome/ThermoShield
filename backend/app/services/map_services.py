from app.services.weather import get_weather
from app.services.thermal import calculate_heat_index
from app.services.risk import predict_risk


async def get_location_risk(lat: float, lon: float):

    weather_data = await get_weather(lat, lon)
    weather = weather_data["weather"]

    heat_index = calculate_heat_index(
        weather["temperature"],
        weather["humidity"]
    )

    score, level = predict_risk(
        temperature=weather["temperature"],
        humidity=weather["humidity"],
        wind_speed=weather["wind_speed"],
        heat_index=heat_index
    )

    return {
        "latitude": lat,
        "longitude": lon,
        "risk_score": score,
        "risk_level": level
    }