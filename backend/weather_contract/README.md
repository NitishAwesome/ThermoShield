# Canonical Weather Contract

This module defines the small shared weather object for ThermoShield.

It does **not** fetch live weather, build another API, calculate thermal indices, or implement ML/alerts.

## Canonical object

```json
{
  "location": "...",
  "ward": "...",
  "latitude": ...,
  "longitude": ...,
  "timestamp": "...",
  "temperature_c": ...,
  "relative_humidity_pct": ...,
  "wind_speed_mps": ...,
  "solar_radiation_wm2": ...
}
```

## Live data flow

`Open-Meteo → Ronit → Canonical Weather Data → Nitish Thermal Engine`

Ronit should map his live weather response into this contract and then pass the validated object forward.

## Offline/demo flow

`Mock data → Canonical Weather Data → Nitish Thermal Engine`

The mock dataset is only for demo/testing fallback.

## Run demo data

From the repo root:

```bash
python -m unittest tests.test_weather_contract -v
```

## How Nitish should consume it

Use `to_weather_input()` when the thermal module still expects the older `WeatherInput` shape.

Use `to_dict()` when passing the canonical object between services.
