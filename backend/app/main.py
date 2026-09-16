import os
import sys
import time
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pathlib import Path


logger = logging.getLogger(__name__)

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
# Ensure project root and backend are in sys.path
backend_dir = Path(__file__).resolve().parent.parent
project_root = backend_dir.parent
for p in (str(project_root), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.auth.router import (
    router as auth_router,
    get_current_user,
    get_current_user_optional,
    require_admin_or_official,
    hash_password,
)
from app.routers.personal_risk import router as personal_risk_router
from app.routers.copilot import router as copilot_router
from app.services.firebase_service import update_live_risk

from fastapi import FastAPI, Query, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session


from app.services.location import search_location, reverse_location
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

from sqlalchemy import text
from app.database.models import Location, User, Risk, Alert, Intervention
from app.database.connection import get_db, engine, Base, init_db

from app.services.risk import predict_risk
from app.services.map_services import (
    get_location_risk,
    get_all_areas_risk_overview,
    get_area_profile_for_coordinates,
)
from app.services.global_areas import (
    get_all_global_areas_overview,
    GLOBAL_AREAS,
)
from app.services.intervention import generate_interventions
from app.services.simulator import simulate_intervention
from app.services.sms import send_sms, get_sms_delivery_status
from app.services.email import send_notification_email, is_smtp_configured
from app.services.email_templates import generate_action_first_alert_html
from app.services.alert_engine import dispatch_automatic_early_warning, get_engine_status_summary, init_cooldown_registry_from_db
from app.services.monitor import monitor_daemon
from app.services.rag_service import get_provenance_report


from app.services.heat_action_plan import (
    evaluate_heat_action_plan,
    get_all_wards_heat_action_overview,
    MUNICIPAL_WARD_REGISTRY,
)
from app.services.health_forecast import (
    generate_health_impact_forecast,
    get_all_wards_forecast_summary,
)


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
    SendAlertEmailRequest,
    SendAlertEmailResponse,
    AlertSubscriptionRequest,
    AlertSubscriptionResponse,
    SendTestSMSRequest,
    SendTestSMSResponse,
    HeatActionEvaluateRequest,
    HeatActionDecisionUpdateRequest,
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


def _seed_demo_accounts_if_needed():
    """Ensure standard judging demo personas exist with valid hashed password 'demo12345'."""
    db = next(get_db())
    try:
        demo_accounts = [
            {
                "name": "Dr. Aarav Sharma",
                "email": "aarav.sharma@health.gov.in",
                "phone_number": "+91 9811223344",
                "role": "official",
            },
            {
                "name": "Rajesh Verma (NDRF)",
                "email": "rajesh.verma@disastermgmt.gov.in",
                "phone_number": "+91 9822334455",
                "role": "responder",
            },
            {
                "name": "Pooja Iyer (IMD)",
                "email": "pooja.iyer@imd.gov.in",
                "phone_number": "+91 9833445566",
                "role": "analyst",
            },
            {
                "name": "Siddharth Patel",
                "email": "siddharth.patel@gmail.com",
                "phone_number": "+91 9844556677",
                "role": "user",
            },
        ]
        demo_hash = hash_password("demo12345")
        for account in demo_accounts:
            existing = db.query(User).filter(User.email == account["email"]).first()
            if not existing:
                user = User(
                    name=account["name"],
                    email=account["email"],
                    phone_number=account["phone_number"],
                    role=account["role"],
                    password_hash=demo_hash
                )
                db.add(user)
            elif existing.password_hash == "UNSET_PASSWORD_RESET_REQUIRED":
                existing.password_hash = demo_hash
        db.commit()
    except Exception as err:
        db.rollback()
        logger.warning(f"Demo accounts initialization notice: {err}")
    finally:
        db.close()


@app.on_event("startup")
async def on_startup():
    try:
        init_db()
        _seed_demo_accounts_if_needed()
        # Hydrate alert cooldown registry from DB
        db = next(get_db())
        try:
            init_cooldown_registry_from_db(db)
        finally:
            db.close()
        # Start proactive autonomous background monitoring daemon
        monitor_daemon.start()
        logger.info("ThermoShield autonomous monitoring daemon initialized on startup.")
    except Exception as e:
        logger.warning(f"Database initialization warning: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    try:
        monitor_daemon.stop()
        logger.info("ThermoShield autonomous monitoring daemon stopped on shutdown.")
    except Exception as e:
        logger.warning(f"Shutdown notice: {e}")

app.include_router(personal_risk_router)
app.include_router(copilot_router, prefix="/copilot", tags=["AI Copilot"])
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
        "http://localhost:3001",
        "http://127.0.0.1:3001",
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
# HEALTH & READINESS PROBES (SIH-25C PRODUCTION HARDENING)
#
# Canonical endpoints:
#   GET /health        — liveness:  is the process alive?
#   GET /health/ready  — readiness: are critical dependencies operational?
#
# Critical services (failure → NOT_READY, HTTP 503):
#   - Database connectivity
#
# Optional / degraded services (absence → READY_WITH_DEGRADED_OPTIONAL_SERVICES):
#   - SMTP email
#   - SMS (demo mode is acceptable)
#   - Gemini API (autonomous RAG fallback available)
#   - Monitoring daemon (non-critical; system still functions)
# ==================================================

@app.get("/health")
def health_liveness():
    """
    Liveness probe: confirms the process is alive.
    Zero-cost — no database or upstream calls.
    Used by Render, Docker, and Kubernetes health checks.
    """
    db_engine_name = engine.dialect.name if hasattr(engine, "dialect") and engine.dialect else "unknown"
    return {
        "status": "healthy",
        "service": "ThermoShield API",
        "database_engine": db_engine_name,
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@app.get("/health/ready")
def health_readiness(db: Session = Depends(get_db)):
    """
    Readiness probe: verifies critical and optional dependencies.

    Critical dependencies — a failure renders the service NOT_READY:
      - Database connectivity (data persistence required for all core features)

    Optional dependencies — absence degrades but does not block readiness:
      - SMTP email (alerts degrade to in-app only)
      - SMS (demo mode is acceptable for SIH deployment)
      - Gemini API (autonomous RAG fallback is available)
      - Monitoring daemon (non-critical background process)

    Never exposes credentials, API keys, or connection strings.
    """
    # ---- CRITICAL: Database connectivity -----------------------------------
    db_ok = False
    db_dialect = "unknown"
    db_status_detail = "OPERATIONAL"
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
        db_dialect = db.bind.dialect.name if hasattr(db, "bind") and db.bind else "unknown"
    except Exception as e:
        db_status_detail = f"UNREACHABLE: {type(e).__name__}"

    # ---- OPTIONAL: Weather cache state (no upstream call) ------------------
    from app.services.weather import _CACHE
    weather_info = {
        "provider": "Open-Meteo Global API",
        "status": "OPERATIONAL",
        "cache_entries": len(_CACHE),
        "classification": "OPTIONAL",
    }

    # ---- OPTIONAL: SMTP email ----------------------------------------------
    smtp_ok = is_smtp_configured()
    email_info = {
        "channel": "SMTP Direct",
        "configured": smtp_ok,
        "status": "OPERATIONAL" if smtp_ok else "NOT_CONFIGURED",
        "classification": "OPTIONAL",
        "note": "In-app alerts remain available when SMTP is not configured.",
    }

    # ---- OPTIONAL: SMS -----------------------------------------------------
    sms_status = get_sms_delivery_status()
    sms_status["classification"] = "OPTIONAL"

    # ---- OPTIONAL: HeatCopilot / Gemini ------------------------------------
    gemini_key = bool(os.getenv("GEMINI_API_KEY", "").strip())
    copilot_info = {
        "primary_model": "Gemini" if gemini_key else "Autonomous RAG (local)",
        "status": "OPERATIONAL" if gemini_key else "FALLBACK_RAG_ACTIVE",
        "gemini_configured": gemini_key,
        "knowledge_chunks": 6,
        "classification": "OPTIONAL",
        "note": "Autonomous RAG fallback is available when Gemini API key is absent.",
    }

    # ---- OPTIONAL: Autonomous monitoring daemon ----------------------------
    daemon_telemetry = monitor_daemon.get_telemetry()
    daemon_info = {
        "running": daemon_telemetry.get("daemon_running", False),
        "cycles_completed": daemon_telemetry.get("total_cycles_completed", 0),
        "monitored_areas": daemon_telemetry.get("monitored_areas_count", 0),
        "classification": "OPTIONAL",
    }

    # ---- Compute overall readiness -----------------------------------------
    optional_degraded = not smtp_ok or not gemini_key
    if db_ok:
        overall_status = (
            "READY_WITH_DEGRADED_OPTIONAL_SERVICES" if optional_degraded else "READY"
        )
    else:
        overall_status = "NOT_READY"

    payload = {
        "status": overall_status,
        "service": "ThermoShield Heat Health Platform",
        "critical_dependencies": {
            "database": {
                "status": db_status_detail,
                "engine": db_dialect,
                "is_critical": True,
            }
        },
        "optional_services": {
            "weather_cache": weather_info,
            "email": email_info,
            "sms": sms_status,
            "copilot": copilot_info,
            "daemon": daemon_info,
        },
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    if not db_ok:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content=payload)

    return payload


@app.get("/ready")
def health_ready_alias(db: Session = Depends(get_db)):
    """
    Backward-compatible alias for /health/ready.
    Kept for monitoring systems that poll /ready.
    Delegates to the canonical /health/ready implementation.
    """
    return health_readiness(db)



# ==================================================
# USER CRUD (PROTECTED)
# ==================================================

@app.post(
    "/users",
    response_model=UserResponse
)
def create_user_api(
    user_data: UserCreate,
    current_user: User = Depends(require_admin_or_official),
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
    current_user: User = Depends(require_admin_or_official),
    db: Session = Depends(get_db)
):
    return get_users(db)


@app.get(
    "/users/{user_id}",
    response_model=UserResponse
)
def get_user_api(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id and (current_user.role or "").lower() not in ["admin", "official"]:
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: you may only view your own user profile."
        )

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
    current_user: User = Depends(require_admin_or_official),
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
    current_user: User = Depends(require_admin_or_official),
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
    current_user: User = Depends(require_admin_or_official),
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
    current_user: User = Depends(require_admin_or_official),
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
    current_user: User = Depends(require_admin_or_official),
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
# ALERT CRUD (PROTECTED)
# ==================================================

@app.post(
    "/alerts",
    response_model=AlertResponse
)
def create_alert_api(
    alert_data: AlertCreate,
    current_user: User = Depends(require_admin_or_official),
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (current_user.role or "").lower() in ["admin", "official"]:
        return get_alerts(db)
    return get_user_alerts(db, current_user.id)


@app.get("/alerts/engine-status")
def get_alert_engine_status_api():
    """
    Returns live telemetry of the proactive background monitoring daemon:
    - Daemon operational status
    - Monitored municipal areas
    - Total evaluation cycles completed
    - Active anti-spam cooldown states
    - Recent automatic early-warning dispatches
    """
    return monitor_daemon.get_telemetry()


@app.post("/alerts/engine-trigger")
async def trigger_alert_engine_cycle_api():
    """
    Manually triggers an immediate proactive thermal evaluation cycle
    across all monitored areas without waiting for the 15-minute scheduled timer.
    """
    results = await monitor_daemon.run_evaluation_cycle()
    return {
        "status": "success",
        "message": f"Evaluated {len(results)} monitored regions proactively.",
        "results": results,
        "telemetry": monitor_daemon.get_telemetry()
    }


@app.get("/alerts/delivery-status")
def get_alerts_delivery_status():
    """
    Returns multi-channel alert delivery gateway health and operational readiness.
    Preserves truthfulness across SMS, Email, and WhatsApp channels.
    """
    sms_status = get_sms_delivery_status()
    smtp_ok = is_smtp_configured()
    sender_email = (os.getenv("MAIL_USERNAME") or "").strip()

    return {
        "sms": sms_status,
        "email": {
            "status": "OPERATIONAL" if smtp_ok else "NOT_CONFIGURED",
            "display_status": "Operational (SMTP Direct)" if smtp_ok else "Not Configured (Simulation Mode)",
            "configured": smtp_ok,
            "sender": sender_email if smtp_ok else "Not Configured",
            "can_deliver": smtp_ok,
            "channel": "Email Dispatch (SMTP)"
        },
        "whatsapp": {
            "status": "PLANNED",
            "display_status": "Planned Integration",
            "configured": False,
            "can_deliver": False,
            "channel": "WhatsApp Business API",
            "note": "Planned for subsequent regional deployment under SIH26083."
        }
    }


@app.post(
    "/alerts/send-test-sms",
    response_model=SendTestSMSResponse
)
async def send_test_sms_api(
    payload: SendTestSMSRequest,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Dispatches a test SMS alert to verify cellular gateway deliverability.
    If Twilio credentials are configured, sends real SMS; otherwise runs truthful demo simulation.
    """
    clean_phone = (payload.phone_number or "").strip()
    if not clean_phone or len(clean_phone) < 7:
        raise HTTPException(
            status_code=400,
            detail="A valid phone number with at least 7 digits is required."
        )

    loc = payload.location_name or "Monitored Region"
    test_msg = payload.message or (
        f"[ThermoShield TEST ALERT] Heatwave early warning system test for {loc}. "
        f"Automated regional dispatch pipeline operational."
    )

    result = await send_sms(clean_phone, test_msg)

    return SendTestSMSResponse(
        success=result.get("success", False),
        status=result.get("status", "SIMULATED"),
        mode=result.get("mode", "DEMO"),
        provider=result.get("provider", "demo"),
        recipient=clean_phone,
        message=test_msg,
        message_id=result.get("message_id"),
        error=result.get("error")
    )


@app.get(
    "/alerts/{alert_id}",
    response_model=AlertResponse
)
def get_alert_api(
    alert_id: int,
    current_user: User = Depends(get_current_user),
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

    if alert.user_id != current_user.id and (current_user.role or "").lower() not in ["admin", "official"]:
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: you do not have permission to view this alert."
        )

    return alert


@app.get(
    "/users/{user_id}/alerts",
    response_model=list[AlertResponse]
)
def get_user_alerts_api(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id and (current_user.role or "").lower() not in ["admin", "official"]:
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: you may only view your own alerts."
        )

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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_location_alerts(
        db,
        location_id
    )


@app.delete("/alerts/{alert_id}")
def delete_alert_api(
    alert_id: int,
    current_user: User = Depends(require_admin_or_official),
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




@app.post(
    "/alerts/send-email",
    response_model=SendAlertEmailResponse
)
def send_alert_email_direct_api(
    payload: SendAlertEmailRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Directly dispatch a heat alert email to a candidate or user (Simulation / Test Dispatch).
    The receiver is dynamically set to payload.email.
    The sender is always the system's configured MAIL_USERNAME from environment.
    """
    candidate_email = str(payload.email).strip().lower()
    location_name = payload.location_name or "Your Area"
    risk_level = (payload.risk_level or "HIGH").upper()
    risk_score = payload.risk_score if payload.risk_score is not None else 75.0
    temp_val = payload.temperature_c if payload.temperature_c is not None else 36.5

    interventions = payload.interventions or [
        "Hydrate frequently with water and electrolyte replenishment (ORS).",
        "Avoid strenuous outdoor work or direct sunlight between 12:00 PM and 3:00 PM.",
        "Seek designated cooling shelters or well-ventilated indoor spaces.",
        "Check on elderly individuals, children, and vulnerable family members."
    ]

    subject = f"ThermoShield Alert: {risk_level} Heat Risk in {location_name}"

    # Plain text version
    bullet_points = "\n".join([f"• {item}" for item in interventions])
    plain_body = (
        f"ThermoShield Heat Health Advisory (Test Dispatch)\n\n"
        f"A {risk_level} heat-health risk alert has been evaluated for {location_name}.\n"
        f"• Risk Level: {risk_level}\n"
        f"• Risk Score: {risk_score}/100\n"
        f"• Current Temperature: {temp_val:.1f}°C\n\n"
        f"Recommended Safety Actions:\n"
        f"{bullet_points}\n\n"
        f"— ThermoShield Civic Early Warning System"
    )

    # High-fidelity Action-First HTML
    html_body = generate_action_first_alert_html(
        location_name=location_name,
        risk_level=risk_level,
        risk_score=risk_score,
        temperature_c=temp_val,
        wbgt_c=payload.wbgt_c,
        heat_index_c=payload.heat_index_c,
        transition_type="EVALUATOR SIMULATION / DIRECT DISPATCH",
        recommended_actions=interventions,
        recipient_email=candidate_email,
        custom_note=payload.custom_note
    )

    res = send_notification_email(
        to_email=candidate_email,
        subject=subject,
        body=plain_body,
        html_body=html_body
    )

    if res.get("status") == "error":
        raise HTTPException(
            status_code=500,
            detail=f"Failed to dispatch email alert: {res.get('message')}"
        )
    elif res.get("status") == "skipped":
        raise HTTPException(
            status_code=400,
            detail=(
                "Email dispatch skipped: SMTP mail credentials not configured. "
                "Please set MAIL_USERNAME and MAIL_PASSWORD (e.g. Gmail App Password) in your .env file."
            )
        )

    # Log/persist alert in DB if possible
    try:
        user_to_link = current_user or db.query(User).filter(User.email.ilike(candidate_email)).first()
        if not user_to_link:
            user_to_link = User(
                name=candidate_email.split('@')[0],
                phone_number=f"999{int(time.time()) % 10000000:07d}",
                email=candidate_email,
                role="candidate"
            )
            db.add(user_to_link)
            db.commit()
            db.refresh(user_to_link)

        loc_obj = None
        if payload.lat is not None and payload.lon is not None:
            loc_obj = get_location_by_coordinates(db, payload.lat, payload.lon)
        if not loc_obj:
            loc_obj = db.query(Location).first()

        alert_data = AlertCreate(
            user_id=user_to_link.id,
            location_id=loc_obj.id if loc_obj else 1,
            risk_level=risk_level,
            risk_score=float(risk_score),
            message=f"Heat health risk {risk_level} at {location_name}. Dispatched to {candidate_email}.",
            status="SENT",
            phone_number=user_to_link.phone_number,
            reference_id=f"DISPATCH-{int(time.time())}"
        )
        create_alert(db, alert_data)
    except Exception as log_err:
        logger.warning(f"Non-critical: alert record persistence failed: {log_err}")

    return SendAlertEmailResponse(
        status="success",
        message=f"Heat alert email successfully dispatched to {candidate_email}",
        recipient=candidate_email,
        sender=os.getenv("MAIL_USERNAME") or "ronit.jagdale.39@gmail.com"
    )


@app.post(
    "/alerts/subscribe",
    response_model=AlertSubscriptionResponse
)
def subscribe_citizen_alerts(
    payload: AlertSubscriptionRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """
    Enrolls a citizen for automatic heatwave early alerts.
    Whenever HIGH or EXTREME risk is detected in their area, the citizen receives instant alerts.
    """
    clean_email = str(payload.email).strip().lower()
    clean_phone = (payload.phone_number or "").strip() or f"999{int(time.time()) % 10000000:07d}"
    citizen_name = (payload.name or "").strip() or clean_email.split("@")[0].capitalize()

    existing_user = db.query(User).filter(User.email.ilike(clean_email)).first()
    is_new = False

    if not existing_user:
        new_citizen = User(
            name=citizen_name,
            phone_number=clean_phone,
            email=clean_email,
            role="citizen",
            password_hash=hash_password("citizen12345")
        )
        try:
            db.add(new_citizen)
            db.commit()
            db.refresh(new_citizen)
            is_new = True
            user_obj = new_citizen
        except Exception:
            db.rollback()
            user_obj = db.query(User).filter(User.email.ilike(clean_email)).first()
    else:
        user_obj = existing_user

    location_str = payload.location_name or "your area"
    welcome_subject = f"🛡️ ThermoShield Active: Enrolled for Automatic Heat Alerts in {location_str}"
    welcome_body = (
        f"Hello {citizen_name},\n\n"
        f"You have been successfully enrolled in the ThermoShield Civic Heatwave Defense Network.\n\n"
        f"Whenever HIGH or EXTREME biometeorological heat risk is detected for {location_str}, "
        f"you will automatically receive immediate email alerts with hydration guidance and safety directives.\n\n"
        f"No manual email entry required — our real-time monitoring engine alerts you automatically.\n\n"
        f"— ThermoShield Civic Protection Team"
    )
    welcome_html = f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f172a;color:#f8fafc;border-radius:16px;border:1px solid #334155;">
        <h2 style="color:#f97316;margin-top:0;">🛡️ ThermoShield Early Warning Network</h2>
        <div style="background:rgba(34,197,94,0.15);border:1px solid #22c55e;border-radius:10px;padding:16px;margin:16px 0;">
            <h3 style="color:#22c55e;margin:0 0 6px 0;">✅ Automatic Heat Alerts Active</h3>
            <p style="margin:0;color:#cbd5e1;font-size:13px;">Location: <strong>{location_str}</strong> | Citizen: <strong>{clean_email}</strong></p>
        </div>
        <p style="font-size:13px;line-height:1.6;color:#cbd5e1;">
            Whenever <strong>HIGH</strong> or <strong>EXTREME</strong> heatwaves threaten your area, our biometeorological prediction engine will automatically dispatch emergency safety directives, WBGT telemetry, and hydration protocols directly to your inbox.
        </p>
        <p style="font-size:11px;color:#64748b;border-top:1px solid #334155;padding-top:12px;margin-top:16px;">
            Enrolled under Smart India Hackathon Heat Defense Initiative • Automatic Civic Broadcast
        </p>
    </div>
    """
    background_tasks.add_task(
        send_notification_email,
        to_email=clean_email,
        subject=welcome_subject,
        body=welcome_body,
        html_body=welcome_html
    )

    return AlertSubscriptionResponse(
        status="success",
        message=f"Citizen {clean_email} enrolled for automatic High/Extreme heat alerts in {location_str}.",
        email=clean_email,
        is_new_citizen=is_new,
        auto_alert_active=True
    )







# ==================================================
# INTERVENTION CRUD (PROTECTED)
# ==================================================

@app.post(
    "/interventions",
    response_model=InterventionResponse
)
def create_intervention_api(
    intervention_data: InterventionCreate,
    current_user: User = Depends(require_admin_or_official),
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_interventions(db)


@app.get(
    "/interventions/{intervention_id}",
    response_model=InterventionResponse
)
def get_intervention_api(
    intervention_id: int,
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(require_admin_or_official),
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
    db_status = "unavailable"
    try:
        driver = engine.url.drivername
        backend_name = "sqlite" if "sqlite" in driver else "postgresql"
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = backend_name
    except Exception as e:
        logger.warning(f"Health check database probe failed: {e}")
        db_status = "unavailable"

    is_healthy = db_status != "unavailable"
    return {
        "status": "healthy" if is_healthy else "degraded",
        "database": db_status
    }


# ==================================================
# LOCATION SEARCH
# ==================================================

@app.get("/location/search")
async def location_search(
    q: str = Query(..., min_length=2)
):
    try:
        locations = await search_location(q)
        return {
            "count": len(locations),
            "locations": locations
        }
    except Exception as e:
        logger.warning(f"Location search query failed for '{q}': {e}")
        return {
            "count": 0,
            "locations": [],
            "error": "Location search temporarily unavailable."
        }



@app.get("/location/reverse")
async def location_reverse(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """
    Reverse geocodes a lat/lon coordinate to a human-friendly place name.
    Used by the Citizen Heat Map for tap-to-place interaction.
    Returns: { name, latitude, longitude }
    """
    result = await reverse_location(lat, lon)
    return result


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
        "forecast": weather_data.get("forecast", {}),
    }


# ==================================================
# RISK ANALYSIS + DATABASE + SMS + EMAIL
# ==================================================

@app.get("/risk")
async def risk(
    lat: float,
    lon: float,
    vulnerability_index: Optional[float] = 30.0,
    historical_health_events: Optional[int] = 17,
    lag_health_events: Optional[int] = 15,
    email: Optional[str] = Query(None, description="Candidate or recipient email address for alerts"),
    phone_number: Optional[str] = Query(None, description="Recipient phone number for SMS alerts"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
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

    area_profile = get_area_profile_for_coordinates(lat, lon)

    if area_profile:
        vulnerability_index = (
            vulnerability_index
            if vulnerability_index is not None
            else float(area_profile["vulnerability_index"])
        )
        historical_health_events = (
            historical_health_events
            if historical_health_events is not None
            else int(area_profile["historical_health_events"])
        )
        lag_health_events = (
            lag_health_events
            if lag_health_events is not None
            else int(area_profile["lag_health_events"])
        )
    else:
        vulnerability_index = (
            vulnerability_index
            if vulnerability_index is not None
            else 30.0
        )
        historical_health_events = (
            historical_health_events
            if historical_health_events is not None
            else 17
        )
        lag_health_events = (
            lag_health_events
            if lag_health_events is not None
            else 15
        )

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
    location = None
    # Publish current risk to Firebase for real-time dashboard state
    firebase_live_risk = None

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
            try:
                firebase_live_risk = update_live_risk(
                location_id=str(location.id),
                location=location.name,
                risk_score=risk_result["risk_score"],
                risk_level=risk_result["risk_level"],
                thermal_risk_level=thermal_result["risk_assessment"]["level"],
                status="ACTIVE",
            )
            except Exception as exc:
                logger.warning(
                    "Firebase live-risk update failed: %s",
                exc,
            )

            # --------------------------------------------------
            # 8. DATABASE ALERT DECISION ENGINE
            # --------------------------------------------------
            if should_create_alert(risk_result["risk_level"]):
                # Prioritize: 1) authenticated current_user, 2) candidate email provided, 3) existing user matching email
                user = current_user
                clean_email = email.strip().lower() if (email and email.strip() and "@" in email) else None
                if not user and clean_email:
                    user = db.query(User).filter(User.email.ilike(clean_email)).first()

                if not user and (clean_email or phone_number):
                    clean_phone = phone_number.strip() if phone_number else f"999{int(time.time()) % 10000000:07d}"
                    target_rec_email = clean_email or f"candidate_{int(time.time())}@thermoshield.org"
                    try:
                        user = User(
                            name=clean_email.split("@")[0] if clean_email else "Candidate",
                            phone_number=clean_phone,
                            email=target_rec_email,
                            role="candidate"
                        )
                        db.add(user)
                        db.commit()
                        db.refresh(user)
                    except Exception:
                        db.rollback()
                        if clean_email:
                            user = db.query(User).filter(User.email.ilike(clean_email)).first()

                if user:
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
                        phone_number=getattr(user, "phone_number", phone_number),
                        reference_id=f"RISK-{saved_risk.id if saved_risk else 0}"
                    )
                    alert = create_alert(db, alert_data)
    except Exception as e:
        logger.warning(f"Database persistence warning for /risk: {e}")

    # --------------------------------------------------
    # 9. AUTOMATIC SMS & EMAIL ALERTS (HIGH / EXTREME ONLY)
    # --------------------------------------------------

    sms_alert = None
    email_status = None

    current_risk_level = risk_result["risk_level"].upper().strip()

    # Email and SMS are dispatched strictly for HIGH or EXTREME risk
    if current_risk_level in [
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

        # -----------------------------------------------------------------
        # UNIFIED PROACTIVE EARLY-WARNING ENGINE DISPATCH
        # -----------------------------------------------------------------
        loc_id = location.id if location else None
        loc_name = weather_data['location'].get('name', f'Location ({lat:.2f}, {lon:.2f})')

        dispatch_report = dispatch_automatic_early_warning(
            db=db,
            location_name=loc_name,
            location_id=loc_id,
            risk_level=current_risk_level,
            risk_score=risk_result["risk_score"],
            temperature_c=weather["temperature"],
            wbgt_c=wbgt,
            heat_index_c=heat_index,
            interventions=intervention_texts if intervention_texts else None,
            force_test_recipient=email if (email and "@" in email) else None
        )

        email_status = f"Engine: {dispatch_report.get('transition')} ({dispatch_report.get('dispatched_count', 0)} sent, {dispatch_report.get('skipped_count', 0)} cooldown-guarded)"

        if alert is not None:
            try:
                alert.status = "SENT"
                db.commit()
            except Exception as err:
                logger.warning(f"Failed to update alert status: {err}")




    # --------------------------------------------------
    # 10. FINAL RESPONSE
    # --------------------------------------------------

    return {
        "location": {
            **weather_data["location"],
            "id": location.id if location is not None else None,
            "name": location.name if location is not None else None,
        },

        "weather": weather,

        "risk": risk_result,

        "risk_factors": risk_result.get("risk_factors", []),

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
        "firebase_live_risk": firebase_live_risk,
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


@app.get("/areas/global-risk-overview")
async def global_areas_risk_overview(
    region: Optional[str] = Query(None, description="Optional continent/region filter")
):
    """
    Returns global heatwave and thermal stress risk intelligence across 40+ worldwide megacities and extreme climate zones.
    """
    return await get_all_global_areas_overview(region_filter=region)



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

    # Fallback to the latest calculated Risk if risk_id was not provided
    if risk_obj is None:
        try:
            risk_obj = db.query(Risk).order_by(Risk.created_at.desc()).first()
            if risk_obj is not None and effective_risk_score is None:
                effective_risk_score = risk_obj.risk_score
        except Exception as e:
            logger.warning(f"Database query fallback warning in /intervention/simulate: {e}")

    if effective_risk_score is None:
        effective_risk_score = 50.0

    # Ensure baseline location and risk exist so intervention is always persisted
    if risk_obj is None:
        try:
            loc = db.query(Location).first()
            if not loc:
                loc = Location(name="Simulated Area", latitude=19.0760, longitude=72.8777)
                db.add(loc)
                db.commit()
                db.refresh(loc)
            risk_obj = Risk(
                location_id=loc.id,
                temperature_c=34.0,
                thermal_stress=40.0,
                heat_index=36.0,
                wbgt=28.0,
                predicted_health_impact_proxy=14.0,
                risk_score=effective_risk_score,
                risk_level="HIGH" if effective_risk_score >= 50 else "MODERATE"
            )
            db.add(risk_obj)
            db.commit()
            db.refresh(risk_obj)
        except Exception as e:
            logger.warning(f"Could not create baseline risk for intervention: {e}")

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


# ==================================================
# HEAT ACTION PLAN (HAP) DECISION ENGINE (PROMPT 21)
# ==================================================

# In-memory store for municipal manual decision states
HEAT_ACTION_DECISIONS: Dict[str, Dict[str, Any]] = {}


def _apply_decisions_to_actions(area_id: str, actions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enriches recommended actions with saved manual municipal decisions."""
    clean_area = area_id.strip().lower()
    for act in actions:
        key = f"{clean_area}:{act.get('action')}"
        if key in HEAT_ACTION_DECISIONS:
            dec = HEAT_ACTION_DECISIONS[key]
            act["decision_status"] = dec.get("decision_status", act.get("status"))
            act["decision_officer"] = dec.get("officer_name")
            act["decision_notes"] = dec.get("officer_notes")
            act["decision_timestamp"] = dec.get("updated_at")
        else:
            act["decision_status"] = act.get("status", "RECOMMENDED_FOR_REVIEW")
    return actions


@app.get("/api/action-plan/all")
def get_all_heat_action_plans_api():
    """
    Returns localized Heat Action Plan evaluations across all registered administrative wards.
    Enriched with any active municipal authority review decisions.
    """
    plans = get_all_wards_heat_action_overview()
    for plan in plans:
        plan["recommended_actions"] = _apply_decisions_to_actions(
            plan["area_id"], plan.get("recommended_actions", [])
        )
    return {
        "count": len(plans),
        "plans": plans
    }


@app.get("/api/action-plan/decisions")
def get_action_decisions_api():
    """
    Returns all manual authority decision overrides recorded by city disaster managers.
    """
    return {
        "count": len(HEAT_ACTION_DECISIONS),
        "decisions": list(HEAT_ACTION_DECISIONS.values())
    }


@app.post("/api/action-plan/decision")
def update_action_decision_api(
    payload: HeatActionDecisionUpdateRequest,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Records an authority decision on a Heat Action recommendation:
    Allowed states: 'Reviewed', 'Acknowledged', 'Deferred', 'Action Initiated Externally'
    """
    status_val = payload.decision_status or payload.decision or "Reviewed"
    valid_states = ["Reviewed", "Acknowledged", "Deferred", "Action Initiated Externally", "RECOMMENDED_FOR_REVIEW"]
    if status_val not in valid_states:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision_status '{status_val}'. Must be one of: {', '.join(valid_states)}"
        )

    clean_area = (payload.area_id or "general").strip().lower()
    clean_action = payload.action_key.strip()
    key = f"{clean_area}:{clean_action}"

    officer_name = payload.officer_name
    if not officer_name and current_user:
        officer_name = getattr(current_user, "name", None) or getattr(current_user, "email", "Civic Administrator")

    record = {
        "key": key,
        "area_id": clean_area,
        "action_key": clean_action,
        "decision_status": status_val,
        "officer_name": officer_name or "Disaster Management Officer",
        "officer_notes": payload.officer_notes or payload.notes or "",
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }
    HEAT_ACTION_DECISIONS[key] = record

    return {
        "status": "success",
        "message": f"Action '{clean_action}' for area '{clean_area}' marked as '{payload.decision_status}'",
        "decision": record
    }


@app.get("/api/action-plan/{area_id}")
async def get_heat_action_plan_api(
    area_id: str,
    temp_override: Optional[float] = None,
    risk_override: Optional[str] = None
):
    """
    Evaluates and returns the localized Heat Action Plan trigger package for a specific ward/area.
    Uses real meteorological forecast data if available, or registered municipal baseline.
    """
    clean_area = area_id.strip().lower()
    profile = MUNICIPAL_WARD_REGISTRY.get(clean_area)

    lat = profile["latitude"] if profile else 19.0760
    lon = profile["longitude"] if profile else 72.8777
    vuln = profile.get("vulnerability_score", 55.0) if profile else 50.0
    name = profile.get("name") if profile else clean_area.replace("_", " ").title()

    temp = temp_override or (profile.get("baseline_temp", 34.5) if profile else 34.0)
    try:
        w = await get_weather(lat, lon)
        weather = w.get("weather", {})
        if "temperature" in weather and temp_override is None:
            temp = weather["temperature"]
        hum = weather.get("humidity", 65.0)
    except Exception as exc:
        logger.warning(f"Weather lookup fallback for HAP area {area_id}: {exc}")
        hum = 65.0

    plan = evaluate_heat_action_plan(
        area_id=clean_area,
        area_name=name,
        temperature_c=temp,
        humidity_pct=hum,
        vulnerability_score=vuln,
        risk_level=risk_override,
    )

    plan_dict = plan.to_dict()
    plan_dict["recommended_actions"] = _apply_decisions_to_actions(
        clean_area, plan_dict.get("recommended_actions", [])
    )
    return plan_dict


@app.post("/api/action-plan/evaluate")
def evaluate_heat_action_plan_api(payload: HeatActionEvaluateRequest):
    """
    Evaluates arbitrary or custom microclimate telemetry against the city administration decision engine.
    """
    plan = evaluate_heat_action_plan(
        area_id=payload.area_id,
        area_name=payload.area_name,
        temperature_c=payload.temperature_c or 34.0,
        humidity_pct=payload.humidity_pct or 65.0,
        wbgt_c=payload.wbgt_c,
        heat_index_c=payload.heat_index_c,
        solar_radiation=payload.solar_radiation,
        wind_speed=payload.wind_speed,
        vulnerability_score=payload.vulnerability_score,
        risk_level=payload.risk_level,
        risk_score=payload.risk_score,
        forecast_max_risk=payload.forecast_max_risk,
        forecast_trend=payload.forecast_trend,
        forecast_lead_time_hours=payload.forecast_lead_time_hours,
        alert_state=payload.alert_state
    )

    plan_dict = plan.to_dict()
    plan_dict["recommended_actions"] = _apply_decisions_to_actions(
        payload.area_id, plan_dict.get("recommended_actions", [])
    )
    return plan_dict


# =========================================================================
# 3–5 DAY HUMAN HEALTH IMPACT FORECAST & PREDICTIVE EARLY WARNING (PROMPT 22)
# =========================================================================

@app.get("/api/forecast/health-impact")
async def get_health_impact_forecast_api(
    lat: float = Query(19.0760, description="Latitude"),
    lon: float = Query(72.8777, description="Longitude"),
    area_id: Optional[str] = Query(None, description="Optional municipal ward identifier"),
    area_name: Optional[str] = Query(None, description="Optional area label"),
    vulnerability_score: Optional[float] = Query(None, description="Local vulnerability score (0-100)")
):
    """
    Generates a 3-5 day human health impact outlook.
    Translates weather forecast, biometeorological WBGT, and socio-demographic vulnerability
    into Projected Civic Health Concern and alert lead time intelligence.
    STRICT SCIENTIFIC HONESTY: Does not fabricate death or hospital admission counts.
    """
    clean_id = (area_id or "").strip().lower()
    if clean_id in MUNICIPAL_WARD_REGISTRY and lat == 19.0760 and lon == 72.8777:
        reg = MUNICIPAL_WARD_REGISTRY[clean_id]
        lat = reg["latitude"]
        lon = reg["longitude"]
        if not area_name:
            area_name = reg["name"]
        if vulnerability_score is None:
            vulnerability_score = reg.get("vulnerability_score")

    return await generate_health_impact_forecast(
        latitude=lat,
        longitude=lon,
        area_name=area_name,
        area_id=clean_id or None,
        vulnerability_score=vulnerability_score
    )


@app.get("/api/forecast/wards-summary")
async def get_wards_forecast_summary_api():
    """
    Returns 5-day risk level projections across all 24 Mumbai administrative ward references for dynamic GIS recoloring
    with top-level failure accounting and source classification metadata.
    Ward coordinates are representative coordinates derived from the current administrative ward geometry dataset.
    """
    summaries = await get_all_wards_forecast_summary()

    total_wards = len(summaries)
    real_forecast_wards = sum(
        1 for w in summaries
        if not w.get("forecast_source_classification", {}).get("fallback_active", False)
        and w.get("source_status") != "UNAVAILABLE"
    )
    fallback_wards = sum(
        1 for w in summaries
        if w.get("forecast_source_classification", {}).get("fallback_active", False)
        and w.get("source_status") != "UNAVAILABLE"
    )
    unavailable_wards = sum(
        1 for w in summaries
        if w.get("source_status") == "UNAVAILABLE"
    )

    return {
        "total_wards": total_wards,
        "real_forecast_wards": real_forecast_wards,
        "fallback_wards": fallback_wards,
        "unavailable_wards": unavailable_wards,
        "count": total_wards,  # preserved for backwards compatibility
        "wards": summaries,
    }


# ==============================================================================
# COPILOT RAG PROVENANCE DISCLOSURE (SIH-25C)
# ==============================================================================

@app.get(
    "/copilot/provenance",
    tags=["Copilot"],
    summary="RAG Knowledge Corpus Provenance Table",
)
def get_rag_provenance():
    """
    Returns the full provenance classification table for every knowledge chunk
    in the ThermoShield HeatCopilot RAG knowledge corpus.

    Each entry is classified as:
      - VERIFIED_PUBLIC_SOURCE: content paraphrases a specific, publicly
        accessible primary document (source_url populated).
      - INTERNAL_SUMMARY: content synthesises multiple published guidelines
        listed in the authority field; no single citable URL covers the chunk.
      - NOT_VERIFIED: based on domain knowledge; no traceable primary document.

    Intended for:
      - SIH evaluation committee auditor review
      - CI provenance gate checks
      - Transparency disclosure to judges and end-users
    """
    report = get_provenance_report()
    verified = sum(1 for r in report if r["provenance_class"] == "VERIFIED_PUBLIC_SOURCE")
    internal = sum(1 for r in report if r["provenance_class"] == "INTERNAL_SUMMARY")
    not_verified = sum(1 for r in report if r["provenance_class"] == "NOT_VERIFIED")

    return {
        "corpus_summary": {
            "total_chunks": len(report),
            "VERIFIED_PUBLIC_SOURCE": verified,
            "INTERNAL_SUMMARY": internal,
            "NOT_VERIFIED": not_verified,
            "note": (
                "INTERNAL_SUMMARY chunks synthesise multiple published guidelines "
                "from the listed authorities. They do not constitute primary clinical "
                "references and should be read alongside the cited authority documents."
            ),
        },
        "chunks": report,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
