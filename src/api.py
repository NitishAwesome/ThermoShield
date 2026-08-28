from pathlib import Path

import joblib

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from src.risk_model import (
    HEATWAVE_FEATURES,
    predict_heatwave
)


# --------------------------------------------------
# PATH
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_FILE = (
    BASE_DIR
    / "models"
    / "heatwave_model.pkl"
)


# --------------------------------------------------
# LOAD MODEL
# --------------------------------------------------

if not MODEL_FILE.exists():
    raise FileNotFoundError(
        "Heatwave model not found. "
        "Run 'python src/risk_model.py' first."
    )

model = joblib.load(
    MODEL_FILE
)


# --------------------------------------------------
# FASTAPI
# --------------------------------------------------

app = FastAPI(
    title="SIH26083 Heatwave Risk Prediction API",
    description=(
        "Prototype API for predicting future "
        "heat-risk levels using environmental, "
        "thermal, vulnerability and health signals."
    ),
    version="2.1.0"
)


# --------------------------------------------------
# FORECAST DAY SCHEMA
# --------------------------------------------------

class ForecastDay(BaseModel):

    day: int = Field(
        ...,
        ge=1,
        le=5,
        description="Forecast day (1 to 5)"
    )

    temperature_c: float = Field(
        ...,
        description="Forecast temperature in Celsius"
    )

    thermal_stress: float = Field(
        ...,
        ge=0,
        le=100,
        description="Forecast thermal stress index"
    )

    temperature_trend: float = Field(
        ...,
        description=(
            "Temperature change from "
            "previous day"
        )
    )

    thermal_stress_trend: float = Field(
        ...,
        description=(
            "Thermal stress change from "
            "previous day"
        )
    )


# --------------------------------------------------
# REQUEST SCHEMA
# --------------------------------------------------

class PredictionRequest(BaseModel):

    location: str = Field(
        ...,
        description="Ward or geographic location"
    )

    vulnerability_index: float = Field(
        ...,
        ge=0,
        le=100,
        description="Population vulnerability index"
    )

    historical_health_events: int = Field(
        ...,
        ge=0,
        description="Historical health-event signal"
    )

    lag_health_events: int = Field(
        ...,
        ge=0,
        description="Recent health-event signal"
    )

    forecast: list[ForecastDay] = Field(
        ...,
        min_length=3,
        max_length=5,
        description=(
            "3 to 5 day weather and "
            "thermal-stress forecast"
        )
    )


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.get("/")
def home():

    return {

        "service":
            "SIH26083 Heatwave Risk Prediction",

        "status":
            "running",

        "model":
            "Random Forest Classifier",

        "classes":
            [
                "LOW",
                "MODERATE",
                "HIGH",
                "EXTREME"
            ],

        "forecast_range":
            "3-5 days",

        "primary_horizon":
            "3 days",

        "type":
            "prototype",

        "medical_validation":
            False
    }


# --------------------------------------------------
# MODEL INFORMATION
# --------------------------------------------------

@app.get("/model-info")
def model_info():

    return {

        "model":
            "Random Forest Classifier",

        "features":
            HEATWAVE_FEATURES,

        "target":
            "future_risk_level",

        "classes":
            [
                str(label)
                for label in model.classes_
            ],

        "forecast_horizon":
            "3 days",

        "supported_forecast_range":
            "3-5 days",

        "medical_validation":
            False
    }


# --------------------------------------------------
# PREDICTION API
# --------------------------------------------------

@app.post("/predict")
def predict(
    request: PredictionRequest
):

    # ----------------------------------------------
    # Validate forecast day sequence
    # ----------------------------------------------

    days = [
        forecast_day.day
        for forecast_day in request.forecast
    ]

    expected_days = list(
        range(1, len(days) + 1)
    )

    if days != expected_days:

        raise HTTPException(
            status_code=400,
            detail=(
                "Forecast days must be sequential "
                "starting from day 1."
            )
        )


    # ----------------------------------------------
    # Generate predictions
    # ----------------------------------------------

    results = []

    for forecast_day in request.forecast:

        input_data = {

            "temperature_c":
                forecast_day.temperature_c,

            "thermal_stress":
                forecast_day.thermal_stress,

            "vulnerability_index":
                request.vulnerability_index,

            "historical_health_events":
                request.historical_health_events,

            "lag_health_events":
                request.lag_health_events,

            "temperature_trend":
                forecast_day.temperature_trend,

            "thermal_stress_trend":
                forecast_day.thermal_stress_trend
        }


        # ------------------------------------------
        # Heatwave model prediction
        # ------------------------------------------

        prediction = predict_heatwave(
            model,
            input_data
        )


        # ------------------------------------------
        # Store prediction
        # ------------------------------------------

        results.append({

            "day":
                forecast_day.day,

            "temperature_c":
                forecast_day.temperature_c,

            "thermal_stress":
                forecast_day.thermal_stress,

            "temperature_trend":
                forecast_day.temperature_trend,

            "thermal_stress_trend":
                forecast_day.thermal_stress_trend,

            "prediction":
                prediction["prediction"],

            "probability":
                prediction["probability"],

            "confidence":
                prediction["confidence"],

            "all_probabilities":
                prediction["all_probabilities"]
        })


    # ----------------------------------------------
    # Final response
    # ----------------------------------------------

    return {

        "location":
            request.location,

        "forecast_days":
            len(results),

        "model":
            "Random Forest Classifier",

        "prediction_type":
            "Heatwave risk classification",

        "forecast_horizon":
            "3 days",

        "forecast":
            results,

        "prototype":
            True,

        "medical_validation":
            False
    }