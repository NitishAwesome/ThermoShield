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
}

export interface DailyForecast {
  dates: string[];
  max_temperature: number[];
  min_temperature: number[];
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

export interface RiskResponse {
  location: {
    latitude: number;
    longitude: number;
  };
  weather?: WeatherCondition;
  risk: MLRiskData;
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
