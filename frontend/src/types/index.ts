export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'CRITICAL';

export interface LocationItem {
  name: string;
  latitude: number;
  longitude: number;
}

export interface LocationSearchResult {
  count: number;
  locations: LocationItem[];
}

export interface WeatherCondition {
  temperature: number;
  humidity: number;
  wind_speed: number;
  solar_radiation: number | null;
  time: string;
  apparent_temperature?: number;
  uv_index?: number;
  weather_code?: number;
  weather_description?: string;
  weather_icon?: string;
  precipitation?: number;
  wind_direction?: number;
  source_status?: 'LIVE' | 'OFFLINE_FALLBACK';
  source_name?: string;
  is_fallback?: boolean;
}

export interface HourlyForecast {
  time: string[];
  temperature: number[];
  humidity: number[];
  apparent_temperature: number[];
  uv_index: number[];
  is_day: number[];
}

export interface DailyForecast {
  dates: string[];
  max_temperature: number[];
  min_temperature: number[];
  apparent_temperature_max?: number[];
  apparent_temperature_min?: number[];
  uv_index_max?: number[];
  weather_code?: number[];
  hourly?: HourlyForecast;
}

export interface WeatherResponse {
  location: {
    latitude: number;
    longitude: number;
  };
  weather: WeatherCondition;
  forecast?: DailyForecast;
  source_status?: 'LIVE' | 'OFFLINE_FALLBACK';
  source_name?: string;
  is_fallback?: boolean;
}

export interface ThermalIndices {
  wbgt_c: number;
  heat_index_c: number | null;
  apparent_temperature_c: number;
  wet_bulb_temp_c: number;
  heat_index_status: 'VALID' | 'OUTSIDE_VALIDATED_RANGE' | 'NOT_APPLICABLE_COOL';
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  primary_index: string;
  reason: string;
  color_code: string;
  alert_category: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  risk_basis: string[];
  environmental_factors: string[];
}

export interface HydrationGuidance {
  priority: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommended_interval: string;
  approximate_amount_ml: number | null;
  water_ml_per_30_min: number | null;
  electrolytes_recommended: boolean;
  guidance: string;
  basis: string;
}

export interface ActivityGuidance {
  outdoor_activity: string;
  heavy_physical_work: string;
  rest_guidance: string;
  peak_heat_hours: string;
}

export interface VulnerablePopulationGuidance {
  priority: boolean;
  groups: string[];
  guidance: string;
}

export interface ThermalResponse {
  location: {
    latitude: number;
    longitude: number;
  };
  weather: WeatherCondition;
  thermal: {
    indices: ThermalIndices;
    risk_assessment: RiskAssessment;
    advisories: string[];
    hydration?: HydrationGuidance;
    activity_guidance?: ActivityGuidance;
    vulnerable_population?: VulnerablePopulationGuidance;
    input_summary: {
      temperature_c: number;
      relative_humidity_pct: number;
      wind_speed_mps: number;
      solar_radiation_wm2: number | null;
    };
  };
  forecast?: DailyForecast;
}

export interface MLRiskData {
  predicted_health_impact_proxy: number;
  risk_score: number;
  risk_level: RiskLevel;
}

export interface RiskFactorItem {
  factor: string;
  contribution: number;
  observed_value?: string;
  category: string;
  description: string;
}

export interface RiskResponse {
  location: {
    id: number | null;
    name: string | null;
    latitude: number;
    longitude: number;
  };
  weather?: WeatherCondition;
  risk: MLRiskData;
  risk_factors?: RiskFactorItem[];
  thermal: {
    heat_index: number | null;
    thermal_stress: number;
    thermal_risk_level: RiskLevel;
    wbgt: number;
    apparent_temperature: number;
    wet_bulb_temperature: number;
  };
}

export interface ForecastResponse {
  location: {
    latitude: number;
    longitude: number;
  };
  forecast: DailyForecast;
  source_status?: 'LIVE' | 'OFFLINE_FALLBACK';
  source_name?: string;
  is_fallback?: boolean;
}

export interface MapLocationRisk {
  latitude: number;
  longitude: number;
  risk_score: number;
  risk_level: RiskLevel;
}

export interface MapRiskResponse {
  count: number;
  locations: MapLocationRisk[];
}

export interface InterventionResponse {
  risk_score: number;
  priority: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
}

export interface SimulationResponse {
  current_risk: number;
  projected_risk: number;
  risk_reduction: number;
  projected_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface User {
  id: number;
  name: string;
  phone_number: string;
  email: string;
  role: 'user' | 'official' | 'responder' | 'analyst' | string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  phone_number: string;
  password: string;
  role?: string;
}

export interface PersonalRiskRequest {
  age: number;
  smoking?: boolean;
  is_acclimatized?: boolean;
  health_conditions?: string[];
  physical_activity?: 'sedentary' | 'light' | 'moderate' | 'heavy' | string;
  is_pregnant?: boolean;
  hydration_status?: 'well_hydrated' | 'moderate' | 'dehydrated' | string;
  outdoor_exposure_hours?: number;
  clothing_type?: 'light' | 'standard' | 'heavy_protective' | string;
  temperature_c?: number | null;
  humidity_pct?: number | null;
  wbgt_c?: number | null;
  solar_radiation?: number | null;
  uv_index?: number | null;
  apparent_temperature_c?: number | null;
}

export interface PersonalRiskFactorContribution {
  factor: string;
  contribution: number;
  category: string;
  description: string;
}

export interface PersonalRiskResult {
  risk_score: number;
  risk_level: RiskLevel;
  heat_strain_level: string;
  alert: string;
  recommended_water_intake_ml_hr: number;
  work_rest_cycle: string;
  risk_factors_breakdown: PersonalRiskFactorContribution[];
  safety_recommendations: string[];
}

export interface AreaRiskItem {
  name: string;
  state: string;
  zone: string;
  latitude: number;
  longitude: number;
  temperature_c: number;
  humidity_pct: number;
  wind_speed_mps?: number;
  wbgt_c: number;
  risk_score: number;
  risk_level: RiskLevel;
  vulnerability_tag: string;
  summary_advisory: string;
  area_type?: 'prototype_zone' | 'regional_centroid';
}

export interface ThermalZone {
  id: string;
  name: string;
  shortName: string;
  district: string;
  zone: string;
  representativeCoords: [number, number]; // [lat, lon]
  polygon: [number, number][]; // [[lat, lon], ...]
  baselineTempOffsetC: number;
  vulnerabilityIndex: number;
  vulnerabilityFactors: string[];
  demographicsNote: string;
  areaType: 'prototype_zone';
}

export interface HeatRiskArea {
  id: string;
  name: string;
  wardCode?: string;
  district?: string;
  localities?: string[];

  geographyType:
    | 'official_ward'
    | 'municipal_zone'
    | 'prototype_zone'
    | 'regional_centroid';

  geometry?: any;
  polygonRings?: [number, number][][];

  centroid: {
    latitude: number;
    longitude: number;
  };

  weather: {
    temperatureC: number;
    humidityPercent: number;
    windSpeedMps: number;
    solarRadiationWm2: number;
  };

  thermal: {
    wetBulbC: number;
    estimatedWbgtC: number;
    heatIndexC: number;
  };

  vulnerability: {
    score: number;
    source: 'real' | 'modelled' | 'prototype';
  };

  risk: {
    score: number;
    level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  };

  trend: 'RISING' | 'STABLE' | 'IMPROVING';

  provenance?: {
    sourceName: string;
    sourceType: string;
    boundaryLevel: string;
    retrievedAt: string;
    license: string;
  };

  microclimateOffsetC?: number;
  demographicsNote?: string;
  attentionReason?: string;
}

export interface AreasRiskOverviewResponse {
  count: number;
  updated_at: string;
  areas: AreaRiskItem[];
}

export interface UserHealthProfile {
  conditions: string[]; // e.g. 'heart_disease', 'asthma', 'diabetes', 'kidney_disease', 'hypertension', 'mobility'
  isPregnant: boolean;
  isOlderAdult: boolean;
  isChild: boolean;
  isOutdoorWorker: boolean;
  hasHeatIllnessHistory: boolean;
  takesMedication: boolean;
  smoking: boolean;
  notes?: string;
}

export interface UserExposureProfile {
  dailyOutdoorTime: 'mostly_indoors' | 'mixed' | 'mostly_outdoors';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'heavy';
  typicalPeakExposure: 'morning' | 'afternoon' | 'evening' | 'multiple';
  coolingAccess: 'reliable' | 'limited' | 'none';
  clothingType: 'light' | 'standard' | 'heavy_protective';
  isAcclimatized: boolean;
  hydrationHabit: 'well_hydrated' | 'moderate' | 'dehydrated';
}

export interface UserEmergencyPreparedness {
  hasDrinkingWaterAccess: boolean;
  hasCoolingAccess: boolean;
  hasShadeAccess: boolean;
  knowsCoolingCenter: boolean;
}

export type NotificationMode = 'essential' | 'smart' | 'personalized' | 'quiet';

export interface HeatSafetyAlertPreferences {
  criticalRiskChanges: boolean;
  extremeWarnings: boolean;
  suddenWorsening: boolean;
  personalRiskChanges: boolean;
}

export interface PersonalReminderPreferences {
  smartHydration: boolean;
  restBreaks: boolean;
  outdoorExposure: boolean;
  safetyActions: boolean;
}

export interface PreferredConditionsPreferences {
  saferConditionsWindow: boolean;
  sunlightDecrease: boolean;
  temperatureThreshold: boolean;
  rainConditions: boolean;
  shadeFriendlyHours: boolean;
}

export interface LocationContextPreferences {
  autoLocationMonitoring: boolean;
  useCurrentLocationForAlerts: boolean;
  severeHeatCheckIn: boolean;
}

export interface FamilyVulnerablePreferences {
  vulnerableFamilyReminders: boolean;
  selectedProfilesAlerts: boolean;
  severeHeatFamilyCheck: boolean;
}

export interface NotificationPreferences {
  mode: NotificationMode;
  heatSafety: HeatSafetyAlertPreferences;
  personalReminders: PersonalReminderPreferences;
  preferredConditions: PreferredConditionsPreferences;
  locationContext: LocationContextPreferences;
  familyProtection: FamilyVulnerablePreferences;
  updatedAt?: string;
}

export interface UserPreferences {
  preferredLanguage: string;
  autoSyncLocation: boolean;
  emailAlerts: boolean;
}

export interface UserProfile {
  id?: number | string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  age: number | null;
  gender?: string;
  role: 'user' | 'official' | 'responder' | 'analyst' | string;
  
  // Primary Location
  city: string;
  state: string;
  district?: string;
  latitude?: number;
  longitude?: number;

  // Professional context for officials/responders/analysts
  organization?: string;
  jurisdiction?: string;
  department?: string;

  // Citizen health & daily exposure
  health: UserHealthProfile;
  exposure: UserExposureProfile;
  preparedness: UserEmergencyPreparedness;
  preferences: UserPreferences;
  notificationPreferences?: NotificationPreferences;
  familyProtectionMembers?: FamilyVulnerableMember[];

  updatedAt?: string;
}

export type SituationalContextType = 'indoors' | 'outdoors' | 'travelling' | 'prefer_not_to_say';

export interface SituationalCheckInState {
  currentContext: SituationalContextType | null;
  checkedInAt: number | null; // timestamp in ms
  dismissedUntil: number | null; // timestamp in ms
}

export type VulnerableCategory = 'older_adult' | 'child' | 'outdoor_worker' | 'special_care';

export interface FamilyVulnerableMember {
  id: string;
  category: VulnerableCategory;
  nickname?: string;
  notes?: string;
  addedAt: string;
}

export interface ChannelDeliveryStatus {
  status: string;
  display_status: string;
  mode?: string;
  provider?: string;
  configured: boolean;
  can_deliver: boolean;
  channel: string;
  sender?: string;
  from_number?: string;
  note?: string;
}

export interface AlertDeliveryStatusResponse {
  sms: ChannelDeliveryStatus;
  email: ChannelDeliveryStatus;
  whatsapp: ChannelDeliveryStatus;
}

export interface SendTestSMSRequest {
  phone_number: string;
  location_name?: string;
  message?: string;
}

export interface SendTestSMSResponse {
  success: boolean;
  status: string;
  mode: string;
  provider: string;
  recipient: string;
  message: string;
  message_id?: string;
  error?: string;
}

// =========================================================================
// HEAT ACTION PLAN (HAP) & EARLY WARNING TYPES (PROMPT 21)
// =========================================================================

export type HeatActionCategory =
  | 'COOLING'
  | 'OUTDOOR_WORK'
  | 'HYDRATION'
  | 'HEALTH_PREPAREDNESS'
  | 'INFRASTRUCTURE';

export type HeatActionTriggerState =
  | 'ACTION_REVIEW_REQUIRED_NOW'
  | 'PREPARE_WITHIN_24_HOURS'
  | 'PREPARE_WITHIN_3_DAYS'
  | 'MONITOR_NORMAL_BASELINE';

export interface HeatActionItem {
  category: HeatActionCategory;
  action: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  justification: string;
  decision_status?: string;
  decision_officer?: string;
  decision_notes?: string;
  decision_timestamp?: string;
}

export interface HeatActionPlanResponse {
  area_id: string;
  area_name: string;
  risk_level: RiskLevel;
  risk_score: number;
  trigger_state: HeatActionTriggerState;
  trigger_reasons: string[];
  action_count: number;
  recommended_actions: HeatActionItem[];
  evaluated_telemetry: Record<string, any>;
}

export interface HeatActionDecisionUpdateRequest {
  area_id: string;
  action_key: string;
  decision_status: 'Reviewed' | 'Acknowledged' | 'Deferred' | 'Action Initiated Externally' | string;
  officer_name?: string;
  officer_notes?: string;
}

// =========================================================================
// 3–5 DAY HUMAN HEALTH IMPACT FORECAST TYPES (PROMPT 22)
// =========================================================================

export interface HealthImpactForecastDay {
  day_index: number;
  day_label: string;
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  apparent_temp_max_c: number;
  estimated_wbgt_c: number;
  heat_index_c: number;
  uv_index_max: number;
  thermal_risk_level: RiskLevel;
  thermal_risk_score: number;
  vulnerability_score: number;
  projected_health_impact_proxy: number;
  civic_health_concern: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL';
  civic_health_label: string;
  civic_health_description: string;
  civic_health_color: string;
  trigger_state: HeatActionTriggerState;
}

export interface HealthImpactForecastResponse {
  area_id: string;
  area_name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  days_count: number;
  forecast_days: HealthImpactForecastDay[];
  lead_time_intelligence: {
    first_high_risk_day: string | null;
    first_extreme_risk_day: string | null;
    lead_time_hours: number | null;
    peak_concern_day: string;
    peak_concern_date: string;
    peak_concern_score: number;
    relief_day: string;
    summary_directive: string;
  };
  ml_transparency_disclaimer: string;
  source_status?: string;
  source_name?: string;
}

export interface WardForecastSummaryItem {
  day_index: number;
  day_label: string;
  temperature_c: number;
  wbgt_c: number;
  risk_level: RiskLevel;
  risk_score: number;
  health_concern: string;
  health_concern_color: string;
}

export interface WardForecastSummary {
  ward_id: string;
  ward_name: string;
  district: string;
  latitude: number;
  longitude: number;
  vulnerability_score: number;
  forecast_days: WardForecastSummaryItem[];
}

export interface WardsForecastSummaryResponse {
  count: number;
  wards: WardForecastSummary[];
}

export * from './notifications';
export * from './provenance';


