import axios from 'axios';
import {
  LocationSearchResult,
  WeatherResponse,
  ThermalResponse,
  RiskResponse,
  ForecastResponse,
  InterventionResponse,
  SimulationResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Location Search
  searchLocations: async (query: string): Promise<LocationSearchResult> => {
    const res = await apiClient.get<LocationSearchResult>('/location/search', {
      params: { q: query },
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
    }
  ): Promise<RiskResponse> => {
    const res = await apiClient.get<RiskResponse>('/risk', {
      params: {
        lat,
        lon,
        vulnerability_index: options?.vulnerability_index ?? 30.0,
        historical_health_events: options?.historical_health_events ?? 17,
        lag_health_events: options?.lag_health_events ?? 15,
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
};
