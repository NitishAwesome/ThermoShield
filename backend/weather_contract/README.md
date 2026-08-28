# Canonical Weather Contract

This module defines the shared weather observation for ThermoShield.

It does **not** build a second weather API, calculate thermal indices, or implement ML/alerts.

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

## Units

- `temperature_c`: °C
- `relative_humidity_pct`: %
- `wind_speed_mps`: m/s
- `solar_radiation_wm2`: W/m²
- `latitude` / `longitude`: degrees
- `timestamp`: timezone-aware ISO-8601

## Live data flow

`Open-Meteo → Ronit → Canonical Weather Data → Nitish Thermal Engine`

Ronit should call `canonicalize_open_meteo_payload(...)` after fetching Open-Meteo data. The helper also normalizes wind speed to m/s if the source payload is in km/h.

## Offline/demo flow

`Mock data → Canonical Weather Data → Nitish Thermal Engine`

Use `load_demo_observations()` or `demo_observation_for_scenario(...)` for deterministic fallback data.

## How Nitish should consume it

Use `to_weather_input()` when the thermal module expects the older `WeatherInput` shape.

Use `to_dict()` when passing the canonical object between services.

## Validation rules

- temperature is numeric
- humidity is between 0 and 100
- wind speed is non-negative
- solar radiation is non-negative
- latitude is between -90 and 90
- longitude is between -180 and 180
- timestamp is timezone-aware
