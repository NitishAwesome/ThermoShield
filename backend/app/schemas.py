from pydantic import BaseModel, EmailStr,Field
from datetime import datetime
from typing import List

class UserCreate(BaseModel):
    name: str
    phone_number: str
    email: EmailStr
    role: str = "user"
    organization: str | None = None
    department: str | None = None
    designation: str | None = None
    official_id: str | None = None
    jurisdiction_id: str | None = "IN"
    jurisdiction_type: str | None = "COUNTRY"
    permissions: str | None = ""
    account_status: str = "APPROVED"

class UserResponse(BaseModel):
    id: int
    name: str
    phone_number: str
    email: EmailStr
    role: str
    organization: str | None = None
    department: str | None = None
    designation: str | None = None
    official_id: str | None = None
    jurisdiction_id: str | None = "IN"
    jurisdiction_type: str | None = "COUNTRY"
    permissions: str | None = ""
    account_status: str | None = "APPROVED"
    portal_type: str = "CITIZEN"
    jurisdiction_name: str | None = None

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
    is_acclimatized: bool = True
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
    uv_index: float | None = None
    apparent_temperature_c: float | None = None


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


class SendAlertEmailRequest(BaseModel):
    email: EmailStr
    location_name: str | None = "Current Location"
    lat: float | None = None
    lon: float | None = None
    risk_level: str | None = "HIGH"
    risk_score: float | None = 75.0
    temperature_c: float | None = None
    heat_index_c: float | None = None
    wbgt_c: float | None = None
    interventions: List[str] | None = None
    custom_note: str | None = None


class SendAlertEmailResponse(BaseModel):
    status: str
    message: str
    recipient: str
    sender: str


class AlertSubscriptionRequest(BaseModel):
    email: EmailStr
    name: str | None = None
    phone_number: str | None = None
    location_name: str | None = "Current Location"
    lat: float | None = None
    lon: float | None = None


class AlertSubscriptionResponse(BaseModel):
    status: str
    message: str
    email: str
    is_new_citizen: bool
    auto_alert_active: bool


class SendTestSMSRequest(BaseModel):
    phone_number: str
    location_name: str | None = "Current Monitored Area"
    message: str | None = None


class SendTestSMSResponse(BaseModel):
    success: bool
    status: str
    mode: str
    provider: str
    recipient: str
    message: str
    message_id: str | None = None
    error: str | None = None


class HeatActionEvaluateRequest(BaseModel):
    area_id: str | None = "custom_area"
    area_name: str | None = "Custom Zone"
    temperature_c: float | None = 34.0
    humidity_pct: float | None = 65.0
    wbgt_c: float | None = None
    heat_index_c: float | None = None
    solar_radiation: float | None = None
    wind_speed: float | None = None
    vulnerability_score: float | None = None
    risk_level: str | None = None
    risk_score: float | None = None
    forecast_max_risk: str | None = None
    forecast_trend: str | None = "STEADY"
    forecast_lead_time_hours: int | None = None
    alert_state: str | None = None


class HeatActionDecisionUpdateRequest(BaseModel):
    area_id: str = "general"
    action_key: str
    decision_status: str | None = None
    decision: str | None = None
    officer_name: str | None = None
    officer_notes: str | None = None
    notes: str | None = None


class HAPAuditLogResponse(BaseModel):
    id: int
    action_id: str
    jurisdiction_id: str
    action_key: str
    recommended_action: str | None = None
    created_by: str
    approved_by: str | None = None
    status: str
    reason_comment: str | None = None
    risk_snapshot_score: float | None = None
    risk_snapshot_level: str | None = None
    activated_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class JurisdictionContextResponse(BaseModel):
    user_id: int
    name: str
    email: str | None = None
    role: str
    organization: str | None = None
    department: str | None = None
    designation: str | None = None
    official_id: str | None = None
    jurisdiction_id: str
    jurisdiction_name: str
    jurisdiction_type: str
    parent_id: str | None = None
    permissions: List[str] = []
    account_status: str
    subordinate_jurisdiction_ids: List[str] = []
    can_activate_hap: bool = False
    is_national: bool = False
    is_state: bool = False
    is_municipal: bool = False
    portal_type: str = "AUTHORITY"
