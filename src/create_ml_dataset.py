from pathlib import Path

import pandas as pd


# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

OUTPUT_FILE = (
    BASE_DIR
    / "data"
    / "weather_history_ml.csv"
)


# --------------------------------------------------
# SYNTHETIC WEATHER DATA
# --------------------------------------------------

records = []


ward_configs = {
    "Ward_A": {
        "temperature": 31.0,
        "thermal_stress": 40,
        "vulnerability": 30,
        "health_events": 8
    },
    "Ward_B": {
        "temperature": 33.0,
        "thermal_stress": 50,
        "vulnerability": 50,
        "health_events": 12
    },
    "Ward_C": {
        "temperature": 35.0,
        "thermal_stress": 60,
        "vulnerability": 70,
        "health_events": 16
    },
    "Ward_D": {
        "temperature": 37.0,
        "thermal_stress": 70,
        "vulnerability": 80,
        "health_events": 20
    }
}


# --------------------------------------------------
# CREATE 15 DAYS PER WARD
# --------------------------------------------------

for ward, config in ward_configs.items():

    for day in range(1, 16):

        # Gradually changing weather conditions.
        temperature = (
            config["temperature"]
            + (day - 1) * 0.35
        )

        thermal_stress = (
            config["thermal_stress"]
            + (day - 1) * 1.5
        )

        historical_health_events = (
            config["health_events"]
            + (day - 1)
        )

        lag_health_events = max(
            historical_health_events - 1,
            0
        )

        records.append({
            "date": f"2026-04-{day:02d}",
            "location": ward,
            "temperature_c": round(
                temperature,
                1
            ),
            "thermal_stress": round(
                thermal_stress,
                1
            ),
            "vulnerability_index":
                config["vulnerability"],
            "historical_health_events":
                historical_health_events,
            "lag_health_events":
                lag_health_events
        })


# --------------------------------------------------
# CREATE DATAFRAME
# --------------------------------------------------

df = pd.DataFrame(records)

df["date"] = pd.to_datetime(
    df["date"]
)

df = df.sort_values(
    ["location", "date"]
).reset_index(drop=True)


# --------------------------------------------------
# SAVE DATASET
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
    "\nSIH26083 - ML Synthetic Weather Dataset"
)

print("=" * 50)

print(
    f"Records created : {len(df)}"
)

print(
    f"Wards           : {df['location'].nunique()}"
)

print(
    f"Dataset saved   : {OUTPUT_FILE}"
)

print("\nRecords per Ward")
print("----------------")

print(
    df["location"].value_counts()
)

print("\nThermal Stress Range")
print("--------------------")

print(
    df["thermal_stress"].describe()
)

print(
    "\nSynthetic dataset creation completed."
)