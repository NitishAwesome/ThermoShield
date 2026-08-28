from pathlib import Path
import joblib

from risk_model import (
    HEATWAVE_MODEL_FILE,
    predict_heatwave
)


# --------------------------------------------------
# LOAD TRAINED MODEL
# --------------------------------------------------

model_path = Path(HEATWAVE_MODEL_FILE)

model = joblib.load(model_path)

print("Heatwave model loaded successfully.")

# --------------------------------------------------
# TEST SCENARIOS
# --------------------------------------------------

test_cases = {

    "LOW CONDITIONS": {
        "temperature_c": 30.0,
        "thermal_stress": 35.0,
        "vulnerability_index": 30,
        "historical_health_events": 5,
        "lag_health_events": 4,
        "temperature_trend": 0.2,
        "thermal_stress_trend": 1.0
    },

    "MODERATE CONDITIONS": {
        "temperature_c": 35.0,
        "thermal_stress": 55.0,
        "vulnerability_index": 60,
        "historical_health_events": 10,
        "lag_health_events": 9,
        "temperature_trend": 0.5,
        "thermal_stress_trend": 3.0
    },

    "HIGH CONDITIONS": {
        "temperature_c": 39.0,
        "thermal_stress": 72.0,
        "vulnerability_index": 60,
        "historical_health_events": 18,
        "lag_health_events": 16,
        "temperature_trend": 0.8,
        "thermal_stress_trend": 4.0
    },

    "EXTREME CONDITIONS": {
        "temperature_c": 43.0,
        "thermal_stress": 92.0,
        "vulnerability_index": 80,
        "historical_health_events": 28,
        "lag_health_events": 25,
        "temperature_trend": 1.2,
        "thermal_stress_trend": 6.0
    }
}

# --------------------------------------------------
# RUN PREDICTIONS
# --------------------------------------------------

print("\nRisk Scenario Testing")
print("=====================")

for scenario, input_data in test_cases.items():

    result = predict_heatwave(
        model,
        input_data
    )

    print(f"\n{scenario}")
    print("---------------------")
    print(
        f"Prediction : {result['prediction']}"
    )
    print(
        f"Probability: {result['probability']}"
    )
    print(
        f"Horizon    : {result['forecast_horizon']}"
    )