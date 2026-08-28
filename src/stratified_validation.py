from pathlib import Path

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)


# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_FILE = (
    BASE_DIR
    / "data"
    / "weather_history_ml_prepared.csv"
)

MODEL_FILE = (
    BASE_DIR
    / "models"
    / "heatwave_model.pkl"
)


# --------------------------------------------------
# FEATURES
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

TARGET = "future_risk_level"


# --------------------------------------------------
# LOAD DATA
# --------------------------------------------------

def load_data():

    data = pd.read_csv(
        DATA_FILE
    )

    required_columns = (
        HEATWAVE_FEATURES
        + [TARGET]
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

    return data


# --------------------------------------------------
# STRATIFIED VALIDATION
# --------------------------------------------------

def run_validation():

    print(
        "\nSIH26083 - Stratified Four-Class Validation"
    )

    print("=" * 55)

    # --------------------------------------------------
    # LOAD DATA
    # --------------------------------------------------

    data = load_data()

    X = data[HEATWAVE_FEATURES]
    y = data[TARGET]

    print(
        f"\nTotal records : {len(data)}"
    )

    # --------------------------------------------------
    # STRATIFIED SPLIT
    # --------------------------------------------------

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    print(
        f"Training records : {len(X_train)}"
    )

    print(
        f"Testing records  : {len(X_test)}"
    )

    # --------------------------------------------------
    # DISTRIBUTION
    # --------------------------------------------------

    print("\nTraining Distribution")
    print("---------------------")

    print(
        y_train.value_counts()
        .sort_index()
    )

    print("\nTesting Distribution")
    print("--------------------")

    print(
        y_test.value_counts()
        .sort_index()
    )

    # --------------------------------------------------
    # TRAIN VALIDATION MODEL
    # --------------------------------------------------

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

    # --------------------------------------------------
    # PREDICTIONS
    # --------------------------------------------------

    predictions = model.predict(
        X_test
    )

    # --------------------------------------------------
    # METRICS
    # --------------------------------------------------

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

    print("\nValidation Metrics")
    print("------------------")

    print(
        f"Accuracy  : {accuracy:.3f}"
    )

    print(
        f"Precision : {precision:.3f}"
    )

    print(
        f"Recall    : {recall:.3f}"
    )

    print(
        f"F1 Score  : {f1:.3f}"
    )

    # --------------------------------------------------
    # ACTUAL VS PREDICTED
    # --------------------------------------------------

    results = pd.DataFrame({
        "actual": y_test.values,
        "predicted": predictions
    })

    print("\nActual vs Predicted")
    print("-------------------")

    print(
        results.to_string(
            index=False
        )
    )

    # --------------------------------------------------
    # CONFUSION MATRIX
    # --------------------------------------------------

    labels = [
        "LOW",
        "MODERATE",
        "HIGH",
        "EXTREME"
    ]

    matrix = confusion_matrix(
        y_test,
        predictions,
        labels=labels
    )

    confusion_df = pd.DataFrame(
        matrix,
        index=[
            "Actual LOW",
            "Actual MODERATE",
            "Actual HIGH",
            "Actual EXTREME"
        ],
        columns=[
            "Predicted LOW",
            "Predicted MODERATE",
            "Predicted HIGH",
            "Predicted EXTREME"
        ]
    )

    print("\nConfusion Matrix")
    print("----------------")

    print(
        confusion_df
    )

    # --------------------------------------------------
    # CLASSIFICATION REPORT
    # --------------------------------------------------

    print("\nClassification Report")
    print("---------------------")

    print(
        classification_report(
            y_test,
            predictions,
            labels=labels,
            zero_division=0
        )
    )

    # --------------------------------------------------
    # MODEL CLASSES
    # --------------------------------------------------

    print("Model Classes")
    print("-------------")

    print(
        model.classes_
    )

    print(
        "\nStratified validation completed."
    )


# --------------------------------------------------
# MAIN
# --------------------------------------------------

if __name__ == "__main__":

    run_validation()