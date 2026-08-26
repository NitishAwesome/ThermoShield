# ThermoShield — Human Thermal Stress Module

**SIH 2026 Problem Statement:** SIH26083 — Extreme Heatwave Early Warning and Human Thermal Stress Index  
**Module Lead:** Nitish (**Human Thermal Stress**)  
**Location:** `backend/thermal_stress/`

---

## 1. Overview & Architecture

The **Human Thermal Stress Module** converts raw meteorological observations and AI forecasts into actionable, biometeorologically accurate human heat-strain indices, IMD-aligned risk assessments, and targeted civic advisories.

```text
  [ Zuhaib (Data Pipeline) ]        [ Sumit (AI Predictions) ]
   (Current Weather Stream)          (Future Forecast Features)
               │                                │
               └───────────────┬────────────────┘
                               ▼
            ┌──────────────────────────────────────┐
            │   Nitish: Thermal Stress Engine      │
            │   backend/thermal_stress/            │
            │   - WBGT (ISO 7243 / Stull Model)    │
            │   - NOAA Heat Index (Rothfusz Poly)  │
            │   - Apparent Temp (Steadman Formula) │
            │   - 4-Tier Risk Categorization       │
            │   - Contextual Advisory Generator    │
            └──────────────────┬───────────────────┘
                               ▼
                  [ Ronit: Backend API Router ]
                     (FastAPI / GIS Engine)
                               │
                               ▼
                 [ Sreethu & Aditi: Frontend ]
                    (Dashboard / Heat Alerts)
```

---

## 2. Input Contract (For Zuhaib / Data Pipeline)

The module accepts standard Python variables or a dictionary:

| Field | Type | Unit | Valid Range | Required | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `temperature` | `float` | °C | `[-40.0, 70.0]` | **Yes** | Dry-bulb ambient air temperature |
| `relative_humidity` | `float` | % | `[0.0, 100.0]` | **Yes** | Relative humidity percentage |
| `wind_speed` | `float` | m/s | `[0.0, ∞)` | Optional (Default: `1.0`) | Surface wind speed (at 2m/10m) |
| `solar_radiation` | `float` | W/m² | `[0.0, ∞)` | Optional (Default: `None`) | Global solar irradiance. If `None` or `0`, indoor/shaded conditions are modeled. |

---

## 3. Output Contract (For Ronit / Backend & Sumit / ML)

Unified JSON/Dictionary response:

```json
{
  "indices": {
    "wbgt_c": 32.2,
    "heat_index_c": 48.1,
    "apparent_temperature_c": 42.3,
    "wet_bulb_temp_c": 29.4
  },
  "risk_assessment": {
    "level": "HIGH",
    "score": 0.81,
    "primary_index": "WBGT",
    "reason": "Severe thermal stress (WBGT: 32.2°C, HI: 48.1°C). Elevated risk of heat cramps, exhaustion, and dehydration.",
    "color_code": "#E67E22",
    "alert_category": "ORANGE"
  },
  "advisories": [
    "[HIGH HEAT STRESS] Reschedule intense outdoor sports and heavy physical labor to early morning or late evening.",
    "[HYDRATION] Drink at least 250-300 ml of water every 30 minutes during outdoor activities.",
    "[PROTECTION] Wear lightweight, loose, light-colored clothing, wide-brimmed hats, and UV sunglasses."
  ],
  "input_summary": {
    "temperature_c": 36.0,
    "relative_humidity_pct": 60.0,
    "wind_speed_mps": 2.0,
    "solar_radiation_wm2": 600.0
  }
}
```

---

## 4. Integration Guide for Teammates

### A. How Ronit (Backend) Imports This in FastAPI/Flask

```python
from backend.thermal_stress import analyze_thermal_stress

# Inside FastAPI endpoint:
@app.get("/api/v1/thermal-stress")
def get_thermal_stress(temp: float, humidity: float, wind: float = 1.0, solar: float = None):
    result = analyze_thermal_stress(
        temperature=temp,
        relative_humidity=humidity,
        wind_speed=wind,
        solar_radiation=solar
    )
    return result.to_dict()
```

### B. How Zuhaib (Data Pipeline) Feeds Sensor Data

```python
from backend.thermal_stress import analyze_thermal_stress

def process_station_reading(station_payload: dict):
    return analyze_thermal_stress(
        temperature=station_payload["temp_c"],
        relative_humidity=station_payload["humidity_pct"],
        wind_speed=station_payload.get("wind_mps", 1.0),
        solar_radiation=station_payload.get("solar_wm2")
    ).to_dict()
```

### C. How Sumit (AI Prediction) Uses Thermal Stress as ML Features

```python
from backend.thermal_stress import calculate_wbgt, calculate_heat_index

# Extract biometeorological features for heatwave mortality/admission prediction:
df["wbgt"] = df.apply(lambda row: calculate_wbgt(row["temp"], row["rh"], row["wind"], row["solar"]), axis=1)
df["heat_index"] = df.apply(lambda row: calculate_heat_index(row["temp"], row["rh"]), axis=1)
```

---

## 5. Scientific Formulations & Assumptions

1. **Wet-Bulb Globe Temperature (WBGT) [Primary Gold Standard]**:
   * Wet-bulb temperature ($T_w$) calculated using **Stull (2011)** empirical formulation.
   * Shaded / Indoor: $WBGT = 0.7 \cdot T_w + 0.3 \cdot T_a$ (ISO 7243).
   * Direct Sun: $T_g = T_a + \frac{S}{100 \cdot \sqrt{\max(v, 0.5)}}$, $WBGT = 0.7 \cdot T_w + 0.2 \cdot T_g + 0.1 \cdot T_a$.
2. **NOAA Heat Index (HI)**:
   * Standard 9-term **Rothfusz polynomial regression** with low/high humidity boundary corrections.
3. **Australian Apparent Temperature (AT)**:
   * Steadman (1994) formula: $AT = T_a + 0.33 \cdot e - 0.70 \cdot v - 4.00$, where $e$ is vapor pressure in hPa.

---

## 6. How to Run & Verify

```bash
# 1. Run presentation scenarios demo
python -m backend.thermal_stress.demo_runner

# 2. Run custom single evaluation with JSON output
python -m backend.thermal_stress.demo_runner --temp 40.0 --humidity 65.0 --wind 1.5 --solar 800.0 --json

# 3. Run unit test suite
python -m unittest tests/test_thermal_stress.py
```
