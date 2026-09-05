from pydantic import BaseModel, EmailStr,Field
from datetime import datetime
from typing import List

class UserCreate(BaseModel):
    name: str
    phone_number: str
    email: EmailStr
    role: str = "user"

class UserResponse(BaseModel):
    id: int
    name: str
    phone_number: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True

class LocationCreate(BaseModel):
    name: str
    latitude: float
    longitude: float

class LocationResponse(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    class Config:
        from_attributes = True

class RiskCreate(BaseModel):
    location_id: int
    temperature_c: float
    thermal_stress: float
    heat_index: float | None = None
    wbgt: float | None = None
    predicted_health_impact_proxy: float | None = None
    risk_score: float
    risk_level: str

class RiskResponse(BaseModel):
    id: int
    location_id: int
    temperature_c: float
    thermal_stress: float
    heat_index: float | None
    wbgt: float | None
    predicted_health_impact_proxy: float | None
    risk_score: float
    risk_level: str
    created_at: datetime
    class Config:
        from_attributes = True

class AlertCreate(BaseModel):
    user_id: int
    location_id: int
    risk_level: str
    risk_score: float
    message: str
    status: str = "PENDING"
    phone_number: str | None = None
    reference_id: str | None = None


class AlertResponse(BaseModel):
    id: int
    user_id: int
    location_id: int
    risk_level: str
    risk_score: float
    message: str
    status: str
    phone_number: str | None
    reference_id: str | None
    created_at: datetime

    class Config:
        from_attributes = True

class InterventionCreate(BaseModel):
    location_id: int
    risk_id: int
    cooling_center: bool = False
    hydration_station: bool = False
    outdoor_work_restriction: bool = False
    before_risk_score: float
    after_risk_score: float


class InterventionResponse(BaseModel):
    id: int
    location_id: int
    risk_id: int
    cooling_center: bool
    hydration_station: bool
    outdoor_work_restriction: bool
    before_risk_score: float
    after_risk_score: float
    created_at: datetime

    class Config:
        from_attributes = True
class PersonalRiskInput(BaseModel):
    age: int = Field(..., ge=1, le=120)
    smoking: bool = False
    health_conditions: List[str] = []
    physical_activity: str = "moderate"
    is_pregnant: bool = False
    hydration_status: str = "moderate"
    outdoor_exposure_hours: float = Field(1.0, ge=0.0, le=24.0)
    clothing_type: str = "standard"
    temperature_c: float | None = None
    humidity_pct: float | None = None
    wbgt_c: float | None = None
    solar_radiation: float | None = None


class PersonalRiskFactorContribution(BaseModel):
    factor: str
    contribution: float
    category: str
    description: str


class PersonalRiskResponse(BaseModel):
    risk_score: float
    risk_level: str
    heat_strain_level: str
    alert: str
    recommended_water_intake_ml_hr: int
    work_rest_cycle: str
    risk_factors_breakdown: List[PersonalRiskFactorContribution] = []
    safety_recommendations: List[str] = []


class AreaRiskOverviewItem(BaseModel):
    name: str
    state: str
    zone: str
    latitude: float
    longitude: float
    temperature_c: float
    humidity_pct: float
    wbgt_c: float
    risk_score: float
    risk_level: str
    vulnerability_tag: str
    summary_advisory: str


class AreaRiskOverviewResponse(BaseModel):
    count: int
    updated_at: str
    areas: List[AreaRiskOverviewItem]