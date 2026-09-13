"""
ThermoShield Alert Decision & State Transition Engine
Handles:
1. Meaningful risk transition detection (MODERATE -> HIGH, HIGH -> EXTREME, WBGT threshold breach)
2. Anti-spam alert fingerprinting and intelligent cooldown guards (60m steady cooldown, immediate bypass on critical escalation)
3. User notification preference evaluation
4. Proactive automatic early-warning dispatch to registered citizens
"""

import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.database.models import User, Location, Alert
from app.services.email import send_notification_email
from app.services.email_templates import generate_action_first_alert_html

logger = logging.getLogger(__name__)

# In-memory alert state registry: location_id -> { "last_risk_level": str, "last_wbgt": float, "last_evaluated": float }
_LOCATION_STATE_REGISTRY: Dict[str, Dict[str, Any]] = {}

# In-memory citizen alert cooldown registry: fingerprint -> float (timestamp of last dispatch)
_CITIZEN_COOLDOWN_REGISTRY: Dict[str, float] = {}

# Recent automated dispatches audit log (kept in-memory for live dashboard feed)
_RECENT_DISPATCH_LOG: List[Dict[str, Any]] = []
MAX_DISPATCH_LOG_ENTRIES = 50

# Cooldown constants
DEFAULT_STEADY_COOLDOWN_SECONDS = 3600  # 60 minutes for identical severe condition
MIN_COOLDOWN_BETWEEN_ANY_ALERT_SECONDS = 900  # 15 minutes minimum to prevent mailbox flooding


def should_create_alert(risk_level: str) -> bool:
    """Returns True if the calculated risk warrants an alert (HIGH or EXTREME)."""
    if not risk_level:
        return False
    return risk_level.upper().strip() in ["HIGH", "EXTREME"]


def get_alert_priority(risk_level: str) -> str:
    """Returns priority classification for civic alerts."""
    lvl = (risk_level or "LOW").upper().strip()
    if lvl == "EXTREME":
        return "CRITICAL"
    if lvl == "HIGH":
        return "HIGH"
    if lvl == "MODERATE":
        return "MEDIUM"
    return "LOW"


def get_engine_status_summary() -> Dict[str, Any]:
    """Returns engine telemetry for diagnostics and frontend inspection."""
    return {
        "engine_active": True,
        "monitored_locations_tracked": len(_LOCATION_STATE_REGISTRY),
        "cooldown_records_active": len(_CITIZEN_COOLDOWN_REGISTRY),
        "recent_dispatches_count": len(_RECENT_DISPATCH_LOG),
        "recent_dispatches": _RECENT_DISPATCH_LOG[-10:] if _RECENT_DISPATCH_LOG else []
    }


def evaluate_risk_transition(
    location_key: str,
    current_risk_level: str,
    current_wbgt: Optional[float] = None
) -> Tuple[bool, str]:
    """
    Evaluates whether the current risk represents a meaningful condition change.
    Returns (should_trigger, transition_description).
    """
    curr_lvl = (current_risk_level or "LOW").upper().strip()
    prev_state = _LOCATION_STATE_REGISTRY.get(location_key)

    if not prev_state:
        # First evaluation for this location
        _LOCATION_STATE_REGISTRY[location_key] = {
            "last_risk_level": curr_lvl,
            "last_wbgt": current_wbgt,
            "last_evaluated": time.time()
        }
        if curr_lvl in ["HIGH", "EXTREME"]:
            return True, f"Initial Severe Condition Detected ({curr_lvl})"
        return False, "Normal Baseline"

    prev_lvl = prev_state.get("last_risk_level", "LOW").upper()
    prev_wbgt = prev_state.get("last_wbgt")

    # Update state for next cycle
    _LOCATION_STATE_REGISTRY[location_key] = {
        "last_risk_level": curr_lvl,
        "last_wbgt": current_wbgt,
        "last_evaluated": time.time()
    }

    # 1. Critical Escalation: HIGH -> EXTREME (Emergency Priority)
    if prev_lvl in ["LOW", "MODERATE", "HIGH"] and curr_lvl == "EXTREME":
        return True, f"CRITICAL ESCALATION: {prev_lvl} → EXTREME"

    # 2. Severe Onset: LOW/MODERATE -> HIGH
    if prev_lvl in ["LOW", "MODERATE"] and curr_lvl == "HIGH":
        return True, f"RISK ESCALATION: {prev_lvl} → HIGH"

    # 3. Hazardous WBGT Spike crossing ISO 7243 thresholds (>30°C or >32°C)
    if current_wbgt is not None and prev_wbgt is not None:
        if prev_wbgt < 32.0 and current_wbgt >= 32.0:
            return True, f"HAZARDOUS WBGT SPIKE: {prev_wbgt:.1f}°C → {current_wbgt:.1f}°C (Crossed Extreme Limit)"
        if prev_wbgt < 30.0 and current_wbgt >= 30.0 and curr_lvl in ["HIGH", "EXTREME"]:
            return True, f"WBGT WARNING: Crossed 30.0°C Threshold"

    # 4. Sustained HIGH/EXTREME condition
    if curr_lvl in ["HIGH", "EXTREME"]:
        return True, f"SUSTAINED {curr_lvl} HEAT CONDITION"

    return False, "No critical transition"


def check_anti_spam_cooldown(
    citizen_email: str,
    location_name: str,
    risk_level: str,
    transition_description: str
) -> Tuple[bool, str]:
    """
    Checks anti-spam cooldown rules.
    - Escalations to EXTREME bypass regular 60m cooldown (safety-first rule).
    - Identical steady severe alerts enforce 60m cooldown.
    Returns (is_allowed, reason).
    """
    now = time.time()
    clean_email = citizen_email.strip().lower()
    fingerprint = f"{clean_email}::{location_name}::{risk_level}"

    last_dispatched = _CITIZEN_COOLDOWN_REGISTRY.get(fingerprint, 0)
    elapsed = now - last_dispatched

    # CRITICAL ESCALATION RULE: Always bypass 60m cooldown if escalating to EXTREME
    is_extreme_escalation = "CRITICAL ESCALATION" in transition_description or (
        risk_level == "EXTREME" and elapsed >= MIN_COOLDOWN_BETWEEN_ANY_ALERT_SECONDS
    )

    if is_extreme_escalation and elapsed >= MIN_COOLDOWN_BETWEEN_ANY_ALERT_SECONDS:
        _CITIZEN_COOLDOWN_REGISTRY[fingerprint] = now
        return True, "Critical escalation bypasses standard cooldown"

    # Standard steady cooldown check
    if elapsed < DEFAULT_STEADY_COOLDOWN_SECONDS:
        remaining_mins = int((DEFAULT_STEADY_COOLDOWN_SECONDS - elapsed) / 60)
        return False, f"Suppressed by anti-spam cooldown ({remaining_mins}m remaining)"

    # Cooldown expired, allow dispatch and update fingerprint timestamp
    _CITIZEN_COOLDOWN_REGISTRY[fingerprint] = now
    return True, "Cooldown clear"


def check_citizen_preferences(citizen: User, risk_level: str) -> bool:
    """
    Checks if citizen has opted into this category of heat alerts.
    By default in ThermoShield, registered citizens are opted in to emergency protection.
    """
    # If the user object has explicit preferences in future, inspect them here
    # Role-based check: citizens and responders always receive severe heat alerts
    return True


def dispatch_automatic_early_warning(
    db: Session,
    location_name: str,
    location_id: Optional[int],
    risk_level: str,
    risk_score: float,
    temperature_c: float,
    wbgt_c: Optional[float] = None,
    heat_index_c: Optional[float] = None,
    interventions: Optional[List[str]] = None,
    custom_note: Optional[str] = None,
    force_test_recipient: Optional[str] = None
) -> Dict[str, Any]:
    """
    Core Automatic Early-Warning Dispatcher.
    Executes:
    1. Risk transition evaluation
    2. Eligible citizen discovery
    3. Anti-spam / Cooldown verification per citizen
    4. Action-first RFC 5322 HTML email generation
    5. Real-time network dispatch via SMTP
    6. Database Alert persistence & audit logging
    """
    location_key = f"{location_name}::{location_id or 0}"
    should_trigger, transition_type = evaluate_risk_transition(
        location_key=location_key,
        current_risk_level=risk_level,
        current_wbgt=wbgt_c
    )

    if not should_trigger and not force_test_recipient:
        return {
            "status": "skipped",
            "reason": f"No trigger threshold met for {location_name} (Level: {risk_level})",
            "transition": transition_type,
            "dispatched_count": 0
        }

    # Find recipients
    citizens_to_evaluate: List[Tuple[str, Optional[int]]] = []

    if force_test_recipient and "@" in force_test_recipient:
        citizens_to_evaluate.append((force_test_recipient.strip().lower(), None))
    else:
        # Load all registered citizens in the system
        try:
            db_citizens = db.query(User).filter(User.email.isnot(None), User.email.like("%@%")).all()
            for c in db_citizens:
                if check_citizen_preferences(c, risk_level):
                    citizens_to_evaluate.append((c.email.strip().lower(), c.id))
        except Exception as e:
            logger.warning(f"Failed to query citizens for automatic dispatch: {e}")

    if not citizens_to_evaluate:
        return {
            "status": "skipped",
            "reason": "No registered citizens found to receive alerts.",
            "dispatched_count": 0
        }

    dispatched = []
    skipped = []

    for citizen_email, user_id in citizens_to_evaluate:
        # Check anti-spam cooldown
        is_allowed, cd_reason = check_anti_spam_cooldown(
            citizen_email=citizen_email,
            location_name=location_name,
            risk_level=risk_level,
            transition_description=transition_type
        )

        if not is_allowed and not force_test_recipient:
            skipped.append({"email": citizen_email, "reason": cd_reason})
            continue

        # Generate action-first HTML email
        html_body = generate_action_first_alert_html(
            location_name=location_name,
            risk_level=risk_level,
            risk_score=risk_score,
            temperature_c=temperature_c,
            wbgt_c=wbgt_c,
            heat_index_c=heat_index_c,
            transition_type=transition_type,
            recommended_actions=interventions,
            recipient_email=citizen_email,
            custom_note=custom_note
        )

        subject = f"ThermoShield Alert: {risk_level} Heat Threat in {location_name}"
        plain_body = (
            f"🚨 THERMOSHIELD AUTOMATIC EARLY-WARNING ADVISORY 🚨\n\n"
            f"Location: {location_name}\n"
            f"Risk Level: {risk_level} ({risk_score:.0f}/100)\n"
            f"Air Temp: {temperature_c:.1f}°C"
            + (f" | WBGT: {wbgt_c:.1f}°C" if wbgt_c is not None else "")
            + f"\nEvent: {transition_type}\n\n"
            f"Take immediate hydration and shade precautions. Follow designated civic work-rest cycles.\n\n"
            f"— ThermoShield Automated Citizen Heat Defense Network"
        )

        # Dispatch via SMTP
        send_res = send_notification_email(
            to_email=citizen_email,
            subject=subject,
            body=plain_body,
            html_body=html_body
        )

        # Record in DB if user_id is known
        if user_id and location_id:
            try:
                alert_record = Alert(
                    user_id=user_id,
                    location_id=location_id,
                    risk_level=risk_level,
                    risk_score=risk_score,
                    message=f"{transition_type}: {risk_level} heat in {location_name}",
                    status="SENT" if send_res.get("status") == "success" else "FAILED",
                    reference_id=f"AUTO-{int(time.time())}"
                )
                db.add(alert_record)
                db.commit()
            except Exception as dbe:
                db.rollback()
                logger.warning(f"Could not record automated alert to DB: {dbe}")

        # Audit log entry
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "recipient": citizen_email,
            "location": location_name,
            "risk_level": risk_level,
            "transition": transition_type,
            "status": send_res.get("status"),
            "message": send_res.get("message")
        }
        _RECENT_DISPATCH_LOG.append(audit_entry)
        if len(_RECENT_DISPATCH_LOG) > MAX_DISPATCH_LOG_ENTRIES:
            _RECENT_DISPATCH_LOG.pop(0)

        dispatched.append(audit_entry)

    return {
        "status": "success" if dispatched else "all_cooldown_skipped",
        "transition": transition_type,
        "dispatched_count": len(dispatched),
        "dispatched": dispatched,
        "skipped_count": len(skipped),
        "skipped": skipped
    }