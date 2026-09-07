from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)
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
BACKEND_MODEL_FILE = BASE_DIR / "backend" / "app" / "models" / "risk_model.pkl"
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
# HEATWAVE PREDICTION MODEL CONFIGURATION
# --------------------------------------------------

HEATWAVE_FEATURES = [
    "temperature_c",
    "thermal_stress",
    "vulnerability_index",
    "historical_health_events",
    "lag_health_events",
    "temperature_trend",
    "thermal_stress_trend"
]

HEATWAVE_TARGET = "future_risk_level"

HEATWAVE_DATA_FILE = (
    DATA_DIR / "weather_history_ml_prepared.csv"
)

HEATWAVE_MODEL_FILE = (
    MODEL_DIR / "heatwave_model.pkl"
)

HEATWAVE_EVALUATION_FILE = (
    RESULTS_DIR / "heatwave_evaluation.json"
)

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
# LOAD HEATWAVE DATA
# --------------------------------------------------

def load_heatwave_data(
    file_path=HEATWAVE_DATA_FILE
):
    """Load prepared weather-history data."""

    data = pd.read_csv(
        file_path
    )

    required_columns = (
        HEATWAVE_FEATURES +
        [HEATWAVE_TARGET]
    )

    missing_columns = [
        column
        for column in required_columns
        if column not in data.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing columns: {missing_columns}"
        )

    # Remove rows where trend features
    # cannot be calculated.
    data = data.dropna(
        subset=[
            "temperature_trend",
            "thermal_stress_trend"
        ]
    ).copy()

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
# TRAIN HEATWAVE MODEL
# --------------------------------------------------
def train_heatwave_model(data):
    """
    Train Random Forest classifier using a
    chronological split within each location.

    For every ward:
    - Earlier records -> training data
    - Latest records  -> testing data

    This prevents the test set from being
    dominated by one ward.
    """

    data = data.sort_values(
        ["location", "date"]
    ).reset_index(drop=True)

    train_parts = []
    test_parts = []

    for location, location_data in data.groupby(
        "location",
        sort=False
    ):

        location_data = location_data.sort_values(
            "date"
        ).reset_index(drop=True)

        split_index = int(
            len(location_data) * 0.80
        )

        train_parts.append(
            location_data.iloc[:split_index]
        )

        test_parts.append(
            location_data.iloc[split_index:]
        )

    train_data = pd.concat(
        train_parts,
        ignore_index=True
    )

    test_data = pd.concat(
        test_parts,
        ignore_index=True
    )

    X_train = train_data[HEATWAVE_FEATURES]
    X_test = test_data[HEATWAVE_FEATURES]

    y_train = train_data[HEATWAVE_TARGET]
    y_test = test_data[HEATWAVE_TARGET]

    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced"
    )

    model.fit(
        X_train,
        y_train
    )

    return (
        model,
        X_train,
        X_test,
        y_train,
        y_test
    )

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
# EVALUATE HEATWAVE MODEL
# --------------------------------------------------

def evaluate_heatwave_model(
    model,
    X_test,
    y_test
):
    """Evaluate heatwave classification model."""

    predictions = model.predict(
        X_test
    )

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    precision = precision_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0
    )

    recall = recall_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0
    )

    f1 = f1_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0
    )

    matrix = confusion_matrix(
        y_test,
        predictions,
        labels=[
            "MODERATE",
            "HIGH",
            "EXTREME"
        ]
    )

    return {
        "model":
            "Random Forest Classifier",

        "dataset_type":
            "synthetic_prototype",

        "prediction_horizon":
            "3 days",

        "train_test_split":
            "80/20 chronological",

        "accuracy":
            round(float(accuracy), 3),

        "precision_weighted":
            round(float(precision), 3),

        "recall_weighted":
            round(float(recall), 3),

        "f1_weighted":
            round(float(f1), 3),

        "confusion_matrix":
            matrix.tolist(),

        "medical_validation":
            False
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
# HEATWAVE FEATURE IMPORTANCE
# --------------------------------------------------

def get_heatwave_feature_importance(
    model
):
    """Return heatwave model feature importance."""

    importance = pd.Series(
        model.feature_importances_,
        index=HEATWAVE_FEATURES
    ).sort_values(
        ascending=False
    )

    return {
        feature: round(
            float(value),
            4
        )
        for feature, value
        in importance.items()
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
# HEATWAVE PREDICTION
# --------------------------------------------------

# --------------------------------------------------
# HEATWAVE PREDICTION
# --------------------------------------------------

def predict_heatwave(
    model,
    input_data
):
    """
    Predict future heat-risk category.

    Probability means the model-estimated
    probability of the defined risk category.
    It is NOT a medical probability.
    """

    input_df = pd.DataFrame(
        [input_data]
    )

    prediction = model.predict(
        input_df[HEATWAVE_FEATURES]
    )[0]

    probabilities = model.predict_proba(
        input_df[HEATWAVE_FEATURES]
    )[0]

    classes = model.classes_

    probability_map = {
        str(label): round(
            float(probability),
            4
        )
        for label, probability
        in zip(
            classes,
            probabilities
        )
    }

    predicted_probability = probability_map[
        str(prediction)
    ]

    return {
        "prediction":
            str(prediction),

        "probability":
            predicted_probability,

        "forecast_horizon":
            "3 days",

        "confidence":
            predicted_probability,

        "all_probabilities":
            probability_map,

        "top_features":
            get_heatwave_feature_importance(
                model
            )
    }


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
    """Save trained model to models/ and backend/app/models/."""

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

    BACKEND_MODEL_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    joblib.dump(
        model,
        BACKEND_MODEL_FILE
    )

    print(
        f"Backend model saved to: {BACKEND_MODEL_FILE}"
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

# --------------------------------------------------
# HEATWAVE MODEL MAIN
# --------------------------------------------------

def main_heatwave():

    print(
        "\nSIH26083 - Heatwave Prediction Model"
    )

    print(
        "=========================================="
    )

    # Load prepared data
    data = load_heatwave_data()

    print(
        f"\nDataset loaded: {len(data)} records"
    )

    # Train classifier
    (
        model,
        X_train,
        X_test,
        y_train,
        y_test
    ) = train_heatwave_model(data)

    print(
        "Heatwave model trained successfully."
    )

    # Evaluate
    evaluation = evaluate_heatwave_model(
        model,
        X_test,
        y_test
    )

    # Feature importance
    evaluation["feature_importance"] = (
        get_heatwave_feature_importance(
            model
        )
    )

    # Save model
    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    joblib.dump(
        model,
        HEATWAVE_MODEL_FILE
    )

    print(
        f"Heatwave model saved to: "
        f"{HEATWAVE_MODEL_FILE}"
    )

    # Save evaluation
    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        HEATWAVE_EVALUATION_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            evaluation,
            file,
            indent=4
        )

    print(
        f"Evaluation saved to: "
        f"{HEATWAVE_EVALUATION_FILE}"
    )

    print("\nHeatwave Model Evaluation")
    print("-------------------------")

    print(
        f"Accuracy  : "
        f"{evaluation['accuracy']}"
    )

    print(
        f"Precision : "
        f"{evaluation['precision_weighted']}"
    )

    print(
        f"Recall    : "
        f"{evaluation['recall_weighted']}"
    )

    print(
        f"F1 Score  : "
        f"{evaluation['f1_weighted']}"
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
        "\nHeatwave model training completed."
    )

if __name__ == "__main__":
    main()
    main_heatwave()

