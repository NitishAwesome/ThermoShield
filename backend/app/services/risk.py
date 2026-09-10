from pathlib import Path
import logging
import joblib
import pandas as pd
from .ml_prediction import predict_future_risk

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "risk_model.pkl"

FEATURES = [
    "temperature_c",
    "thermal_stress",
    "vulnerability_index",
    "historical_health_events",
    "lag_health_events",
]

_model = None


def get_model():
    global _model
    if _model is None and MODEL_PATH.exists():
        try:
            _model = joblib.load(MODEL_PATH)
        except Exception as e:
            logger.warning(f"Could not load ML model from {MODEL_PATH}: {e}")
            _model = None
    return _model


# Attempt initial load at module import
get_model()


def predict_risk(
    temperature_c: float,
    thermal_stress: float,
    vulnerability_index: float = 30.0,
    historical_health_events: int = 17,
    lag_health_events: int = 15,
    temperature_trend: float = 0.0,
    thermal_stress_trend: float = 0.0,
):
    model = get_model()

    # Calibrated Biometeorological Components:
    # 1. Ambient temperature strain (0 - 45 pts) above human thermal comfort baseline (24°C)
    temp_pts = max(0.0, min(45.0, (temperature_c - 24.0) * 2.5))

    # 2. Physiological thermal index (WBGT & Heat Index score, 0 - 40 pts)
    thermal_pts = (max(0.0, min(100.0, thermal_stress)) / 100.0) * 40.0

    # 3. Community / Demographic Vulnerability index (0 - 15 pts)
    vuln_pts = (max(0.0, min(100.0, vulnerability_index)) / 100.0) * 15.0

    calibrated_score = min(100.0, max(0.0, temp_pts + thermal_pts + vuln_pts))

    if model is not None:
        try:
            input_data = pd.DataFrame([
                {
                    "temperature_c": temperature_c,
                    "thermal_stress": thermal_stress,
                    "vulnerability_index": vulnerability_index,
                    "historical_health_events": historical_health_events,
                    "lag_health_events": lag_health_events,
                }
            ])

            raw_pred = float(model.predict(input_data[FEATURES])[0])
            predicted_impact = raw_pred
            # Balance biometeorological index (70%) with ML health proxy (30%)
            ml_normalized = min(100.0, max(0.0, (raw_pred / 55.0) * 100.0))
            risk_score = round(0.70 * calibrated_score + 0.30 * ml_normalized, 2)
        except Exception as e:
            logger.warning(f"Model prediction failed: {e}. Using calibrated biometeorological score.")
            predicted_impact = calibrated_score * 0.45
            risk_score = round(calibrated_score, 2)
    else:
        predicted_impact = calibrated_score * 0.45
        risk_score = round(calibrated_score, 2)

    risk_score = min(100.0, max(0.0, risk_score))

    if risk_score >= 75:
        level = "EXTREME"
    elif risk_score >= 50:
        level = "HIGH"
    elif risk_score >= 30:
        level = "MODERATE"
    else:
        level = "LOW"

    # Breakdown of individual risk drivers for transparency
    risk_factors = [
        {
            "factor": "Ambient Temperature Strain",
            "contribution": round(temp_pts, 1),
            "observed_value": f"{temperature_c:.1f}°C",
            "category": "Thermodynamic",
            "description": "Dry-bulb heat accumulation exceeding baseline physiological comfort"
        },
        {
            "factor": "Thermal Index Load (WBGT/HI)",
            "contribution": round(thermal_pts, 1),
            "observed_value": f"{thermal_stress:.1f}/100",
            "category": "Biometeorological",
            "description": "Convective & evaporative restriction on metabolic heat dissipation"
        },
        {
            "factor": "Civic Vulnerability Index",
            "contribution": round(vuln_pts, 1),
            "observed_value": f"{vulnerability_index:.0f}/100",
            "category": "Demographic",
            "description": "Baseline population sensitivity and healthcare access buffer"
        }
    ]

    # 3-day future heatwave risk prediction
    future_risk = predict_future_risk(
        temperature_c=temperature_c,
        thermal_stress=thermal_stress,
        vulnerability_index=vulnerability_index,
        historical_health_events=historical_health_events,
        lag_health_events=lag_health_events,
        temperature_trend=temperature_trend,
        thermal_stress_trend=thermal_stress_trend,
    )

    return {
        "predicted_health_impact_proxy": round(
            float(predicted_impact), 2
        ),
        "risk_score": risk_score,
        "risk_level": level,
        "risk_factors": risk_factors,
        "future_risk": future_risk,
    }