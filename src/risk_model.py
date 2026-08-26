from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.dummy import DummyRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)


# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
RESULTS_DIR = BASE_DIR / "results"

DATA_FILE = DATA_DIR / "health_risk_data.csv"
MODEL_FILE = MODEL_DIR / "risk_model.pkl"
EVALUATION_FILE = RESULTS_DIR / "evaluation.json"


# --------------------------------------------------
# MODEL CONFIGURATION
# --------------------------------------------------

FEATURES = [
    "temperature_c",
    "thermal_stress",
    "vulnerability_index",
    "historical_health_events",
    "lag_health_events"
]

TARGET = "health_impact_proxy"

# Prototype normalization range.
# This is NOT a medical threshold.
PROTOTYPE_MAX_IMPACT = 40.0


# --------------------------------------------------
# LOAD DATA
# --------------------------------------------------

def load_data(file_path=DATA_FILE):
    """Load the health-risk dataset."""

    data = pd.read_csv(file_path)

    required_columns = FEATURES + [TARGET]

    missing_columns = [
        column
        for column in required_columns
        if column not in data.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing columns: {missing_columns}"
        )

    return data


# --------------------------------------------------
# TRAIN MODEL
# --------------------------------------------------

def train_model(data):
    """Train Random Forest Regressor."""

    X = data[FEATURES]
    y = data[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=6,
        min_samples_leaf=2,
        random_state=42
    )

    model.fit(
        X_train,
        y_train
    )

    return model, X_train, X_test, y_train, y_test


# --------------------------------------------------
# EVALUATION
# --------------------------------------------------

def evaluate_model(
    model,
    X_test,
    y_test,
    X_train,
    y_train
):
    """Evaluate model and compare against baseline."""

    predictions = model.predict(X_test)

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    rmse = np.sqrt(
        mean_squared_error(
            y_test,
            predictions
        )
    )

    r2 = r2_score(
        y_test,
        predictions
    )

    # Simple mean baseline
    baseline = DummyRegressor(
        strategy="mean"
    )

    baseline.fit(
        X_train,
        y_train
    )

    baseline_predictions = baseline.predict(
        X_test
    )

    baseline_mae = mean_absolute_error(
        y_test,
        baseline_predictions
    )

    baseline_r2 = r2_score(
        y_test,
        baseline_predictions
    )

    return {
        "model": "Random Forest Regressor",
        "dataset_type": "synthetic_prototype",
        "train_test_split": "80/20",
        "mae": round(float(mae), 3),
        "rmse": round(float(rmse), 3),
        "r2": round(float(r2), 3),
        "baseline": {
            "model": "Mean Predictor",
            "mae": round(float(baseline_mae), 3),
            "r2": round(float(baseline_r2), 3)
        },
        "medical_validation": False
    }


# --------------------------------------------------
# FEATURE IMPORTANCE
# --------------------------------------------------

def get_feature_importance(model):
    """Return Random Forest feature importance."""

    importance = pd.Series(
        model.feature_importances_,
        index=FEATURES
    ).sort_values(
        ascending=False
    )

    return {
        feature: round(float(value), 4)
        for feature, value in importance.items()
    }


# --------------------------------------------------
# RISK SCORE
# --------------------------------------------------

def calculate_risk_score(
    predicted_impact,
    max_impact=PROTOTYPE_MAX_IMPACT
):
    """
    Convert predicted health-impact proxy
    into a prototype 0-100 risk score.

    This is NOT a medical probability.
    """

    score = (
        predicted_impact / max_impact
    ) * 100

    score = min(
        max(score, 0),
        100
    )

    return round(
        float(score),
        2
    )


# --------------------------------------------------
# RISK LEVEL
# --------------------------------------------------

def get_risk_level(risk_score):
    """Convert risk score to prototype risk category."""

    if risk_score < 25:
        return "LOW"

    elif risk_score < 50:
        return "MODERATE"

    elif risk_score < 75:
        return "HIGH"

    return "EXTREME"


# --------------------------------------------------
# SINGLE PREDICTION
# --------------------------------------------------

def predict_health_impact(
    model,
    input_data
):
    """Predict health-impact proxy."""

    input_df = pd.DataFrame(
        [input_data]
    )

    prediction = model.predict(
        input_df[FEATURES]
    )[0]

    return float(prediction)


# --------------------------------------------------
# 3-5 DAY FORECAST
# --------------------------------------------------

def generate_forecast(
    model,
    forecast_data,
    vulnerability_index,
    historical_health_events,
    lag_health_events
):
    """Generate health-risk forecast for future days."""

    results = []

    for day_data in forecast_data:

        input_data = {
            "temperature_c":
                day_data["temperature_c"],

            "thermal_stress":
                day_data["thermal_stress"],

            "vulnerability_index":
                vulnerability_index,

            "historical_health_events":
                historical_health_events,

            "lag_health_events":
                lag_health_events
        }

        predicted_impact = predict_health_impact(
            model,
            input_data
        )

        risk_score = calculate_risk_score(
            predicted_impact
        )

        risk_level = get_risk_level(
            risk_score
        )

        results.append({
            "day": day_data["day"],
            "risk_score": risk_score,
            "risk_level": risk_level
        })

    return results


# --------------------------------------------------
# SAVE MODEL
# --------------------------------------------------

def save_model(model):
    """Save trained model."""

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    joblib.dump(
        model,
        MODEL_FILE
    )

    print(
        f"Model saved to: {MODEL_FILE}"
    )


# --------------------------------------------------
# SAVE EVALUATION
# --------------------------------------------------

def save_evaluation(evaluation):
    """Save evaluation results."""

    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        EVALUATION_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            evaluation,
            file,
            indent=4
        )

    print(
        f"Evaluation saved to: {EVALUATION_FILE}"
    )


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main():

    print(
        "\nSIH26083 - Health Risk Prediction Engine"
    )

    print(
        "=========================================="
    )

    # Load dataset
    data = load_data()

    print(
        f"\nDataset loaded: {len(data)} records"
    )

    # Train model
    (
        model,
        X_train,
        X_test,
        y_train,
        y_test
    ) = train_model(data)

    print(
        "Model trained successfully."
    )

    # Evaluate
    evaluation = evaluate_model(
        model,
        X_test,
        y_test,
        X_train,
        y_train
    )

    # Feature importance
    evaluation["feature_importance"] = (
        get_feature_importance(model)
    )

    # Save model
    save_model(model)

    # Save evaluation
    save_evaluation(
        evaluation
    )

    # Display results
    print("\nModel Evaluation")
    print("-------------------------")

    print(
        f"MAE  : {evaluation['mae']}"
    )

    print(
        f"RMSE : {evaluation['rmse']}"
    )

    print(
        f"R²   : {evaluation['r2']}"
    )

    print("\nFeature Importance")
    print("-------------------------")

    for feature, value in (
        evaluation["feature_importance"].items()
    ):
        print(
            f"{feature}: {value}"
        )

    print(
        "\nModel training completed."
    )


if __name__ == "__main__":
    main()