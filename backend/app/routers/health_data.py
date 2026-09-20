import json
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.auth.router import require_permission
from app.database.connection import get_db
from app.database.models import HealthDataset, User
from app.jurisdiction import is_in_jurisdiction_scope, resolve_area_to_jurisdiction_id
from app.services.heat_action_plan import (
    MUNICIPAL_WARD_REGISTRY,
    bilingual_advisory_for_risk,
    initiate_municipal_hap_triggers,
)
from app.services.health_forecast import generate_health_impact_forecast
from app.services.health_outcomes import (
    DatasetImport, parse_records, dataset_checksum, train_model, forecast_outcomes,
    COLUMNS, LIMITATIONS, forecast_baseline_epidemiological_outcomes, BASELINE_CITATION,
)

router = APIRouter(prefix="/api/health-data", tags=["Aggregate health surveillance"])
analyst = require_permission("ANALYZE_RISK")
officer = require_permission("ACTIVATE_HAP")


def check_area(user: User, area_id: str):
    if area_id not in MUNICIPAL_WARD_REGISTRY:
        raise HTTPException(422, "Select a supported ward from /api/health-data/areas.")
    if not is_in_jurisdiction_scope(user.jurisdiction_id, resolve_area_to_jurisdiction_id(area_id)):
        raise HTTPException(403, "Ward is outside your operational jurisdiction.")


def summarize(row):
    records = json.loads(row.records_json)
    return {
        "id": row.id, "area_id": row.area_id, "source_name": row.source_name,
        "source_url": row.source_url, "data_kind": row.data_kind, "outcome_scope": row.outcome_scope,
        "record_count": len(records), "date_start": records[0]["date"], "date_end": records[-1]["date"],
        "checksum": row.checksum, "trained": bool(row.model_json),
        "report": json.loads(row.report_json) if row.report_json else None,
    }


@router.get("/areas")
def areas(user: User = Depends(analyst)):
    return {
        "areas": [
            {"id": key, "name": value["name"]}
            for key, value in MUNICIPAL_WARD_REGISTRY.items()
            if is_in_jurisdiction_scope(user.jurisdiction_id, resolve_area_to_jurisdiction_id(key))
        ],
        "csv_columns": COLUMNS, "minimum_training_days": 90, "limitations": LIMITATIONS,
    }


@router.get("/datasets")
def datasets(area_id: str, user: User = Depends(analyst), db: Session = Depends(get_db)):
    check_area(user, area_id)
    return {"datasets": [summarize(row) for row in db.query(HealthDataset)
        .filter_by(area_id=area_id).order_by(HealthDataset.id.desc()).limit(20)]}


@router.post("/datasets", status_code=201)
def import_dataset(payload: DatasetImport, user: User = Depends(analyst), db: Session = Depends(get_db)):
    check_area(user, payload.area_id)
    try:
        records = parse_records(payload.csv_text)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    row = HealthDataset(
        area_id=payload.area_id, source_name=payload.source_name,
        source_url=str(payload.source_url), data_kind=payload.data_kind,
        outcome_scope=payload.outcome_scope,
        checksum=dataset_checksum(payload, records),
        records_json=json.dumps(records), created_by=user.id,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This dataset snapshot is already imported.")
    return summarize(row)


@router.post("/datasets/{dataset_id}/train")
def train(dataset_id: int, user: User = Depends(analyst), db: Session = Depends(get_db)):
    row = db.get(HealthDataset, dataset_id)
    if not row:
        raise HTTPException(404, "Dataset not found.")
    check_area(user, row.area_id)
    try:
        model, report = train_model(json.loads(row.records_json))
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    row.model_json, row.report_json = json.dumps(model), json.dumps(report)
    db.commit()
    return summarize(row)


@router.get("/outlook/{area_id}")
async def outlook(
    area_id: str, dataset_id: int | None = None,
    user: User = Depends(analyst), db: Session = Depends(get_db),
):
    check_area(user, area_id)
    query = db.query(HealthDataset).filter(
        HealthDataset.area_id == area_id, HealthDataset.model_json.isnot(None)
    )
    query = query.filter(HealthDataset.id == dataset_id) if dataset_id else query.filter_by(data_kind="observed")
    row = query.order_by(HealthDataset.id.desc()).first()
    unavailable = {
        "status": "DATA_REQUIRED", "forecast_days": [], "limitations": LIMITATIONS,
        "reason": "Import and train a ward dataset to estimate mortality and admissions.",
    }
    if not row:
        return unavailable
    model = json.loads(row.model_json)
    age = (date.today() - date.fromisoformat(model["last_demographics"]["date"])).days
    if age > 90:
        return {**unavailable, "status": "STALE_DATA",
                "reason": "Latest observations are over 90 days old. Import recent surveillance data."}
    profile = MUNICIPAL_WARD_REGISTRY[area_id]
    forecast = await generate_health_impact_forecast(
        profile["latitude"], profile["longitude"], area_id=area_id, include_day_five=True
    )
    future_days = forecast["forecast_days"][1:6]
    if (len(future_days) != 5
            or forecast["forecast_source_classification"]["fallback_active"]
            or not all(d["is_real_hourly"] and d.get("is_real_daily") for d in future_days)):
        return {**unavailable, "status": "WEATHER_UNAVAILABLE",
                "reason": "Outcome forecasts require complete live hourly forecast inputs."}
    risk_level = forecast.get("risk_level", "MODERATE")
    wbgt = (forecast["forecast_days"][0].get("estimated_wbgt_c", 28.0)
            if forecast["forecast_days"] else 28.0)
    return {
        "status": "DEMO_MODEL" if row.data_kind == "synthetic_demo" else "EXPERIMENTAL_MODEL",
        "dataset": summarize(row),
        "forecast_days": forecast_outcomes(model, future_days),
        "bilingual_advisory": bilingual_advisory_for_risk(risk_level, wbgt),
        "index_definition": (
            "0–100 relative mortality increase over a calendar/demographic baseline; "
            "100 means at least a doubling (denominator floor: 1 event). "
            "This is not a probability or causal heat attribution."
        ),
        "limitations": LIMITATIONS,
    }


# ---------------------------------------------------------------------------
# Gap 7 — Calibrated National Baseline Outlook (no CSV required)
# ---------------------------------------------------------------------------

@router.get("/baseline-outlook/{area_id}")
async def baseline_outlook(area_id: str, user: User = Depends(analyst)):
    """
    Returns a 3–5 day mortality risk and hospital admission surge outlook using the
    Calibrated National Baseline model (Ahmedabad HAP / Mavalankar et al. 2014 +
    Lancet Planetary Health 2021). No CSV upload required.

    Always available — use as the default planning view before any municipal
    surveillance data has been imported.
    """
    check_area(user, area_id)
    profile = MUNICIPAL_WARD_REGISTRY[area_id]
    forecast = await generate_health_impact_forecast(
        profile["latitude"], profile["longitude"], area_id=area_id, include_day_five=True
    )
    future_days = forecast["forecast_days"][1:6] or forecast["forecast_days"][:5]
    risk_level = forecast.get("risk_level", "MODERATE")
    wbgt = (forecast["forecast_days"][0].get("estimated_wbgt_c", 28.0)
            if forecast["forecast_days"] else 28.0)

    ward_profile = {
        "population": profile.get("population", 550_000),
        "vulnerability_score": profile.get("vulnerability_score", 50.0),
        "elderly_fraction": profile.get("elderly_fraction", 0.09),
        "outdoor_worker_fraction": profile.get("outdoor_worker_fraction", 0.20),
    }
    outcome_rows = forecast_baseline_epidemiological_outcomes(area_id, future_days, ward_profile)

    return {
        "status": "CALIBRATED_NATIONAL_BASELINE",
        "area_id": area_id,
        "area_name": profile["name"],
        "model_description": BASELINE_CITATION,
        "forecast_days": outcome_rows,
        "bilingual_advisory": bilingual_advisory_for_risk(risk_level, wbgt),
        "limitations": LIMITATIONS,
        "index_definition": (
            "mortality_risk_index: 0–100 scale representing estimated excess all-cause mortality "
            "relative to a calendar-adjusted baseline. hospitalization_surge_pct: estimated % "
            "increase in acute heat-related ED admissions vs. baseline. These are population-level "
            "planning indicators — NOT individual probabilities or clinical diagnoses."
        ),
    }


# ---------------------------------------------------------------------------
# Gap 4 — Municipal Concrete Initiative Triggers
# ---------------------------------------------------------------------------

VALID_TRIGGER_IDS = frozenset({
    "cooling_centers",
    "grid_peak_load_balance",
    "outdoor_work_halt",
    "emergency_108_staging",
})


@router.post("/heat-action-plan/{area_id}/trigger-initiatives")
def trigger_initiatives(
    area_id: str,
    triggers: List[str] = Body(..., embed=True,
        description="List of trigger IDs: cooling_centers | grid_peak_load_balance | "
                    "outdoor_work_halt | emergency_108_staging"),
    notes: Optional[str] = Body(None, embed=True, description="Officer justification notes"),
    risk_level: str = Body("HIGH", embed=True),
    wbgt_c: float = Body(30.0, embed=True),
    user: User = Depends(officer),
):
    """
    Initiates concrete municipal Heat Action Plan triggers and returns dispatch receipts.

    Supported trigger IDs:
    - **cooling_centers**: Activate designated public cooling shelters
    - **grid_peak_load_balance**: MSEDCL peak-load deferral directive (12–4 PM)
    - **outdoor_work_halt**: Outdoor labour restriction order (12–4 PM)
    - **emergency_108_staging**: Pre-position MEMS ambulances in high-risk wards

    Requires **ACTIVATE_HAP** permission. Officer must be within the ward's jurisdiction.
    Every dispatch is recorded in the HAP audit log.
    """
    check_area(user, area_id)
    if not triggers:
        raise HTTPException(422, "Provide at least one trigger ID.")

    invalid = [t for t in triggers if t not in VALID_TRIGGER_IDS]
    if invalid:
        raise HTTPException(
            422,
            f"Unrecognised trigger IDs: {invalid}. Valid: {sorted(VALID_TRIGGER_IDS)}",
        )

    result = initiate_municipal_hap_triggers(
        area_id=area_id,
        triggers=triggers,
        officer_id=str(user.id),
        risk_level=risk_level,
        wbgt_c=wbgt_c,
        notes=notes or "",
    )
    return result
