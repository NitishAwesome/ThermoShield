import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.auth.router import require_permission
from app.database.connection import get_db
from app.database.models import HealthDataset, User
from app.jurisdiction import is_in_jurisdiction_scope, resolve_area_to_jurisdiction_id
from app.services.heat_action_plan import MUNICIPAL_WARD_REGISTRY
from app.services.health_forecast import generate_health_impact_forecast
from app.services.health_outcomes import (
    DatasetImport, parse_records, dataset_checksum, train_model, forecast_outcomes, COLUMNS, LIMITATIONS,
)

router = APIRouter(prefix="/api/health-data", tags=["Aggregate health surveillance"])
analyst = require_permission("ANALYZE_RISK")


def check_area(user: User, area_id: str):
    if area_id not in MUNICIPAL_WARD_REGISTRY:
        raise HTTPException(422, "Select a supported ward from /api/health-data/areas.")
    if not is_in_jurisdiction_scope(user.jurisdiction_id, resolve_area_to_jurisdiction_id(area_id)):
        raise HTTPException(403, "Ward is outside your operational jurisdiction.")


def summarize(row):
    records = json.loads(row.records_json)
    return {"id": row.id, "area_id": row.area_id, "source_name": row.source_name,
        "source_url": row.source_url, "data_kind": row.data_kind, "outcome_scope": row.outcome_scope,
        "record_count": len(records), "date_start": records[0]["date"], "date_end": records[-1]["date"],
        "checksum": row.checksum, "trained": bool(row.model_json),
        "report": json.loads(row.report_json) if row.report_json else None}


@router.get("/areas")
def areas(user: User = Depends(analyst)):
    return {"areas": [{"id": key, "name": value["name"]} for key, value in MUNICIPAL_WARD_REGISTRY.items()
        if is_in_jurisdiction_scope(user.jurisdiction_id, resolve_area_to_jurisdiction_id(key))],
        "csv_columns": COLUMNS, "minimum_training_days": 90, "limitations": LIMITATIONS}


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
    row = HealthDataset(area_id=payload.area_id, source_name=payload.source_name,
        source_url=str(payload.source_url), data_kind=payload.data_kind, outcome_scope=payload.outcome_scope,
        checksum=dataset_checksum(payload, records), records_json=json.dumps(records), created_by=user.id)
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
async def outlook(area_id: str, dataset_id: int | None = None,
                  user: User = Depends(analyst), db: Session = Depends(get_db)):
    check_area(user, area_id)
    query = db.query(HealthDataset).filter(HealthDataset.area_id == area_id, HealthDataset.model_json.isnot(None))
    # Demo data is never automatically chosen as the operational data source.
    query = query.filter(HealthDataset.id == dataset_id) if dataset_id else query.filter_by(data_kind="observed")
    row = query.order_by(HealthDataset.id.desc()).first()
    unavailable = {"status": "DATA_REQUIRED", "forecast_days": [], "limitations": LIMITATIONS,
                   "reason": "Import and train a ward dataset to estimate mortality and admissions."}
    if not row:
        return unavailable
    model = json.loads(row.model_json)
    age = (date.today() - date.fromisoformat(model["last_demographics"]["date"])).days
    if age > 90:
        return {**unavailable, "status": "STALE_DATA", "reason": "Latest observations are over 90 days old. Import recent surveillance data."}
    profile = MUNICIPAL_WARD_REGISTRY[area_id]
    forecast = await generate_health_impact_forecast(profile["latitude"], profile["longitude"], area_id=area_id, include_day_five=True)
    future_days = forecast["forecast_days"][1:6]
    if len(future_days) != 5 or forecast["forecast_source_classification"]["fallback_active"] or not all(d["is_real_hourly"] and d.get("is_real_daily") for d in future_days):
        return {**unavailable, "status": "WEATHER_UNAVAILABLE", "reason": "Outcome forecasts require complete live hourly forecast inputs."}
    return {"status": "DEMO_MODEL" if row.data_kind == "synthetic_demo" else "EXPERIMENTAL_MODEL",
        "dataset": summarize(row), "forecast_days": forecast_outcomes(model, future_days),
        "index_definition": "0–100 relative mortality increase over a calendar/demographic baseline; 100 means at least a doubling (denominator floor: 1 event). This is not a probability or causal heat attribution.",
        "limitations": LIMITATIONS}
