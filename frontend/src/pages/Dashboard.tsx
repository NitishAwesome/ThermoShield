import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ThermalResponse,
  RiskResponse,
  WeatherResponse,
  MapLocationRisk,
} from '../types';
import { LocationSearch } from '../components/LocationSearch';
import { RiskCard } from '../components/RiskCard';
import { WeatherCard } from '../components/WeatherCard';
import { ThermalCard } from '../components/ThermalCard';
import { RiskMap } from '../components/RiskMap';
import { ForecastChart } from '../components/ForecastChart';
import { AlertBanner } from '../components/AlertBanner';
import { LoadingState } from '../components/LoadingState';
import { AlertCircle, RefreshCw, HeartPulse, Sparkles, Globe, UserCheck, ArrowRight } from 'lucide-react';
import { getCachedData, setCachedData } from '../services/cache';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { AreaRiskShowcase } from '../components/AreaRiskShowcase';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { coords, locationName, isLocating, setLocation, setCoordsAndName, detectMyLocation } = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [mapLocations, setMapLocations] = useState<MapLocationRisk[]>([]);
  const [isLoadingMap, setIsLoadingMap] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mlRiskError, setMlRiskError] = useState<string | null>(null);
  const [showAreaShowcase, setShowAreaShowcase] = useState<boolean>(true);

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

  const handleMapClick = (lat: number, lon: number) => {
    setCoordsAndName({ lat, lon }, `Custom (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls: Search Bar & Location Detect */}
      <div className="relative z-40 bg-slate-900/80 p-4 rounded-2xl border border-slate-800/90 backdrop-blur-md shadow-lg">
        <LocationSearch
          currentLocationName={locationName}
          onSelectLocation={setLocation}
          onUseMyLocation={detectMyLocation}
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
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-bold text-red-200 flex items-center space-x-1 cursor-pointer"
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

          {/* Logged-In User Feature: Individual Heat Risk Status & Quick Calculator */}
          {isAuthenticated && user && (
            <div className="rounded-2xl bg-gradient-to-r from-orange-950/40 via-slate-900/90 to-cyan-950/40 border border-orange-500/30 p-5 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 flex-shrink-0">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                      Personalized Heat Health Active
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      {user.role?.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Welcome back, {user.name}! Calculate your individual heat strain for {locationName.split(',')[0]}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                    Calibrate current thermal load ({thermalData?.weather?.temperature ? `${thermalData.weather.temperature.toFixed(1)}°C` : 'Live'}) with your biometrics, hydration level, and work schedule.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto flex-shrink-0">
                <Link
                  to="/personal-risk"
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Open Personal Risk Calculator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Area Risk Showcase: Prominently displayed for Guest Users, and toggleable for Authenticated Users */}
          {(!isAuthenticated || showAreaShowcase) && (
            <AreaRiskShowcase
              isGuestView={!isAuthenticated}
              onSelectArea={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              title={!isAuthenticated ? 'Guest Showcase: Regional Heat Risk Across All Areas' : 'All-Area Municipal Heat Risk Matrix'}
              subtitle={
                !isAuthenticated
                  ? 'Viewing real-time heat health risks for major Indian metropolitan areas. Sign in to calculate your individual risk.'
                  : 'Compare real-time thermal strain and civic risk levels across all monitored municipal hubs.'
              }
            />
          )}

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

export default Dashboard;
