from pathlib import Path
from typing import Dict, Any

import joblib
import pandas as pd


# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[3]
MODEL_DIR = BASE_DIR / "models"

HEALTH_MODEL_PATH = MODEL_DIR / "risk_model.pkl"
HEATWAVE_MODEL_PATH = MODEL_DIR / "heatwave_model.pkl"


# ---------------------------------------------------------
# Feature contracts
# ---------------------------------------------------------

HEALTH_FEATURES = [
    "temperature_c",
    "thermal_stress",
    "vulnerability_index",
    "historical_health_events",
    "lag_health_events",
]

HEATWAVE_FEATURES = [
    "temperature_c",
    "thermal_stress",
    "vulnerability_index",
    "historical_health_events",
    "lag_health_events",
    "temperature_trend",
    "thermal_stress_trend",
]


# ---------------------------------------------------------
# Model loading
# ---------------------------------------------------------

_health_model = None
_heatwave_model = None


def load_models():
    """Load both trained ML models."""

    global _health_model, _heatwave_model

    if not HEALTH_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Health risk model not found: {HEALTH_MODEL_PATH}"
        )

    if not HEATWAVE_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Heatwave model not found: {HEATWAVE_MODEL_PATH}"
        )

    _health_model = joblib.load(HEALTH_MODEL_PATH)
    _heatwave_model = joblib.load(HEATWAVE_MODEL_PATH)


def get_health_model():
    global _health_model

    if _health_model is None:
        load_models()

    return _health_model


def get_heatwave_model():
    global _heatwave_model

    if _heatwave_model is None:
        load_models()

    return _heatwave_model


# ---------------------------------------------------------
# Health-impact prediction
# ---------------------------------------------------------

def predict_health_impact(
    temperature_c: float,
    thermal_stress: float,
    vulnerability_index: float,
    historical_health_events: float,
    lag_health_events: float,
) -> float:
    """
    Predict the health-impact proxy using the trained
    Random Forest regression model.

    This is a prototype health-impact proxy, not a
    clinically validated medical prediction.
    """

    model = get_health_model()

    input_data = pd.DataFrame(
        [
            {
                "temperature_c": temperature_c,
                "thermal_stress": thermal_stress,
                "vulnerability_index": vulnerability_index,
                "historical_health_events": historical_health_events,
                "lag_health_events": lag_health_events,
            }
        ]
    )

    input_data = input_data[HEALTH_FEATURES]

    prediction = model.predict(input_data)[0]

    return float(prediction)


# ---------------------------------------------------------
# Risk score
# ---------------------------------------------------------

def calculate_risk_score(
    predicted_health_impact: float,
    max_impact: float = 40.0,
) -> float:
    """
    Convert predicted health-impact proxy into a 0-100
    prototype risk score.

    This is NOT a probability of illness or mortality.
    """

    score = (predicted_health_impact / max_impact) * 100

    return round(
        max(0.0, min(100.0, score)),
        2,
    )


def classify_risk(score: float) -> str:
    """Convert risk score into a risk category."""

    if score < 25:
        return "LOW"

    if score < 50:
        return "MODERATE"

    if score < 75:
        return "HIGH"

    return "EXTREME"


# ---------------------------------------------------------
# Future heatwave prediction
# ---------------------------------------------------------

def predict_future_risk(
    temperature_c: float,
    thermal_stress: float,
    vulnerability_index: float,
    historical_health_events: float,
    lag_health_events: float,
    temperature_trend: float,
    thermal_stress_trend: float,
) -> Dict[str, Any]:
    """
    Predict future heat-health risk category using the
    trained Random Forest classifier.
    """

    model = get_heatwave_model()

    input_data = pd.DataFrame(
        [
            {
                "temperature_c": temperature_c,
                "thermal_stress": thermal_stress,
                "vulnerability_index": vulnerability_index,
                "historical_health_events": historical_health_events,
                "lag_health_events": lag_health_events,
                "temperature_trend": temperature_trend,
                "thermal_stress_trend": thermal_stress_trend,
            }
        ]
    )

    input_data = input_data[HEATWAVE_FEATURES]

    prediction = model.predict(input_data)[0]

    result = {
        "predicted_risk_level": str(prediction),
        "forecast_horizon": "3 days",
    }

    # Probability/confidence if supported by the model
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(input_data)[0]

        classes = model.classes_

        probability_map = {
            str(label): round(float(probability), 4)
            for label, probability in zip(classes, probabilities)
        }

        result["confidence"] = round(
            float(max(probabilities)),
            4,
        )

        result["probabilities"] = probability_map

    return result


# ---------------------------------------------------------
# Combined prediction
# ---------------------------------------------------------

def predict_complete_risk(
    temperature_c: float,
    thermal_stress: float,
    vulnerability_index: float,
    historical_health_events: float,
    lag_health_events: float,
    temperature_trend: float,
    thermal_stress_trend: float,
) -> Dict[str, Any]:
    """
    Run both ML models and return a combined prediction.
    """

    health_impact = predict_health_impact(
        temperature_c=temperature_c,
        thermal_stress=thermal_stress,
        vulnerability_index=vulnerability_index,
        historical_health_events=historical_health_events,
        lag_health_events=lag_health_events,
    )

    risk_score = calculate_risk_score(
        predicted_health_impact=health_impact
    )

    current_risk_level = classify_risk(risk_score)

    future_prediction = predict_future_risk(
        temperature_c=temperature_c,
        thermal_stress=thermal_stress,
        vulnerability_index=vulnerability_index,
        historical_health_events=historical_health_events,
        lag_health_events=lag_health_events,
        temperature_trend=temperature_trend,
        thermal_stress_trend=thermal_stress_trend,
    )

    return {
        "health_impact_proxy": round(health_impact, 4),
        "risk_score": risk_score,
        "current_risk_level": current_risk_level,
        "future_risk": future_prediction,
        "medical_validation": False,
    }