"""Consented ward alerts, persistent idempotency and signed provider receipts."""
import hashlib
import json
import os
import re
from datetime import datetime, timedelta

import httpx
from sqlalchemy.exc import IntegrityError

from app.database.models import RegionalDelivery, RegionalSubscription, User
from app.services.heat_action_plan import MUNICIPAL_WARD_REGISTRY
from app.services.health_forecast import generate_health_impact_forecast


def delivery_mode():
    if os.getenv("ENVIRONMENT", "").lower() in ("test", "testing"):
        return "demo"
    return os.getenv("REGIONAL_DELIVERY_MODE", "demo").lower()


def channel_status(channel: str):
    mode = delivery_mode()
    required = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_STATUS_CALLBACK_URL"]
    required += ["TWILIO_WHATSAPP_FROM", "TWILIO_WHATSAPP_CONTENT_SID"] if channel == "whatsapp" else ["TWILIO_FROM_NUMBER"]
    configured = all(os.getenv(key, "").strip() for key in required)
    return {"mode": mode.upper(), "configured": configured, "can_deliver": configured and mode == "live",
        "status": "SIMULATED" if mode == "demo" else "CONFIGURED" if configured and mode == "live" else "DISABLED",
        "display_status": "Demo simulation" if mode == "demo" else "Gateway configured" if configured and mode == "live" else "Not configured",
        "channel": "WhatsApp Business (Twilio)" if channel == "whatsapp" else "SMS (Twilio)",
        "note": "Provider acceptance and confirmed delivery are tracked separately."}


def normalize_phone(value: str):
    value = value.strip()
    if not re.fullmatch(r"\+[1-9]\d{7,14}", value):
        raise ValueError("Your profile phone must use international format, e.g. +919876543210.")
    return value


async def send_channel(channel: str, phone: str, message: str, variables: dict, callback_url: str):
    readiness = channel_status(channel)
    if readiness["mode"] == "DEMO":
        return {"status": "SIMULATED", "provider_sid": None, "error": None}
    if not readiness["can_deliver"]:
        return {"status": "DISABLED", "provider_sid": None, "error": "Gateway configuration is incomplete or delivery is disabled."}
    account = os.environ["TWILIO_ACCOUNT_SID"].strip()
    payload = {"To": phone, "From": os.environ.get("TWILIO_FROM_NUMBER", ""), "StatusCallback": callback_url}
    if channel == "whatsapp":
        sender = os.environ["TWILIO_WHATSAPP_FROM"].removeprefix("whatsapp:")
        payload.update(To="whatsapp:" + phone, From="whatsapp:" + sender,
            ContentSid=os.environ["TWILIO_WHATSAPP_CONTENT_SID"], ContentVariables=json.dumps(variables))
    else:
        payload["Body"] = message
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(f"https://api.twilio.com/2010-04-01/Accounts/{account}/Messages.json",
                auth=(account, os.environ["TWILIO_AUTH_TOKEN"]), data=payload)
        if response.status_code in (200, 201) and response.json().get("sid"):
            return {"status": "ACCEPTED", "provider_sid": response.json()["sid"], "error": None}
        return {"status": "FAILED", "provider_sid": None, "error": f"Provider rejected request (HTTP {response.status_code})."}
    except (httpx.HTTPError, ValueError):
        # A timeout may occur after acceptance. Do not automatically resend and risk duplication.
        return {"status": "UNKNOWN", "provider_sid": None, "error": "Provider outcome unknown; check the provider console before retrying."}


async def evaluate_region(db, area_id: str):
    profile = MUNICIPAL_WARD_REGISTRY[area_id]
    forecast = await generate_health_impact_forecast(profile["latitude"], profile["longitude"], area_id=area_id, include_day_five=True)
    if forecast["forecast_source_classification"]["fallback_active"]:
        return {"area_id": area_id, "status": "WEATHER_UNAVAILABLE", "dispatch_count": 0}
    severe = [d for d in forecast["forecast_days"] if d.get("is_real_hourly") and
              d.get("biometeorological_risk_level", d["thermal_risk_level"]) in ("HIGH", "EXTREME")]
    if not severe:
        return {"area_id": area_id, "status": "NO_ALERT", "dispatch_count": 0}
    # Choose the earliest actionable day; alerts are based on physical thermal strain, not synthetic mortality.
    day = severe[0]
    risk = day.get("biometeorological_risk_level", day["thermal_risk_level"])
    action = "Plan shaded breaks, drinking water and cooler work hours. Check local heat action advisories."
    message = f"ThermoShield: {risk} heat forecast for {profile['name']} on {day['date']}. Estimated WBGT {day['estimated_wbgt_c']:.1f}C. {action}"
    variables = {"1": profile["name"], "2": risk, "3": day["date"], "4": action}
    recipients = db.query(RegionalSubscription, User).join(User, User.id == RegionalSubscription.user_id).filter(
        RegionalSubscription.area_id == area_id, RegionalSubscription.consent_at.isnot(None),
        User.account_status == "APPROVED").all()
    dispatched = 0
    for subscription, user in recipients:
        try:
            phone = normalize_phone(user.phone_number)
        except ValueError:
            continue
        for channel in ("sms", "whatsapp"):
            if not getattr(subscription, channel + "_enabled"):
                continue
            mode = delivery_mode()
            # Disabled channels create no deduplication claim, so fixing configuration permits the next evaluation.
            if channel_status(channel)["status"] == "DISABLED":
                continue
            fingerprint = hashlib.sha256(f"{subscription.id}:{channel}:{day['date']}:{risk}:{mode}".encode()).hexdigest()
            if db.query(RegionalDelivery.id).filter_by(fingerprint=fingerprint).first():
                continue
            recent = db.query(RegionalDelivery).filter(RegionalDelivery.subscription_id == subscription.id,
                RegionalDelivery.channel == channel, RegionalDelivery.created_at > datetime.utcnow() - timedelta(hours=1)
            ).order_by(RegionalDelivery.id.desc()).first()
            if recent and (risk != "EXTREME" or recent.risk_level == "EXTREME"):
                continue
            delivery = RegionalDelivery(subscription_id=subscription.id, area_id=area_id, channel=channel,
                fingerprint=fingerprint, risk_level=risk, forecast_date=day["date"], message=message)
            db.add(delivery)
            try:
                db.commit()  # Unique claim is persisted BEFORE any external side effect.
            except IntegrityError:
                db.rollback()
                continue
            callback_base = os.getenv("TWILIO_STATUS_CALLBACK_URL", "").rstrip("/")
            callback_url = f"{callback_base}?delivery_id={delivery.id}"
            result = await send_channel(channel, phone, message, variables, callback_url)
            # A receipt may arrive before this request returns. Preserve advanced receipt status.
            db.refresh(delivery)
            if delivery.status == "PENDING":
                delivery.status = result["status"]
            delivery.provider_sid = delivery.provider_sid or result["provider_sid"]
            delivery.error = delivery.error or result["error"]
            db.commit()
            dispatched += 1
    return {"area_id": area_id, "status": "EVALUATED", "dispatch_count": dispatched,
            "forecast_date": day["date"], "risk_level": risk}


async def evaluate_subscribed_regions(db):
    if os.getenv("ENABLE_REGIONAL_DISPATCH", "false").lower() != "true":
        return []
    active = db.query(RegionalSubscription.area_id).filter(
        RegionalSubscription.consent_at.isnot(None),
        (RegionalSubscription.sms_enabled.is_(True) | RegionalSubscription.whatsapp_enabled.is_(True))
    ).distinct().all()
    results = []
    for (area_id,) in active:
        if area_id in MUNICIPAL_WARD_REGISTRY:
            try:
                results.append(await evaluate_region(db, area_id))
            except Exception:
                db.rollback()
                results.append({"area_id": area_id, "status": "EVALUATION_FAILED"})
    return results
