"""Auditable ward-level aggregate outcome modelling, separate from the legacy proxy.

Retrospective weather/outcome associations are not causal attribution or validation
of operational 3–5-day forecast skill. Every output carries this distinction.
"""
import csv
import hashlib
import io
import json
import math
from datetime import date, timedelta
from typing import Literal

import numpy as np
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator
from sklearn.linear_model import PoissonRegressor
from sklearn.preprocessing import StandardScaler

from app.services.thermal import calculate_thermal_stress


class HealthDay(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    date: date
    population: int = Field(ge=100, le=100_000_000)
    elderly_fraction: float = Field(ge=0, le=1)
    outdoor_worker_fraction: float = Field(ge=0, le=1)
    temperature_c: float = Field(ge=-40, le=60)
    min_temperature_c: float = Field(ge=-40, le=60)
    humidity_pct: float = Field(ge=0, le=100)
    wind_speed_ms: float = Field(ge=0, le=60)
    solar_radiation_wm2: float = Field(ge=0, le=1500)
    deaths: int = Field(ge=0)
    admissions: int = Field(ge=0)

    @model_validator(mode="after")
    def validate_record(self):
        if self.date >= date.today():
            raise ValueError("Use completed historical days before today.")
        if self.min_temperature_c > self.temperature_c:
            raise ValueError("Minimum temperature exceeds peak-hour temperature.")
        if self.deaths > self.population or self.admissions > self.population:
            raise ValueError("Outcome counts exceed the ward population.")
        return self


class DatasetImport(BaseModel):
    model_config = ConfigDict(extra="forbid")
    area_id: str = Field(min_length=1, max_length=80)
    source_name: str = Field(min_length=3, max_length=200)
    source_url: HttpUrl
    data_kind: Literal["observed", "synthetic_demo"]
    outcome_scope: Literal["heat_related", "all_cause"]
    csv_text: str = Field(min_length=20, max_length=2_000_000)


COLUMNS = list(HealthDay.model_fields)
FEATURES = ["wbgt_above_25c", "minimum_temperature_c", "humidity_pct",
            "elderly_fraction", "outdoor_worker_fraction", "season_sin", "season_cos", "weekend"]
BASELINE_COLUMNS = [3, 4, 5, 6, 7]
LIMITATIONS = (
    "Experimental population estimates. Validation uses held-out historical weather, not archived "
    "weather forecasts; 3–5-day operational forecast skill and clinical utility remain unvalidated. "
    "All-cause outcomes must not be described as heat-attributable. Bands show retrospective "
    "absolute error and omit weather-forecast uncertainty."
)


def parse_records(csv_text: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(csv_text.lstrip("\ufeff")))
    if reader.fieldnames is None or len(reader.fieldnames) != len(COLUMNS) or set(reader.fieldnames) != set(COLUMNS):
        raise ValueError("CSV must contain exactly: " + ",".join(COLUMNS))
    records = []
    seen = set()
    for line, raw in enumerate(reader, start=2):
        if line > 5001:
            raise ValueError("Maximum 5,000 daily records per upload.")
        try:
            record = HealthDay.model_validate(raw).model_dump(mode="json")
        except ValueError as exc:
            # Pydantic's default error includes input values; keep the response aggregate-only.
            raise ValueError(f"Invalid record at CSV line {line}. Check dates, counts, units and required fields.") from exc
        if record["date"] in seen:
            raise ValueError(f"Duplicate date at line {line}; supply one aggregate row per ward/day.")
        seen.add(record["date"])
        records.append(record)
    if not records:
        raise ValueError("CSV contains no records.")
    return sorted(records, key=lambda row: row["date"])


def dataset_checksum(payload: DatasetImport, records: list[dict]) -> str:
    body = {"records": records, "kind": payload.data_kind, "scope": payload.outcome_scope,
            "source": str(payload.source_url), "source_name": payload.source_name}
    return hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()


def features(day: dict, wbgt: float | None = None) -> list[float]:
    d = date.fromisoformat(day["date"])
    if wbgt is None:
        wbgt = calculate_thermal_stress(day["temperature_c"], day["humidity_pct"],
                                       day["wind_speed_ms"], day["solar_radiation_wm2"])["indices"]["wbgt_c"]
    phase = 2 * math.pi * d.timetuple().tm_yday / 365.25
    return [max(0, wbgt - 25), day["min_temperature_c"], day["humidity_pct"],
            day["elderly_fraction"], day["outdoor_worker_fraction"],
            math.sin(phase), math.cos(phase), float(d.weekday() >= 5)]


def _fit(x, counts, exposure):
    scaler = StandardScaler().fit(x)
    model = PoissonRegressor(alpha=0.2, max_iter=500).fit(
        scaler.transform(x), counts / exposure, sample_weight=exposure)
    return {"mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist(),
            "coef": model.coef_.tolist(), "intercept": float(model.intercept_)}


def _predict(model, x, exposure):
    standardized = (np.asarray(x) - np.asarray(model["mean"])) / np.asarray(model["scale"])
    return np.exp(np.clip(standardized @ np.asarray(model["coef"]) + model["intercept"], -20, 20)) * exposure


def train_model(records: list[dict]) -> tuple[dict, dict]:
    if len(records) < 90:
        raise ValueError("At least 90 completed daily records are required (including a chronological holdout).")
    dates = [date.fromisoformat(r["date"]) for r in records]
    if any((b - a).days != 1 for a, b in zip(dates, dates[1:])):
        raise ValueError("Training requires consecutive daily records; missing days must not be treated as zero events.")
    x = np.asarray([features(r) for r in records])
    exposure = np.asarray([r["population"] / 100_000 for r in records])
    split = len(records) - max(14, math.ceil(len(records) * 0.2))
    model = {"version": 1, "features": FEATURES, "outcomes": {}, "last_demographics": records[-1],
             "feature_min": x[:split].min(axis=0).tolist(), "feature_max": x[:split].max(axis=0).tolist()}
    report = {"method": "Population-exposure Poisson regression", "train_days": split,
              "holdout_days": len(records) - split, "train_end": records[split - 1]["date"],
              "holdout_start": records[split]["date"], "data_end": records[-1]["date"],
              "validation_type": "CHRONOLOGICAL_HISTORICAL_WEATHER", "clinically_validated": False,
              "operational_forecast_validated": False, "limitations": LIMITATIONS, "metrics": {}}
    for outcome in ("deaths", "admissions"):
        counts = np.asarray([r[outcome] for r in records], dtype=float)
        if counts[:split].sum() < 10 or counts[split:].sum() < 3:
            report["metrics"][outcome] = {"status": "INSUFFICIENT_EVENTS"}
            continue
        fitted = _fit(x[:split], counts[:split], exposure[:split])
        baseline = _fit(x[:split, BASELINE_COLUMNS], counts[:split], exposure[:split])
        pred = _predict(fitted, x[split:], exposure[split:])
        base = _predict(baseline, x[split:, BASELINE_COLUMNS], exposure[split:])
        residual = np.abs(counts[split:] - pred)
        mae, base_mae = float(residual.mean()), float(np.abs(counts[split:] - base).mean())
        radius = float(np.quantile(residual, 0.9, method="higher"))
        report["metrics"][outcome] = {"status": "EVALUATED", "mae": round(mae, 3),
            "baseline_mae": round(base_mae, 3), "rmse": round(float(np.sqrt(np.mean(residual**2))), 3),
            "beats_baseline": mae < base_mae, "absolute_error_p90": round(radius, 3)}
        # Keep the evaluated model frozen: no refit on the holdout or inflated accuracy claim.
        model["outcomes"][outcome] = {"regression": fitted, "baseline": baseline, "error_radius": radius}
    if not model["outcomes"]:
        raise ValueError("Too few events to fit either outcome; need 10 training and 3 holdout events per outcome.")
    return model, report


def forecast_outcomes(model: dict, forecast_days: list[dict]) -> list[dict]:
    profile = model["last_demographics"]
    rows = []
    for day in forecast_days:
        record = {**profile, "date": day["date"], "min_temperature_c": day["temp_min_c"],
                  "humidity_pct": day["peak_hour_humidity"]}
        x = np.asarray(features(record, day["estimated_wbgt_c"]))
        exposure = profile["population"] / 100_000
        outputs = {}
        for outcome, fitted in model["outcomes"].items():
            expected = float(_predict(fitted["regression"], x, exposure))
            baseline = float(_predict(fitted["baseline"], x[BASELINE_COLUMNS], exposure))
            radius = fitted["error_radius"]
            outputs[outcome] = {"expected": round(expected, 2), "baseline": round(baseline, 2),
                "error_band": [round(max(0, expected - radius), 2), round(expected + radius, 2)],
                "relative_increase_pct": round(100 * (expected - baseline) / max(baseline, 1), 1)}
        mortality = outputs.get("deaths")
        rows.append({"date": day["date"], "day_label": day["day_label"], **outputs,
            "mortality_risk_index": round(min(100, max(0, mortality["relative_increase_pct"])), 1) if mortality else None,
            "outside_training_range": bool(np.any(x[:3] < np.asarray(model["feature_min"])[:3]) or
                                           np.any(x[:3] > np.asarray(model["feature_max"])[:3]))})
    return rows
