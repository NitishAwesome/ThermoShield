from fastapi import FastAPI, Query
from app.services.location import search_location
from app.services.weather import get_weather
from app.services.thermal import calculate_heat_index, classify_heat_stress
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

    weather = weather_data["weather"]

    heat_index = calculate_heat_index(
        weather["temperature"],
        weather["humidity"]
    )

    stress = classify_heat_stress(heat_index)

    return {
        "location": weather_data["location"],
        "weather": weather,
        "thermal": {
            "heat_index": heat_index,
            "stress_level": stress
        }
    }
@app.get("/risk")
async def risk(
    lat: float,
    lon: float
):
    weather_data = await get_weather(lat, lon)

    weather = weather_data["weather"]

    heat_index = calculate_heat_index(
        weather["temperature"],
        weather["humidity"]
    )

    risk_score, risk_level = predict_risk(
        temperature=weather["temperature"],
        humidity=weather["humidity"],
        wind_speed=weather["wind_speed"],
        heat_index=heat_index
    )

    return {
        "location": weather_data["location"],
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
        "location": data["location"],
        "forecast": data["forecast"]
    }