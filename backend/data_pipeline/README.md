# Weather / Data Pipeline Module

This is the **legacy/demo sample weather pipeline** kept for the SIH 2026 prototype.

The canonical contract now lives in `backend/weather_contract/`. This module only does the demo-data side of the system:
- loads weather samples,
- cleans the values,
- keeps the output in a small shared format,
- and gives the thermal-stress module one consistent record to consume.

It does **not** do thermal index calculation, ML, alerts, GIS, or frontend work.

## What this module provides

A single shared weather payload:

```json
{
  "location": "Chennai, Tamil Nadu",
  "ward": "Ward-50",
  "temperature": 36.4,
  "humidity": 58,
  "wind_speed": 1.8,
  "solar_radiation": 820,
  "timestamp": "2026-08-27T10:00:00+05:30"
}
```

## Files

- `sample_weather_data.json` — small mock dataset for the demo
- `pipeline.py` — load, clean, and fetch records
- `demo.py` — prints demo output

## How to run

From the project root:

```bash
python -m backend.data_pipeline.demo
```

## Input

The module accepts a raw record with these fields:

- `location`
- `ward`
- `temperature`
- `humidity`
- `wind_speed`
- `solar_radiation`
- `timestamp`

## Output

The cleaned output is the same small demo contract above, and it is not the live canonical weather contract.

## How another teammate should use it

Import and call the function below:

```python
from backend.data_pipeline import get_weather_payload

payload = get_weather_payload(
    location="Chennai, Tamil Nadu",
    ward="Ward-50",
)
```

The returned dictionary can be passed to the thermal-stress module as weather input.

## Basic cleaning rules

- humidity is clamped to `0–100`
- negative wind speed becomes `0`
- negative solar radiation becomes `0`
- timestamp must be ISO 8601
- temperature must stay in a prototype-safe range
