from fastapi import APIRouter

from app.schemas import PersonalRiskInput, PersonalRiskResponse
from app.services.personal_risk import calculate_personal_risk


router = APIRouter(
    prefix="/personal-risk",
    tags=["Personal Risk"]
)


@router.post("/calculate", response_model=PersonalRiskResponse)
def calculate_risk(data: PersonalRiskInput):
    result = calculate_personal_risk(
        age=data.age,
        smoking=data.smoking,
        health_conditions=data.health_conditions,
        physical_activity=data.physical_activity,
        is_pregnant=data.is_pregnant,
        hydration_status=data.hydration_status,
        outdoor_exposure_hours=data.outdoor_exposure_hours,
        clothing_type=data.clothing_type,
        temperature_c=data.temperature_c,
        humidity_pct=data.humidity_pct,
        wbgt_c=data.wbgt_c,
        solar_radiation=data.solar_radiation,
    )

    return result