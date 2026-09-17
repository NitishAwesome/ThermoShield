import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.sms import get_sms_provider, DemoSMSProvider, get_sms_delivery_status

client = TestClient(app)


def test_sms_provider_demo_truthfulness():
    """Verify demo SMS provider returns status='SIMULATED' and never falsely claims 'SENT'."""
    provider = get_sms_provider()
    # In test environment, Twilio credentials are not set, so it must be DemoSMSProvider
    assert isinstance(provider, DemoSMSProvider)

    status_meta = provider.get_status()
    assert status_meta["mode"] == "DEMO"
    assert status_meta["status"] == "DEMO_SIMULATION"
    assert status_meta["can_deliver"] is False


@pytest.mark.anyio
async def test_demo_sms_dispatch():
    provider = DemoSMSProvider()
    result = await provider.send_sms("+919876543210", "Test heatwave alert payload")
    assert result.success is True
    assert result.status == "SIMULATED"
    assert result.mode == "DEMO"
    assert result.provider == "demo"
    assert result.recipient == "+919876543210"
    assert result.message_id is not None
    assert result.message_id.startswith("SIM-SMS-")


def test_alerts_delivery_status_endpoint():
    """Verify GET /alerts/delivery-status returns multi-channel truthfulness."""
    response = client.get("/alerts/delivery-status")
    assert response.status_code == 200
    data = response.json()

    assert "sms" in data
    assert "email" in data
    assert "whatsapp" in data

    assert data["sms"]["mode"] in ["DEMO", "LIVE"]
    assert data["whatsapp"]["status"] == "SIMULATED"
    assert data["whatsapp"]["can_deliver"] is False


def test_send_test_sms_endpoint_demo():
    """Verify POST /alerts/send-test-sms runs truthful simulation."""
    response = client.post(
        "/alerts/send-test-sms",
        json={"phone_number": "+919811223344", "location_name": "Mumbai Ward A"}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["status"] == "SIMULATED"
    assert data["mode"] == "DEMO"
    assert data["provider"] == "demo"
    assert data["recipient"] == "+919811223344"
    assert data["message_id"] is not None


def test_send_test_sms_endpoint_invalid_phone():
    """Verify POST /alerts/send-test-sms validates phone number."""
    response = client.post(
        "/alerts/send-test-sms",
        json={"phone_number": "123"}
    )
    assert response.status_code == 400


def test_live_test_sms_requires_signed_in_owner(monkeypatch):
    from app import main
    from types import SimpleNamespace
    monkeypatch.setattr(main, "get_sms_delivery_status", lambda: {"can_deliver": True})
    payload = {"phone_number": "+919811223344"}
    assert client.post("/alerts/send-test-sms", json=payload).status_code == 401
    app.dependency_overrides[main.get_current_user_optional] = lambda: SimpleNamespace(
        account_status="APPROVED", phone_number="+919899998888")
    try:
        assert client.post("/alerts/send-test-sms", json=payload).status_code == 403
    finally:
        app.dependency_overrides.pop(main.get_current_user_optional)
