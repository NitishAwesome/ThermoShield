import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Compass,
  Sliders,
  Radio,
  HeartPulse,
  Layers,
  ArrowRight,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Activity,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  AlertTriangle,
  FileText,
  RefreshCw,
  Sparkles,
  Shield,
  ShieldCheck,
  Info,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button } from '../../components/ui';
import { AreaRiskShowcase } from '../../components/AreaRiskShowcase';
import { evaluateRiskEvolution } from '../../components/RiskEvolutionTimeline';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { translateRiskLevel } from '../../utils/translationHelpers';
import { ThermalResponse, WeatherResponse, ForecastResponse, RiskLevel, HealthImpactForecastResponse, JurisdictionContextResponse } from '../../types';
import { DataRealityBadge, FallbackModeBanner } from '../../components/provenance';

export const GovernmentDashboard: React.FC = () => {
  const { locationName, coords } = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [jurisdictionContext, setJurisdictionContext] = useState<JurisdictionContextResponse | null>(null);
  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [healthForecast, setHealthForecast] = useState<HealthImpactForecastResponse | null>(null);
  const [engineTelemetry, setEngineTelemetry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Recently');

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [thermalRes, weatherRes, forecastRes, telemetryRes, healthFcRes, jurRes] = await Promise.allSettled([
          api.getThermal(coords.lat, coords.lon),
          api.getWeather(coords.lat, coords.lon),
          api.getForecast(coords.lat, coords.lon),
          api.getAlertEngineStatus(),
          api.getHealthImpactForecast({ lat: coords.lat, lon: coords.lon }),
          api.getJurisdictionUserContext(),
        ]);

        if (!isMounted) return;

        if (thermalRes.status === 'fulfilled') setThermalData(thermalRes.value);
        if (weatherRes.status === 'fulfilled') setWeatherData(weatherRes.value);
        if (forecastRes.status === 'fulfilled') setForecastData(forecastRes.value);
        if (telemetryRes.status === 'fulfilled') setEngineTelemetry(telemetryRes.value);
        if (healthFcRes.status === 'fulfilled') setHealthForecast(healthFcRes.value);
        if (jurRes.status === 'fulfilled') setJurisdictionContext(jurRes.value);

        setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      } catch (e) {
        console.debug('Gov Dashboard data load error', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, [coords.lat, coords.lon]);

  const currentRiskLevel: RiskLevel | null = (thermalData?.thermal?.risk_assessment?.level as RiskLevel) || null;
  const currentTemp = weatherData?.weather?.temperature ?? thermalData?.thermal?.input_summary?.temperature_c ?? null;
  const feelsLike = weatherData?.weather?.apparent_temperature ?? thermalData?.thermal?.indices?.heat_index_c ?? null;

  // Derived Trend Evolution using existing evaluator
  const evolution = useMemo(() => {
    const dailyFc = forecastData?.forecast || weatherData?.forecast;
    return evaluateRiskEvolution(
      dailyFc,
      weatherData?.weather,
      currentRiskLevel || 'LOW'
    );
  }, [forecastData, weatherData, currentRiskLevel]);

  // User role label
  const getRoleLabel = () => {
    const role = (user?.role || '').toLowerCase();
    if (role === 'responder') return 'Responder Access';
    if (role === 'analyst') return 'Analyst Access';
    return 'Signed in as Official';
  };

  // Plain-Language Command Interpretation
  const getCommandInterpretation = () => {
    if (!currentRiskLevel) {
      return 'Weather telemetry is currently unavailable for this jurisdiction. Real-time heat risk calculations and command directives are paused.';
    }
    const level = currentRiskLevel.toUpperCase();
    if (level === 'EXTREME' || level === 'CRITICAL') {
      return 'Heat stress conditions are currently severe across monitored sectors. Immediate public health precautions and hydration measures are recommended.';
    }
    if (level === 'HIGH') {
      return 'Heat conditions are currently elevated and may become more stressful during the afternoon peak hours.';
    }
    if (level === 'MODERATE') {
      return 'Conditions are currently moderate but are expected to increase before the afternoon peak.';
    }
    return 'Thermal stress is currently within baseline levels. Routine monitoring active.';
  };

  const isFallback = weatherData?.is_fallback || weatherData?.source_status === 'OFFLINE_FALLBACK';

  return (
    <div className="space-y-8 pb-16">
      {/* Fallback indicator if live weather is unavailable */}
      {isFallback && (
        <FallbackModeBanner
          isFallback={true}
          sourceName={weatherData?.source_name}
          compact
          className="mb-2"
        />
      )}

      {/* AUTHENTIC OFFICIAL IDENTITY & OPERATIONAL JURISDICTION BAR */}
      {user && (
        <div className="rounded-2xl ts-card p-4 border ts-border shadow-md bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="font-black text-sm ts-text-primary tracking-tight">
                  {user.name || user.email}
                </span>
                {user.official_id && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-700/60 text-slate-300 border border-slate-600/50">
                    {user.official_id}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1" title="Simulated Government Workflow Account (Judging Persona)">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Demo Authority Persona</span>
                </span>
              </div>
              <div className="text-xs ts-text-muted mt-0.5 flex items-center space-x-2 flex-wrap">
                <span>{user.designation || 'Government Decision Officer'}</span>
                <span>•</span>
                <span>{user.department || user.organization || 'Disaster Management'}</span>
                {user.organization && user.department && (
                  <>
                    <span>•</span>
                    <span>{user.organization}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Assigned Scope & Hierarchy Badge */}
          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <div>
                <span className="font-bold text-[11px] block text-orange-200">
                  Assigned Scope: {jurisdictionContext?.jurisdiction_name || user.jurisdiction_name || user.jurisdiction_id || 'Jurisdiction Managed'}
                </span>
                <span className="text-[10px] text-orange-400 font-mono">
                  Level: {jurisdictionContext?.jurisdiction_type || user.jurisdiction_type || 'OFFICIAL'}
                  {jurisdictionContext?.subordinate_jurisdiction_ids?.length ? ` • ${jurisdictionContext.subordinate_jurisdiction_ids.length} Sub-jurisdictions` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1 — GOVERNMENT COMMAND HEADER */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center space-x-1.5">
                <Shield className="w-4 h-4" />
                <span>Government Command Center</span>
              </span>
              <DataRealityBadge
                tier={
                  isLoading && !weatherData && !thermalData
                    ? 'LOADING'
                    : !weatherData && !thermalData
                    ? 'UNAVAILABLE'
                    : isFallback
                    ? 'OFFLINE_FALLBACK'
                    : 'LIVE'
                }
                size="sm"
                customLabel={
                  !weatherData && !thermalData && !isLoading
                    ? 'Telemetry Unavailable'
                    : isFallback
                    ? 'Offline Baseline'
                    : 'Live Regional Data'
                }
              />
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                Updated {lastUpdatedTime}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black ts-text-primary tracking-tight font-sans mt-2">
              Government Command Center
            </h1>
            <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-3xl leading-relaxed">
              Operational heat-health intelligence for {jurisdictionContext?.jurisdiction_name || user?.jurisdiction_name || locationName}
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start lg:self-auto flex-shrink-0">
            {/* Compact Role Chip */}
            <div className="px-3 py-1.5 rounded-xl ts-card-subtle border ts-border text-xs font-bold ts-text-primary flex items-center space-x-2">
              <Building2 className="w-3.5 h-3.5 text-orange-500" />
              <span>{getRoleLabel()}</span>
            </div>
          </div>
        </div>

        {/* Compact Jurisdiction Summary Bar */}
        <div className="mt-4 pt-2 flex flex-wrap items-center justify-between gap-3 text-xs ts-text-muted">
          <div className="flex items-center space-x-2">
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
            <span>
              <strong className="ts-text-primary font-bold">Operational Jurisdiction:</strong>{' '}
              {jurisdictionContext?.jurisdiction_name || user?.jurisdiction_name || locationName}
            </span>
          </div>
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <span>Lat {coords.lat.toFixed(2)}°, Lon {coords.lon.toFixed(2)}°</span>
          </div>
        </div>
      </div>

      {/* SECTION 2 — CURRENT HEAT SITUATION */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="flex items-center space-x-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          <h2 className="text-xs font-black uppercase tracking-wider text-orange-500">
            Current Heat Situation
          </h2>
        </div>

        {/* 4 Main Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Overall Heat Risk
            </div>
            <div className="mt-2">
              <Badge riskLevel={currentRiskLevel} size="lg" showDot showIcon>
                {currentRiskLevel ? translateRiskLevel(currentRiskLevel, t) : 'Unavailable'}
              </Badge>
            </div>
            <div className="text-[11px] ts-text-muted mt-2">
              Sector-wide priority level
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Current Temperature
            </div>
            <div className="text-2xl sm:text-3xl font-black ts-text-primary font-mono mt-1">
              {currentTemp != null ? `${currentTemp.toFixed(1)}°C` : '—'}
            </div>
            <div className="text-[11px] ts-text-muted mt-1">
              Ambient dry bulb
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Feels Like
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-500 font-mono mt-1">
              {feelsLike != null ? `${feelsLike.toFixed(1)}°C` : '—'}
            </div>
            <div className="text-[11px] ts-text-muted mt-1">
              Thermal sensation index
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Peak Danger Period
            </div>
            <div className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400 font-mono mt-1">
              12 PM – 4 PM
            </div>
            <div className="text-[11px] ts-text-muted mt-1">
              Max solar radiation window
            </div>
          </div>
        </div>

        {/* Plain-Language Command Interpretation */}
        <div className="mt-5 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-start space-x-3">
          <Info className="w-5 h-5 text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Command Operational Interpretation
            </div>
            <p className="text-xs sm:text-sm ts-text-primary mt-1 leading-relaxed">
              {getCommandInterpretation()}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3 — AREAS NEEDING ATTENTION */}
      <AreaRiskShowcase variant="command-summary" />

      {/* SECTION 4 — HEAT RISK TREND */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-orange-500">
                Heat Risk Trend
              </h2>
            </div>
            <h3 className="text-lg font-black ts-text-primary mt-0.5">
              Diurnal Risk Trajectory
            </h3>
          </div>
          <Link
            to="/gov/map"
            className="self-start sm:self-auto inline-flex items-center space-x-1.5 text-xs font-extrabold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
          >
            <span>View Heat Risk Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Compact 3-Phase Trajectory Display */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl ts-card-subtle border ts-border text-center">
            <div className="text-xs font-bold uppercase tracking-wider ts-text-subtle">
              NOW
            </div>
            <div className="text-lg font-black ts-text-primary mt-1">
              {translateRiskLevel(currentRiskLevel, t)}
            </div>
            <div className="mt-2 flex justify-center">
              <Badge riskLevel={currentRiskLevel} size="sm">
                {translateRiskLevel(currentRiskLevel, t)}
              </Badge>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-center relative">
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              AFTERNOON PEAK
            </div>
            <div className="text-lg font-black text-orange-600 dark:text-orange-400 mt-1">
              {translateRiskLevel(evolution.peakLevel, t)}
            </div>
            <div className="mt-2 flex justify-center">
              <Badge riskLevel={evolution.peakLevel} size="sm">
                {translateRiskLevel(evolution.peakLevel, t)}
              </Badge>
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border text-center">
            <div className="text-xs font-bold uppercase tracking-wider ts-text-subtle">
              EVENING
            </div>
            <div className="text-lg font-black ts-text-primary mt-1">
              {translateRiskLevel(evolution.steps[evolution.steps.length - 1]?.riskLevel || 'MODERATE', t)}
            </div>
            <div className="mt-2 flex justify-center">
              <Badge riskLevel={evolution.steps[evolution.steps.length - 1]?.riskLevel || 'MODERATE'} size="sm">
                {translateRiskLevel(evolution.steps[evolution.steps.length - 1]?.riskLevel || 'MODERATE', t)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Plain-Language Trend Interpretation */}
        <p className="text-xs sm:text-sm ts-text-muted mt-4 leading-relaxed bg-slate-500/5 p-3.5 rounded-2xl border ts-border">
          <strong className="ts-text-primary font-bold">Trend Summary:</strong>{' '}
          {evolution.proactiveInsight}
        </p>
      </div>

      {/* SECTION 4.5 — COMPACT NEXT 5 DAYS OUTLOOK (PROMPT 22) */}
      <div className="rounded-3xl ts-card p-6 sm:p-7 border ts-border shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ts-border">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-orange-500">
              Early Warning Trajectory (Prompt 22)
            </h2>
            <span className="text-sm font-black ts-text-primary font-sans">
              NEXT 5 DAYS OUTLOOK
            </span>
          </div>

          <Link
            to="/gov/health-impact"
            className="inline-flex items-center space-x-1.5 text-xs font-extrabold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
          >
            <span>Detailed Health Impact Outlook</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Compact Horizontal 5-Day Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {healthForecast?.forecast_days ? (
            healthForecast.forecast_days.map((d) => (
              <div
                key={d.day_index}
                className="p-3 rounded-2xl ts-card-subtle border ts-border flex flex-col justify-between space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black ts-text-primary">{d.day_label.split('(')[0]}</span>
                  <span
                    className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold uppercase"
                    style={{
                      backgroundColor: `${d.civic_health_color}20`,
                      color: d.civic_health_color,
                    }}
                  >
                    {d.thermal_risk_level}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs font-mono">
                  <span className="text-xs font-black ts-text-primary">{d.temp_max_c}°C</span>
                  <span className="text-[10px] text-red-500">WBGT {d.estimated_wbgt_c}°C</span>
                </div>
                <div className="text-[10px] ts-text-muted truncate">
                  {d.civic_health_label}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-4 rounded-2xl ts-card-subtle border ts-border text-center text-xs ts-text-muted">
              {isLoading ? 'Loading 5-day predictive health forecast...' : '5-day predictive health impact forecast is temporarily unavailable.'}
            </div>
          )}
        </div>

        {/* Highlight Lead-Time Bar */}
        {healthForecast?.lead_time_intelligence && (
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span className="font-bold ts-text-primary">
                Peak Concern: {healthForecast.lead_time_intelligence.peak_concern_day} ({healthForecast.lead_time_intelligence.peak_concern_date})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="ts-text-muted">Expected Relief:</span>
              <span className="font-bold text-emerald-500">{healthForecast.lead_time_intelligence.relief_day}</span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5 — POPULATION & HEALTH CONCERN SNAPSHOT */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-rose-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-rose-500">
                Population & Health Concern Snapshot
              </h2>
            </div>
            <h3 className="text-lg font-black ts-text-primary mt-0.5">
              People Who May Need Extra Attention
            </h3>
          </div>
          <Link
            to="/gov/health-impact"
            className="self-start sm:self-auto inline-flex items-center space-x-1.5 text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            <span>View Health Impact</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-6">
          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-xs font-bold ts-text-primary flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Older Adults</span>
            </div>
            <p className="text-xs ts-text-muted mt-1.5 leading-relaxed">
              Higher heat sensitivity, reduced thermoregulation capacity, and cardiovascular strain risks.
            </p>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-xs font-bold ts-text-primary flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Outdoor Workers</span>
            </div>
            <p className="text-xs ts-text-muted mt-1.5 leading-relaxed">
              Longer solar & metabolic exposure during peak afternoon radiation hours.
            </p>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-xs font-bold ts-text-primary flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Young Children</span>
            </div>
            <p className="text-xs ts-text-muted mt-1.5 leading-relaxed">
              Faster core temperature rise; require additional hydration and adult supervision.
            </p>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-xs font-bold ts-text-primary flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Chronic Conditions</span>
            </div>
            <p className="text-xs ts-text-muted mt-1.5 leading-relaxed">
              Pre-existing respiratory or kidney vulnerabilities requiring climate-controlled shelter.
            </p>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-xs font-bold ts-text-primary flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Limited Cooling Access</span>
            </div>
            <p className="text-xs ts-text-muted mt-1.5 leading-relaxed">
              Informal housing and uninsulated indoor spaces with high thermal accumulation.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 6 — ACTIVE ALERT STATUS */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-purple-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-purple-500">
                Active Alert Status
              </h2>
            </div>
            <h3 className="text-lg font-black ts-text-primary mt-0.5">
              Regional Response Summary
            </h3>
          </div>
          <Link
            to="/gov/dispatch"
            className="self-start sm:self-auto inline-flex items-center space-x-1.5 text-xs font-extrabold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
          >
            <span>Manage Alerts & Dispatch</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Active Heat Advisories
            </div>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">
              High Heat Advisory
            </div>
            <div className="text-[11px] ts-text-muted mt-1">
              Public broadcast active
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Affected Priority Sectors
            </div>
            <div className="text-xl font-black ts-text-primary mt-1 font-mono">
              3 Monitored Locations
            </div>
            <div className="text-[11px] ts-text-muted mt-1">
              Curated Reference Points: Dadar, Thane, Navi Mumbai
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Background Monitoring Daemon
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1.5 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Active</span>
            </div>
            <div className="text-[11px] ts-text-muted mt-1">
              Continuous 15m evaluation cycle
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 7 — RECOMMENDED ATTENTION */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl bg-orange-500/5">
        <div className="flex items-center space-x-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-orange-500" />
          <h2 className="text-xs font-black uppercase tracking-wider text-orange-500">
            Recommended Attention
          </h2>
        </div>
        <h3 className="text-base font-extrabold ts-text-primary">
          Priority Actions for Monitored Jurisdiction
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="p-3.5 rounded-2xl ts-card border ts-border flex items-start space-x-3">
            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
            <p className="text-xs ts-text-primary leading-relaxed">
              <strong>Monitor high-risk locations</strong> before the afternoon peak hours, focusing on dense urban centers.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl ts-card border ts-border flex items-start space-x-3">
            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
            <p className="text-xs ts-text-primary leading-relaxed">
              <strong>Review active alerts</strong> for vulnerable populations to ensure medical response units are staged.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl ts-card border ts-border flex items-start space-x-3">
            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
            <p className="text-xs ts-text-primary leading-relaxed">
              <strong>Consider additional hydration and shade support</strong> for outdoor municipal workers and labor sites.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl ts-card border ts-border flex items-start space-x-3">
            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
            <p className="text-xs ts-text-primary leading-relaxed">
              <strong>Check cooling shelter readiness</strong> and public water distribution availability in higher-risk zones.
            </p>
          </div>
        </div>

        {/* Explore Potential Interventions CTA */}
        <div className="mt-5 pt-4 border-t ts-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold ts-text-primary">
              Explore Risk Reduction Scenarios
            </h4>
            <p className="text-[11px] ts-text-muted mt-0.5 max-w-xl leading-relaxed">
              Evaluate how opening designated cooling centers, implementing outdoor work restrictions, and staging hydration stations lower projected population heat stress.
            </p>
          </div>
          <Link
            to="/gov/interventions"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap flex-shrink-0"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Evaluate Intervention Options →</span>
          </Link>
        </div>
      </div>

      {/* SECTION 8 — QUICK ACTIONS */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Layers className="w-4 h-4 text-orange-500" />
          <h2 className="text-xs font-black uppercase tracking-wider ts-text-subtle">
            Quick Actions & Authority Tools
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/gov/map"
            className="p-5 rounded-2xl ts-card-elevated border ts-border hover:border-cyan-500/50 hover:shadow-lg transition-all group block"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold ts-text-primary flex items-center justify-between">
              <span>View Heat Risk Map</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
            </h3>
            <p className="text-xs ts-text-muted mt-1 leading-relaxed">
              Geospatial regional mapping centered on curated monitoring reference coordinates.
            </p>
          </Link>

          <Link
            to="/gov/health-impact"
            className="p-5 rounded-2xl ts-card-elevated border ts-border hover:border-rose-500/50 hover:shadow-lg transition-all group block"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <HeartPulse className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold ts-text-primary flex items-center justify-between">
              <span>Review Health Impact</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 transition-colors" />
            </h3>
            <p className="text-xs ts-text-muted mt-1 leading-relaxed">
              Modelled service pressure planning indicators and surge estimation.
            </p>
          </Link>

          <Link
            to="/gov/dispatch"
            className="p-5 rounded-2xl ts-card-elevated border ts-border hover:border-purple-500/50 hover:shadow-lg transition-all group block"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold ts-text-primary flex items-center justify-between">
              <span>Manage Alerts & Dispatch</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500 transition-colors" />
            </h3>
            <p className="text-xs ts-text-muted mt-1 leading-relaxed">
              Trigger alerts, inspect background monitoring cycles, and manage communications.
            </p>
          </Link>

          <Link
            to="/gov/interventions"
            className="p-5 rounded-2xl ts-card-elevated border ts-border hover:border-orange-500/50 hover:shadow-lg transition-all group block"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold ts-text-primary flex items-center justify-between">
              <span>Run Intervention Simulation</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500 transition-colors" />
            </h3>
            <p className="text-xs ts-text-muted mt-1 leading-relaxed">
              Explore hypothetical scenarios for cooling centers, work rest cycles, and hydration.
            </p>
          </Link>

          <Link
            to="/gov/matrix"
            className="p-5 rounded-2xl ts-card-elevated border ts-border hover:border-emerald-500/50 hover:shadow-lg transition-all group block"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold ts-text-primary flex items-center justify-between">
              <span>Open Municipal Matrix</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
            </h3>
            <p className="text-xs ts-text-muted mt-1 leading-relaxed">
              Comparative analysis across curated regional monitoring locations.
            </p>
          </Link>

          <Link
            to="/gov/reports"
            className="p-5 rounded-2xl ts-card-elevated border ts-border hover:border-sky-500/50 hover:shadow-lg transition-all group block"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold ts-text-primary flex items-center justify-between">
              <span>View Reports & Data</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
            </h3>
            <p className="text-xs ts-text-muted mt-1 leading-relaxed">
              Export heatwave situation reports, civic documentation, and historical telemetry data.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GovernmentDashboard;
