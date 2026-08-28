import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.app.services.location import search_location
from backend.app.services.weather import get_weather
from backend.app.services.thermal import (
    calculate_thermal_stress,
    calculate_heat_index,
    classify_heat_stress,
)
from backend.app.services.risk import predict_risk
from backend.app.services.map_services import get_location_risk
from backend.app.services.intervention import generate_interventions
from backend.app.services.simulator import simulate_intervention
from backend.app.services.sms import send_sms


app = FastAPI(
    title="SIH26083 Heat Health API",
    version="1.0.0"
)

# Configure CORS for local dev + dynamically allow deployed Vercel frontends
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# HOME
# ---------------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to the SIH26083 Heat Health API"
    }


# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# ---------------------------------------------------------
# LOCATION SEARCH
# ---------------------------------------------------------

@app.get("/location/search")
async def location_search(
    q: str = Query(..., min_length=2)
):
    locations = await search_location(q)

    return {
        "count": len(locations),
        "locations": locations
    }


# ---------------------------------------------------------
# WEATHER
# ---------------------------------------------------------

@app.get("/weather")
async def weather(
    lat: float,
    lon: float
):
    return await get_weather(lat, lon)


# ---------------------------------------------------------
# THERMAL
# ---------------------------------------------------------

@app.get("/thermal")
async def thermal(
    lat: float,
    lon: float
):
    weather_data = await get_weather(lat, lon)

    weather = weather_data["weather"]

    # Complete scientific thermal engine
    thermal_result = calculate_thermal_stress(
        temperature=weather["temperature"],
        humidity=weather["humidity"],
        wind_speed=weather.get("wind_speed", 1.0),
        solar_radiation=weather.get("solar_radiation")
    )

    return {
        "location": weather_data["location"],
        "weather": weather,
        "thermal": thermal_result,
    }


# ---------------------------------------------------------
# RISK + AUTOMATIC SMS ALERT
# ---------------------------------------------------------

@app.get("/risk")
async def risk(
    lat: float,
    lon: float,
    vulnerability_index: float = 30.0,
    historical_health_events: int = 17,
    lag_health_events: int = 15
):
    weather_data = await get_weather(lat, lon)

    weather = weather_data["weather"]

    # -----------------------------------------------------
    # 1. Calculate actual thermal stress
    # -----------------------------------------------------

    thermal_result = calculate_thermal_stress(
        temperature=weather["temperature"],
        humidity=weather["humidity"],
        wind_speed=weather.get("wind_speed", 1.0),
        solar_radiation=weather.get("solar_radiation")
    )

    # Thermal engine score is 0-1.
    # ML training feature thermal_stress is approximately 0-100.
    thermal_stress = round(
        thermal_result["risk_assessment"]["score"] * 100,
        2
    )

    # -----------------------------------------------------
    # 2. ML risk prediction
    # -----------------------------------------------------

    risk_result = predict_risk(
        temperature_c=weather["temperature"],
        thermal_stress=thermal_stress,
        vulnerability_index=vulnerability_index,
        historical_health_events=historical_health_events,
        lag_health_events=lag_health_events
    )

    # -----------------------------------------------------
    # 3. Automatic DEMO SMS alert
    # -----------------------------------------------------

    sms_alert = None

    if risk_result["risk_level"] in ["HIGH", "EXTREME"]:

        message = (
            f"ThermoShield ALERT: "
            f"{risk_result['risk_level']} heat-health risk detected. "
            f"Risk score: "
            f"{risk_result['risk_score']}/100."
        )

        sms_alert = await send_sms(
            phone_number="+919999999999",
            message=message
        )

    # -----------------------------------------------------
    # 4. Final response
    # -----------------------------------------------------

    return {
        "location": weather_data["location"],
        "weather": weather,
        "risk": risk_result,
        "thermal": thermal_result,
        "sms_alert": sms_alert,
    }


# ---------------------------------------------------------
# MAP RISK
# ---------------------------------------------------------

@app.get("/map/risk")
async def map_risk(
    locations: list[str] = Query(...)
):
    results = []

    for location in locations:
        lat, lon = map(
            float,
            location.split(",")
        )

        risk_data = await get_location_risk(
            lat,
            lon
        )

        results.append(risk_data)

    return {
        "count": len(results),
        "locations": results
    }


# ---------------------------------------------------------
# FORECAST
# ---------------------------------------------------------

@app.get("/forecast")
async def forecast(
    lat: float,
    lon: float
):
    weather_data = await get_weather(lat, lon)

    return {
        "location": weather_data["location"],
        "forecast": weather_data["forecast"]
    }


# ---------------------------------------------------------
# INTERVENTION
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# INTERVENTION SIMULATION
# ---------------------------------------------------------

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
