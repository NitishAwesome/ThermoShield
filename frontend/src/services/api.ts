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
};


