from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import confusion_matrix


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
# MODEL FEATURES
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
# DIAGNOSE MODEL
# --------------------------------------------------

def diagnose_heatwave_model():

    print(
        "\nSIH26083 - Four-Class Heatwave Model Diagnosis"
    )

    print("=" * 55)

    # Load dataset
    data = load_data()

    # Sort chronologically
    data["date"] = pd.to_datetime(
        data["date"]
    )

    data = data.sort_values(
        "date"
    ).reset_index(drop=True)

    # --------------------------------------------------
    # TRAIN / TEST SPLIT
    # --------------------------------------------------

    split_index = int(
        len(data) * 0.80
    )

    X = data[HEATWAVE_FEATURES]
    y = data[TARGET]

    X_train = X.iloc[:split_index]
    X_test = X.iloc[split_index:]

    y_train = y.iloc[:split_index]
    y_test = y.iloc[split_index:]

    # --------------------------------------------------
    # LOAD MODEL
    # --------------------------------------------------

    model = joblib.load(
        MODEL_FILE
    )

    print(
        f"\nPrepared records : {len(data)}"
    )

    print(
        f"Training records : {len(X_train)}"
    )

    print(
        f"Testing records  : {len(X_test)}"
    )

    # --------------------------------------------------
    # TARGET DISTRIBUTION
    # --------------------------------------------------

    print("\nTarget Distribution")
    print("-------------------")

    print(
        y.value_counts()
    )

    # --------------------------------------------------
    # TESTING DISTRIBUTION
    # --------------------------------------------------

    print("\nTesting Distribution")
    print("--------------------")

    print(
        y_test.value_counts()
    )

    # --------------------------------------------------
    # PREDICTIONS
    # --------------------------------------------------

    predictions = model.predict(
        X_test
    )

    # --------------------------------------------------
    # ACTUAL VS PREDICTED
    # --------------------------------------------------

    results = pd.DataFrame({
        "date": data.iloc[
            split_index:
        ]["date"].dt.strftime("%Y-%m-%d"),

        "location": data.iloc[
            split_index:
        ]["location"].values,

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
    # PREDICTION SUMMARY
    # --------------------------------------------------

    correct = (
        predictions == y_test.values
    ).sum()

    incorrect = (
        predictions != y_test.values
    ).sum()

    print("\nPrediction Summary")
    print("-------------------")

    print(
        f"Correct predictions   : {correct}"
    )

    print(
        f"Incorrect predictions : {incorrect}"
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
    # MODEL CLASSES
    # --------------------------------------------------

    print("\nModel Classes")
    print("-------------")

    print(
        model.classes_
    )

    # --------------------------------------------------
    # FEATURE IMPORTANCE
    # --------------------------------------------------

    importance = pd.Series(
        model.feature_importances_,
        index=HEATWAVE_FEATURES
    ).sort_values(
        ascending=False
    )

    print("\nFeature Importance")
    print("------------------")

    for feature, value in importance.items():

        print(
            f"{feature:25} : {value:.4f}"
        )

    print(
        "\nDiagnosis completed."
    )


# --------------------------------------------------
# MAIN
# --------------------------------------------------

if __name__ == "__main__":

    diagnose_heatwave_model()