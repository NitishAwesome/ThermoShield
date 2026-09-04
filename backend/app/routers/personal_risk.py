from fastapi import APIRouter

from app.schemas import PersonalRiskInput
from app.services.personal_risk import calculate_personal_risk


router = APIRouter(
    prefix="/personal-risk",
    tags=["Personal Risk"]
)


@router.post("/calculate")
def calculate_risk(data: PersonalRiskInput):
    result = calculate_personal_risk(
        age=data.age,
        smoking=data.smoking,
        health_conditions=data.health_conditions,
        physical_activity=data.physical_activity,
    )

    return result