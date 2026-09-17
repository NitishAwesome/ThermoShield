import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.heat_action_plan import (
    evaluate_heat_action_plan,
    get_all_wards_heat_action_overview,
    CATEGORY_COOLING,
    CATEGORY_OUTDOOR_WORK,
    CATEGORY_HYDRATION,
    CATEGORY_HEALTH,
    CATEGORY_INFRASTRUCTURE,
    TRIGGER_ACTION_NOW,
    TRIGGER_PREPARE_24H,
    TRIGGER_PREPARE_3D,
    TRIGGER_BASELINE,
)

client = TestClient(app)


def test_heat_action_plan_extreme_conditions():
    """Verify EXTREME conditions trigger immediate action across all 5 official civic categories."""
    result = evaluate_heat_action_plan(
        area_id="ward_f_south",
        temperature_c=39.0,
        humidity_pct=75.0,
        wbgt_c=33.5,
        vulnerability_score=80.0,
        risk_level="EXTREME",
        risk_score=88.0,
    )

    assert result.trigger_state == TRIGGER_ACTION_NOW
    assert result.risk_level == "EXTREME"
    assert len(result.trigger_reasons) >= 2
    assert any("threshold" in r.lower() or "critical" in r.lower() for r in result.trigger_reasons)

    categories = {action.category for action in result.recommended_actions}
    assert CATEGORY_COOLING in categories
    assert CATEGORY_OUTDOOR_WORK in categories
    assert CATEGORY_HYDRATION in categories
    assert CATEGORY_HEALTH in categories
    assert CATEGORY_INFRASTRUCTURE in categories

    # Verify rule transparency justification is present on all actions
    for act in result.recommended_actions:
        assert act.justification != "", f"Action {act.action} missing rule justification"
        assert len(act.justification) > 15


def test_heat_action_plan_high_conditions():
    """Verify HIGH risk triggers immediate operational review."""
    result = evaluate_heat_action_plan(
        area_id="ward_k_west",
        temperature_c=35.0,
        humidity_pct=60.0,
        wbgt_c=30.2,
        vulnerability_score=50.0,
        risk_level="HIGH",
        risk_score=60.0,
    )
    assert result.trigger_state == TRIGGER_ACTION_NOW
    assert any(a.action == "review_work_restrictions" for a in result.recommended_actions)


def test_heat_action_plan_forecast_24h_trigger():
    """Verify upcoming 24h severe forecast triggers PREPARE_WITHIN_24_HOURS."""
    result = evaluate_heat_action_plan(
        area_id="ward_g_north",
        temperature_c=31.0,
        humidity_pct=50.0,
        wbgt_c=26.5,
        vulnerability_score=85.0,
        risk_level="LOW",
        risk_score=25.0,
        forecast_max_risk="EXTREME",
        forecast_lead_time_hours=18,
    )
    assert result.trigger_state == TRIGGER_PREPARE_24H
    assert any("24 hours" in r or "18 hours" in r for r in result.trigger_reasons)


def test_heat_action_plan_forecast_3d_trigger():
    """Verify upcoming 3-day severe forecast triggers PREPARE_WITHIN_3_DAYS."""
    result = evaluate_heat_action_plan(
        area_id="ward_m_east",
        temperature_c=30.0,
        humidity_pct=50.0,
        wbgt_c=25.0,
        vulnerability_score=75.0,
        risk_level="LOW",
        risk_score=20.0,
        forecast_max_risk="HIGH",
        forecast_lead_time_hours=48,
    )
    assert result.trigger_state == TRIGGER_PREPARE_3D
    assert any("48 to 72 hours" in r for r in result.trigger_reasons)


def test_heat_action_plan_baseline_conditions():
    """Verify normal mild weather stays in baseline monitoring state."""
    result = evaluate_heat_action_plan(
        area_id="ward_a",
        temperature_c=28.0,
        humidity_pct=45.0,
        wbgt_c=23.0,
        vulnerability_score=25.0,
        risk_level="LOW",
        risk_score=15.0,
        forecast_max_risk="LOW",
    )
    assert result.trigger_state == TRIGGER_BASELINE


def test_api_action_plan_endpoints():
    """Test full API surface for Heat Action Plan engine."""
    # 1. GET /api/action-plan/all
    res_all = client.get("/api/action-plan/all")
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert data_all["count"] >= 5
    assert len(data_all["plans"]) >= 5

    # 2. GET /api/action-plan/{area_id}
    res_ward = client.get("/api/action-plan/ward_f_south")
    assert res_ward.status_code == 200
    data_ward = res_ward.json()
    assert data_ward["area_id"] == "ward_f_south"
    assert "recommended_actions" in data_ward
    assert len(data_ward["recommended_actions"]) > 0

    # 3. POST /api/action-plan/evaluate
    eval_payload = {
        "area_id": "custom_zone",
        "area_name": "Special Industrial Zone",
        "temperature_c": 41.0,
        "humidity_pct": 70.0,
        "wbgt_c": 34.0,
        "vulnerability_score": 85.0,
        "risk_level": "EXTREME",
        "risk_score": 92.0
    }
    res_eval = client.post("/api/action-plan/evaluate", json=eval_payload)
    assert res_eval.status_code == 200
    data_eval = res_eval.json()
    assert data_eval["trigger_state"] == TRIGGER_ACTION_NOW
    assert data_eval["risk_level"] == "EXTREME"

    # 4. POST /api/action-plan/decision
    login_res = client.post("/auth/login", json={"email": "aarav.sharma@health.gov.in", "password": "demo12345"})
    token = login_res.json()["access_token"]
    decision_payload = {
        "area_id": "ward_f_south",
        "action_key": "review_work_restrictions",
        "decision_status": "Action Initiated Externally",
        "officer_name": "Dr. Aarav Sharma",
        "officer_notes": "Issued mandatory 12-3pm work cessation directive via Municipal circular #401."
    }
    res_dec = client.post(
        "/api/action-plan/decision",
        headers={"Authorization": f"Bearer {token}"},
        json=decision_payload
    )
    assert res_dec.status_code == 200
    data_dec = res_dec.json()
    assert data_dec["status"] == "success"
    assert data_dec["decision"]["decision_status"] == "Action Initiated Externally"

    # 5. Verify the updated decision is reflected in GET /api/action-plan/decisions and GET /api/action-plan/{area_id}
    res_list = client.get("/api/action-plan/decisions")
    assert res_list.status_code == 200
    assert any(d["key"] == "ward_f_south:review_work_restrictions" for d in res_list.json()["decisions"])

    res_ward2 = client.get("/api/action-plan/ward_f_south")
    work_act = next((a for a in res_ward2.json()["recommended_actions"] if a["action"] == "review_work_restrictions"), None)
    assert work_act is not None
    assert work_act["decision_status"] == "Action Initiated Externally"
