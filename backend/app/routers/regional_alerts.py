import os
from datetime import datetime
from urllib.parse import parse_qs

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from twilio.request_validator import RequestValidator

from app.auth.router import get_current_user, require_permission
from app.database.connection import get_db
from app.database.models import RegionalSubscription, RegionalDelivery, User
from app.routers.health_data import check_area
from app.services.heat_action_plan import MUNICIPAL_WARD_REGISTRY
from app.services.regional_alerts import channel_status, normalize_phone, evaluate_region

router = APIRouter(prefix="/api/regional-alerts", tags=["Regional SMS and WhatsApp"])


class SubscriptionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sms_enabled: bool = False
    whatsapp_enabled: bool = False
    consent: bool = False


@router.get("/areas")
def areas():
    return {"areas": [{"id": key, "name": value["name"]} for key, value in MUNICIPAL_WARD_REGISTRY.items()],
            "sms": channel_status("sms"), "whatsapp": channel_status("whatsapp"),
            "automation_enabled": os.getenv("ENABLE_REGIONAL_DISPATCH", "false").lower() == "true"}


@router.get("/subscriptions")
def subscriptions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"subscriptions": [{"area_id": row.area_id, "sms_enabled": row.sms_enabled,
        "whatsapp_enabled": row.whatsapp_enabled, "consent_at": row.consent_at}
        for row in db.query(RegionalSubscription).filter_by(user_id=user.id)]}


@router.put("/subscriptions/{area_id}")
def subscribe(area_id: str, payload: SubscriptionInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if area_id not in MUNICIPAL_WARD_REGISTRY:
        raise HTTPException(422, "Unknown ward.")
    if user.account_status != "APPROVED":
        raise HTTPException(403, "Account must be approved.")
    enabled = payload.sms_enabled or payload.whatsapp_enabled
    if enabled and not payload.consent:
        raise HTTPException(422, "Explicit consent is required to enable phone alerts.")
    if enabled:
        try:
            normalize_phone(user.phone_number)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
    row = db.query(RegionalSubscription).filter_by(user_id=user.id, area_id=area_id).first()
    if row is None:
        row = RegionalSubscription(user_id=user.id, area_id=area_id)
        db.add(row)
    row.sms_enabled, row.whatsapp_enabled = payload.sms_enabled, payload.whatsapp_enabled
    row.consent_at = datetime.utcnow() if enabled else None
    db.commit()
    return {"area_id": area_id, "sms_enabled": row.sms_enabled, "whatsapp_enabled": row.whatsapp_enabled,
            "consent_at": row.consent_at}


@router.post("/evaluate/{area_id}")
async def evaluate(area_id: str, user: User = Depends(require_permission("SEND_PUBLIC_ADVISORY")), db: Session = Depends(get_db)):
    check_area(user, area_id)
    return await evaluate_region(db, area_id)


@router.get("/deliveries")
def deliveries(area_id: str, user: User = Depends(require_permission("SEND_PUBLIC_ADVISORY")), db: Session = Depends(get_db)):
    check_area(user, area_id)
    return {"deliveries": [{"id": row.id, "area_id": row.area_id, "channel": row.channel,
        "risk_level": row.risk_level, "forecast_date": row.forecast_date, "status": row.status,
        "created_at": row.created_at, "error": row.error}
        for row in db.query(RegionalDelivery).filter_by(area_id=area_id).order_by(RegionalDelivery.id.desc()).limit(50)]}


@router.post("/twilio/status")
async def receipt(request: Request, delivery_id: int, db: Session = Depends(get_db)):
    callback_base = os.getenv("TWILIO_STATUS_CALLBACK_URL", "").rstrip("/")
    token = os.getenv("TWILIO_AUTH_TOKEN", "")
    if not callback_base or not token:
        raise HTTPException(503, "Receipt endpoint is not configured.")
    body = await request.body()
    if len(body) > 16384:
        raise HTTPException(413, "Receipt is too large.")
    parsed = parse_qs(body.decode("utf-8"), keep_blank_values=True)
    if any(len(values) != 1 for values in parsed.values()):
        raise HTTPException(400, "Duplicate receipt fields.")
    params = {key: values[0] for key, values in parsed.items()}
    url = f"{callback_base}?delivery_id={delivery_id}"
    if not RequestValidator(token).validate(url, params, request.headers.get("X-Twilio-Signature", "")):
        raise HTTPException(403, "Invalid receipt signature.")
    if params.get("AccountSid") != os.getenv("TWILIO_ACCOUNT_SID"):
        raise HTTPException(403, "Invalid provider account.")
    row = db.get(RegionalDelivery, delivery_id)
    sid = params.get("MessageSid")
    if not row or not sid or (row.provider_sid and row.provider_sid != sid) or row.status == "SIMULATED":
        raise HTTPException(404, "Delivery not found.")
    incoming = params.get("MessageStatus", "").upper()
    rank = {"PENDING": 0, "UNKNOWN": 0, "ACCEPTED": 1, "QUEUED": 1, "SENDING": 2, "SENT": 3,
            "FAILED": 4, "UNDELIVERED": 4, "DELIVERED": 5, "READ": 6}
    if incoming in rank and rank[incoming] >= rank.get(row.status, 0):
        row.status, row.provider_sid = incoming, sid
        row.error = "Provider error " + params["ErrorCode"] if params.get("ErrorCode") else None
        db.commit()
    return {"received": True}
