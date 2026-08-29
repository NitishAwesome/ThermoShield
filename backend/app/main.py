import os

from fastapi import FastAPI, Query, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.services.location import search_location
from app.services.weather import get_weather

from app.services.thermal import (
    calculate_heat_index,
    classify_heat_stress,
    calculate_thermal_stress,
)

from app.services.alert_engine import (
    should_create_alert,
    get_alert_priority,
)

from app.database.models import Location, User, Risk
from app.database.connection import get_db

from app.services.risk import predict_risk
from app.services.map_services import get_location_risk
from app.services.intervention import generate_interventions
from app.services.simulator import simulate_intervention
from app.services.sms import send_sms


from app.schemas import (
    UserCreate,
    UserResponse,
    LocationCreate,
    LocationResponse,
    RiskCreate,
    RiskResponse,
    AlertCreate,
    AlertResponse,
    InterventionCreate,
    InterventionResponse,
)


from app.services.user import (
    create_user,
    get_users,
    get_user,
    delete_user,
)


from app.services.location_db import (
    create_location,
    get_locations,
    get_location,
    get_location_by_coordinates,
    delete_location,
)


from app.services.risk_db import (
    create_risk,
    get_risks,
    get_risk,
    get_location_risks,
    delete_risk,
)


from app.services.alert_db import (
    create_alert,
    get_alerts,
    get_alert,
    get_user_alerts,
    get_location_alerts,
    delete_alert,
)


from app.services.intervention_db import (
    create_intervention,
    get_interventions,
    get_intervention,
    get_location_interventions,
    get_risk_interventions,
    delete_intervention,
)


# ==================================================
# APPLICATION
# ==================================================

app = FastAPI(
    title="SIH26083 Heat Health API",
    version="1.0.0"
)


# ==================================================
# CORS CONFIGURATION
# ==================================================

allowed_origins_env = os.getenv("ALLOWED_ORIGINS")

if allowed_origins_env:
    allowed_origins = [
        origin.strip()
        for origin in allowed_origins_env.split(",")
        if origin.strip()
    ]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://thermo-shield-tau.vercel.app",
        "https://thermoshield.vercel.app",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# USER CRUD
# ==================================================

@app.post(
    "/users",
    response_model=UserResponse
)
def create_user_api(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    return create_user(
        db,
        user_data
    )


@app.get(
    "/users",
    response_model=list[UserResponse]
)
def get_users_api(
    db: Session = Depends(get_db)
):
    return get_users(db)


@app.get(
    "/users/{user_id}",
    response_model=UserResponse
)
def get_user_api(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = get_user(
        db,
        user_id
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


@app.delete("/users/{user_id}")
def delete_user_api(
    user_id: int,
    db: Session = Depends(get_db)
):
    deleted = delete_user(
        db,
        user_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "message": "User deleted successfully"
    }


# ==================================================
# LOCATION CRUD
# ==================================================

@app.post(
    "/locations",
    response_model=LocationResponse
)
def create_location_api(
    location_data: LocationCreate,
    db: Session = Depends(get_db)
):
    return create_location(
        db,
        location_data
    )


@app.get(
    "/locations",
    response_model=list[LocationResponse]
)
def get_locations_api(
    db: Session = Depends(get_db)
):
    return get_locations(db)


@app.get(
    "/locations/{location_id}",
    response_model=LocationResponse
)
def get_location_api(
    location_id: int,
    db: Session = Depends(get_db)
):
    location = get_location(
        db,
        location_id
    )

    if location is None:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )

    return location


@app.delete("/locations/{location_id}")
def delete_location_api(
    location_id: int,
    db: Session = Depends(get_db)
):
    deleted = delete_location(
        db,
        location_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )

    return {
        "message": "Location deleted successfully"
    }


# ==================================================
# RISK CRUD
# ==================================================

@app.post(
    "/risks",
    response_model=RiskResponse
)
def create_risk_api(
    risk_data: RiskCreate,
    db: Session = Depends(get_db)
):
    return create_risk(
        db,
        risk_data
    )


@app.get(
    "/risks",
    response_model=list[RiskResponse]
)
def get_risks_api(
    db: Session = Depends(get_db)
):
    return get_risks(db)


@app.get(
    "/risks/{risk_id}",
    response_model=RiskResponse
)
def get_risk_api(
    risk_id: int,
    db: Session = Depends(get_db)
):
    risk = get_risk(
        db,
        risk_id
    )

    if risk is None:
        raise HTTPException(
            status_code=404,
            detail="Risk not found"
        )

    return risk


@app.get(
    "/locations/{location_id}/risks",
    response_model=list[RiskResponse]
)
def get_location_risks_api(
    location_id: int,
    db: Session = Depends(get_db)
):
    return get_location_risks(
        db,
        location_id
    )


@app.delete("/risks/{risk_id}")
def delete_risk_api(
    risk_id: int,
    db: Session = Depends(get_db)
):
    deleted = delete_risk(
        db,
        risk_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Risk not found"
        )

    return {
        "message": "Risk deleted successfully"
    }


# ==================================================
# ALERT CRUD
# ==================================================

@app.post(
    "/alerts",
    response_model=AlertResponse
)
def create_alert_api(
    alert_data: AlertCreate,
    db: Session = Depends(get_db)
):
    return create_alert(
        db,
        alert_data
    )


@app.get(
    "/alerts",
    response_model=list[AlertResponse]
)
def get_alerts_api(
    db: Session = Depends(get_db)
):
    return get_alerts(db)


@app.get(
    "/alerts/{alert_id}",
    response_model=AlertResponse
)
def get_alert_api(
    alert_id: int,
    db: Session = Depends(get_db)
):
    alert = get_alert(
        db,
        alert_id
    )

    if alert is None:
        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    return alert


@app.get(
    "/users/{user_id}/alerts",
    response_model=list[AlertResponse]
)
def get_user_alerts_api(
    user_id: int,
    db: Session = Depends(get_db)
):
    return get_user_alerts(
        db,
        user_id
    )


@app.get(
    "/locations/{location_id}/alerts",
    response_model=list[AlertResponse]
)
def get_location_alerts_api(
    location_id: int,
    db: Session = Depends(get_db)
):
    return get_location_alerts(
        db,
        location_id
    )


@app.delete("/alerts/{alert_id}")
def delete_alert_api(
    alert_id: int,
    db: Session = Depends(get_db)
):
    deleted = delete_alert(
        db,
        alert_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    return {
        "message": "Alert deleted successfully"
    }


# ==================================================
# INTERVENTION CRUD
# ==================================================

@app.post(
    "/interventions",
    response_model=InterventionResponse
)
def create_intervention_api(
    intervention_data: InterventionCreate,
    db: Session = Depends(get_db)
):
    return create_intervention(
        db,
        intervention_data
    )


@app.get(
    "/interventions",
    response_model=list[InterventionResponse]
)
def get_interventions_api(
    db: Session = Depends(get_db)
):
    return get_interventions(db)


@app.get(
    "/interventions/{intervention_id}",
    response_model=InterventionResponse
)
def get_intervention_api(
    intervention_id: int,
    db: Session = Depends(get_db)
):
    intervention = get_intervention(
        db,
        intervention_id
    )

    if intervention is None:
        raise HTTPException(
            status_code=404,
            detail="Intervention not found"
        )

    return intervention


@app.get(
    "/risks/{risk_id}/interventions",
    response_model=list[InterventionResponse]
)
def get_risk_interventions_api(
    risk_id: int,
    db: Session = Depends(get_db)
):
    return get_risk_interventions(
        db,
        risk_id
    )


@app.get(
    "/locations/{location_id}/interventions",
    response_model=list[InterventionResponse]
)
def get_location_interventions_api(
    location_id: int,
    db: Session = Depends(get_db)
):
    return get_location_interventions(
        db,
        location_id
    )


@app.delete(
    "/interventions/{intervention_id}"
)
def delete_intervention_api(
    intervention_id: int,
    db: Session = Depends(get_db)
):
    deleted = delete_intervention(
        db,
        intervention_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Intervention not found"
        )

    return {
        "message": "Intervention deleted successfully"
    }


# ==================================================
# BASIC ENDPOINTS
# ==================================================

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


# ==================================================
# LOCATION SEARCH
# ==================================================

@app.get("/location/search")
async def location_search(
    q: str = Query(..., min_length=2)
):
    locations = await search_location(q)

    return {
        "count": len(locations),
        "locations": locations
    }


# ==================================================
# WEATHER
# ==================================================

@app.get("/weather")
async def weather(
    lat: float,
    lon: float
):
    return await get_weather(
        lat,
        lon
    )


# ==================================================
# THERMAL ANALYSIS
# ==================================================

@app.get("/thermal")
async def thermal(
    lat: float,
    lon: float
):
    weather_data = await get_weather(
        lat,
        lon
    )

    weather = weather_data["weather"]

    thermal_result = calculate_thermal_stress(
        temperature=weather["temperature"],
        humidity=weather["humidity"],
        wind_speed=weather.get(
            "wind_speed",
            1.0
        ),
        solar_radiation=weather.get(
            "solar_radiation"
        )
    )

    return {
        "location": weather_data["location"],
        "weather": weather,
        "thermal": thermal_result,
    }


# ==================================================
# RISK ANALYSIS + DATABASE + SMS
# ==================================================

@app.get("/risk")
async def risk(
    lat: float,
    lon: float,
    vulnerability_index: float = 30.0,
    historical_health_events: int = 17,
    lag_health_events: int = 15,
    db: Session = Depends(get_db)
):
    # --------------------------------------------------
    # 1. GET CURRENT WEATHER
    # --------------------------------------------------

    weather_data = await get_weather(
        lat,
        lon
    )

    weather = weather_data["weather"]


    # --------------------------------------------------
    # 2. CALCULATE THERMAL STRESS
    # --------------------------------------------------

    thermal_result = calculate_thermal_stress(
        temperature=weather["temperature"],
        humidity=weather["humidity"],
        wind_speed=weather.get(
            "wind_speed",
            1.0
        ),
        solar_radiation=weather.get(
            "solar_radiation"
        )
    )


    # --------------------------------------------------
    # 3. EXTRACT THERMAL INDICES
    # --------------------------------------------------

    heat_index = thermal_result["indices"]["heat_index_c"]

    wbgt = thermal_result["indices"]["wbgt_c"]

    apparent_temperature = (
        thermal_result["indices"]["apparent_temperature_c"]
    )

    wet_bulb_temperature = (
        thermal_result["indices"]["wet_bulb_temp_c"]
    )


    # --------------------------------------------------
    # 4. CONVERT THERMAL SCORE TO 0-100
    # --------------------------------------------------

    thermal_stress = round(
        thermal_result["risk_assessment"]["score"] * 100,
        2
    )


    # --------------------------------------------------
    # 5. RUN ML RISK MODEL
    # --------------------------------------------------

    risk_result = predict_risk(
        temperature_c=weather["temperature"],
        thermal_stress=thermal_stress,
        vulnerability_index=vulnerability_index,
        historical_health_events=historical_health_events,
        lag_health_events=lag_health_events
    )


    # --------------------------------------------------
    # 6. FIND DATABASE LOCATION
    # --------------------------------------------------

    location = get_location_by_coordinates(
        db,
        lat,
        lon
    )

    if location is None:
        raise HTTPException(
            status_code=404,
            detail="Location not found in database"
        )


    # --------------------------------------------------
    # 7. SAVE RISK TO DATABASE
    # --------------------------------------------------

    risk_data = RiskCreate(
        location_id=location.id,
        temperature_c=weather["temperature"],
        thermal_stress=thermal_stress,
        heat_index=heat_index,
        wbgt=wbgt,
        predicted_health_impact_proxy=(
            risk_result[
                "predicted_health_impact_proxy"
            ]
        ),
        risk_score=risk_result["risk_score"],
        risk_level=risk_result["risk_level"],
    )

    saved_risk = create_risk(
        db,
        risk_data
    )


    # --------------------------------------------------
    # 8. DATABASE ALERT DECISION ENGINE
    # --------------------------------------------------

    alert = None

    if should_create_alert(
        risk_result["risk_level"]
    ):

        user = (
            db.query(User)
            .filter(User.id == 1)
            .first()
        )

        if user is not None:

            alert_message = (
                f"Heat health risk is "
                f"{risk_result['risk_level']} "
                f"at {location.name}."
            )

            alert_data = AlertCreate(
                user_id=user.id,
                location_id=location.id,
                risk_level=risk_result["risk_level"],
                risk_score=risk_result["risk_score"],
                message=alert_message,
                status="PENDING",
                phone_number=user.phone_number,
                reference_id=f"RISK-{saved_risk.id}"
            )

            alert = create_alert(
                db,
                alert_data
            )


    # --------------------------------------------------
    # 9. AUTOMATIC SMS ALERT
    # --------------------------------------------------

    sms_alert = None

    if risk_result["risk_level"] in [
        "HIGH",
        "EXTREME"
    ]:

        message = (
            f"ThermoShield ALERT: "
            f"{risk_result['risk_level']} "
            f"heat-health risk detected. "
            f"Risk score: "
            f"{risk_result['risk_score']}/100."
        )

        sms_alert = await send_sms(
            phone_number="+919999999999",
            message=message
        )


    # --------------------------------------------------
    # 10. FINAL RESPONSE
    # --------------------------------------------------

    return {
        "location": weather_data["location"],

        "weather": weather,

        "risk": risk_result,

        "alert": (
            {
                "id": alert.id,
                "risk_level": alert.risk_level,
                "risk_score": alert.risk_score,
                "message": alert.message,
                "status": alert.status,
                "phone_number": alert.phone_number,
                "reference_id": alert.reference_id,
            }
            if alert is not None
            else None
        ),

        "thermal": {
            "heat_index": heat_index,
            "thermal_stress": thermal_stress,
            "thermal_risk_level": (
                thermal_result[
                    "risk_assessment"
                ]["level"]
            ),
            "wbgt": wbgt,
            "apparent_temperature": (
                apparent_temperature
            ),
            "wet_bulb_temperature": (
                wet_bulb_temperature
            ),
        },

        "sms_alert": sms_alert,
    }


# ==================================================
# MAP RISK
# ==================================================

@app.get("/map/risk")
async def map_risk(
    locations: list[str] = Query(...)
):
    results = []

    # Handle multiple coordinates passed
    # as list or semicolon-separated values

    coords_list = []

    for loc in locations:

        if ";" in loc:
            coords_list.extend(
                loc.split(";")
            )
        else:
            coords_list.append(loc)


    for location in coords_list:

        try:
            parts = (
                location
                .strip()
                .split(",")
            )

            if len(parts) == 2:

                lat = float(parts[0])
                lon = float(parts[1])

                risk_data = await get_location_risk(
                    lat,
                    lon
                )

                results.append(
                    risk_data
                )

        except Exception as e:

            print(
                f"Error resolving coordinate "
                f"'{location}': {e}"
            )


    return {
        "count": len(results),
        "locations": results
    }


# ==================================================
# FORECAST
# ==================================================

@app.get("/forecast")
async def forecast(
    lat: float,
    lon: float
):
    weather_data = await get_weather(
        lat,
        lon
    )

    return {
        "location": weather_data["location"],
        "forecast": weather_data["forecast"]
    }


# ==================================================
# INTERVENTION
# ==================================================

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


# ==================================================
# INTERVENTION SIMULATION + DATABASE
# ==================================================

@app.post("/intervention/simulate")
async def intervention_simulation(
    risk_id: int,
    cooling_center: bool = False,
    outdoor_work_restriction: bool = False,
    hydration_stations: bool = False,
    db: Session = Depends(get_db)
):

    # --------------------------------------------------
    # 1. FIND RISK
    # --------------------------------------------------

    risk = (
        db.query(Risk)
        .filter(Risk.id == risk_id)
        .first()
    )

    if risk is None:
        raise HTTPException(
            status_code=404,
            detail="Risk not found"
        )


    # --------------------------------------------------
    # 2. RUN INTERVENTION SIMULATION
    # --------------------------------------------------

    simulation_result = simulate_intervention(
        risk_score=risk.risk_score,
        cooling_center=cooling_center,
        outdoor_work_restriction=(
            outdoor_work_restriction
        ),
        hydration_stations=(
            hydration_stations
        )
    )


    # --------------------------------------------------
    # 3. EXTRACT BEFORE / AFTER RISK
    # --------------------------------------------------

    before_risk_score = (
        simulation_result["current_risk"]
    )

    after_risk_score = (
        simulation_result["projected_risk"]
    )


    # --------------------------------------------------
    # 4. SAVE INTERVENTION TO DATABASE
    # --------------------------------------------------

    intervention_data = InterventionCreate(
        location_id=risk.location_id,
        risk_id=risk.id,
        cooling_center=cooling_center,
        hydration_station=hydration_stations,
        outdoor_work_restriction=(
            outdoor_work_restriction
        ),
        before_risk_score=before_risk_score,
        after_risk_score=after_risk_score
    )

    saved_intervention = create_intervention(
        db,
        intervention_data
    )


    # --------------------------------------------------
    # 5. RETURN RESULT
    # --------------------------------------------------

    return {
        "risk_id": risk.id,

        "location_id": risk.location_id,

        "simulation": simulation_result,

        "intervention": {
            "id": saved_intervention.id,

            "cooling_center": (
                saved_intervention.cooling_center
            ),

            "hydration_station": (
                saved_intervention.hydration_station
            ),

            "outdoor_work_restriction": (
                saved_intervention
                .outdoor_work_restriction
            ),

            "before_risk_score": (
                saved_intervention
                .before_risk_score
            ),

            "after_risk_score": (
                saved_intervention
                .after_risk_score
            ),

            "created_at": (
                saved_intervention.created_at
            )
        }
    }