from pathlib import Path

import joblib
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "risk_model.pkl"

model = joblib.load(MODEL_PATH)

FEATURES = [
    "temperature_c",
    "thermal_stress",
    "vulnerability_index",
    "historical_health_events",
    "lag_health_events",
]


def predict_risk(
    temperature_c: float,
    thermal_stress: float,
    vulnerability_index: float,
    historical_health_events: int,
    lag_health_events: int,
):
    input_data = pd.DataFrame([
        {
            "temperature_c": temperature_c,
            "thermal_stress": thermal_stress,
            "vulnerability_index": vulnerability_index,
            "historical_health_events": historical_health_events,
            "lag_health_events": lag_health_events,
        }
    ])

    predicted_impact = model.predict(
        input_data[FEATURES]
    )[0]

    # Prototype conversion to 0-100 risk score
    risk_score = min(
        100,
        max(
            0,
            (float(predicted_impact) / 40) * 100
        )
    )

    risk_score = round(risk_score, 2)

    if risk_score >= 75:
        level = "EXTREME"
    elif risk_score >= 50:
        level = "HIGH"
    elif risk_score >= 25:
        level = "MODERATE"
    else:
        level = "LOW"

    return {
        "predicted_health_impact_proxy": round(
            float(predicted_impact), 2
        ),
        "risk_score": risk_score,
        "risk_level": level,
    }