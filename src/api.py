from pathlib import Path

import joblib
import pandas as pd

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from src.risk_model import (
    FEATURES,
    calculate_risk_score,
    get_risk_level
)


# --------------------------------------------------
# PATH
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_FILE = (
    BASE_DIR /
    "models" /
    "risk_model.pkl"
)


# --------------------------------------------------
# LOAD MODEL
# --------------------------------------------------

if not MODEL_FILE.exists():
    raise FileNotFoundError(
        "Model not found. "
        "Run 'python src/risk_model.py' first."
    )

model = joblib.load(
    MODEL_FILE
)


# --------------------------------------------------
# FASTAPI
# --------------------------------------------------

app = FastAPI(
    title="SIH26083 Health Risk Prediction API",
    description=(
        "Prototype API for estimating heat-related "
        "health risk using environmental, thermal, "
        "vulnerability and historical health signals."
    ),
    version="1.0.0"
)


# --------------------------------------------------
# REQUEST SCHEMAS
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
        description="Thermal stress index"
    )


class PredictionRequest(BaseModel):

    location: str

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
        description="3 to 5 day weather and thermal-stress forecast"
    )


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.get("/")
def home():

    return {
        "service":
            "SIH26083 Health Risk Prediction",

        "status":
            "running",

        "model":
            "Random Forest Regressor",

        "forecast_range":
            "3-5 days",

        "type":
            "prototype",

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
        day.day
        for day in request.forecast
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

    for day in request.forecast:

        input_data = {

            "temperature_c":
                day.temperature_c,

            "thermal_stress":
                day.thermal_stress,

            "vulnerability_index":
                request.vulnerability_index,

            "historical_health_events":
                request.historical_health_events,

            "lag_health_events":
                request.lag_health_events
        }


        # Convert input into DataFrame
        input_df = pd.DataFrame(
            [input_data]
        )


        # ------------------------------------------
        # Model prediction
        # ------------------------------------------

        predicted_impact = model.predict(
            input_df[FEATURES]
        )[0]


        # ------------------------------------------
        # Convert prediction to risk score
        # ------------------------------------------

        risk_score = calculate_risk_score(
            predicted_impact
        )


        # ------------------------------------------
        # Determine risk level
        # ------------------------------------------

        risk_level = get_risk_level(
            risk_score
        )


        # ------------------------------------------
        # Store result
        # ------------------------------------------

        results.append({

            "day":
                day.day,

            "predicted_health_impact_proxy":
                round(
                    float(predicted_impact),
                    2
                ),

            "risk_score":
                risk_score,

            "risk_level":
                risk_level
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
            "Random Forest Regressor",

        "prototype":
            True,

        "medical_validation":
            False,

        "forecast":
            results
    }