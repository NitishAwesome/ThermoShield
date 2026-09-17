import os
import time
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass
from pathlib import Path
import httpx
from dotenv import load_dotenv

logger = logging.getLogger(__name__)


def _load_env_credentials():
    """Dynamically load environment variables from root and backend .env files."""
    root_env = Path(__file__).resolve().parent.parent.parent.parent / ".env"
    if root_env.exists():
        load_dotenv(root_env, override=False)
    backend_env = Path(__file__).resolve().parent.parent.parent / ".env"
    if backend_env.exists():
        load_dotenv(backend_env, override=False)


@dataclass
class SMSResult:
    success: bool
    status: str       # "SIMULATED", "ACCEPTED", "FAILED", "SKIPPED"
    mode: str         # "DEMO", "LIVE"
    provider: str     # "demo", "twilio"
    message: str
    recipient: str
    message_id: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "status": self.status,
            "mode": self.mode,
            "provider": self.provider,
            "message": self.message,
            "recipient": self.recipient,
            "message_id": self.message_id,
            "error": self.error,
        }


class SMSProvider(ABC):
    @abstractmethod
    async def send_sms(self, phone_number: str, message: str) -> SMSResult:
        """Dispatches an SMS alert to the target phone number."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Returns the operational status and metadata for this provider."""
        pass


class DemoSMSProvider(SMSProvider):
    """
    Simulation SMS provider for local development, judging demonstrations,
    and fallback operation when upstream cellular gateway credentials are unset.
    
    IMPORTANT: Per SIH truthfulness guidelines, this provider ALWAYS returns status='SIMULATED'
    and mode='DEMO'. It NEVER deceptively claims delivery as 'SENT'.
    """

    async def send_sms(self, phone_number: str, message: str) -> SMSResult:
        clean_phone = (phone_number or "").strip()
        sim_id = f"SIM-SMS-{int(time.time() * 1000)}"

        print("\n================= THERMOSHIELD SMS (SIMULATED) =================")
        print(f"MODE:      DEMO / SIMULATION (No live cellular gateway connected)")
        print(f"TO:        {clean_phone}")
        print(f"MSG ID:    {sim_id}")
        print(f"PAYLOAD:\n{message}")
        print("=================================================================\n")

        logger.info(
            f"[SMS DEMO SIMULATION] Dispatched simulated alert to {clean_phone} (ID: {sim_id})"
        )

        return SMSResult(
            success=True,
            status="SIMULATED",
            mode="DEMO",
            provider="demo",
            message=message,
            recipient=clean_phone,
            message_id=sim_id,
            error=None
        )

    def get_status(self) -> Dict[str, Any]:
        return {
            "mode": "DEMO",
            "provider": "demo",
            "status": "DEMO_SIMULATION",
            "display_status": "Demo Simulation Mode",
            "from_number": "Console / Stdout",
            "can_deliver": False,
            "channel": "SMS Gateway (Simulated)"
        }


class TwilioSMSProvider(SMSProvider):
    """
    Live SMS delivery adapter via Twilio REST API.
    Dispatches real SMS to regional recipients when credentials are provided.
    """

    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self.account_sid = account_sid.strip()
        self.auth_token = auth_token.strip()
        self.from_number = from_number.strip()
        self.api_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"

    async def send_sms(self, phone_number: str, message: str) -> SMSResult:
        clean_phone = (phone_number or "").strip()
        if not clean_phone:
            return SMSResult(
                success=False,
                status="SKIPPED",
                mode="LIVE",
                provider="twilio",
                message=message,
                recipient=clean_phone,
                error="Invalid or empty recipient phone number."
            )

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    self.api_url,
                    auth=(self.account_sid, self.auth_token),
                    data={
                        "To": clean_phone,
                        "From": self.from_number,
                        "Body": message,
                    },
                )

                if response.status_code in (200, 201):
                    data = response.json()
                    message_sid = data.get("sid", f"TW-{int(time.time())}")
                    logger.info(f"[SMS LIVE] Successfully queued Twilio SMS to {clean_phone} (SID: {message_sid})")
                    return SMSResult(
                        success=True,
                        status="ACCEPTED",
                        mode="LIVE",
                        provider="twilio",
                        message=message,
                        recipient=clean_phone,
                        message_id=message_sid,
                        error=None
                    )
                else:
                    error_detail = response.text
                    try:
                        err_json = response.json()
                        error_detail = err_json.get("message") or err_json.get("detail") or response.text
                    except Exception:
                        pass

                    logger.error(f"[SMS LIVE ERROR] Twilio returned {response.status_code}: {error_detail}")
                    return SMSResult(
                        success=False,
                        status="FAILED",
                        mode="LIVE",
                        provider="twilio",
                        message=message,
                        recipient=clean_phone,
                        message_id=None,
                        error=f"Twilio API Error ({response.status_code}): {error_detail}"
                    )

        except Exception as exc:
            logger.error(f"[SMS LIVE EXCEPTION] Failed to dispatch Twilio SMS to {clean_phone}: {exc}")
            return SMSResult(
                success=False,
                status="FAILED",
                mode="LIVE",
                provider="twilio",
                message=message,
                recipient=clean_phone,
                message_id=None,
                error=str(exc)
            )

    def get_status(self) -> Dict[str, Any]:
        # Mask the from_number for security in API outputs (e.g. +1*****1234)
        masked = self.from_number
        if len(self.from_number) > 5:
            masked = self.from_number[:2] + "*****" + self.from_number[-3:]

        return {
            "mode": "LIVE",
            "provider": "twilio",
            "status": "OPERATIONAL",
            "display_status": "Operational (Twilio Live SMS)",
            "from_number": masked,
            "can_deliver": True,
            "channel": "SMS Gateway (Twilio Live)"
        }


def get_sms_provider() -> SMSProvider:
    """
    Factory function returning the active SMSProvider.
    Uses Twilio if credentials are found in the environment; otherwise defaults to DemoSMSProvider.
    """
    if (os.getenv("ENVIRONMENT", "").lower() in ("test", "testing")
            or os.getenv("REGIONAL_DELIVERY_MODE", "demo").lower() != "live"):
        return DemoSMSProvider()
    _load_env_credentials()

    account_sid = (os.getenv("TWILIO_ACCOUNT_SID") or "").strip()
    auth_token = (os.getenv("TWILIO_AUTH_TOKEN") or "").strip()
    from_number = (os.getenv("TWILIO_FROM_NUMBER") or "").strip()

    if account_sid and auth_token and from_number:
        return TwilioSMSProvider(account_sid, auth_token, from_number)

    return DemoSMSProvider()


def get_sms_delivery_status() -> Dict[str, Any]:
    """Returns the operational status of the SMS dispatch gateway."""
    provider = get_sms_provider()
    return provider.get_status()


async def send_sms(phone_number: str, message: str) -> Dict[str, Any]:
    """
    Dispatches SMS alert through the active provider (live Twilio or demo simulation).
    Returns a dictionary matching the SMSResult structure for full caller compatibility.
    """
    provider = get_sms_provider()
    result = await provider.send_sms(phone_number, message)
    return result.to_dict()
