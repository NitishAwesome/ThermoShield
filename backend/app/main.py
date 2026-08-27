from fastapi import FastAPI, Query

from backend.app.services.location import search_location
from backend.app.services.weather import get_weather
from backend.app.services.thermal import (
    calculate_heat_index,
    classify_heat_stress,
    calculate_thermal_stress,
)
from backend.app.services.risk import predict_risk
from backend.app.services.map_services import get_location_risk
from backend.app.services.intervention import generate_interventions
from backend.app.services.simulator import simulate_intervention


app = FastAPI(
    title="SIH26083 Heat Health API",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "message": "Welcome to the SIH26083 Heat Health API"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


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

    thermal_result = calculate_thermal_stress(
        temperature=weather["temperature"],
        humidity=weather["humidity"],
        wind_speed=weather.get("wind_speed", 1.0),
        solar_radiation=weather.get("solar_radiation")
    )

    return {
        "location": weather_data["location"],
        "weather": weather,
        "thermal": thermal_result
    }


@app.get("/risk")
async def risk(
    lat: float,
    lon: float,
    vulnerability_index: float = 30.0,
    historical_health_events: int = 17,
    lag_health_events: int = 15
):
    # Get current weather
    weather_data = await get_weather(lat, lon)

    weather = weather_data["weather"]

    # Run Nitish's actual thermal stress engine
    thermal_result = calculate_thermal_stress(
        temperature=weather["temperature"],
        humidity=weather["humidity"],
        wind_speed=weather.get("wind_speed", 1.0),
        solar_radiation=weather.get("solar_radiation")
    )

    # Extract thermal indices
    heat_index = thermal_result["indices"]["heat_index_c"]

    wbgt = thermal_result["indices"]["wbgt_c"]

    apparent_temperature = (
        thermal_result["indices"]["apparent_temperature_c"]
    )

    wet_bulb_temperature = (
        thermal_result["indices"]["wet_bulb_temp_c"]
    )

    # Thermal engine score is 0-1.
    # ML training feature thermal_stress is approximately 0-100.
    thermal_stress = round(
        thermal_result["risk_assessment"]["score"] * 100,
        2
    )

    # Run ML risk model
    risk_result = predict_risk(
        temperature_c=weather["temperature"],
        thermal_stress=thermal_stress,
        vulnerability_index=vulnerability_index,
        historical_health_events=historical_health_events,
        lag_health_events=lag_health_events
    )

    return {
        "location": weather_data["location"],

        "risk": risk_result,

        "thermal": {
            "heat_index": heat_index,
            "thermal_stress": thermal_stress,
            "thermal_risk_level": (
                thermal_result["risk_assessment"]["level"]
            ),
            "wbgt": wbgt,
            "apparent_temperature": apparent_temperature,
            "wet_bulb_temperature": wet_bulb_temperature,
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


@app.get("/intervention")
async def intervention(
    risk_score: float,
    temperature: float,
    humidity: float,
    hour: int,
    vulnerable_population: float = 0
):
    return generate_interventions(
        risk_score=risk_score,
        temperature=temperature,
        humidity=humidity,
        hour=hour,
        vulnerable_population=vulnerable_population
    )


@app.post("/intervention/simulate")
async def intervention_simulation(
    risk_score: float,
    cooling_center: bool = False,
    outdoor_work_restriction: bool = False,
    hydration_stations: bool = False
):
    return simulate_intervention(
        risk_score=risk_score,
        cooling_center=cooling_center,
        outdoor_work_restriction=outdoor_work_restriction,
        hydration_stations=hydration_stations
    )
