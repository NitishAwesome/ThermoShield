# ThermoShield — Human Thermal Stress Module

**SIH 2026 Problem Statement:** SIH26083 — Extreme Heatwave Early Warning and Human Thermal Stress Index  
**Module Lead:** Nitish (**Human Thermal Stress**)  
**Location:** `backend/thermal_stress/`

---

## 1. Overview & Architecture

The **Human Thermal Stress Module** converts raw meteorological observations and AI forecasts into actionable human thermal strain indices, prototype risk classifications, and civic heat advisories.

```text
  [ Zuhaib (Data Pipeline) ]        [ Sumit (AI Predictions) ]
   (Current Weather Stream)          (Future Forecast Features)
               │                                │
               └───────────────┬────────────────┘
                               ▼
            ┌──────────────────────────────────────┐
            │   Nitish: Thermal Stress Engine      │
            │   backend/thermal_stress/            │
            │   - Estimated WBGT (Weather Model)   │
            │   - NOAA Heat Index (Domain Valid)   │
            │   - Apparent Temp (Steadman Formula) │
            │   - 4-Tier Prototype Risk Engine     │
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
| `solar_radiation` | `float` | W/m² | `[0.0, ∞)` | Optional (Default: `None`) | Global solar irradiance. If `None` or `0`, indoor/shaded conditions are assumed for WBGT. |

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
    "reason": "Severe thermal stress (Estimated WBGT: 32.2°C, HI: 48.1°C). Elevated risk of heat cramps, exhaustion, and dehydration.",
    "color_code": "#E67E22",
    "alert_category": "ORANGE"
  },
  "advisories": [
    "[HIGH HEAT STRESS] Reduce prolonged strenuous outdoor activity during peak sun hours.",
    "[HYDRATION] Maintain frequent hydration and take regular fluid breaks.",
    "[PROTECTION] Wear lightweight, light-colored clothing and use sun protection.",
    "[REST & SHADE] Utilize shaded or well-ventilated cooling areas during rest breaks."
  ],
  "input_summary": {
    "temperature_c": 36.0,
    "relative_humidity_pct": 60.0,
    "wind_speed_mps": 2.0,
    "solar_radiation_wm2": 600.0
  }
}
```

*Note:* `heat_index_c` is `null` if meteorological conditions are outside the validated domain of the NOAA Rothfusz regression (e.g., $T < 20^\circ\text{C}$ or extreme combinations like $45^\circ\text{C} + 58\%\text{ RH}$).

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

1. **Estimated Wet-Bulb Globe Temperature (WBGT) [Primary Index]**:
   * *Methodology:* True physical WBGT requires direct measurements from calibrated wet-bulb and black-globe thermometer instruments. This prototype estimates these physical components from standard meteorological observations.
   * *Wet-bulb:* Natural wet-bulb ($T_w$) estimated via **Stull (2011)** continuous empirical formulation.
   * *Globe temperature:* Direct sun black-globe temperature ($T_g$) estimated using solar irradiance ($S$) and convective wind cooling ($v$).
   * *Indoor/Shaded:* $WBGT = 0.7 \cdot T_w + 0.3 \cdot T_a$.
   * *Outdoor/Sun:* $WBGT = 0.7 \cdot T_w + 0.2 \cdot T_g + 0.1 \cdot T_a$.
   * *Scope:* Intended for prototype screening and early warning.
2. **NOAA Heat Index (HI)**:
   * Standard 9-term **Rothfusz polynomial regression** with NOAA boundary corrections.
   * Includes domain validation to return `null` instead of unphysical mathematical artifacts when conditions fall outside the reliable domain.
3. **Australian Apparent Temperature (AT)**:
   * Steadman (1994) formula: $AT = T_a + 0.33 \cdot e - 0.70 \cdot v - 4.00$, where $e$ is vapor pressure in hPa.
4. **Prototype Risk Classification**:
   * 4-tier screening levels: `LOW`, `MODERATE`, `HIGH`, `EXTREME`.
   * These are simplified prototype screening bands (not official IMD heatwave alert levels, which are based on climatological normal deviations).

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
