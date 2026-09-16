import axios from 'axios';
import {
  LocationSearchResult,
  WeatherResponse,
  ThermalResponse,
  RiskResponse,
  ForecastResponse,
  InterventionResponse,
  SimulationResponse,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
  PersonalRiskRequest,
  PersonalRiskResult,
  AreasRiskOverviewResponse,
  AlertDeliveryStatusResponse,
  SendTestSMSRequest,
  SendTestSMSResponse,
  HeatActionPlanResponse,
  HeatActionDecisionUpdateRequest,
  HealthImpactForecastResponse,
  WardsForecastSummaryResponse,
} from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? 'https://thermoshield.onrender.com'
    : 'http://127.0.0.1:8000');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to outgoing requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('thermoshield_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Location Search Endpoint
  searchLocations: async (query: string, signal?: AbortSignal): Promise<LocationSearchResult> => {
    const res = await apiClient.get<LocationSearchResult>('/location/search', {
      params: { q: query },
      signal,
    });
    return res.data;
  },

  // Reverse Geocoding: coordinates → human-friendly place name
  reverseGeocode: async (lat: number, lon: number): Promise<{ name: string; latitude: number; longitude: number }> => {
    const res = await apiClient.get('/location/reverse', {
      params: { lat, lon },
    });
    return res.data;
  },

  // Weather Endpoint
  getWeather: async (lat: number, lon: number): Promise<WeatherResponse> => {
    const res = await apiClient.get<WeatherResponse>('/weather', {
      params: { lat, lon },
    });
    return res.data;
  },

  // Thermal Stress Engine
  getThermal: async (lat: number, lon: number): Promise<ThermalResponse> => {
    const res = await apiClient.get<ThermalResponse>('/thermal', {
      params: { lat, lon },
    });
    return res.data;
  },

  // ML Risk Prediction
  getRisk: async (
    lat: number,
    lon: number,
    options?: {
      vulnerability_index?: number;
      historical_health_events?: number;
      lag_health_events?: number;
      email?: string;
      phone_number?: string;
    }
  ): Promise<RiskResponse> => {
    const res = await apiClient.get<RiskResponse>('/risk', {
      params: {
        lat,
        lon,
        vulnerability_index: options?.vulnerability_index ?? 30.0,
        historical_health_events: options?.historical_health_events ?? 17,
        lag_health_events: options?.lag_health_events ?? 15,
        email: options?.email,
        phone_number: options?.phone_number,
      },
    });
    return res.data;
  },

  // Forecast Endpoint
  getForecast: async (lat: number, lon: number): Promise<ForecastResponse> => {
    const res = await apiClient.get<ForecastResponse>('/forecast', {
      params: { lat, lon },
    });
    return res.data;
  },

  // Multi-location Map Risk
  getMapRisk: async (locations: string[]): Promise<{ count: number; locations: { latitude: number; longitude: number; risk_score: number; risk_level: any }[] }> => {
    const params = new URLSearchParams();
    locations.forEach((loc) => params.append('locations', loc));
    const res = await apiClient.get('/map/risk', { params });
    return res.data;
  },

  // Interventions Recommendation
  getInterventions: async (params: {
    risk_score: number;
    temperature: number;
    humidity: number;
    hour: number;
    vulnerable_population?: number;
  }): Promise<InterventionResponse> => {
    const res = await apiClient.get<InterventionResponse>('/intervention', {
      params: {
        risk_score: params.risk_score,
        temperature: params.temperature,
        humidity: params.humidity,
        hour: params.hour,
        vulnerable_population: params.vulnerable_population ?? 0,
      },
    });
    return res.data;
  },

  // Intervention Simulation
  simulateIntervention: async (params: {
    risk_score: number;
    cooling_center?: boolean;
    outdoor_work_restriction?: boolean;
    hydration_stations?: boolean;
  }): Promise<SimulationResponse> => {
    const res = await apiClient.post<SimulationResponse>(
       '/intervention/simulate',
       null,
       {
         params: {
           risk_score: params.risk_score,
           cooling_center: params.cooling_center ?? false,
           outdoor_work_restriction: params.outdoor_work_restriction ?? false,
           hydration_stations: params.hydration_stations ?? false,
         },
       }
     );
     return res.data;
   },

  // Auth Endpoints
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },

  register: async (data: RegisterCredentials): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  loginWithGoogle: async (credential: string, role: string = 'user'): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/google', { credential, role });
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },

  updateMe: async (data: Partial<User>): Promise<User> => {
    const res = await apiClient.patch<User>('/auth/me', data);
    return res.data;
  },

  // Personal Risk Calculation (Individual Strain Engine)
  calculatePersonalRisk: async (data: PersonalRiskRequest): Promise<PersonalRiskResult> => {
    const res = await apiClient.post<PersonalRiskResult>('/personal-risk/calculate', data);
    return res.data;
  },

  // Multi-Area Heat Risk Overview (Showcases every major area)
  getAreasRiskOverview: async (): Promise<AreasRiskOverviewResponse> => {
    const res = await apiClient.get<AreasRiskOverviewResponse>('/areas/risk-overview');
    return res.data;
  },

  // Global Worldwide Heat Risk Overview (Multi-continent Surveillance)
  getGlobalAreasRiskOverview: async (region?: string): Promise<AreasRiskOverviewResponse> => {
    const res = await apiClient.get<AreasRiskOverviewResponse>('/areas/global-risk-overview', {
      params: region ? { region } : undefined,
    });
    return res.data;
  },

  // Dynamic Candidate Email Dispatch
  sendAlertEmail: async (data: {
    email: string;
    location_name?: string;
    lat?: number;
    lon?: number;
    risk_level?: string;
    risk_score?: number;
    temperature_c?: number;
    heat_index_c?: number;
    wbgt_c?: number;
    interventions?: string[];
    custom_note?: string;
  }): Promise<{ status: string; message: string; recipient: string; sender: string }> => {
    const res = await apiClient.post<{ status: string; message: string; recipient: string; sender: string }>('/alerts/send-email', data);
    return res.data;
  },

  // Automated Citizen Alert Enrollment
  subscribeCitizenAlerts: async (data: {
    email: string;
    name?: string;
    phone_number?: string;
    location_name?: string;
    lat?: number;
    lon?: number;
  }): Promise<{ status: string; message: string; email: string; is_new_citizen: boolean; auto_alert_active: boolean }> => {
    const res = await apiClient.post<{ status: string; message: string; email: string; is_new_citizen: boolean; auto_alert_active: boolean }>('/alerts/subscribe', data);
    return res.data;
  },

  // Proactive Background Early-Warning Monitoring Engine Status
  getAlertEngineStatus: async (): Promise<{
    daemon_running: boolean;
    last_cycle_timestamp: string | null;
    total_cycles_completed: number;
    monitored_areas_count: number;
    monitored_areas: string[];
    last_cycle_results: any[];
    engine: {
      engine_active: boolean;
      monitored_locations_tracked: number;
      cooldown_records_active: number;
      recent_dispatches_count: number;
      recent_dispatches: any[];
    };
  }> => {
    const res = await apiClient.get('/alerts/engine-status');
    return res.data;
  },

  // Trigger On-Demand Proactive Background Cycle
  triggerAlertEngineCycle: async (): Promise<{
    status: string;
    message: string;
    results: any[];
    telemetry: any;
  }> => {
    const res = await apiClient.post('/alerts/engine-trigger');
    return res.data;
  },

  // Multi-Channel Delivery Gateway Status
  getAlertDeliveryStatus: async (): Promise<AlertDeliveryStatusResponse> => {
    const res = await apiClient.get<AlertDeliveryStatusResponse>('/alerts/delivery-status');
    return res.data;
  },

  // Dispatch Test SMS Alert (Live Twilio or Honest Demo Simulation)
  sendTestSMS: async (data: SendTestSMSRequest): Promise<SendTestSMSResponse> => {
    const res = await apiClient.post<SendTestSMSResponse>('/alerts/send-test-sms', data);
    return res.data;
  },

  // Heatwave AI Copilot (Dr. ThermoShield)
  chatWithCopilot: async (data: {
    message: string;
    location?: string;
    temperature_c?: number;
    humidity?: number;
    risk_level?: string;
    risk_score?: number;
    user_role?: string;
    conversation_history?: Array<{ role: string; text: string }>;
    api_key?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{
    reply: string;
    suggested_questions: string[];
    safety_tier: string;
    timestamp: string;
    model_used?: string;
    is_gemini?: boolean;
    emergency_call?: boolean;
    resolved_location?: string;
    resolved_telemetry?: {
      temp: number;
      humidity: number;
      apparent_temperature?: number;
      weather_description?: string;
      risk_level?: string;
      latitude?: number;
      longitude?: number;
      is_query_location?: boolean;
    };
    rag_sources?: string[];
    grounded_authority?: string;
  }> => {
    const res = await apiClient.post<{
      reply: string;
      suggested_questions: string[];
      safety_tier: string;
      timestamp: string;
      model_used?: string;
      is_gemini?: boolean;
      emergency_call?: boolean;
      resolved_location?: string;
      resolved_telemetry?: {
        temp: number;
        humidity: number;
        apparent_temperature?: number;
        weather_description?: string;
        risk_level?: string;
        latitude?: number;
        longitude?: number;
        is_query_location?: boolean;
      };
      rag_sources?: string[];
      grounded_authority?: string;
    }>('/copilot/chat', data);
    return res.data;
  },

  // Heat Action Plan (HAP) Decision Engine (Prompt 21)
  getHeatActionPlan: async (
    areaId: string,
    tempOverride?: number,
    riskOverride?: string
  ): Promise<HeatActionPlanResponse> => {
    const params = new URLSearchParams();
    if (tempOverride !== undefined) params.append('temp_override', tempOverride.toString());
    if (riskOverride) params.append('risk_override', riskOverride);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<HeatActionPlanResponse>(`/api/action-plan/${encodeURIComponent(areaId)}${qs}`);
    return res.data;
  },

  getAllHeatActionPlans: async (): Promise<{ count: number; plans: HeatActionPlanResponse[] }> => {
    const res = await apiClient.get<{ count: number; plans: HeatActionPlanResponse[] }>('/api/action-plan/all');
    return res.data;
  },

  evaluateHeatActionPlan: async (data: any): Promise<HeatActionPlanResponse> => {
    const res = await apiClient.post<HeatActionPlanResponse>('/api/action-plan/evaluate', data);
    return res.data;
  },

  updateActionDecision: async (
    data: HeatActionDecisionUpdateRequest
  ): Promise<{ status: string; message: string; decision: any }> => {
    const res = await apiClient.post<{ status: string; message: string; decision: any }>('/api/action-plan/decision', data);
    return res.data;
  },

  getActionDecisions: async (): Promise<{ count: number; decisions: any[] }> => {
    const res = await apiClient.get<{ count: number; decisions: any[] }>('/api/action-plan/decisions');
    return res.data;
  },

  // 3–5 Day Human Health Impact Forecast (Prompt 22)
  getHealthImpactForecast: async (params: {
    lat?: number;
    lon?: number;
    area_id?: string;
    area_name?: string;
    vulnerability_score?: number;
  }): Promise<HealthImpactForecastResponse> => {
    const q = new URLSearchParams();
    if (params.lat !== undefined) q.append('lat', params.lat.toString());
    if (params.lon !== undefined) q.append('lon', params.lon.toString());
    if (params.area_id) q.append('area_id', params.area_id);
    if (params.area_name) q.append('area_name', params.area_name);
    if (params.vulnerability_score !== undefined) q.append('vulnerability_score', params.vulnerability_score.toString());
    const res = await apiClient.get<HealthImpactForecastResponse>(`/api/forecast/health-impact?${q.toString()}`);
    return res.data;
  },

  getWardsForecastSummary: async (): Promise<WardsForecastSummaryResponse> => {
    const res = await apiClient.get<WardsForecastSummaryResponse>('/api/forecast/wards-summary');
    return res.data;
  },
};


