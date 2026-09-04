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

    smoking: bool

    health_conditions: List[str] = []

    physical_activity: str = "moderate"