from fastapi import FastAPI, Query
from app.services.location import search_location
from app.services.weather import get_weather
from app.services.thermal import calculate_thermal_stress, calculate_heat_index, classify_heat_stress
from app.services.risk import predict_risk
from app.services.map_services import get_location_risk

app = FastAPI(
    title="SIH26083 Heat Health API",
    version="1.0.0"
)


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/location/search")
async def location_search(
    q: str = Query(..., min_length=2)
):
    locations = await search_location(q)

    return {
        "count": len(locations),
        "locations": locations
    }


@app.get("/weather")
async def weather(
    lat: float,
    lon: float
):
    return await get_weather(lat, lon)


@app.get("/thermal")
async def thermal(
    lat: float,
    lon: float
):
    weather_data = await get_weather(lat, lon)

    thermal_result = calculate_thermal_stress(
        temperature=weather_data["temperature_c"],
        humidity=weather_data["relative_humidity_pct"],
        wind_speed=weather_data.get("wind_speed_mps", 1.0),
        solar_radiation=weather_data.get("solar_radiation_wm2")
    )

    return {
        "location": {
            "location": weather_data["location"],
            "ward": weather_data["ward"],
            "latitude": weather_data["latitude"],
            "longitude": weather_data["longitude"],
        },
        "weather": {
            "temperature_c": weather_data["temperature_c"],
            "relative_humidity_pct": weather_data["relative_humidity_pct"],
            "wind_speed_mps": weather_data["wind_speed_mps"],
            "solar_radiation_wm2": weather_data["solar_radiation_wm2"],
            "timestamp": weather_data["timestamp"],
        },
        "thermal": thermal_result
    }


@app.get("/risk")
async def risk(
    lat: float,
    lon: float
):
    weather_data = await get_weather(lat, lon)

    heat_index = calculate_heat_index(
        weather_data["temperature_c"],
        weather_data["relative_humidity_pct"]
    )

    risk_score, risk_level = predict_risk(
        temperature=weather_data["temperature_c"],
        humidity=weather_data["relative_humidity_pct"],
        wind_speed=weather_data["wind_speed_mps"],
        heat_index=heat_index if heat_index is not None else weather_data["temperature_c"]
    )

    return {
        "location": {
            "location": weather_data["location"],
            "ward": weather_data["ward"],
            "latitude": weather_data["latitude"],
            "longitude": weather_data["longitude"],
        },
        "risk": {
            "score": risk_score,
            "level": risk_level
        },
        "thermal": {
            "heat_index": heat_index
        }
    }


@app.get("/map/risk")
async def map_risk(
    locations: list[str] = Query(...)
):
    results = []

    for location in locations:
        lat, lon = map(float, location.split(","))

        risk = await get_location_risk(lat, lon)

        results.append(risk)

    return {
        "count": len(results),
        "locations": results
    }


@app.get("/forecast")
async def forecast(
    lat: float,
    lon: float
):
    data = await get_weather(lat, lon)

    return {
        "location": {
            "location": data["location"],
            "ward": data["ward"],
            "latitude": data["latitude"],
            "longitude": data["longitude"],
        },
        "forecast": data["forecast"]
    }
