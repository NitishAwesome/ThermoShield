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
}

export interface DailyForecast {
  dates: string[];
  max_temperature: number[];
  min_temperature: number[];
  apparent_temperature_max?: number[];
  apparent_temperature_min?: number[];
  uv_index_max?: number[];
  weather_code?: number[];
}

export interface WeatherResponse {
  location: {
    latitude: number;
    longitude: number;
  };
  weather: WeatherCondition;
  forecast?: DailyForecast;
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
  wbgt_c: number;
  risk_score: number;
  risk_level: RiskLevel;
  vulnerability_tag: string;
  summary_advisory: string;
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

  updatedAt?: string;
}
