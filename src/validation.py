from pathlib import Path

import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score


# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_FILE = (
    BASE_DIR
    / "data"
    / "weather_history_ml_prepared.csv"
)


# --------------------------------------------------
# MODEL CONFIGURATION
# --------------------------------------------------

FEATURES = [
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
        FEATURES + [TARGET]
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
# CROSS-VALIDATION
# --------------------------------------------------

def run_cross_validation(data):

    X = data[FEATURES]
    y = data[TARGET]

    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced"
    )

    cv = StratifiedKFold(
        n_splits=4,
        shuffle=True,
        random_state=42
    )

    scores = cross_val_score(
        model,
        X,
        y,
        cv=cv,
        scoring="accuracy"
    )

    return scores


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main():

    print(
        "\nSIH26083 - Cross-Validation Stability Test"
    )

    print(
        "=" * 50
    )

    # Load data
    data = load_data()

    print(
        f"\nDataset loaded: {len(data)} records"
    )

    print(
        "\nRisk Distribution"
    )

    print(
        "-----------------"
    )

    print(
        data[TARGET].value_counts()
    )

    # Run validation
    scores = run_cross_validation(
        data
    )

    print(
        "\nCross-Validation Results"
    )

    print(
        "------------------------"
    )

    for index, score in enumerate(
        scores,
        start=1
    ):

        print(
            f"Fold {index} Accuracy : "
            f"{score:.3f}"
        )

    mean_accuracy = scores.mean()

    std_accuracy = scores.std()

    print(
        f"\nMean Accuracy : "
        f"{mean_accuracy:.3f}"
    )

    print(
        f"Std Accuracy  : "
        f"{std_accuracy:.3f}"
    )

    print(
        "\nValidation completed."
    )


if __name__ == "__main__":

    main()