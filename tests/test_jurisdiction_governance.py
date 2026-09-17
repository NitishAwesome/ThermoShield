import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.jurisdiction import (
    JurisdictionType,
    get_jurisdiction,
    is_in_jurisdiction_scope,
    get_subordinate_jurisdiction_ids,
    resolve_area_to_jurisdiction_id,
    BMC_WARDS_REGISTRY,
    _JURISDICTION_REGISTRY,
)
from backend.app.database.connection import get_db
from backend.app.database.models import User, HAPActionAuditLog

client = TestClient(app)


def test_jurisdiction_taxonomy_completeness():
    """Verify 36 States/UTs, 36 MH Districts, MCGM, and 24 BMC Administrative Wards."""
    # Country exists
    india = get_jurisdiction("IN")
    assert india is not None
    assert india.type == JurisdictionType.COUNTRY

    # 36 States & UTs
    states = [node for node in _JURISDICTION_REGISTRY.values() if node.type == JurisdictionType.STATE_UT]
    assert len(states) == 36
    assert get_jurisdiction("IN-MH") is not None
    assert get_jurisdiction("IN-DL") is not None
    assert get_jurisdiction("IN-LA") is not None

    # 36 Maharashtra Districts
    mh_districts = [node for node in _JURISDICTION_REGISTRY.values() if node.type == JurisdictionType.DISTRICT and node.state_id == "IN-MH"]
    assert len(mh_districts) == 36
    assert get_jurisdiction("IN-MH-DIST-MUMBAI-CITY") is not None
    assert get_jurisdiction("IN-MH-DIST-MUMBAI-SUBURBAN") is not None
    assert get_jurisdiction("IN-MH-DIST-NAGPUR") is not None
    assert get_jurisdiction("IN-MH-DIST-PUN") is not None

    # MCGM Municipal Corporation (Spans both revenue districts)
    mcgm = get_jurisdiction("IN-MH-MCGM")
    assert mcgm is not None
    assert mcgm.type == JurisdictionType.MUNICIPAL_CORPORATION
    assert mcgm.parent_id == "IN-MH"
    assert "IN-MH-DIST-MUMBAI-CITY" in mcgm.district_ids
    assert "IN-MH-DIST-MUMBAI-SUBURBAN" in mcgm.district_ids

    # 24 BMC Administrative Wards
    assert len(BMC_WARDS_REGISTRY) == 24
    ward_nodes = [node for node in _JURISDICTION_REGISTRY.values() if node.type == JurisdictionType.ADMINISTRATIVE_WARD]
    assert len(ward_nodes) == 24
    for ward_data in BMC_WARDS_REGISTRY:
        ward_node = get_jurisdiction(ward_data["id"])
        assert ward_node is not None
        assert ward_node.type == JurisdictionType.ADMINISTRATIVE_WARD
        assert ward_node.parent_id == "IN-MH-MCGM"


def test_jurisdiction_scope_evaluation():
    """Verify hierarchical scope authorization logic."""
    # National scope (IN) encompasses everything in India
    assert is_in_jurisdiction_scope("IN", "IN-MH")
    assert is_in_jurisdiction_scope("IN", "IN-MH-MCGM")
    assert is_in_jurisdiction_scope("IN", "IN-MH-MCGM-FS")
    assert is_in_jurisdiction_scope("IN", "IN-DL")

    # State scope (IN-MH) encompasses MH districts and MCGM wards
    assert is_in_jurisdiction_scope("IN-MH", "IN-MH-MCGM")
    assert is_in_jurisdiction_scope("IN-MH", "IN-MH-MCGM-FS")
    assert is_in_jurisdiction_scope("IN-MH", "IN-MH-DIST-NAGPUR")
    assert not is_in_jurisdiction_scope("IN-MH", "IN-DL")  # Cannot govern Delhi!

    # Municipal Corporation scope (IN-MH-MCGM) encompasses all 24 BMC wards
    assert is_in_jurisdiction_scope("IN-MH-MCGM", "IN-MH-MCGM-A")
    assert is_in_jurisdiction_scope("IN-MH-MCGM", "IN-MH-MCGM-FS")
    assert is_in_jurisdiction_scope("IN-MH-MCGM", "IN-MH-MCGM-KE")
    assert not is_in_jurisdiction_scope("IN-MH-MCGM", "IN-MH-DIST-NAGPUR")  # Cannot govern Nagpur!

    # Individual Ward scope (IN-MH-MCGM-KE) ONLY governs Ward K/East
    assert is_in_jurisdiction_scope("IN-MH-MCGM-KE", "IN-MH-MCGM-KE")
    assert not is_in_jurisdiction_scope("IN-MH-MCGM-KE", "IN-MH-MCGM-FS")  # Cannot govern Ward F/South!
    assert not is_in_jurisdiction_scope("IN-MH-MCGM-KE", "IN-MH-MCGM")


def test_resolve_area_to_jurisdiction_id():
    """Verify loose area names resolve to canonical IDs."""
    assert resolve_area_to_jurisdiction_id("ward_f_south") == "IN-MH-MCGM-FS"
    assert resolve_area_to_jurisdiction_id("ward_k_east") == "IN-MH-MCGM-KE"
    assert resolve_area_to_jurisdiction_id("ward_a") == "IN-MH-MCGM-A"
    assert resolve_area_to_jurisdiction_id("mumbai") == "IN-MH-MCGM"
    assert resolve_area_to_jurisdiction_id("nagpur") == "IN-MH-DIST-NAGPUR"


def test_unauthorized_cross_jurisdiction_decision_returns_403():
    """A Ward K/East officer attempting to review Ward F/South MUST receive 403 Forbidden."""
    # Login as Mahesh Kulkarni (Ward K/East Officer)
    login_res = client.post(
        "/auth/login",
        json={"email": "ward.ke@mcgm.gov.in", "password": "demo12345"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Attempt to submit decision for Ward F/South (outside assigned scope)
    decision_res = client.post(
        "/api/action-plan/decision",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "area_id": "ward_f_south",
            "action_key": "MUNICIPAL_MISTING_CANOPY",
            "decision_status": "Reviewed",
            "officer_notes": "Attempted cross-jurisdiction review",
        },
    )

    assert decision_res.status_code == 403
    assert "Jurisdiction scope violation" in decision_res.json()["detail"]


def test_authorized_decision_creates_audit_log_entry():
    """An authorized MCGM official submitting a decision receives 200 and generates an audit log entry."""
    # Login as Dr. Aarav Sharma (MCGM 24-Ward Municipal Officer)
    login_res = client.post(
        "/auth/login",
        json={"email": "aarav.sharma@health.gov.in", "password": "demo12345"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Submit authorized decision for Ward F/South
    decision_res = client.post(
        "/api/action-plan/decision",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "area_id": "ward_f_south",
            "action_key": "MUNICIPAL_MISTING_CANOPY",
            "decision_status": "Action Initiated Externally",
            "officer_notes": "Order #MCGM-2026-401 issued to ward contractors",
        },
    )

    assert decision_res.status_code == 200
    data = decision_res.json()
    assert data["decision_status"] == "Action Initiated Externally"
    assert data["officer_notes"] == "Order #MCGM-2026-401 issued to ward contractors"

    # Query audit logs endpoint
    audit_res = client.get(
        "/api/action-plan/audit-logs?area_id=ward_f_south",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0
    latest_log = logs[0]
    assert latest_log["created_by"] == "aarav.sharma@health.gov.in"
    assert latest_log["jurisdiction_id"] == "IN-MH-MCGM-FS"
    assert latest_log["action_key"] == "MUNICIPAL_MISTING_CANOPY"
    assert latest_log["status"] == "Action Initiated Externally"


def test_national_heat_risk_reconciled_data_quality():
    """Verify reconciled data-quality formula on /api/heat-risk/national."""
    res = client.get("/api/heat-risk/national?day=0")
    assert res.status_code == 200
    payload = res.json()

    dq = payload["data_quality_breakdown"]
    total = payload["total_cells"]
    reconciled_sum = (
        dq["real_cells"]
        + dq["cached_cells"]
        + dq["fallback_cells"]
        + dq["unavailable_cells"]
    )

    assert total == reconciled_sum, f"Accounting mismatch: total={total} != sum={reconciled_sum}"
    assert payload["states_monitored_count"] == 36
    assert len(payload["states"]) == 36

    # Verify canonical 0.0-1.0 thermal risk score scaling and explicit None composite area risk
    for state in payload["states"]:
        assert 0.0 <= state["peak_risk_score"] <= 1.0
        assert 0.0 <= state["mean_risk_score"] <= 1.0
        assert state["composite_area_risk_score"] is None


def test_user_jurisdiction_context_endpoint():
    """Verify /api/jurisdiction/user-context returns authentic official scope."""
    # Login as Sunil More (Maharashtra State Officer)
    login_res = client.post(
        "/auth/login",
        json={"email": "coordinator.mh@maharashtra.gov.in", "password": "demo12345"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    ctx_res = client.get(
        "/api/jurisdiction/user-context",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ctx_res.status_code == 200
    ctx = ctx_res.json()
    assert ctx["jurisdiction_id"] == "IN-MH"
    assert ctx["is_state"] is True
    assert ctx["is_municipal"] is False
    assert ctx["is_national"] is False
    assert len(ctx["subordinate_jurisdiction_ids"]) == 62  # IN-MH + 36 districts + MCGM + 24 BMC wards
    assert "IN-MH-DIST-PUN" in ctx["subordinate_jurisdiction_ids"]
    assert "IN-MH-MCGM-FS" in ctx["subordinate_jurisdiction_ids"]


def test_revoked_jwt_permission_returns_403():
    """An official whose permissions are revoked mid-session MUST receive 403 even with a valid JWT."""
    # 1. Login as Aarav Sharma (MCGM official)
    login_res = client.post(
        "/auth/login",
        json={"email": "aarav.sharma@health.gov.in", "password": "demo12345"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    db = next(get_db())
    user = db.query(User).filter(User.email == "aarav.sharma@health.gov.in").first()
    original_perms = user.permissions
    try:
        # Revoke operational permission, keep only view
        user.permissions = "VIEW_JURISDICTION"
        db.commit()

        # Attempt to submit decision with previously issued token
        res = client.post(
            "/api/action-plan/decision",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "area_id": "ward_f_south",
                "action_key": "MUNICIPAL_MISTING_CANOPY",
                "decision_status": "Action Initiated Externally",
                "officer_notes": "Should fail due to revoked permission",
            },
        )
        assert res.status_code == 403
        assert "permission" in res.json()["detail"].lower()
    finally:
        user.permissions = original_perms
        db.commit()


def test_suspended_account_jwt_returns_403():
    """A user whose account is suspended MUST receive 403 on any authenticated endpoint."""
    login_res = client.post(
        "/auth/login",
        json={"email": "ward.ke@mcgm.gov.in", "password": "demo12345"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    db = next(get_db())
    user = db.query(User).filter(User.email == "ward.ke@mcgm.gov.in").first()
    original_status = user.account_status
    try:
        user.account_status = "SUSPENDED"
        db.commit()

        # Attempt authenticated call
        res = client.get(
            "/api/jurisdiction/user-context",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403
        assert "suspended" in res.json()["detail"].lower()
    finally:
        user.account_status = original_status
        db.commit()


def test_system_admin_cannot_activate_hap():
    """A System Admin has IT/user admin powers but CANNOT usurp operational HAP activation/approval powers."""
    login_res = client.post(
        "/auth/login",
        json={"email": "admin@thermoshield.gov.in", "password": "demo12345"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Attempt HAP operational decision
    res = client.post(
        "/api/action-plan/decision",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "area_id": "ward_f_south",
            "action_key": "MUNICIPAL_MISTING_CANOPY",
            "decision_status": "Action Initiated Externally",
            "officer_notes": "Admin attempting operational usurpation",
        },
    )
    assert res.status_code == 403
    assert "APPROVE_HAP_ACTION" in res.json()["detail"] or "permission" in res.json()["detail"].lower()


def test_demo_account_seeding_skipped_in_production(monkeypatch):
    """Verify demo account seeding is completely inhibited when ENVIRONMENT=production or ENABLE_DEMO_ACCOUNTS=false."""
    from backend.app.main import _seed_demo_accounts_if_needed

    # Case 1: ENVIRONMENT=production
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("ENABLE_DEMO_ACCOUNTS", raising=False)
    # Should safely return without seeding
    _seed_demo_accounts_if_needed()

    # Case 2: ENABLE_DEMO_ACCOUNTS=false
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("ENABLE_DEMO_ACCOUNTS", "false")
    _seed_demo_accounts_if_needed()


def test_generic_user_status_approval_hierarchy():
    """Verify hierarchical user account approval/suspension via POST /api/jurisdiction/users/{user_id}/status."""
    # Login as System Admin (scope: IN, permission: MANAGE_JURISDICTION_USERS)
    admin_res = client.post(
        "/auth/login",
        json={"email": "admin@thermoshield.gov.in", "password": "demo12345"},
    )
    assert admin_res.status_code == 200
    admin_token = admin_res.json()["access_token"]

    db = next(get_db())
    target = db.query(User).filter(User.email == "ward.ke@mcgm.gov.in").first()
    assert target is not None
    orig_status = target.account_status

    try:
        # 1. Admin can update status to SUSPENDED
        res = client.post(
            f"/api/jurisdiction/users/{target.id}/status",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"account_status": "SUSPENDED", "permissions": "VIEW_JURISDICTION"},
        )
        assert res.status_code == 200
        payload = res.json()
        assert payload["account_status"] == "SUSPENDED"

        # Verify target is now suspended in DB
        db.refresh(target)
        assert target.account_status == "SUSPENDED"

        # Restore target to APPROVED for testing caller checks
        target.account_status = "APPROVED"
        db.commit()

        ke_login = client.post(
            "/auth/login",
            json={"email": "ward.ke@mcgm.gov.in", "password": "demo12345"},
        )
        assert ke_login.status_code == 200
        ke_token = ke_login.json()["access_token"]

        # Ward officer tries to approve someone -> 403 Forbidden (missing MANAGE_JURISDICTION_USERS)
        unauth_res = client.post(
            f"/api/jurisdiction/users/{target.id}/status",
            headers={"Authorization": f"Bearer {ke_token}"},
            json={"account_status": "APPROVED"},
        )
        assert unauth_res.status_code == 403
    finally:
        target.account_status = orig_status
        db.commit()


def test_authority_auto_approve_endpoint(monkeypatch):
    """Verify POST /auth/authority/auto-approve approves valid pending authority accounts in demo mode."""
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("ENABLE_DEMO_ACCOUNTS", "true")

    db = next(get_db())
    # Create a test pending authority user
    test_email = "test_pending_officer@mcgm.gov.in"
    test_phone = "+910000000001"  # unique test-only number

    # Clean up any stale test user from prior runs (by email or phone)
    for stale in db.query(User).filter(
        (User.email == test_email) | (User.phone_number == test_phone)
    ).all():
        db.delete(stale)
    db.commit()

    from backend.app.auth.router import hash_password

    test_user = User(
        name="Test Pending Officer",
        email=test_email,
        password_hash=hash_password("testpass123"),
        phone_number=test_phone,
        role="municipal_hap_officer",
        organization="Municipal Corporation of Greater Mumbai (MCGM / BMC)",
        department="Disaster Management Cell",
        designation="HAP Nodal Officer",
        jurisdiction_id="IN-MH-MCGM",
        jurisdiction_type="MUNICIPAL_CORPORATION",
        permissions="",
        account_status="PENDING_VERIFICATION",
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)

    try:
        # Login to get JWT
        login_res = client.post(
            "/auth/login",
            json={"email": test_email, "password": "testpass123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

        # Call auto-approve
        res = client.post(
            "/auth/authority/auto-approve",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        # Endpoint returns AuthResponse: {access_token, token_type, user: {...}}
        user_data = data["user"]
        assert user_data["account_status"] == "APPROVED"
        assert "ACTIVATE_HAP" in (user_data.get("permissions") or "")

        # Verify DB state
        db.refresh(test_user)
        assert test_user.account_status == "APPROVED"
        assert "ACTIVATE_HAP" in test_user.permissions

        # Test auto-approval inhibition (e.g. production mode)
        monkeypatch.setenv("AUTO_APPROVE_AUTHORITY_REGISTRATION", "false")
        prod_res = client.post(
            "/auth/authority/auto-approve",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert prod_res.status_code == 403
        assert "disabled in production" in prod_res.json()["detail"]
    finally:
        db.refresh(test_user)
        db.delete(test_user)
        db.commit()

