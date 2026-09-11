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
import { AlertCircle, RefreshCw, HeartPulse, Sparkles, ArrowRight, Sliders, Building2, Flame, BarChart2, Zap, Layers, Bell, Calendar, ShieldCheck } from 'lucide-react';
import { getCachedData, setCachedData } from '../services/cache';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { AreaRiskShowcase } from '../components/AreaRiskShowcase';
import { PersonalizedDashboardSummary } from '../components/PersonalizedDashboardSummary';
import { Link } from 'react-router-dom';
import { Button, Card, EmptyState } from '../components/ui';
import { subscribeToLiveRisk, type LiveRisk } from "../services/liveRisk";
import { RoleWelcomeBanner } from '../components/RoleWelcomeBanner';
import { useTranslation } from '../context/LanguageContext';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { coords, locationName, isLocating, setLocation, setCoordsAndName, detectMyLocation } = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { profile } = useProfile();

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
        api.getRisk(lat, lon, { email: user?.email }),
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
        if (!cached?.risk) {
          setRiskData(null);
        }
        setMlRiskError('Civic health risk estimate currently calculating.');
      }

      // 3. Map Risk Geospatial Layer (Non-blocking fallback)
      if (mapRes.status === 'fulfilled') {
        updatedMap = mapRes.value.locations || [];
        setMapLocations(updatedMap);
        setMapError(null);
      } else {
        console.warn('Map risk layer failed to load:', mapRes.reason);
        if (!cached?.mapLocations || cached.mapLocations.length === 0) {
          setMapLocations([]);
        }
        setMapError('Geospatial risk layer service temporarily busy');
      }

      // Update cache
      if (updatedThermal) {
        setCachedData(lat, lon, {
          thermal: updatedThermal,
          risk: updatedRisk || cached?.risk,
          mapLocations: updatedMap.length > 0 ? updatedMap : (cached?.mapLocations || []),
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

  // Role-aware header and contextual actions config
  const getRoleHeader = () => {
    const role = user?.role?.toLowerCase();
    switch (role) {
      case 'official':
        return {
          badge: t('role.healthOfficial', 'Municipal Health Authority'),
          icon: Building2,
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/10 border-cyan-500/30',
          title: t('dashboard.roleOfficialTitle', 'Municipal Command Center: Heat Surveillance & Action Planning'),
          subtitle: t('dashboard.roleOfficialSubtitle', 'Monitor area-level heat risk across municipal wards, understand civic health demand, and evaluate intervention responses.'),
          actions: [
            { to: '/matrix', label: t('nav.matrix', 'Municipal Matrix'), icon: Building2, primary: false },
            { to: '/risk-details', label: t('nav.analysis', 'Risk Analysis'), icon: Layers, primary: false },
            { to: '/interventions', label: t('nav.interventions', 'Plan Response'), icon: Sliders, primary: true },
          ],
        };
      case 'responder':
        return {
          badge: t('role.responder', 'Emergency Field Responder'),
          icon: Flame,
          color: 'text-orange-400',
          bg: 'bg-orange-500/10 border-orange-500/30',
          title: t('dashboard.roleResponderTitle', 'Field Response Command: Heat Hazard & Alert Operations'),
          subtitle: t('dashboard.roleResponderSubtitle', 'Operational surveillance: active alerts, areas needing attention, heat conditions, people needing extra protection, and response measures.'),
          actions: [
            { to: '/alerts', label: t('nav.alerts', 'Active Alerts'), icon: Bell, primary: true },
            { to: '/interventions', label: t('nav.interventions', 'Response Measures'), icon: Sliders, primary: false },
            { to: '/personal-risk', label: t('nav.personalRisk', 'Field Worker Safety'), icon: HeartPulse, primary: false },
          ],
        };
      case 'analyst':
        return {
          badge: t('role.analyst', 'Climate & Data Analyst'),
          icon: BarChart2,
          color: 'text-purple-400',
          bg: 'bg-purple-500/10 border-purple-500/30',
          title: t('dashboard.roleAnalystTitle', 'Climate Intelligence & Multi-Index Risk Analytics'),
          subtitle: t('dashboard.roleAnalystSubtitle', 'Biometeorological modeling: analyze WBGT, multi-index heat stress, predictive ML risk factors, and cross-zone surveillance.'),
          actions: [
            { to: '/risk-details', label: t('nav.riskAnalysis', 'Risk Analysis'), icon: Layers, primary: true },
            { to: '/matrix', label: t('nav.municipalMatrix', 'Municipal Matrix'), icon: Building2, primary: false },
            { to: '/forecast', label: t('nav.forecast', '5-Day Forecast'), icon: Calendar, primary: false },
          ],
        };
      default: // Citizen / Public User
        return {
          badge: t('role.citizen', 'Citizen Safety View'),
          icon: ShieldCheck,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/30',
          title: t('dashboard.title', "Today's Heat Conditions & Personal Safety"),
          subtitle: t('dashboard.subtitle', 'Real-time local heat risk monitoring, personalized safety precautions, weather updates, and early warning protection for you and your family.'),
          actions: [
            { to: '/personal-risk', label: t('nav.myHeatRisk', 'My Heat Risk'), icon: HeartPulse, primary: true },
            { to: '/alerts', label: t('nav.alerts', 'View Alerts'), icon: Bell, primary: false },
          ],
        };
    }
  };
  const roleHeader = getRoleHeader();
  const RoleHeaderIcon = roleHeader.icon;

  return (
    <div className="space-y-6 pb-12">
      {/* Platform Mission Header for Instant Recognition */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ts-border pb-5">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-xs font-black uppercase tracking-wider text-orange-500">
              {t('dashboard.extremeHeatwaveEarlyWarning')}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
              {t('dashboard.decisionSupportBadge')}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center space-x-1 ${roleHeader.bg}`}>
              <RoleHeaderIcon className={`w-3 h-3 ${roleHeader.color}`} />
              <span className={roleHeader.color}>{roleHeader.badge}</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black ts-text-primary tracking-tight font-sans mt-1">
            {roleHeader.title}
          </h1>
          <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-3xl leading-relaxed">
            {roleHeader.subtitle}
          </p>
        </div>

        {/* Dynamic Contextual Next Actions for Current Role */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {roleHeader.actions.map((act) => {
            const ActIcon = act.icon;
            return (
              <Link
                key={act.to + act.label}
                to={act.to}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm ${
                  act.primary
                    ? 'text-white bg-orange-500 hover:bg-orange-600'
                    : 'ts-text-muted hover:ts-text-primary ts-card-subtle border ts-border'
                }`}
              >
                {ActIcon && <ActIcon className="w-3.5 h-3.5" />}
                <span>{act.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Role Welcome Banner (Landing page default: full details view, expandable / collapsible) */}
      <RoleWelcomeBanner user={user} initialMode="full" />

      {/* Top Controls: Search Bar & Location Detect */}
      <div className="relative z-10 ts-card p-3 sm:p-4 shadow-lg">
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
              <p className="font-bold text-sm text-red-900 dark:text-red-200">{t('common.error')}: {t('weatherCard.telemetryInactive')}</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(coords.lat, coords.lon)}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      )}

      {isLoading && !thermalData ? (
        <LoadingState message={t('common.loading', 'Loading...')} />
      ) : (
        <>
          {/* Personalized Health Situation Summary */}
          <PersonalizedDashboardSummary
            user={user}
            profile={profile}
            locationName={locationName}
            thermalData={thermalData}
          />

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

          {/* Live Firebase Risk Sync Indicator */}
          {liveRisk && (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <Zap className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-400">
                Live Firebase Sync — {liveRisk.risk_level} ({liveRisk.risk_score.toFixed(2)})
              </span>
            </div>
          )}

          {/* Why This Rating? — Environmental Risk Drivers Section */}
          <RiskDrivers
            temperature={thermalData?.weather?.temperature}
            humidity={thermalData?.weather?.humidity}
            windSpeed={thermalData?.weather?.wind_speed}
            solarRadiation={thermalData?.weather?.solar_radiation}
            apparentTemperature={thermalData?.weather?.apparent_temperature}
            uvIndex={thermalData?.weather?.uv_index}
            thermalScore={thermalData?.thermal?.risk_assessment?.score ? thermalData.thermal.risk_assessment.score * 100 : undefined}
            riskLevel={thermalData?.thermal?.risk_assessment?.level}
            civicScore={riskData?.risk?.risk_score}
            reason={thermalData?.thermal?.risk_assessment?.reason}
            riskFactors={riskData?.risk_factors}
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
                      {t('dashboard.personalizedIntelligence')}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      {user.role?.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold ts-text-primary mt-0.5">
                    {t('dashboard.welcomeUser', { name: user.name, city: locationName.split(',')[0] })}
                  </h3>
                  <p className="text-xs ts-text-muted mt-0.5 max-w-2xl">
                    {t('dashboard.calibrateAmbientLoad', { temp: thermalData?.weather?.temperature ? thermalData.weather.temperature.toFixed(1) : '29.1' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto flex-shrink-0">
                <Link
                  to="/personal-risk"
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t('dashboard.openRiskCalc')}</span>
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
              title={t('matrix.title', 'All-Area Municipal Heat Risk Matrix')}
              subtitle={t('matrix.subtitle', 'Multi-city surveillance: Track which municipal zones face acute heat stress, why the risk exists, and immediate public safety actions.')}
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
