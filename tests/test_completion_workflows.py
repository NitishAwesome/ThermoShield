"""Offline regression tests for the health-data and regional messaging workflows."""
import asyncio
import csv
import io
import json
from datetime import date, datetime, timedelta
from urllib.parse import urlencode, parse_qs

import httpx
import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from twilio.request_validator import RequestValidator

from app.auth.router import get_current_user
from app.database.connection import Base, get_db
from app.database.models import User, HealthDataset, RegionalSubscription, RegionalDelivery
from app.routers import health_data, regional_alerts
from app.services import health_outcomes as outcomes, regional_alerts as dispatch


def records(days=120):
    rng = np.random.default_rng(26083)
    rows = []
    for i in range(days):
        temp = 30 + (i % 12)
        rows.append({"date": (date.today() - timedelta(days=days - i)).isoformat(),
            "population": 100000, "elderly_fraction": 0.12, "outdoor_worker_fraction": 0.28,
            "temperature_c": temp, "min_temperature_c": temp - 8, "humidity_pct": 60,
            "wind_speed_ms": 2, "solar_radiation_wm2": 700,
            "deaths": int(rng.poisson(3 + max(0, temp - 34))),
            "admissions": int(rng.poisson(8 + max(0, temp - 30) * 3))})
    return rows


def as_csv(rows):
    stream = io.StringIO()
    writer = csv.DictWriter(stream, fieldnames=outcomes.COLUMNS)
    writer.writeheader(); writer.writerows(rows)
    return stream.getvalue()


def forecast_payload(fallback=False):
    return {"forecast_source_classification": {"fallback_active": fallback}, "forecast_days": [
        {"date": (date.today() + timedelta(days=i)).isoformat(), "day_label": f"Day {i}",
         "temp_min_c": 29, "peak_hour_humidity": 60, "estimated_wbgt_c": 32,
         "thermal_risk_level": "HIGH", "biometeorological_risk_level": "HIGH", "is_real_hourly": True, "is_real_daily": True}
        for i in range(6)]}


def test_csv_accepts_aggregate_records_and_rejects_duplicate_dates():
    rows = records()
    assert outcomes.parse_records(as_csv(rows)) == rows
    with pytest.raises(ValueError, match="Duplicate"):
        outcomes.parse_records(as_csv(rows + [rows[0]]))


@pytest.mark.parametrize("field,value", [("deaths", -1), ("population", 0), ("humidity_pct", float('nan')),
    ("outdoor_worker_fraction", 32), ("date", date.today().isoformat()), ("admissions", "")])
def test_rejects_invalid_counts_dates_and_units(field, value):
    rows = records(1); rows[0][field] = value
    with pytest.raises(ValueError, match="Invalid record"):
        outcomes.parse_records(as_csv(rows))


def test_rejects_patient_identifier_columns():
    with pytest.raises(ValueError, match="exactly"):
        outcomes.parse_records(as_csv(records()).replace("date,", "patient_name,date,"))


def test_train_requires_sufficient_consecutive_history():
    with pytest.raises(ValueError, match="90"):
        outcomes.train_model(records(20))
    rows = records(); del rows[10]
    with pytest.raises(ValueError, match="consecutive"):
        outcomes.train_model(rows)


def test_temporal_holdout_is_never_used_for_training():
    rows = records()
    first, report = outcomes.train_model(rows)
    assert report["train_end"] < report["holdout_start"]
    assert report["operational_forecast_validated"] is False
    for row in rows[report["train_days"]:]:
        row["deaths"] += 100
    second, _ = outcomes.train_model(rows)
    assert first["outcomes"]["deaths"]["regression"] == second["outcomes"]["deaths"]["regression"]
    assert first["outcomes"]["deaths"]["error_radius"] != second["outcomes"]["deaths"]["error_radius"]


def test_sparse_mortality_is_unavailable_and_population_scales_counts():
    rows = records()
    for row in rows: row["deaths"] = 0
    model, report = outcomes.train_model(rows)
    assert report["metrics"]["deaths"]["status"] == "INSUFFICIENT_EVENTS"
    future = forecast_payload()["forecast_days"][1:]
    small = outcomes.forecast_outcomes(model, future)
    model["last_demographics"]["population"] *= 2
    large = outcomes.forecast_outcomes(model, future)
    assert small[0]["mortality_risk_index"] is None
    assert large[0]["admissions"]["expected"] == pytest.approx(small[0]["admissions"]["expected"] * 2, abs=0.02)


def test_five_day_heat_action_preparation():
    from app.services.heat_action_plan import evaluate_heat_action_plan
    result = evaluate_heat_action_plan(area_id="ward_a", temperature_c=27, humidity_pct=40,
        wbgt_c=22, vulnerability_score=20, risk_level="LOW", risk_score=10,
        forecast_max_risk="HIGH", forecast_lead_time_hours=120)
    assert result.trigger_state == "PREPARE_WITHIN_5_DAYS"
    assert {a.category for a in result.recommended_actions} >= {"COOLING", "HEALTH_PREPAREDNESS", "INFRASTRUCTURE"}


def test_only_complete_matching_hourly_inputs_are_grounded():
    from app.services.health_forecast import _extract_daily_peak_from_hourly
    hourly = {"time": [f"2026-09-18T{h:02d}:00" for h in range(24)],
        "temperature": [35] * 24, "humidity": [60] * 24, "wind_speed": [2] * 24,
        "shortwave_radiation": [600] * 24, "is_day": [1] * 24,
        "apparent_temperature": [None] * 24}
    assert _extract_daily_peak_from_hourly(hourly, 0, "2026-09-18")["is_real_hourly"] is True
    assert _extract_daily_peak_from_hourly(hourly, 0, "2026-09-19")["is_real_hourly"] is False
    hourly["humidity"][0] = None
    assert _extract_daily_peak_from_hourly(hourly, 0, "2026-09-18")["is_real_hourly"] is False


def test_incomplete_daily_weather_is_flagged_without_crashing(monkeypatch):
    from app.services import health_forecast
    async def incomplete(*args):
        return {"forecast": {"dates": [date.today().isoformat()], "max_temperature": [None],
            "min_temperature": [float("nan")], "uv_index_max": [None], "apparent_temperature_max": [None]}}
    monkeypatch.setattr(health_forecast, "get_weather", incomplete)
    result = asyncio.run(health_forecast.generate_health_impact_forecast(19, 73))
    assert result["forecast_days"][0]["is_real_daily"] is False
    assert result["forecast_days"][0]["is_real_hourly"] is False


@pytest.fixture
def api_fixture(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    db = Session()
    user = User(name="Test officer", email="officer@example.org", phone_number="+919811223344",
        role="official", account_status="APPROVED", jurisdiction_id="IN-MH-MCGM",
        permissions="ANALYZE_RISK,SEND_PUBLIC_ADVISORY", password_hash="test-only")
    db.add(user); db.commit()
    application = FastAPI()
    application.include_router(health_data.router); application.include_router(regional_alerts.router)
    application.dependency_overrides[get_current_user] = lambda: user
    application.dependency_overrides[get_db] = lambda: db
    async def mock_forecast(*args, **kwargs): return forecast_payload()
    monkeypatch.setattr(health_data, "generate_health_impact_forecast", mock_forecast)
    monkeypatch.setattr(dispatch, "generate_health_impact_forecast", mock_forecast)
    with TestClient(application) as client:
        yield client, db, user, application
    db.close(); engine.dispose()


def upload(client, kind="observed"):
    return client.post("/api/health-data/datasets", json={"area_id": "ward_a", "source_name": "Test fixture",
        "source_url": "https://example.org/test-data", "data_kind": kind, "outcome_scope": "all_cause",
        "csv_text": as_csv(records())})


def test_import_train_and_five_day_forecast_with_provenance(api_fixture):
    client, _, _, _ = api_fixture
    response = upload(client); assert response.status_code == 201, response.text
    assert upload(client).status_code == 409
    dataset_id = response.json()["id"]
    trained = client.post(f"/api/health-data/datasets/{dataset_id}/train")
    assert trained.status_code == 200, trained.text
    result = client.get("/api/health-data/outlook/ward_a").json()
    assert result["status"] == "EXPERIMENTAL_MODEL"
    assert result["dataset"]["source_name"] == "Test fixture"
    assert result["forecast_days"][0]["date"] == (date.today() + timedelta(days=1)).isoformat()
    assert result["forecast_days"][-1]["date"] == (date.today() + timedelta(days=5)).isoformat()
    assert all(0 <= d["mortality_risk_index"] <= 100 for d in result["forecast_days"])


def test_demo_dataset_requires_explicit_selection(api_fixture):
    client, _, _, _ = api_fixture
    dataset_id = upload(client, "synthetic_demo").json()["id"]
    client.post(f"/api/health-data/datasets/{dataset_id}/train")
    assert client.get("/api/health-data/outlook/ward_a").json()["status"] == "DATA_REQUIRED"
    assert client.get(f"/api/health-data/outlook/ward_a?dataset_id={dataset_id}").json()["status"] == "DEMO_MODEL"


def test_permissions_jurisdiction_and_missing_data(api_fixture):
    client, _, user, application = api_fixture
    assert client.get("/api/health-data/outlook/ward_a").json()["forecast_days"] == []
    user.jurisdiction_id = "IN-MH-MCGM-KE"
    assert upload(client).status_code == 403
    user.permissions = ""
    assert client.get("/api/health-data/areas").status_code == 403
    application.dependency_overrides.pop(get_current_user)
    assert client.get("/api/health-data/areas").status_code == 401


def test_weather_fallback_suppresses_count_predictions_and_dispatch(api_fixture, monkeypatch):
    client, _, _, _ = api_fixture
    dataset_id = upload(client).json()["id"]
    client.post(f"/api/health-data/datasets/{dataset_id}/train")
    async def fallback(*args, **kwargs): return forecast_payload(True)
    monkeypatch.setattr(health_data, "generate_health_impact_forecast", fallback)
    monkeypatch.setattr(dispatch, "generate_health_impact_forecast", fallback)
    assert client.get("/api/health-data/outlook/ward_a").json()["status"] == "WEATHER_UNAVAILABLE"
    assert client.post("/api/regional-alerts/evaluate/ward_a").json()["dispatch_count"] == 0


def test_consent_region_scope_deduplication_and_unsubscribe(api_fixture):
    client, db, user, _ = api_fixture
    assert client.put("/api/regional-alerts/subscriptions/ward_a", json={"sms_enabled": True}).status_code == 422
    assert client.put("/api/regional-alerts/subscriptions/ward_a", json={"sms_enabled": True, "whatsapp_enabled": True, "consent": True}).status_code == 200
    assert client.post("/api/regional-alerts/evaluate/ward_b").json()["dispatch_count"] == 0
    assert client.post("/api/regional-alerts/evaluate/ward_a").json()["dispatch_count"] == 2
    assert client.post("/api/regional-alerts/evaluate/ward_a").json()["dispatch_count"] == 0
    history = client.get("/api/regional-alerts/deliveries?area_id=ward_a").json()["deliveries"]
    assert all(d["status"] == "SIMULATED" for d in history)
    assert len(history) == 2
    client.put("/api/regional-alerts/subscriptions/ward_a", json={})
    assert db.query(RegionalSubscription).first().consent_at is None


def test_whatsapp_template_payload_and_acceptance(monkeypatch):
    for key, value in {"TWILIO_ACCOUNT_SID": "ACtest", "TWILIO_AUTH_TOKEN": "test-token",
        "TWILIO_WHATSAPP_FROM": "+15551234567", "TWILIO_WHATSAPP_CONTENT_SID": "HXtest",
        "TWILIO_STATUS_CALLBACK_URL": "https://example.org/api/regional-alerts/twilio/status"}.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setattr(dispatch, "delivery_mode", lambda: "live")
    def handler(request):
        body = parse_qs(request.content.decode())
        assert body["To"] == ["whatsapp:+919811223344"]
        assert body["ContentSid"] == ["HXtest"]
        assert "Body" not in body
        assert json.loads(body["ContentVariables"][0])["2"] == "HIGH"
        return httpx.Response(201, json={"sid": "SMaccepted"})
    original = httpx.AsyncClient
    monkeypatch.setattr(dispatch.httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    result = asyncio.run(dispatch.send_channel("whatsapp", "+919811223344", "ignored", {"2": "HIGH"}, "https://example.org/receipt"))
    assert result["status"] == "ACCEPTED"


def test_signed_receipts_and_out_of_order_events(api_fixture, monkeypatch):
    client, db, user, _ = api_fixture
    subscription = RegionalSubscription(user_id=user.id, area_id="ward_a", consent_at=datetime.utcnow(), sms_enabled=True)
    db.add(subscription); db.commit()
    row = RegionalDelivery(subscription_id=subscription.id, area_id="ward_a", channel="sms", fingerprint="unique",
        risk_level="HIGH", forecast_date=date.today().isoformat(), message="test", status="ACCEPTED", provider_sid="SMtest")
    db.add(row); db.commit()
    base = "https://example.org/api/regional-alerts/twilio/status"
    monkeypatch.setenv("TWILIO_STATUS_CALLBACK_URL", base)
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "ACtest")
    path = f"/api/regional-alerts/twilio/status?delivery_id={row.id}"
    data = {"AccountSid": "ACtest", "MessageSid": "SMtest", "MessageStatus": "delivered"}
    assert client.post(path, content=urlencode(data)).status_code == 403
    for status in ("delivered", "sent"):
        data["MessageStatus"] = status
        signature = RequestValidator("test-token").compute_signature(f"{base}?delivery_id={row.id}", data)
        response = client.post(path, content=urlencode(data), headers={"X-Twilio-Signature": signature, "Content-Type": "application/x-www-form-urlencoded"})
        assert response.status_code == 200, response.text
    db.refresh(row)
    assert row.status == "DELIVERED"
