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
from app.services.firebase_service import update_live_risk

from fastapi import FastAPI, Query, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session


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

from sqlalchemy import text
from app.database.models import Location, User, Risk, Alert, Intervention
from app.database.connection import get_db, engine, Base, init_db

from app.services.risk import predict_risk
from app.services.map_services import (
    get_location_risk,
    get_all_areas_risk_overview,
    get_area_profile_for_coordinates,
)
from app.services.intervention import generate_interventions
from app.services.simulator import simulate_intervention
from app.services.sms import send_sms
from app.services.email import send_notification_email


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
def on_startup():
    try:
        init_db()
        _seed_demo_accounts_if_needed()
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
    Directly dispatch a heat alert email to a candidate or user.
    The receiver is dynamically set to payload.email (provided by candidate).
    The sender is always the system's configured MAIL_USERNAME from environment.
    """
    candidate_email = str(payload.email).strip().lower()
    location_name = payload.location_name or "Your Area"
    risk_level = (payload.risk_level or "HIGH").upper()
    risk_score = payload.risk_score if payload.risk_score is not None else 75.0
    temp_str = f"{payload.temperature_c:.1f}°C" if payload.temperature_c is not None else "Elevated"

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
        f"ThermoShield Heat Health Advisory\n\n"
        f"Hello,\n\n"
        f"A {risk_level} heat-health risk alert has been issued for {location_name}.\n"
        f"• Risk Level: {risk_level}\n"
        f"• Risk Score: {risk_score}/100\n"
        f"• Current Temperature: {temp_str}\n\n"
        f"Recommended Safety Actions:\n"
        f"{bullet_points}\n\n"
        f"{payload.custom_note if payload.custom_note else 'Please take necessary safety measures and stay hydrated.'}\n\n"
        f"— ThermoShield Civic Early Warning System\n"
        f"You received this automated advisory because this address is registered for civic heat defense alerts."
    )

    # HTML version
    badge_color = "#ef4444" if risk_level == "EXTREME" else "#f97316" if risk_level == "HIGH" else "#eab308"
    interventions_html = "".join([f"<li style='margin-bottom: 8px;'>{item}</li>" for item in interventions])
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; border-bottom: 1px solid #334155;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #f97316; letter-spacing: -0.5px;">🛡️ ThermoShield Early Warning</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Real-Time Biometeorological Heat Defense System</p>
    </div>

    <div style="padding: 24px;">
      <div style="background-color: rgba(249, 115, 22, 0.08); border-left: 4px solid {badge_color}; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
        <div style="display: inline-block; background-color: {badge_color}; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 3px 10px; border-radius: 9999px; letter-spacing: 0.5px; margin-bottom: 8px;">
          {risk_level} THREAT TIER
        </div>
        <h2 style="margin: 4px 0 6px 0; font-size: 20px; font-weight: 700; color: #f8fafc;">Heat Alert for {location_name}</h2>
        <div style="display: flex; gap: 16px; font-size: 13px; color: #cbd5e1; margin-top: 10px;">
          <span>🌡️ Temp: <strong>{temp_str}</strong></span>
          <span>⚡ Risk Score: <strong>{risk_score}/100</strong></span>
        </div>
      </div>

      <div style="background-color: #1e293b; border-radius: 12px; padding: 18px; margin-bottom: 24px; border: 1px solid #334155;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #38bdf8;">🛡️ Recommended Heat Safety Actions:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #e2e8f0; font-size: 13px; line-height: 1.6;">
          {interventions_html}
        </ul>
      </div>

      <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        This email was sent specifically to candidate: <strong style="color: #cbd5e1;">{candidate_email}</strong>.<br/>
        Stay safe and take proactive heat mitigation measures.
      </p>
    </div>

    <div style="background-color: #0b1120; padding: 14px 24px; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #475569;">
      © 2026 ThermoShield • AI-Powered Dynamic Heatwave Decision System
    </div>
  </div>
</body>
</html>"""

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
            status_code=500,
            detail=f"Email dispatch skipped: {res.get('message')}"
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
        # AUTOMATED CITIZEN ALERT ENGINE (NO MANUAL EMAIL ENTRY REQUIRED)
        # Whenever High or Extreme heat strikes an area, all registered citizens
        # of that area are automatically notified, with intelligent 30-minute cooldown.
        # -----------------------------------------------------------------
        loc_id = location.id if location else 1
        cutoff_cooldown = datetime.utcnow() - timedelta(minutes=30)

        # Find recent alerts to prevent duplicate spamming to the same citizen within 30 mins
        recently_alerted_user_ids = set()
        try:
            recent_alerts = (
                db.query(Alert)
                .filter(
                    Alert.location_id == loc_id,
                    Alert.created_at >= cutoff_cooldown,
                    Alert.status == "SENT"
                )
                .all()
            )
            recently_alerted_user_ids = {a.user_id for a in recent_alerts}
        except Exception as e:
            logger.warning(f"Could not query recent alert cooldown: {e}")

        # Gather eligible citizens to alert
        citizens_to_notify = []
        seen_emails = set()

        # 1. Explicit candidate email passed via query (e.g. testing)
        if email and email.strip() and "@" in email:
            c_email = email.strip().lower()
            u_obj = db.query(User).filter(User.email.ilike(c_email)).first()
            if not u_obj:
                u_obj = User(
                    name=c_email.split("@")[0],
                    phone_number=phone_number or f"999{int(time.time()) % 10000000:07d}",
                    email=c_email,
                    role="candidate"
                )
                try:
                    db.add(u_obj)
                    db.commit()
                    db.refresh(u_obj)
                except Exception:
                    db.rollback()
                    u_obj = db.query(User).filter(User.email.ilike(c_email)).first()
            if u_obj and u_obj.email not in seen_emails:
                citizens_to_notify.append(u_obj)
                seen_emails.add(u_obj.email)

        # 2. Currently logged-in user
        if current_user and getattr(current_user, "email", None):
            if current_user.email not in seen_emails:
                citizens_to_notify.append(current_user)
                seen_emails.add(current_user.email)

        # 3. All registered citizens in database
        try:
            registered_citizens = (
                db.query(User)
                .filter(
                    User.email.isnot(None),
                    User.email.like("%@%")
                )
                .all()
            )
            for citizen in registered_citizens:
                if citizen.email not in seen_emails:
                    # Enforce 30-minute cooldown so citizens aren't spammed on repeated page views
                    if citizen.id not in recently_alerted_user_ids:
                        citizens_to_notify.append(citizen)
                        seen_emails.add(citizen.email)
        except Exception as err:
            logger.warning(f"Could not load registered citizens for auto-alert: {err}")

        # Dispatch automated notifications
        dispatched_count = 0
        loc_name = weather_data['location'].get('name', 'your monitored region')
        subject = f"ThermoShield Alert: {current_risk_level} Heat Risk in {loc_name}"
        interventions_html = "".join([f"<li style='margin-bottom:6px;'>{t.lstrip('- ')}</li>" for t in intervention_texts]) if intervention_texts else "<li>Stay hydrated and avoid direct sunlight.</li>"

        for citizen in citizens_to_notify:
            html_body = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #334155;">
                <h2 style="color: #f97316; margin-top: 0;">🛡️ ThermoShield Early Warning</h2>
                <div style="background: rgba(239,68,68,0.15); border: 1px solid #ef4444; border-radius: 10px; padding: 16px; margin: 16px 0;">
                    <div style="display:inline-block;background:#ef4444;color:#fff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:9999px;margin-bottom:6px;">AUTOMATED CIVIC HEAT ADVISORY</div>
                    <h3 style="color: #ef4444; margin: 0 0 8px 0;">{current_risk_level} Heat Threat Detected</h3>
                    <p style="margin: 0; color: #cbd5e1; font-size: 13px;">Location: <strong>{loc_name}</strong> | Temp: <strong>{weather['temperature']}°C</strong></p>
                </div>
                <div style="background: #1e293b; padding: 16px; border-radius: 10px; margin-bottom: 16px;">
                    <h4 style="color: #38bdf8; margin: 0 0 8px 0;">🛡️ Recommended Heat Safety Actions:</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #e2e8f0; line-height: 1.6;">
                        {interventions_html}
                    </ul>
                </div>
                <p style="font-size: 11px; color: #64748b; margin: 0;">Automated broadcast to registered citizen: <strong>{citizen.email}</strong> by ThermoShield Early Warning System.</p>
            </div>
            """

            background_tasks.add_task(
                send_notification_email,
                to_email=citizen.email,
                subject=subject,
                body=message,
                html_body=html_body
            )
            dispatched_count += 1

            # Dispatch SMS if phone number available
            if getattr(citizen, "phone_number", None):
                try:
                    sms_alert = await send_sms(
                        phone_number=citizen.phone_number,
                        message=message
                    )
                except Exception:
                    pass

            # Record SENT alert in DB for cooldown tracking
            try:
                alert_record = AlertCreate(
                    user_id=citizen.id,
                    location_id=loc_id,
                    risk_level=current_risk_level,
                    risk_score=risk_result["risk_score"],
                    message=f"Automated {current_risk_level} heat alert for {loc_name} dispatched to {citizen.email}.",
                    status="SENT",
                    phone_number=citizen.phone_number,
                    reference_id=f"AUTO-{citizen.id}-{int(time.time())}"
                )
                create_alert(db, alert_record)
            except Exception as e:
                logger.warning(f"Failed to record automated alert: {e}")

        if dispatched_count > 0:
            email_status = f"Dispatched automated alert to {dispatched_count} citizen(s)"
        else:
            email_status = "Citizens already alerted (30m cooldown active)"

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
