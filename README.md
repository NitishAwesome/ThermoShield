# SIH26083 – Heat-Related Health Risk Prediction Engine

## Overview

This module is a prototype Health Risk Prediction Engine developed
for SIH26083 – Extreme Heatwave Early Warning and Human Thermal
Stress Index.

The module estimates a heat-related health-impact proxy for
forecasted conditions and converts the prediction into an
interpretable risk level.

It is designed to provide a 3–5 day forecast that can be consumed
by the team's backend, GIS and alert components.

---

## Responsibility

This module is responsible only for:

- Health-risk prediction
- 3–5 day risk forecasting
- Risk-score generation
- Risk-level classification
- Providing prediction results through an API

It does NOT handle:

- Weather-data collection
- Thermal-stress calculation
- GIS visualization
- SMS/WhatsApp alerts
- Frontend development
- Full backend implementation

---

## Architecture

Weather Forecast
        ↓
Thermal Stress Index
        ↓
Health Risk Prediction Engine
        ↓
Random Forest Regressor
        ↓
Health-Impact Proxy
        ↓
Risk Score
        ↓
Risk Level
        ↓
Human-readable Decision Support
        ↓
Backend / GIS / Alert System

---

## Machine Learning Approach

### Model

Random Forest Regressor

The model was selected because it:

- Works well with tabular data
- Can model nonlinear relationships
- Requires relatively little preprocessing
- Provides feature importance
- Is suitable for a hackathon prototype

---

## Input Features

The model uses:

| Feature | Description |
|---|---|
| temperature_c | Temperature in Celsius |
| thermal_stress | Human thermal stress index |
| vulnerability_index | Population vulnerability index (0–100) |
| historical_health_events | Historical health-event signal |
| lag_health_events | Recent health-event signal |

---

## Dataset

The current dataset contains 50 records.

Dataset type:

**Synthetic prototype dataset**

The dataset is intended only for demonstrating the ML
pipeline and system integration.

It is NOT a medically validated dataset.

---

## Prediction Output

The model first generates a numerical:

**Health-Impact Proxy**

This is then converted into:

- Risk Score
- Risk Level

Risk levels:

- LOW
- MODERATE
- HIGH
- EXTREME

The application layer can additionally convert these results
into human-readable recommendations.

---

## Model Evaluation

Current prototype evaluation:

| Metric | Result |
|---|---:|
| MAE | 1.611 |
| RMSE | 1.872 |
| R² | 0.930 |

Baseline Mean Predictor:

| Metric | Result |
|---|---:|
| MAE | 5.800 |
| R² | -0.076 |

These results are based on the synthetic prototype dataset.

They should NOT be interpreted as clinical accuracy.

---

## Medical Validation

Medical validation:

**False**

This prototype does not claim to predict actual mortality,
hospitalization or medical outcomes with clinical validity.

The predicted value represents a prototype
heat-related health-impact proxy.

---

## API

The prediction engine is exposed using FastAPI.

### Start API

```bash
uvicorn src.api:app --reload