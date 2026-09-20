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
  source_status?: 'LIVE' | 'CACHED' | 'STALE_CACHED' | 'OFFLINE_FALLBACK' | 'UNAVAILABLE';
  source_name?: string;
  is_fallback?: boolean;
  cache_age_seconds?: number;
}

export interface HourlyForecast {
  time: string[];
  temperature: number[];
  humidity: number[];
  apparent_temperature: number[];
  wind_speed?: number[];
  shortwave_radiation?: number[];
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
  utci_c?: number | null;
  utci_category?: string | null;
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
  organization?: string;
  department?: string;
  designation?: string;
  official_id?: string;
  jurisdiction_id?: string;
  jurisdiction_name?: string;
  jurisdiction_type?: 'NATIONAL' | 'STATE' | 'DISTRICT' | 'MUNICIPAL_CORPORATION' | 'WARD' | string;
  permissions?: string[];
  account_status?: 'APPROVED' | 'PENDING_VERIFICATION' | 'SUSPENDED' | string;
  portal_type?: 'CITIZEN' | 'AUTHORITY' | string;
}

export interface JurisdictionContextResponse {
  user_id: number;
  name: string;
  email: string;
  role: string;
  organization?: string | null;
  department?: string | null;
  designation?: string | null;
  official_id?: string | null;
  jurisdiction_id: string;
  jurisdiction_type: string;
  jurisdiction_name: string;
  parent_id?: string | null;
  permissions: string[];
  account_status: string;
  subordinate_jurisdiction_ids: string[];
  can_activate_hap?: boolean;
  is_national: boolean;
  is_state: boolean;
  is_municipal: boolean;
  portal_type?: 'CITIZEN' | 'AUTHORITY' | string;
}

export interface HAPAuditLogItem {
  id: number;
  action_id: string;
  jurisdiction_id: string;
  action_key: string;
  recommended_action: string;
  created_by: string;
  approved_by?: string | null;
  status: string;
  reason_comment?: string | null;
  risk_snapshot_score?: number | null;
  risk_snapshot_level?: string | null;
  activated_at: string;
  created_at: string;
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
  organization?: string;
  department?: string;
  designation?: string;
  official_id?: string;
  jurisdiction_id?: string;
  jurisdiction_type?: string;
  requested_jurisdiction?: string;
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
  region?: string;
  latitude: number;
  longitude: number;
  temperature_c: number;
  humidity_pct: number;
  wind_speed_mps?: number;
  wbgt_c: number;
  heat_index_c?: number;
  risk_score: number;
  risk_level: RiskLevel;
  vulnerability_tag: string;
  summary_advisory: string;
  area_type?: 'prototype_zone' | 'regional_centroid' | 'global_hotspot' | 'global_megacity' | 'national_anchor';
}

export interface GlobalHeatStation {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  baselineTemp: number;
  baselineRh: number;
  baselineWbgt: number;
  baselineHeatIndex: number;
  riskLevel: RiskLevel;
  riskScore: number;
  vulnerabilityIndex: number;
  vulnerabilityTag: string;
  hazardNote: string;
  populationMillions?: number;
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
    geographyVersion?: string;
    sourceUrl?: string;
    datasetId?: string;
    provenanceStatus?: string;
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
  | 'PREPARE_WITHIN_5_DAYS'
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
  bilingual_advisory?: {
    en: string;
    hi: string;
  };
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

export interface ForecastSourceClassification {
  weather_classification: 'REAL_FORECAST' | 'SYNTHETIC_FALLBACK';
  thermal_classification: 'CALCULATED_FROM_FORECAST' | 'CALCULATED_FROM_MODELLED_INPUTS';
  health_classification: 'MODELLED_PROTOTYPE';
  fallback_active: boolean;
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
  prototype_seed_note?: string;
  forecast_source_classification?: ForecastSourceClassification;
  source_status?: string;
  source_name?: string;
}

export interface WardForecastSummaryItem {
  day_index: number;
  day_label: string;
  temperature_c: number;
  humidity?: number;
  wind_speed_ms?: number;
  solar_radiation_wm2?: number;
  wbgt_c: number;
  heat_index_c?: number;
  risk_level: RiskLevel;
  risk_score: number;
  health_concern: string;
  health_concern_color: string;
}

export interface WardForecastSummary {
  ward_id: string;
  area_id?: string;
  ward_code?: string;
  ward_name: string;
  area_name?: string;
  district: string;
  latitude: number;
  longitude: number;
  vulnerability_score: number;
  forecast_days: WardForecastSummaryItem[];
  forecast_status?: string;
  fallback_active?: boolean;
  forecast_source_classification?: ForecastSourceClassification;
  source_status?: string;
  source_name?: string;
  data_timestamp?: string;
  cache_age_seconds?: number;
}

export interface WardsForecastSummaryResponse {
  total_wards?: number;
  real_forecast_wards?: number;
  fallback_wards?: number;
  unavailable_wards?: number;
  count: number;
  wards: WardForecastSummary[];
}

export interface StateHeatAlertProperties {
  id: string;
  stateCode: string;
  stateName: string;
  capitalCity: string;
  alertCategory: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
  riskLevel: RiskLevel;
  imdClassification: string;
  temperatureC: number;
  humidityPercent: number;
  apparentTemperatureC: number;
  wetBulbC: number;
  wbgtC: number;
  vulnerabilityScore: number;
  riskScore: number;
  alertTitle: string;
  alertHeadline: string;
  affectedDistricts: string[];
  affectedPopulationMillion: number;
  actionAdvisories: string[];
  authorityName: string;
  issuedAt: string;
  validUntil: string;
  centroid: [number, number]; // [lon, lat]
}

export interface StateHeatAlertFeature {
  type: 'Feature';
  properties: StateHeatAlertProperties;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
}

export interface StateHeatAlertCollection {
  type: 'FeatureCollection';
  crs?: {
    type: string;
    properties: { name: string };
  };
  features: StateHeatAlertFeature[];
}

export interface NationalStateAlertsResponse extends StateHeatAlertCollection {
  states: StateHeatAlertProperties[];
  statistics: {
    totalStates: number;
    redCount: number;
    orangeCount: number;
    yellowCount: number;
    greenCount: number;
    maxTemp: number;
    maxTempState: string;
    minTemp: number;
    minTempState: string;
    avgTemp: number;
    totalPopulationUnderAlertMillion: number;
    isNight: boolean;
    isLive: boolean;
    updatedAt: string;
  };
}

export * from './notifications';
export * from './provenance';

// ─────────────────────────────────────────────────────────────────────────────
// NATIONAL GIS INTELLIGENCE & ADMINISTRATIVE DRILL-DOWN TYPES (PRE-SIH-26)
// ─────────────────────────────────────────────────────────────────────────────

export type GisDrillDownLevel = 'india' | 'state' | 'district' | 'ward';

export interface NationalHeatCell {
  cell_id: string;
  latitude: number;
  longitude: number;
  state_id: string;
  state_name: string;
  forecast_day: number;
  temperature_c: number;
  relative_humidity_pct: number;
  wind_speed_mps: number;
  shortwave_radiation_wm2: number;
  estimated_wbgt_c: number;
  heat_index_c?: number | null;
  risk_score: number;
  risk_level: RiskLevel;
  source_status: string;
  data_timestamp: string;
  cache_age_seconds: number;
  fallback_active: boolean;
}

export interface StateHeatSummary {
  id: string;
  name: string;
  administrative_level: string;
  sample_count: number;
  mean_temperature_c: number;
  peak_temperature_c: number;
  mean_estimated_wbgt_c: number;
  peak_estimated_wbgt_c: number;
  mean_risk_score: number;
  peak_risk_score: number;
  dominant_risk_level: RiskLevel;
  highest_risk_level: RiskLevel;
  risk_level: RiskLevel; // Conservative peak planning color
  data_quality: string;
  data_quality_summary: {
    real_cells: number;
    cached_cells: number;
    fallback_cells: number;
    unavailable_cells: number;
    overall_status: string;
  };
  centroid: {
    latitude: number;
    longitude: number;
  };
  has_municipal_detail?: boolean;
}

export interface DistrictHeatSummary {
  district_id: string;
  district_name: string;
  state_id: string;
  state_name: string;
  temperature_c: number;
  relative_humidity_pct: number;
  estimated_wbgt_c: number;
  risk_score: number;
  risk_level: RiskLevel;
  has_municipal_detail: boolean;
  centroid: {
    latitude: number;
    longitude: number;
  };
}

export interface NationalHeatRiskResponse {
  coverage: string;
  forecast_day: number;
  forecast_day_label: string;
  generated_at: string;
  grid_resolution: string;
  total_cells: number;
  states_monitored_count: number;
  national_summary: {
    states_monitored: number;
    areas_high: number;
    areas_extreme: number;
    highest_risk_state: string;
    highest_risk_score: number;
    peak_estimated_wbgt_c: number;
    data_quality_status: string;
    last_updated: string;
  };
  data_quality_breakdown: {
    real_cells: number;
    cached_cells: number;
    fallback_cells: number;
    unavailable_cells: number;
    overall_status: string;
  };
  states: StateHeatSummary[];
  cells?: NationalHeatCell[];
  provenance: any;
}

export interface StateHeatRiskResponse {
  state_id: string;
  state_name: string;
  forecast_day: number;
  forecast_day_label: string;
  state_summary: StateHeatSummary;
  districts: DistrictHeatSummary[];
  has_municipal_detail: boolean;
  municipal_system_id?: string | null;
  data_quality: string;
  provenance: any;
}

export interface DistrictHeatRiskResponse {
  district_id: string;
  district_name: string;
  state_id: string;
  state_name: string;
  forecast_day: number;
  forecast_day_label: string;
  district_summary: DistrictHeatSummary;
  has_municipal_detail: boolean;
  municipal_system_id?: string | null;
  municipal_message: string;
  data_quality: string;
  provenance: any;
}




