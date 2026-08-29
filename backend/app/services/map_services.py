"""
backend/app/services/map_services.py

Multi-location GIS mapping service for heat-health risk estimation.
Integrates live weather ingestion, biometeorological thermal strain calculation,
and ML risk prediction to generate consistent geospatial risk coordinates.
"""

try:
    from app.services.weather import get_weather
    from app.services.thermal import calculate_thermal_stress
    from app.services.risk import predict_risk
except ImportError:
    from app.services.weather import get_weather
    from app.services.thermal import calculate_thermal_stress
    from app.services.risk import predict_risk


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