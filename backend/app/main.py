import os
import sys
import logging
from pathlib import Path
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.routers.personal_risk import router as personal_risk_router
logger = logging.getLogger(__name__)

# Ensure project root and backend are in sys.path
backend_dir = Path(__file__).resolve().parent.parent
project_root = backend_dir.parent
for p in (str(project_root), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI, Query, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.auth.router import router as auth_router
from app.services.location import search_location
from app.services.weather import get_weather, get_forecast

from app.services.thermal import (
    calculate_heat_index,
    classify_heat_stress,
    calculate_thermal_stress,
)

from app.services.alert_engine import (
    should_create_alert,
    get_alert_priority,
)

from app.database.models import Location, User, Risk, Alert, Intervention
from app.database.connection import get_db, engine, Base

from app.services.risk import predict_risk
from app.services.map_services import get_location_risk, get_all_areas_risk_overview
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

@app.on_event("startup")
def on_startup():
    try:
        from app.database import models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.warning(f"Database initialization warning: {e}")

app.include_router(personal_risk_router)
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

app.include_router(auth_router)


# ==================================================
# EMAIL NOTIFICATION HELPER
# ==================================================
def send_notification_email(to_email: str, subject: str, body: str):
    sender_email = os.getenv("MAIL_USERNAME")
    sender_password = os.getenv("MAIL_PASSWORD")
    smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("MAIL_PORT", 587))

    if not sender_email or not sender_password:
        logger.warning("Mail credentials not configured. Skipping email dispatch.")
        return {"status": "skipped", "message": "Missing credentials"}

    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = to_email
    message["Subject"] = subject

    message.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, message.as_string())
        return {"status": "success", "message": "Email sent successfully"}
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return {"status": "error", "message": str(e)}


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
# RISK ANALYSIS + DATABASE + SMS + EMAIL
# ==================================================

@app.get("/risk")
async def risk(
    lat: float,
    lon: float,
    vulnerability_index: float = 30.0,
    historical_health_events: int = 17,
    lag_health_events: int = 15,
    background_tasks: BackgroundTasks = BackgroundTasks(),
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
    # 6. DATABASE LOCATION & RISK PERSISTENCE (Fail-Safe)
    # --------------------------------------------------
    saved_risk = None
    alert = None
    user = None

    try:
        location = get_location_by_coordinates(db, lat, lon)
        if location is None:
            loc_name = weather_data.get("location", {}).get("name") or f"Location ({lat:.4f}, {lon:.4f})"
            location = create_location(
                db,
                LocationCreate(
                    name=loc_name,
                    latitude=lat,
                    longitude=lon,
                )
            )

        if location is not None:
            risk_data = RiskCreate(
                location_id=location.id,
                temperature_c=weather["temperature"],
                thermal_stress=thermal_stress,
                heat_index=heat_index,
                wbgt=wbgt,
                predicted_health_impact_proxy=(
                    risk_result["predicted_health_impact_proxy"]
                ),
                risk_score=risk_result["risk_score"],
                risk_level=risk_result["risk_level"],
            )
            saved_risk = create_risk(db, risk_data)

            # --------------------------------------------------
            # 8. DATABASE ALERT DECISION ENGINE
            # --------------------------------------------------
            if should_create_alert(risk_result["risk_level"]):
                user = db.query(User).filter(User.id == 1).first()
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
                        reference_id=f"RISK-{saved_risk.id if saved_risk else 0}"
                    )
                    alert = create_alert(db, alert_data)
    except Exception as e:
        logger.warning(f"Database persistence warning for /risk: {e}")

    # --------------------------------------------------
    # 9. AUTOMATIC SMS & EMAIL ALERTS (HIGH / EXTREME HARDCODED FOR TESTING)
    # --------------------------------------------------

    sms_alert = None
    email_status = None

    current_risk_level = risk_result["risk_level"].upper().strip()

    if current_risk_level in [
        "MODERATE",
        "HIGH",
        "EXTREME"
    ]:
        # Generate informative interventions for the alert message
        recommended_interventions = generate_interventions(
            risk_score=risk_result["risk_score"],
            temperature=weather["temperature"],
            humidity=weather["humidity"],
            hour=12,
            vulnerable_population=vulnerability_index
        )
        
        intervention_texts = []
        if recommended_interventions:
            for item in recommended_interventions.get("interventions", [])[:3]:
                intervention_texts.append(f"- {item.get('title', '')}: {item.get('description', '')}")
        
        interventions_formatted = "\n".join(intervention_texts) if intervention_texts else "- Stay hydrated and avoid direct sunlight."

        message = (
            f"🚨 THERMOSHIELD CRITICAL HEAT ALERT 🚨\n\n"
            f"Risk Level: {current_risk_level}\n"
            f"Risk Score: {risk_result['risk_score']}/100\n"
            f"Temperature: {weather['temperature']}°C\n\n"
            f"🛡️ RECOMMENDED SAFETY ACTIONS & INTERVENTIONS:\n"
            f"{interventions_formatted}\n\n"
            f"Please take necessary precautions immediately!"
        )

        sms_alert = await send_sms(
            phone_number="+919999999999",
            message=message
        )

        target_email = getattr(user, "email", None) if user else os.getenv("MAIL_USERNAME")
        if target_email:
            subject = f"⚠️ CRITICAL HEAT ALERT: {current_risk_level} Risk Level Detected"
            background_tasks.add_task(
                send_notification_email,
                to_email=target_email,
                subject=subject,
                body=message
            )
            email_status = "queued"


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
        "email_alert_status": email_status,
    }


# ==================================================
# MAP RISK
# ==================================================

@app.get("/map/risk")
async def map_risk(
    locations: list[str] = Query(...)
):
    results = []

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

                results.append(risk_data)

        except Exception as e:

            print(
                f"Error processing location {location}: {e}"
            )

            continue


    return {
        "count": len(results),
        "locations": results
    }


# ==================================================
# ALL AREAS HEAT RISK OVERVIEW
# ==================================================

@app.get("/areas/risk-overview")
async def areas_risk_overview():
    """
    Returns multi-area heat-health risk intelligence across major Indian municipal zones.
    Provides immediate visibility for guest users and regional monitoring.
    """
    return await get_all_areas_risk_overview()


# ==================================================
# FORECAST
# ==================================================

@app.get("/forecast")
async def forecast(
    lat: float,
    lon: float
):
    return await get_forecast(
        lat=lat,
        lon=lon
    )


# ==================================================
# INTERVENTIONS
# ==================================================

@app.get("/intervention")
def get_interventions_endpoint(
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
    risk_id: int | None = Query(None),
    risk_score: float | None = Query(None),
    cooling_center: bool = False,
    outdoor_work_restriction: bool = False,
    hydration_stations: bool = False,
    db: Session = Depends(get_db)
):

    # --------------------------------------------------
    # 1. RESOLVE BASE RISK SCORE
    # --------------------------------------------------
    effective_risk_score = risk_score
    risk_obj = None

    if risk_id is not None:
        try:
            risk_obj = (
                db.query(Risk)
                .filter(Risk.id == risk_id)
                .first()
            )
            if risk_obj is not None and effective_risk_score is None:
                effective_risk_score = risk_obj.risk_score
        except Exception as e:
            logger.warning(f"Database query warning in /intervention/simulate: {e}")

    if effective_risk_score is None:
        effective_risk_score = 50.0

    # --------------------------------------------------
    # 2. RUN INTERVENTION SIMULATION
    # --------------------------------------------------

    simulation_result = simulate_intervention(
        risk_score=effective_risk_score,
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
    # 4. OPTIONAL SAVE TO DATABASE
    # --------------------------------------------------
    if risk_obj is not None:
        try:
            intervention_data = InterventionCreate(
                location_id=risk_obj.location_id,
                risk_id=risk_obj.id,
                cooling_center=cooling_center,
                hydration_station=hydration_stations,
                outdoor_work_restriction=(
                    outdoor_work_restriction
                ),
                before_risk_score=before_risk_score,
                after_risk_score=after_risk_score
            )

            create_intervention(
                db,
                intervention_data
            )
        except Exception as e:
            logger.warning(f"Database save warning in /intervention/simulate: {e}")

    # --------------------------------------------------
    # 5. RETURN RESULT
    # --------------------------------------------------
    active_list = []
    if cooling_center:
        active_list.append("cooling_center")
    if outdoor_work_restriction:
        active_list.append("outdoor_work_restriction")
    if hydration_stations:
        active_list.append("hydration_stations")

    return {
        "risk_id": risk_id,
        "current_risk": simulation_result["current_risk"],
        "projected_risk": simulation_result["projected_risk"],
        "risk_reduction": simulation_result["risk_reduction"],
        "projected_level": simulation_result.get("projected_level", "LOW"),
        "active_interventions": active_list,
        "policy_count": len(active_list),
    }
