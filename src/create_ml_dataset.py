from pathlib import Path
import numpy as np
import pandas as pd

# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

WEATHER_HISTORY_FILE = BASE_DIR / "data" / "weather_history_ml.csv"
HEALTH_RISK_FILE = BASE_DIR / "data" / "health_risk_data.csv"

# --------------------------------------------------
# SYNTHETIC MULTI-REGIME WEATHER & HEALTH DATASET
# --------------------------------------------------

np.random.seed(42)

records = []

# Demographic ward archetypes with distinct baseline vulnerabilities and hospital capacity
ward_archetypes = [
    {
        "location": "Ward_A",
        "name": "Residential_Canopy",
        "base_vuln": 25.0,
        "base_events": 8
    },
    {
        "location": "Ward_B",
        "name": "Urban_Commercial",
        "base_vuln": 45.0,
        "base_events": 14
    },
    {
        "location": "Ward_C",
        "name": "High_Density_Industrial",
        "base_vuln": 70.0,
        "base_events": 20
    },
    {
        "location": "Ward_D",
        "name": "Vulnerable_Settlement",
        "base_vuln": 85.0,
        "base_events": 25
    },
]

# Meteorological regimes representing the full annual spectrum across Indian climatic zones
regimes = [
    {"name": "Cool_Winter_Night", "days": 25, "t_range": (16.0, 26.0), "ts_range": (0.0, 25.0)},
    {"name": "Moderate_Spring", "days": 25, "t_range": (26.0, 33.0), "ts_range": (25.0, 50.0)},
    {"name": "Pre_Summer_Warm", "days": 25, "t_range": (33.0, 39.0), "ts_range": (50.0, 75.0)},
    {"name": "Severe_Heatwave", "days": 25, "t_range": (39.0, 46.5), "ts_range": (75.0, 98.0)},
]

current_day_offset = 1

for ward in ward_archetypes:
    loc = ward["location"]
    base_vuln = ward["base_vuln"]
    base_events = ward["base_events"]

    for regime in regimes:
        t_low, t_high = regime["t_range"]
        ts_low, ts_high = regime["ts_range"]
        n_days = regime["days"]

        for d in range(n_days):
            day_num = current_day_offset + d
            month = 1 + (day_num // 30) % 12
            day_of_month = 1 + (day_num % 28)

            T = np.random.uniform(t_low, t_high)
            # Thermal stress correlates with temperature, modulated by relative humidity
            TS = np.clip(
                np.random.uniform(ts_low, ts_high) + (T - (t_low + t_high) / 2.0) * 0.6,
                0.0,
                100.0
            )
            vuln = np.clip(base_vuln + np.random.normal(0, 2.5), 10.0, 95.0)

            # Historical clinic load combines demographic baseline with seasonal heat stress
            hist_events = int(np.clip(
                base_events + (TS / 100.0) * 8.0 + np.random.normal(0, 1.2),
                3,
                38
            ))
            lag_events = int(np.clip(
                hist_events + np.random.choice([-1, 0, 1]),
                2,
                38
            ))

            # Biometeorological response curve for civic emergency / clinic volume proxy
            base_load = 3.0 + 0.08 * vuln + 0.25 * hist_events + 0.12 * lag_events
            thermal_surge = 0.06 * max(0.0, T - 20.0)**1.25 + 0.16 * (TS / 10.0)**1.55 * (1.0 + vuln / 120.0)
            noise = np.random.normal(0, 0.25)

            health_impact_proxy = round(float(base_load + thermal_surge + noise), 2)

            records.append({
                "date": f"2026-{month:02d}-{day_of_month:02d}",
                "location": loc,
                "temperature_c": round(float(T), 1),
                "thermal_stress": round(float(TS), 1),
                "vulnerability_index": round(float(vuln), 1),
                "historical_health_events": hist_events,
                "lag_health_events": lag_events,
                "health_impact_proxy": health_impact_proxy
            })

    current_day_offset += 100

df = pd.DataFrame(records)
df = df.sort_values(["location", "date"]).reset_index(drop=True)

# --------------------------------------------------
# SAVE DATASETS
# --------------------------------------------------

HEALTH_RISK_FILE.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(HEALTH_RISK_FILE, index=False)
df.to_csv(WEATHER_HISTORY_FILE, index=False)

print("\nSIH26083 - ML Multi-Regime Heat Health Dataset Created")
print("=" * 60)
print(f"Total Records     : {len(df)}")
print(f"Wards Covered     : {df['location'].nunique()} wards")
print(f"Saved to          : {HEALTH_RISK_FILE}")
print(f"Temperature Range : {df['temperature_c'].min()}°C to {df['temperature_c'].max()}°C")
print(f"Thermal Stress    : {df['thermal_stress'].min()} to {df['thermal_stress'].max()}")
print(f"Health Proxy Range: {df['health_impact_proxy'].min()} to {df['health_impact_proxy'].max()}")