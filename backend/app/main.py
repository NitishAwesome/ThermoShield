
from fastapi import FastAPI, Query

from app.services.location import search_location
from app.services.weather import get_weather
from app.services.thermal import (
    calculate_thermal_stress,
    calculate_heat_index,
    classify_heat_stress,
)
from app.services.risk import predict_risk
from app.services.map_services import get_location_risk
from app.services.intervention import generate_interventions
from app.services.simulator import simulate_intervention
from app.services.sms import send_sms


app = FastAPI(
    title="SIH26083 Heat Health API",
    version="1.0.0"
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

    indices = thermal_result["indices"]
    risk = thermal_result["risk_assessment"]

    return {
        "location": weather_data["location"],
        "weather": weather,
        "thermal": {
            "heat_index": indices.get("heat_index_c"),
            "thermal_stress": indices.get("wbgt_c"),
            "thermal_risk_level": risk.get("level"),
            "wbgt": indices.get("wbgt_c"),
            "apparent_temperature": indices.get(
                "apparent_temperature_c"
            ),
            "wet_bulb_temperature": indices.get(
                "wet_bulb_temp_c"
            )
        }
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

    indices = thermal_result["indices"]
    thermal_risk = thermal_result["risk_assessment"]

    heat_index = indices.get("heat_index_c")

    # Use WBGT as thermal_stress input for ML model
    thermal_stress = indices.get("wbgt_c")

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

        "risk": risk_result,

        "thermal": {
            "heat_index": heat_index,
            "thermal_stress": thermal_stress,
            "thermal_risk_level": thermal_risk.get("level"),
            "wbgt": indices.get("wbgt_c"),
            "apparent_temperature": indices.get(
                "apparent_temperature_c"
            ),
            "wet_bulb_temperature": indices.get(
                "wet_bulb_temp_c"
            )
        },

        "sms_alert": sms_alert
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

        risk = await get_location_risk(
            lat,
            lon
        )

        results.append(risk)

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
    data = await get_weather(lat, lon)

    return {
        "location": data["location"],
        "forecast": data["forecast"]
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
