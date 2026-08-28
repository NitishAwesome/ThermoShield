from pathlib import Path

import joblib

from src.risk_model import (
    HEATWAVE_FEATURES,
    predict_heatwave
)


# --------------------------------------------------
# PATH
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_FILE = (
    BASE_DIR
    / "models"
    / "heatwave_model.pkl"
)


# --------------------------------------------------
# LOAD MODEL
# --------------------------------------------------

model = joblib.load(
    MODEL_FILE
)

print(
    "Heatwave model loaded successfully."
)


# --------------------------------------------------
# TEST SCENARIOS
# --------------------------------------------------

scenarios = [

    {
        "name": "Low Conditions",

        "temperature_c": 31.0,
        "thermal_stress": 42.0,
        "vulnerability_index": 30.0,
        "historical_health_events": 9.0,
        "lag_health_events": 8.0,
        "temperature_trend": 0.3,
        "thermal_stress_trend": 1.5
    },

    {
        "name": "Moderate Conditions",

        "temperature_c": 34.0,
        "thermal_stress": 58.0,
        "vulnerability_index": 45.0,
        "historical_health_events": 13.0,
        "lag_health_events": 12.0,
        "temperature_trend": 0.5,
        "thermal_stress_trend": 2.0
    },

    {
        "name": "High Conditions",

        "temperature_c": 38.0,
        "thermal_stress": 75.0,
        "vulnerability_index": 60.0,
        "historical_health_events": 20.0,
        "lag_health_events": 18.0,
        "temperature_trend": 0.8,
        "thermal_stress_trend": 4.0
    },

    {
        "name": "Extreme Conditions",

        "temperature_c": 42.0,
        "thermal_stress": 90.0,
        "vulnerability_index": 80.0,
        "historical_health_events": 27.0,
        "lag_health_events": 25.0,
        "temperature_trend": 1.2,
        "thermal_stress_trend": 5.0
    }
]


# --------------------------------------------------
# RUN PREDICTIONS
# --------------------------------------------------

print(
    "\nSIH26083 - Prediction Validation"
)

print(
    "=" * 50
)


for scenario in scenarios:

    name = scenario["name"]

    input_data = {
        feature: scenario[feature]
        for feature in HEATWAVE_FEATURES
    }

    result = predict_heatwave(
        model,
        input_data
    )

    print(
        f"\n{name}"
    )

    print(
        "-" * 30
    )

    print(
        f"Temperature       : "
        f"{scenario['temperature_c']} °C"
    )

    print(
        f"Thermal Stress    : "
        f"{scenario['thermal_stress']}"
    )

    print(
        f"Vulnerability     : "
        f"{scenario['vulnerability_index']}"
    )

    print(
        f"Prediction        : "
        f"{result['prediction']}"
    )

    print(
        f"Probability       : "
        f"{result['probability']}"
    )

    print(
        f"Forecast Horizon  : "
        f"{result['forecast_horizon']}"
    )


print(
    "\nPrediction validation completed."
)