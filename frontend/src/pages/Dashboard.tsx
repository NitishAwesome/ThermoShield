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
import { RiskDrivers } from '../components/RiskDrivers';
import { RiskMap } from '../components/RiskMap';
import { ForecastChart } from '../components/ForecastChart';
import { AlertBanner } from '../components/AlertBanner';
import { LoadingState } from '../components/LoadingState';
import { AlertCircle, RefreshCw, HeartPulse, Sparkles, ArrowRight, Sliders, Building2 } from 'lucide-react';
import { getCachedData, setCachedData } from '../services/cache';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { AreaRiskShowcase } from '../components/AreaRiskShowcase';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState } from '../components/ui';
import { subscribeToLiveRisk, type LiveRisk } from "../services/liveRisk";

export const Dashboard: React.FC = () => {
  const { coords, locationName, isLocating, setLocation, setCoordsAndName, detectMyLocation } = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [liveRisk, setLiveRisk] = useState<LiveRisk | null>(null);
  const [liveRiskError, setLiveRiskError] = useState<string | null>(null);

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
        setError(null);
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
        setMlRiskError('Decision-support health risk proxy currently calculating.');
      }

      // 3. Map Risk Geospatial Layer (Non-blocking fallback)
      if (mapRes.status === 'fulfilled') {
        updatedMap = mapRes.value.locations || [];
        setMapLocations(updatedMap);
        setMapError(null);
      } else {
        console.warn('Map risk layer failed to load:', mapRes.reason);
        setMapLocations([]);
        setMapError('Geospatial risk layer service temporarily busy');
      }

      // Update cache
      if (updatedThermal) {
        setCachedData(lat, lon, {
          thermal: updatedThermal,
          risk: updatedRisk,
          mapLocations: updatedMap,
        });
      }

      // If core thermal fails and no thermal data is present, notify user
      if (thermalRes.status === 'rejected' && !updatedThermal && !cached?.thermal) {
        setError('Unable to connect to ThermoShield telemetry engine. Please ensure backend is running.');
      } else if (thermalRes.status === 'fulfilled') {
        setError(null);
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

  useEffect(() => {
    const locationId = riskData?.location?.id;

    if (locationId == null) {
      setLiveRisk(null);
      return;
    }

    setLiveRiskError(null);

    const unsubscribe = subscribeToLiveRisk(
      String(locationId),
      (updatedRisk) => {
        setLiveRisk(updatedRisk);
      },
      (firebaseError) => {
        console.error("Firebase live-risk subscription failed:", firebaseError);
        setLiveRiskError(firebaseError.message);
        setLiveRisk(null);
      },
    );

    return unsubscribe;
  }, [riskData?.location?.id]);

  const handleMapClick = (lat: number, lon: number) => {
    setCoordsAndName({ lat, lon }, `Custom (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Platform Mission Header for Instant SIH Judge Recognition */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ts-border pb-5">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-orange-500">
              Extreme Heatwave Early Warning System
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
              SIH26083 Decision Support
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black ts-text-primary tracking-tight font-sans mt-1">
            Command Center: Heat Stress & Civic Risk Surveillance
          </h1>
          <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-3xl leading-relaxed">
            Real-time multi-dimensional surveillance: combining atmospheric weather, physiological wet-bulb (WBGT) strain, community healthcare demand, and municipal mitigation planning.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <Link
            to="/matrix"
            className="px-3.5 py-2 rounded-xl text-xs font-bold ts-text-muted hover:ts-text-primary ts-card-subtle border ts-border transition-all flex items-center space-x-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-orange-400" />
            <span>All Areas Matrix</span>
          </Link>
          <Link
            to="/interventions"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulate Actions</span>
          </Link>
        </div>
      </div>

      {/* Top Controls: Search Bar & Location Detect */}
      <div className="relative z-40 ts-card p-4 shadow-lg">
        <LocationSearch
          currentLocationName={locationName}
          onSelectLocation={setLocation}
          onUseMyLocation={detectMyLocation}
          isLocating={isLocating}
        />
      </div>

      {/* Error Alert: Only shown if telemetry completely fails */}
      {error && !thermalData && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-red-900 dark:text-red-200">Telemetry Connection Warning</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(coords.lat, coords.lon)}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry
          </Button>
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

          {/* Master Command Center Hero: Overall Heat Risk + Live Weather Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskCard
              riskAssessment={thermalData?.thermal?.risk_assessment}
              mlRiskScore={riskData?.risk?.risk_score}
              mlRiskLevel={riskData?.risk?.risk_level}
              mlRiskError={mlRiskError}
              locationName={locationName}
              temperature={thermalData?.weather?.temperature}
              humidity={thermalData?.weather?.humidity}
              windSpeed={thermalData?.weather?.wind_speed}
              wbgt={thermalData?.thermal?.indices?.wbgt_c}
              timestamp={thermalData?.weather?.time}
            />

            <WeatherCard weather={thermalData?.weather || weatherData?.weather} />
          </div>

          {/* TEMPORARY FIREBASE LIVE-RISK VERIFICATION */}
          {liveRisk && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-semibold">Firebase Live Risk</span>
              </div>

              <div className="mt-2 text-sm">
                <p>Location: {liveRisk.location}</p>
                <p>Risk Score: {liveRisk.risk_score.toFixed(2)}</p>
                <p>Risk Level: {liveRisk.risk_level}</p>
                <p>Thermal Risk: {liveRisk.thermal_risk_level}</p>
                <p>Status: {liveRisk.status}</p>
              </div>
            </div>
          )}

          {/* Why This Rating? — Environmental Risk Drivers Section */}
          <RiskDrivers
            temperature={thermalData?.weather?.temperature}
            humidity={thermalData?.weather?.humidity}
            windSpeed={thermalData?.weather?.wind_speed}
            solarRadiation={thermalData?.weather?.solar_radiation}
            thermalScore={thermalData?.thermal?.risk_assessment?.score ? thermalData.thermal.risk_assessment.score * 100 : undefined}
            riskLevel={thermalData?.thermal?.risk_assessment?.level}
            civicScore={riskData?.risk?.risk_score}
            reason={thermalData?.thermal?.risk_assessment?.reason}
          />

          {/* Thermal Conditions & Physiological Indices Breakdown */}
          <ThermalCard
            indices={thermalData?.thermal?.indices}
            riskAssessment={thermalData?.thermal?.risk_assessment}
          />

          {/* Logged-In User Feature: Individual Heat Risk Status & Quick Calculator */}
          {isAuthenticated && user && (
            <div className="rounded-2xl ts-card-elevated border border-orange-500/40 p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 flex-shrink-0">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                      Personalized Heat Intelligence
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      {user.role?.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold ts-text-primary mt-0.5">
                    Welcome, {user.name}! Assess your individual heat exposure for {locationName.split(',')[0]}
                  </h3>
                  <p className="text-xs ts-text-muted mt-0.5 max-w-2xl">
                    Calibrate current ambient load ({thermalData?.weather?.temperature ? `${thermalData.weather.temperature.toFixed(1)}°C` : 'Live'}) with your biometrics, hydration level, and exposure schedule.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto flex-shrink-0">
                <Link
                  to="/personal-risk"
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center space-x-2"
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
              title={!isAuthenticated ? 'Guest Showcase: Regional Heat Risk Across Major Metros' : 'All-Area Municipal Heat Risk Matrix'}
              subtitle={
                !isAuthenticated
                  ? 'Viewing real-time heat health risks for major Indian municipal regions. Sign in to calculate your individual personal risk.'
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

          {/* 5-Day Synoptic Weather Forecast Area Chart */}
          {weatherData?.forecast && <ForecastChart forecast={weatherData.forecast} />}
        </>
      )}
    </div>
  );
};

export default Dashboard;
