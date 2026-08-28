from pathlib import Path
import logging
import joblib
import pandas as pd

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
):
    model = get_model()

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

            predicted_impact = float(model.predict(input_data[FEATURES])[0])
        except Exception as e:
            logger.warning(f"Model prediction failed: {e}. Using deterministic fallback.")
            # Fallback based on temperature, thermal stress and vulnerability
            predicted_impact = (temperature_c * 0.4) + (thermal_stress * 0.4) + (vulnerability_index * 0.2)
    else:
        # Fallback calculation if model file cannot be unpickled
        predicted_impact = (temperature_c * 0.4) + (thermal_stress * 0.4) + (vulnerability_index * 0.2)

    # Prototype conversion to 0-100 risk score
    risk_score = min(
        100.0,
        max(
            0.0,
            (float(predicted_impact) / 40.0) * 100.0
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