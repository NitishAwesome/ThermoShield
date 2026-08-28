from pathlib import Path

import pandas as pd


# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_FILE = (
    BASE_DIR
    / "data"
    / "weather_history_ml.csv"
)

OUTPUT_FILE = (
    BASE_DIR
    / "data"
    / "weather_history_ml_prepared.csv"
)


# --------------------------------------------------
# LOAD DATA
# --------------------------------------------------

df = pd.read_csv(INPUT_FILE)

df["date"] = pd.to_datetime(
    df["date"]
)

# Keep each ward's observations
# in chronological order.
df = df.sort_values(
    ["location", "date"]
).reset_index(drop=True)


# --------------------------------------------------
# FEATURE ENGINEERING
# --------------------------------------------------

# Difference from the previous day.
df["temperature_trend"] = (
    df.groupby("location")["temperature_c"]
    .diff()
)

df["thermal_stress_trend"] = (
    df.groupby("location")["thermal_stress"]
    .diff()
)


# --------------------------------------------------
# CREATE 3-DAY FUTURE TARGET
# --------------------------------------------------

# shift(-3) means:
#
# Today's row
#      ↓
# Look 3 observations ahead
#
# Therefore the model learns:
#
# current conditions → risk 3 days later

df["future_thermal_stress"] = (
    df.groupby("location")["thermal_stress"]
    .shift(-3)
)


# --------------------------------------------------
# REMOVE ROWS WITHOUT FUTURE TARGET
# --------------------------------------------------

df = df.dropna(
    subset=[
        "future_thermal_stress"
    ]
).copy()


# --------------------------------------------------
# RISK CATEGORY
# --------------------------------------------------

def get_risk_level(thermal_stress):

    if thermal_stress < 40:
        return "LOW"

    elif thermal_stress < 60:
        return "MODERATE"

    elif thermal_stress < 80:
        return "HIGH"

    else:
        return "EXTREME"


df["future_risk_level"] = (
    df["future_thermal_stress"]
    .apply(get_risk_level)
)


# --------------------------------------------------
# REMOVE FIRST ROW OF EACH LOCATION
# --------------------------------------------------

# The first observation of each ward has
# no previous-day trend.
#
# We cannot use it for the model because
# temperature_trend and thermal_stress_trend
# are NaN.

df = df.dropna(
    subset=[
        "temperature_trend",
        "thermal_stress_trend"
    ]
).copy()


# --------------------------------------------------
# TARGET DISTRIBUTION
# --------------------------------------------------

risk_counts = (
    df["future_risk_level"]
    .value_counts()
    .reindex(
        [
            "LOW",
            "MODERATE",
            "HIGH",
            "EXTREME"
        ],
        fill_value=0
    )
)


# --------------------------------------------------
# SAVE PREPARED DATA
# --------------------------------------------------

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

df.to_csv(
    OUTPUT_FILE,
    index=False
)


# --------------------------------------------------
# DISPLAY RESULTS
# --------------------------------------------------

print(
    "\nSIH26083 - ML 3-Day Prediction Data"
)

print("=" * 50)

print(
    f"Original records : 60"
)

print(
    f"Prepared records : {len(df)}"
)

print(
    f"Prepared dataset : {OUTPUT_FILE}"
)


print(
    "\nRecords per Ward"
)

print("----------------")

print(
    df["location"].value_counts()
)


print(
    "\nFuture Risk Distribution"
)

print("------------------------")

for level, count in risk_counts.items():

    print(
        f"{level:10} : {count}"
    )


print(
    "\nSample"
)

print("------------------------")

print(
    df[
        [
            "date",
            "location",
            "temperature_c",
            "temperature_trend",
            "thermal_stress",
            "thermal_stress_trend",
            "future_thermal_stress",
            "future_risk_level"
        ]
    ]
    .head(12)
    .to_string(index=False)
)


print(
    "\nML data preparation completed."
)