import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ThermalResponse,
  RiskResponse,
  WeatherResponse,
  MapLocationRisk,
  LocationItem,
} from '../types';
import { LocationSearch } from '../components/LocationSearch';
import { RiskCard } from '../components/RiskCard';
import { WeatherCard } from '../components/WeatherCard';
import { ThermalCard } from '../components/ThermalCard';
import { RiskMap } from '../components/RiskMap';
import { ForecastChart } from '../components/ForecastChart';
import { AlertBanner } from '../components/AlertBanner';
import { LoadingState } from '../components/LoadingState';
import { AlertCircle, RefreshCw } from 'lucide-react';

const REGIONAL_COORDINATES = [
  '19.0760,72.8777', // Mumbai
  '28.6139,77.2090', // Delhi
  '26.9124,75.7873', // Jaipur
  '12.9716,77.5946', // Bengaluru
  '13.0827,80.2707', // Chennai
  '23.0225,72.5714', // Ahmedabad
  '22.5726,88.3639', // Kolkata
];

import { getCachedData, setCachedData } from '../services/cache';

export const Dashboard: React.FC = () => {
  // Default coordinate: Mumbai (19.0760, 72.8777)
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: 19.076,
    lon: 72.8777,
  });
  const [locationName, setLocationName] = useState<string>('Mumbai, Maharashtra');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [mapLocations, setMapLocations] = useState<MapLocationRisk[]>([]);
  const [isLoadingMap, setIsLoadingMap] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mlRiskError, setMlRiskError] = useState<string | null>(null);

  const fetchData = async (lat: number, lon: number) => {
    // 1. Instant Cache Check for instantaneous UI rendering
    const cached = getCachedData(lat, lon);
    if (cached?.thermal) {
      setThermalData(cached.thermal);
      setWeatherData({
        location: cached.thermal.location,
        weather: cached.thermal.weather,
      });
      if (cached.risk) setRiskData(cached.risk);
      if (cached.mapLocations) setMapLocations(cached.mapLocations);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    setError(null);
    setMlRiskError(null);
    setMapError(null);

    try {
      // Parallel fetch for thermal stress, ML risk, and map risk
      // Note: /thermal already contains the exact weather payload, avoiding duplicate /weather call
      const [thermalRes, riskRes, mapRes] = await Promise.allSettled([
        api.getThermal(lat, lon),
        api.getRisk(lat, lon),
        api.getMapRisk([`${lat.toFixed(4)},${lon.toFixed(4)}`]),
      ]);

      let updatedThermal: ThermalResponse | null = null;
      let updatedRisk: RiskResponse | null = null;
      let updatedMap: MapLocationRisk[] = [];

      // 1. Primary Thermal Engine (includes complete weather payload)
      if (thermalRes.status === 'fulfilled') {
        updatedThermal = thermalRes.value;
        setThermalData(thermalRes.value);
        setWeatherData({
          location: thermalRes.value.location,
          weather: thermalRes.value.weather,
        });
      } else {
        console.error('Thermal API call failed:', thermalRes.reason);
      }

      // 2. ML Risk Prediction (Non-blocking fallback)
      if (riskRes.status === 'fulfilled') {
        updatedRisk = riskRes.value;
        setRiskData(riskRes.value);
      } else {
        console.warn('ML Risk model currently unavailable:', riskRes.reason);
        setRiskData(null);
        setMlRiskError('Health-risk prediction currently unavailable.');
      }

      // 3. Map Risk Geospatial Layer (Non-blocking fallback)
      if (mapRes.status === 'fulfilled') {
        updatedMap = mapRes.value.locations || [];
        setMapLocations(updatedMap);
        setMapError(null);
      } else {
        console.warn('Map risk layer failed to load:', mapRes.reason);
        setMapLocations([]);
        setMapError('Failed to load geospatial risk layer from server');
      }

      // Update cache
      if (updatedThermal) {
        setCachedData(lat, lon, {
          thermal: updatedThermal,
          risk: updatedRisk,
          mapLocations: updatedMap,
        });
      }

      // If core thermal fails and no cached data exists, notify user
      if (thermalRes.status === 'rejected' && !cached?.thermal) {
        setError('Failed to connect to ThermoShield backend API. Ensure FastAPI server is running on port 8000.');
      }
    } catch (err: any) {
      if (!cached?.thermal) {
        setError(err.message || 'An unexpected error occurred while fetching thermal intelligence.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(coords.lat, coords.lon);
  }, [coords.lat, coords.lon]);

  const handleSelectLocation = (loc: LocationItem) => {
    setLocationName(loc.name);
    setCoords({ lat: loc.latitude, lon: loc.longitude });
  };

  const handleMapClick = (lat: number, lon: number) => {
    setLocationName(`Custom (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`);
    setCoords({ lat, lon });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLocationName(`Current GPS (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`);
        setCoords({ lat, lon });
      },
      (err) => {
        setIsLocating(false);
        alert(`Location permission denied or unavailable: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls: Search Bar & Location Detect */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <LocationSearch
          currentLocationName={locationName}
          onSelectLocation={handleSelectLocation}
          onUseMyLocation={handleUseMyLocation}
          isLocating={isLocating}
        />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Connection Warning</p>
              <p className="text-xs text-red-200 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(coords.lat, coords.lon)}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-bold text-red-200 flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {isLoading && !thermalData ? (
        <LoadingState message="Connecting to ThermoShield Heat Health Engine..." />
      ) : (
        <>
          {/* Prominent Alert Banner (When available) */}
          {thermalData?.thermal?.risk_assessment && (
            <AlertBanner
              riskAssessment={thermalData.thermal.risk_assessment}
              hydration={thermalData.thermal.hydration}
              activity={thermalData.thermal.activity_guidance}
              vulnerable={thermalData.thermal.vulnerable_population}
            />
          )}

          {/* Top Row: Overall Risk Card + Live Weather Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskCard
              riskAssessment={thermalData?.thermal?.risk_assessment}
              mlRiskScore={riskData?.risk?.risk_score}
              mlRiskLevel={riskData?.risk?.risk_level}
              mlRiskError={mlRiskError}
              locationName={locationName}
            />

            <WeatherCard weather={thermalData?.weather || weatherData?.weather} />
          </div>

          {/* Middle Row: Interactive Leaflet Map with Real /map/risk Data */}
          <RiskMap
            center={[coords.lat, coords.lon]}
            locationName={locationName}
            temperature={thermalData?.weather?.temperature}
            humidity={thermalData?.weather?.humidity}
            wbgt={thermalData?.thermal?.indices?.wbgt_c}
            riskLevel={thermalData?.thermal?.risk_assessment?.level}
            riskScore={thermalData?.thermal?.risk_assessment?.score}
            mapLocations={mapLocations}
            isLoadingMap={isLoadingMap}
            mapError={mapError}
            onMapClick={handleMapClick}
          />

          {/* Bottom Row: Core Biometeorological Indices + Explainability Breakdown */}
          <ThermalCard
            indices={thermalData?.thermal?.indices}
            riskAssessment={thermalData?.thermal?.risk_assessment}
          />

          {/* 5-Day Synoptic Weather Forecast Area Chart */}
          {weatherData?.forecast && <ForecastChart forecast={weatherData.forecast} />}
        </>
      )}
    </div>
  );
};
