import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  ShieldAlert,
  Info,
  ArrowRight,
  Home,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Compass,
  MousePointerClick,
  Flame,
  Building2,
  Layers,
} from 'lucide-react';
import { RiskMap } from '../components/RiskMap';
import { LocationSearch } from '../components/LocationSearch';
import { Badge, Button } from '../components/ui';
import { DataRealityBadge, FallbackModeBanner } from '../components/provenance';
import { useLocation } from '../context/LocationContext';
import { useProfile } from '../context/ProfileContext';
import { api } from '../services/api';
import { ThermalResponse, RiskLevel, ThermalZone, MapLocationRisk, HeatRiskArea, StateHeatAlertProperties, WardForecastSummary } from '../types';
import { MUMBAI_PROTOTYPE_ZONES } from '../data/thermalZones';
import { MUMBAI_ADMIN_WARDS } from '../data/mumbaiWards';
import {
  getStateCategoryStyle,
  getStateAlertByName,
  getNationalAlertStatistics,
  subscribeStateAlerts,
  fetchLiveNationalStateAlerts,
  getLiveAllStateHeatAlerts,
  NationalAlertStats,
} from '../data/stateHeatAlerts';
import { getOrGenerateCityWards } from '../utils/cityWardsGenerator';
import { INDIAN_MUNICIPAL_CORPORATIONS } from '../data/indianMunicipalCorporations';
import { getRiskStyle } from '../utils/risk';

// Major Indian municipal corporations and reference regions for rapid citizen exploration
const REGIONAL_PRESETS = [
  { name: 'Central Mumbai (UHI)', lat: 19.0400, lon: 72.8550 },
  { name: 'Pune (Shivajinagar)', lat: 18.5204, lon: 73.8567 },
  { name: 'South Mumbai (Coastal)', lat: 18.9320, lon: 72.8340 },
  { name: 'Delhi NCR', lat: 28.6139, lon: 77.2090 },
  { name: 'Ahmedabad (Dry Heat)', lat: 23.0225, lon: 72.5714 },
  { name: 'Kolkata (Humid Delta)', lat: 22.5726, lon: 88.3639 },
  { name: 'Chennai (Coastal Heat)', lat: 13.0827, lon: 80.2707 },
  { name: 'Bengaluru (BBMP)', lat: 12.9716, lon: 77.5946 },
  { name: 'Hyderabad (GHMC)', lat: 17.3850, lon: 78.4867 },
  { name: 'Jaipur (JMC)', lat: 26.9124, lon: 75.7873 },
  { name: 'Surat (SMC)', lat: 21.1702, lon: 72.8311 },
  { name: 'Lucknow (LMC)', lat: 26.8467, lon: 80.9462 },
  { name: 'Kanpur (KNN)', lat: 26.4499, lon: 80.3319 },
  { name: 'Nagpur (NMC)', lat: 21.1458, lon: 79.0882 },
  { name: 'Indore (IMC)', lat: 22.7196, lon: 75.8577 },
  { name: 'Bhopal (BMC)', lat: 23.2599, lon: 77.4126 },
  { name: 'Patna (PMC)', lat: 25.5941, lon: 85.1376 },
  { name: 'Vadodara (VMC)', lat: 22.3072, lon: 73.1812 },
  { name: 'Varanasi (VNN)', lat: 25.3176, lon: 82.9739 },
];

export const CitizenHeatMap: React.FC = () => {
  const { coords, locationName, setLocation, detectMyLocation, isLocating } = useLocation();
  const { profile } = useProfile();

  const [viewScope, setViewScope] = useState<'local' | 'national'>('local');
  const [liveStateAlerts, setLiveStateAlerts] = useState<StateHeatAlertProperties[]>(() => getLiveAllStateHeatAlerts());
  const [citizenNationalStats, setCitizenNationalStats] = useState<NationalAlertStats>(() => getNationalAlertStatistics(getLiveAllStateHeatAlerts()));
  const [selectedState, setSelectedState] = useState<StateHeatAlertProperties | null>(() => {
    const list = getLiveAllStateHeatAlerts();
    if (profile.state) {
      const match = getStateAlertByName(profile.state);
      if (match) return match;
    }
    return list.find((s) => s.stateCode === 'DL') || list[0];
  });
  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [wardsForecastSummary, setWardsForecastSummary] = useState<WardForecastSummary[]>([]);
  const [selectedWard, setSelectedWard] = useState<HeatRiskArea | null>(null);
  const [selectedZone, setSelectedZone] = useState<ThermalZone | null>(null);
  const [showPrototypeZones, setShowPrototypeZones] = useState<boolean>(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const wardDetailRef = useRef<HTMLDivElement>(null);

  // Subscribe to live state alerts and fetch Open-Meteo multi-coordinate telemetry
  useEffect(() => {
    fetchLiveNationalStateAlerts().catch(() => {});
    const unsub = subscribeStateAlerts(() => {
      const updated = getLiveAllStateHeatAlerts();
      setLiveStateAlerts(updated);
      setCitizenNationalStats(getNationalAlertStatistics(updated));
      setSelectedState((prev) => {
        if (!prev) return null;
        return updated.find((s) => s.stateCode === prev.stateCode) || prev;
      });
    });
    return unsub;
  }, []);

  const handleSelectWard = useCallback((ward: HeatRiskArea) => {
    setSelectedWard(ward);
  }, []);

  const handleInspectWardTelemetry = useCallback((ward: HeatRiskArea) => {
    setSelectedWard(ward);
    setTimeout(() => {
      wardDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }, []);

  // Check if active session location differs from permanent profile home
  const isDifferentFromHome = Boolean(
    profile.city &&
    locationName &&
    !locationName.toLowerCase().includes(profile.city.toLowerCase()) &&
    !profile.city.toLowerCase().includes(locationName.toLowerCase().split(',')[0].trim())
  );

  const fetchThermalData = async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getThermal(lat, lon);
      setThermalData(data);
    } catch (err: any) {
      console.error('Failed to load local thermal metrics:', err);
      setError('Unable to load thermal metrics for this location. Displaying regional defaults.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchThermalData(coords.lat, coords.lon);
  }, [coords.lat, coords.lon]);

  // Load live ward risk calculations from canonical forecast service
  useEffect(() => {
    let isMounted = true;
    api.getWardsForecastSummary()
      .then((res) => {
        if (isMounted && res?.wards) {
          setWardsForecastSummary(res.wards);
        }
      })
      .catch((err) => {
        console.warn('Could not load live ward forecast summary for citizen heat map:', err);
      });
    return () => { isMounted = false; };
  }, []);

  // Shared Ward-Risk Truth: Map live calculated risk across all 24 Mumbai administrative ward references
  const effectiveAdminWards = useMemo(() => {
    if (wardsForecastSummary.length === 0) {
      return MUMBAI_ADMIN_WARDS;
    }
    return MUMBAI_ADMIN_WARDS.map((w) => {
      const fcMatch = wardsForecastSummary.find((s) => s.ward_id === w.id);
      if (!fcMatch) return w;
      const dayData = fcMatch.forecast_days.find((d) => d.day_index === 0) || fcMatch.forecast_days[0];
      if (!dayData) return w;
      return {
        ...w,
        weather: {
          ...w.weather,
          temperatureC: dayData.temperature_c,
          humidityPercent: (dayData as any).humidity ?? w.weather.humidityPercent,
          windSpeedMps: (dayData as any).wind_speed_ms ?? w.weather.windSpeedMps,
        },
        thermal: {
          ...w.thermal,
          estimatedWbgtC: dayData.wbgt_c,
        },
        risk: {
          score: dayData.risk_score,
          level: dayData.risk_level as any,
        },
        attentionReason: `Current calculated risk: ${dayData.risk_level}`,
      };
    });
  }, [wardsForecastSummary]);

  const handleReturnToHome = () => {
    if (profile.city) {
      setLocation({
        name: `${profile.city}, ${profile.state || 'India'}`,
        latitude: profile.latitude || 19.076,
        longitude: profile.longitude || 72.8777,
      });
    }
  };

  // ---------------------------------------------------------------
  // Tap-to-place: citizen clicks map → reverse geocode → setLocation
  // ---------------------------------------------------------------
  const handleMapClick = useCallback(async (lat: number, lon: number) => {
    setIsReverseGeocoding(true);
    try {
      const result = await api.reverseGeocode(lat, lon);
      setLocation({
        name: result.name,
        latitude: lat,
        longitude: lon,
      });
    } catch {
      // Fallback: use raw coordinates as the name
      setLocation({
        name: `${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`,
        latitude: lat,
        longitude: lon,
      });
    } finally {
      setIsReverseGeocoding(false);
    }
  }, [setLocation]);

  // Canonical Telemetry State
  const isFallback = Boolean(
    thermalData?.weather?.is_fallback ||
    thermalData?.weather?.source_status === 'OFFLINE_FALLBACK'
  );

  const isDataAvailable = Boolean(
    thermalData?.weather &&
    !error &&
    thermalData?.weather?.source_status !== 'UNAVAILABLE'
  );

  // Weather and thermal readings with safe nullability (never fake numbers)
  const tempC = isDataAvailable ? thermalData?.weather?.temperature ?? null : null;
  const humidity = isDataAvailable ? thermalData?.weather?.humidity ?? null : null;
  const windMps = isDataAvailable ? thermalData?.weather?.wind_speed ?? null : null;
  const wbgtC = isDataAvailable ? thermalData?.thermal?.indices?.wbgt_c ?? null : null;
  const heatIndexC = isDataAvailable ? thermalData?.thermal?.indices?.heat_index_c ?? null : null;
  const rawRiskLevel = isDataAvailable ? thermalData?.thermal?.risk_assessment?.level : null;
  const riskLevel = rawRiskLevel && ['LOW', 'MODERATE', 'HIGH', 'EXTREME', 'CRITICAL'].includes(rawRiskLevel)
    ? (rawRiskLevel as RiskLevel)
    : null;

  // Dynamically generate or load official wards for current monitored city
  const activeCityWards = useMemo(() => {
    const wind = windMps ?? 2.5;
    const solar = thermalData?.weather?.solar_radiation ?? 650;
    return getOrGenerateCityWards(locationName, coords.lat, coords.lon, tempC ?? 33.5, humidity ?? 65, wind, solar);
  }, [locationName, coords.lat, coords.lon, tempC, humidity, windMps, thermalData?.weather?.solar_radiation]);

  useEffect(() => {
    if (activeCityWards.length > 0) {
      const stillValid = selectedWard && activeCityWards.some((w) => w.id === selectedWard.id);
      if (!stillValid) {
        const topRisk = [...activeCityWards].sort((a, b) => b.risk.score - a.risk.score)[0];
        setSelectedWard(topRisk || activeCityWards[0]);
      }
    }
  }, [activeCityWards]);

  // Derive human-friendly advice based on WBGT
  const getHumanAdvice = (wbgt: number | null, level: RiskLevel | null) => {
    if (wbgt === null || level === null) {
      return {
        headline: 'Thermal Analysis Temporarily Unavailable',
        action: 'Current meteorological observations could not be loaded for this location. Heat risk calculations are paused until telemetry resumes.',
        color: 'text-slate-400',
        bg: 'bg-slate-500/10 border-slate-500/30',
        icon: <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-400" />,
      };
    }
    if (wbgt >= 32) {
      return {
        headline: 'Extreme Heat Stress Warning',
        action: 'Stay indoors in cool or shaded environments. Avoid outdoor exercise and manual exertion.',
        color: 'text-rose-500',
        bg: 'bg-rose-500/10 border-rose-500/30',
        icon: <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />,
      };
    }
    if (wbgt >= 30) {
      return {
        headline: 'High Physiological Heat Burden',
        action: 'Drink water with electrolytes frequently. Rest in shade every 20–30 minutes if working outside.',
        color: 'text-orange-500',
        bg: 'bg-orange-500/10 border-orange-500/30',
        icon: <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" />,
      };
    }
    if (wbgt >= 28) {
      return {
        headline: 'Moderate Thermal Strain',
        action: 'Moderate heat stress outdoors. Ensure adequate hydration and check on children and elderly relatives.',
        color: 'text-amber-500',
        bg: 'bg-amber-500/10 border-amber-500/30',
        icon: <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />,
      };
    }
    return {
      headline: 'Low Thermal Stress',
      action: 'Conditions are within normal physiological tolerance. Standard hydration is sufficient.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      icon: <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" />,
    };
  };

  const advice = getHumanAdvice(wbgtC, riskLevel);

  // Map locations for surrounding reference
  const mapLocations: MapLocationRisk[] = isDataAvailable
    ? [
        {
          latitude: coords.lat,
          longitude: coords.lon,
          risk_score: thermalData?.thermal?.risk_assessment?.score != null
            ? Math.round(thermalData.thermal.risk_assessment.score * 100)
            : null,
          risk_level: riskLevel,
        },
      ]
    : [];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-7xl mx-auto px-2 sm:px-4">
      {/* Fallback weather mode disclosure */}
      {isFallback && (
        <FallbackModeBanner
          compact
          sourceName={thermalData?.weather?.source_name || 'Regional Baseline Dataset'}
          onRetry={() => fetchThermalData(coords.lat, coords.lon)}
        />
      )}
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION                                                         */}
      {/* ========================================================================= */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center space-x-1.5 font-mono">
                <MapPin className="w-4 h-4" />
                <span>Citizen Heat Safety Portal</span>
              </span>
              <DataRealityBadge
                tier={!isDataAvailable ? 'UNAVAILABLE' : isFallback ? 'OFFLINE_FALLBACK' : 'CALCULATED'}
                size="xs"
                customLabel={!isDataAvailable ? 'Telemetry Unavailable' : 'Heat Stress Model'}
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black ts-text-primary tracking-tight font-sans mt-2">
              {viewScope === 'national'
                ? 'National State Heatwave Alerts (37)'
                : 'Local City & Ward Heat Map'}
            </h1>
            <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-2xl leading-relaxed">
              {viewScope === 'national'
                ? 'Official Survey of India GIS borders with real-time IMD Severe Heat Wave classifications, wet-bulb metrics, and SDMA advisories.'
                : 'Estimated thermal stress, wet-bulb temperature, and ward microclimate heat index around your monitored Indian city.'}
              {' '}
              <span className="inline-flex items-center gap-1 text-orange-400 font-semibold">
                <MousePointerClick className="w-3.5 h-3.5" />
                {viewScope === 'national' ? 'Tap any Indian State to view emergency advisories.' : 'Tap any ward or location on map to inspect.'}
              </span>
            </p>
          </div>

          {/* Right controls: View Scope switcher & Location Search */}
          <div className="flex flex-col sm:items-end gap-2.5 max-w-md w-full">
            {/* View Scope Switcher: Two Button Choice [Local Wards] vs [State Heat Alerts] */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-500/10 border ts-border text-xs self-start sm:self-auto overflow-x-auto max-w-full gap-1">
              <button
                type="button"
                onClick={() => setViewScope('local')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  viewScope === 'local'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : 'ts-text-muted hover:ts-text-primary'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>📍 My Local Area (City & Wards)</span>
              </button>

              <button
                type="button"
                onClick={() => setViewScope('national')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  viewScope === 'national'
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-sm'
                    : 'ts-text-muted hover:ts-text-primary'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-300" />
                <span>🇮🇳 State Heat Alerts (37)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-red-500/30 text-[10px] text-white font-extrabold ml-1">
                  {citizenNationalStats.redCount} RED
                </span>
              </button>
            </div>

            {/* Location Search Bar with integrated GPS */}
            <div className="w-full">
              <LocationSearch
                currentLocationName={locationName}
                onSelectLocation={(loc) => {
                  setSelectedWard(null);
                  setLocation(loc);
                  setViewScope('local');
                }}
                onUseMyLocation={() => {
                  setSelectedWard(null);
                  detectMyLocation();
                  setViewScope('local');
                }}
                isLocating={isLocating}
              />
            </div>
          </div>
        </div>

        {/* Quick Select Presets (Major Indian Cities or High Priority States) */}
        <div className="mt-4 pt-3 border-t ts-border flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="ts-text-subtle text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 shrink-0">
            <Compass className="w-3 h-3 text-orange-500" />
            <span>
              {viewScope === 'national'
                ? 'High Heatwave Priority States:'
                : 'Major Indian Cities & Municipalities:'}
            </span>
          </span>
          {viewScope === 'national'
            ? liveStateAlerts.slice(0, 10).map((st) => {
                const isSelected = selectedState?.stateCode === st.stateCode;
                const cStyle = getStateCategoryStyle(st.alertCategory, isSelected);
                return (
                  <button
                    key={st.stateCode}
                    type="button"
                    onClick={() => setSelectedState(st)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 font-bold'
                        : 'ts-card-subtle border ts-border text-slate-300 hover:border-orange-500/50'
                    }`}
                  >
                    <span>{st.stateName}</span>
                    <span
                      className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold text-white"
                      style={{ backgroundColor: cStyle.fillColor }}
                    >
                      {st.alertCategory} ({st.temperatureC}°C)
                    </span>
                  </button>
                );
              })
            : REGIONAL_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    setLocation({
                      name: preset.name,
                      latitude: preset.lat,
                      longitude: preset.lon,
                    })
                  }
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium border ts-border ts-card-subtle hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-slate-300 whitespace-nowrap cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ISOLATION BANNER: ACTIVE SESSION VS REGISTERED HOME                     */}
      {/* ========================================================================= */}
      {isDifferentFromHome && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold ts-text-primary">
                Viewing: <span className="text-amber-400">{locationName}</span> (Active Exploration)
              </p>
              <p className="text-[11px] ts-text-muted">
                Your registered home remains <strong>{profile.city}, {profile.state}</strong>. Browsing locations does not alter your saved profile.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReturnToHome}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition-all flex items-center gap-1.5 self-end sm:self-auto cursor-pointer whitespace-nowrap"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Home ({profile.city})</span>
          </button>
        </div>
      )}

      {/* Reverse geocoding spinner notice */}
      {isReverseGeocoding && (
        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
          <span className="animate-spin w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full" />
          <span>Identifying tapped location…</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MONITORED LOCATION THERMAL CONDITIONS OVERVIEW                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Ambient Temperature */}
        <div className="p-4 rounded-2xl ts-card border ts-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs ts-text-subtle font-medium">
            <span>Air Temp</span>
            <Thermometer className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2 font-mono font-black text-2xl ts-text-primary">
            {tempC != null ? `${tempC.toFixed(1)}°C` : '—'}
          </div>
          <div className="text-[10.5px] ts-text-muted mt-0.5">
            {isDataAvailable ? 'Live atmospheric observation' : 'Telemetry unavailable'}
          </div>
        </div>

        {/* Relative Humidity */}
        <div className="p-4 rounded-2xl ts-card border ts-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs ts-text-subtle font-medium">
            <span>Humidity</span>
            <Droplets className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="mt-2 font-mono font-black text-2xl text-cyan-400">
            {humidity != null ? `${Math.round(humidity)}%` : '—'}
          </div>
          <div className="text-[10.5px] ts-text-muted mt-0.5">Moisture trapping index</div>
        </div>

        {/* Heat Index / Feels Like */}
        <div className="p-4 rounded-2xl ts-card border ts-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs ts-text-subtle font-medium">
            <span>Feels Like</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 font-mono font-black text-2xl text-amber-400">
            {heatIndexC != null ? `${heatIndexC.toFixed(1)}°C` : '—'}
          </div>
          <div className="text-[10.5px] ts-text-muted mt-0.5">Rothfusz biometric model</div>
        </div>

        {/* WBGT (Wet Bulb Globe Temp) */}
        <div className="p-4 rounded-2xl ts-card border ts-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs ts-text-subtle font-medium">
            <span>WBGT (Heat Stress)</span>
            <HeartPulse className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 font-mono font-black text-2xl text-rose-400">
            {wbgtC != null ? `${wbgtC.toFixed(1)}°C` : '—'}
          </div>
          <div className="text-[10.5px] ts-text-muted mt-0.5">Estimated WBGT thermal metric</div>
        </div>

        {/* Wind Speed */}
        <div className="p-4 rounded-2xl ts-card border ts-border col-span-2 sm:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs ts-text-subtle font-medium">
            <span>Wind Speed</span>
            <Wind className="w-4 h-4 text-teal-500" />
          </div>
          <div className="mt-2 font-mono font-black text-2xl text-teal-400">
            {windMps != null ? `${windMps.toFixed(1)} m/s` : '—'}
          </div>
          <div className="text-[10.5px] ts-text-muted mt-0.5">Convective cooling factor</div>
        </div>
      </div>

      {/* Human Advice Banner */}
      <div className={`p-4 rounded-2xl border ${advice.bg} flex items-start space-x-3`}>
        {advice.icon}
        <div className="text-xs">
          <h3 className={`font-bold text-sm ${advice.color}`}>{advice.headline}</h3>
          <p className="ts-text-primary mt-0.5 leading-relaxed">{advice.action}</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE RISK MAP (CITIZEN VIEW)                                    */}
      {/* ========================================================================= */}
      {/* Layer Control: Dynamic Ward Boundaries for active city + Optional Prototype Zones */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl ts-card border ts-border text-xs">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span className="font-bold ts-text-primary">
            Primary Heat Map Layer: {activeCityWards.length} {locationName.split(',')[0]} Administrative Wards
          </span>
          <span className="text-[10.5px] ts-text-subtle hidden sm:inline">
            • Live calculated ward-level biometeorological risk & UHI microclimates
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowPrototypeZones(!showPrototypeZones)}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center space-x-1.5 cursor-pointer text-xs ${
            showPrototypeZones
              ? 'bg-purple-600 text-white shadow-sm'
              : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
          }`}
          title="Toggle optional microclimate demonstration polygons"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Prototype Microclimate Illustration</span>
          <span className="text-[10px] opacity-75">({showPrototypeZones ? 'ON' : 'OFF'})</span>
        </button>
      </div>

      <RiskMap
        scope={viewScope === 'national' ? 'national' : 'wards'}
        stateAlerts={liveStateAlerts}
        center={
          viewScope === 'national' && selectedState
            ? [selectedState.centroid[1], selectedState.centroid[0]]
            : [coords.lat, coords.lon]
        }
        zoom={viewScope === 'national' ? 5 : 12}
        locationName={
          viewScope === 'national' && selectedState
            ? `${selectedState.stateName}, India`
            : viewScope === 'local' && selectedWard
            ? selectedWard.name
            : locationName
        }
        temperature={
          viewScope === 'national' && selectedState
            ? selectedState.temperatureC
            : viewScope === 'local' && selectedWard
            ? selectedWard.weather.temperatureC
            : (tempC ?? undefined)
        }
        humidity={
          viewScope === 'national' && selectedState
            ? selectedState.humidityPercent
            : viewScope === 'local' && selectedWard
            ? selectedWard.weather.humidityPercent
            : (humidity ?? undefined)
        }
        wbgt={
          viewScope === 'national' && selectedState
            ? selectedState.wbgtC
            : viewScope === 'local' && selectedWard
            ? selectedWard.thermal.estimatedWbgtC
            : (wbgtC ?? undefined)
        }
        riskLevel={
          viewScope === 'national' && selectedState
            ? selectedState.riskLevel
            : viewScope === 'local' && selectedWard
            ? selectedWard.risk.level
            : (riskLevel ?? undefined)
        }
        riskScore={
          viewScope === 'national' && selectedState
            ? (selectedState.riskScore > 1 ? selectedState.riskScore / 100 : selectedState.riskScore)
            : viewScope === 'local' && selectedWard
            ? (selectedWard.risk.score > 1 ? selectedWard.risk.score / 100 : selectedWard.risk.score)
            : thermalData?.thermal?.risk_assessment?.score
        }
        showStateAlerts={viewScope === 'national'}
        selectedStateCode={selectedState?.stateCode}
        onSelectState={(st) => setSelectedState(st)}
        mapLocations={viewScope === 'national' ? [] : mapLocations}
        adminWards={viewScope === 'local' ? activeCityWards : []}
        selectedWardId={selectedWard?.id}
        onSelectWard={handleSelectWard}
        onInspectWardTelemetry={handleInspectWardTelemetry}
        thermalZones={showPrototypeZones ? MUMBAI_PROTOTYPE_ZONES : []}
        selectedZoneId={selectedZone?.id}
        onSelectZone={(zone) => setSelectedZone(zone)}
        onMapClick={handleMapClick}
        isLoadingMap={isLoading}
        mapError={error}
        isCitizenView={true}
        title={
          viewScope === 'national'
            ? 'India State-Wise GIS Heatwave Alert Map (IMD Criteria)'
            : `${locationName.split(',')[0]} Municipal Administrative Wards (${activeCityWards.length} Wards)`
        }
        subtitle={
          viewScope === 'national'
            ? 'Official Survey of India boundaries across 37 States and Union Territories with calibrated IMD heatwave criteria & SDMA directives'
            : `Displaying administrative ward boundaries and thermal heat diffusion around ${locationName} — tap anywhere to inspect`
        }
      />

      {/* Selected State Heat Alert Details (when in national state alerts mode) */}
      {selectedState && viewScope === 'national' && (
        <div className="p-5 rounded-2xl ts-card border border-red-500/30 bg-red-500/5 space-y-3 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-bold text-red-500 uppercase text-[11px] font-mono tracking-wider">
                Official State Heatwave Advisory (Survey of India / IMD)
              </span>
              <h3 className="text-lg font-black ts-text-primary mt-0.5">
                {selectedState.stateName} — {selectedState.alertCategory} ALERT
              </h3>
            </div>
            <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${getStateCategoryStyle(selectedState.alertCategory).badgeBg}`}>
              {selectedState.imdClassification}
            </span>
          </div>

          <p className="ts-text-primary text-xs sm:text-sm leading-relaxed">
            {selectedState.alertHeadline} Monitored under <strong>{selectedState.authorityName}</strong>.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono">
            <div className="p-2.5 rounded-xl ts-card-subtle border ts-border">
              <span className="ts-text-subtle text-[10px] block">Max Temperature</span>
              <strong className="text-orange-500 text-base">{selectedState.temperatureC}°C</strong>
            </div>
            <div className="p-2.5 rounded-xl ts-card-subtle border ts-border">
              <span className="ts-text-subtle text-[10px] block">Heat Index</span>
              <strong className="text-amber-500 text-base">{selectedState.apparentTemperatureC}°C</strong>
            </div>
            <div className="p-2.5 rounded-xl ts-card-subtle border ts-border">
              <span className="ts-text-subtle text-[10px] block">Stull Wet-Bulb</span>
              <strong className="text-rose-500 text-base">{selectedState.wetBulbC}°C</strong>
            </div>
            <div className="p-2.5 rounded-xl ts-card-subtle border ts-border">
              <span className="ts-text-subtle text-[10px] block">Population Under Alert</span>
              <strong className="ts-text-primary text-base">~{selectedState.affectedPopulationMillion}M</strong>
            </div>
          </div>

          <div className="pt-2 border-t ts-border space-y-1.5">
            <div className="text-[11px] font-bold text-slate-300">
              State Disaster Management Authority (SDMA) Directives:
            </div>
            <ul className="space-y-1 text-slate-300 list-disc list-inside text-xs">
              {selectedState.actionAdvisories.map((advisory, i) => (
                <li key={i} className="leading-relaxed">{advisory}</li>
              ))}
            </ul>
          </div>

          <div className="text-[11px] ts-text-subtle">
            <strong>Key Districts Monitored:</strong> {selectedState.affectedDistricts.join(', ')}
          </div>
        </div>
      )}

      {/* Selected Administrative Ward Details Card */}
      {selectedWard && viewScope === 'local' && (
        <div ref={wardDetailRef} className="p-5 rounded-2xl ts-card border border-orange-500/30 bg-orange-500/5 space-y-3 text-xs animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-orange-400 uppercase text-[11px] font-mono">
                Selected Administrative Ward ({selectedWard.wardCode})
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${getRiskStyle(selectedWard.risk.level).badge}`}>
                {getRiskStyle(selectedWard.risk.level).emoji} {selectedWard.risk.level} ({selectedWard.risk.score}/100)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedWard(null)}
              className="text-xs ts-text-muted hover:ts-text-primary cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black ts-text-primary">{selectedWard.name}</h3>
              <p className="text-xs ts-text-muted mt-0.5">
                {selectedWard.attentionReason || selectedWard.demographicsNote}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleMapClick(selectedWard.centroid.latitude, selectedWard.centroid.longitude)}
              className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer whitespace-nowrap shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Monitor This Ward</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t ts-border font-mono text-xs">
            <div>
              <span className="ts-text-subtle text-[10.5px] block">Air Temperature:</span>
              <strong className="text-orange-400 text-sm">{selectedWard.weather.temperatureC.toFixed(1)}°C</strong>
            </div>
            <div>
              <span className="ts-text-subtle text-[10.5px] block">Estimated WBGT:</span>
              <strong className="text-rose-400 text-sm">{selectedWard.thermal.estimatedWbgtC.toFixed(1)}°C</strong>
            </div>
            <div>
              <span className="ts-text-subtle text-[10.5px] block">Humidity:</span>
              <strong className="ts-text-primary text-sm">{selectedWard.weather.humidityPercent}%</strong>
            </div>
            <div>
              <span className="ts-text-subtle text-[10.5px] block">Heat Index:</span>
              <strong className="text-amber-400 text-sm">{selectedWard.thermal.heatIndexC.toFixed(1)}°C</strong>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-500/10 border ts-border text-[11.5px] ts-text-muted flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="ts-text-primary">Safety Directive: </strong>
              {selectedWard.risk.level === 'EXTREME'
                ? 'Dangerous heat stress conditions. Limit outdoor exposure, stay in shaded or air-cooled locations, and hydrate with electrolytes.'
                : selectedWard.risk.level === 'HIGH'
                ? 'High physiological heat burden. Drink fluids regularly and take frequent breaks in shade if working outdoors.'
                : selectedWard.risk.level === 'MODERATE'
                ? 'Moderate heat conditions. Maintain regular hydration and avoid prolonged sun exposure during peak afternoon hours.'
                : 'Low thermal stress. Conditions are within normal limits; standard hydration is recommended.'}
            </span>
          </div>
        </div>
      )}

      {/* Selected Prototype Zone Details (if user selects a zone on map) */}
      {selectedZone && (
        <div className="p-5 rounded-2xl ts-card border border-purple-500/30 bg-purple-500/5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-400 uppercase text-[11px] font-mono">
              Selected Prototype Urban Thermal Zone (Demonstration)
            </span>
            <Badge variant="brand" size="sm">Prototype Demonstration Zone</Badge>
          </div>
          <h3 className="text-base font-black ts-text-primary">{selectedZone.name}</h3>
          <p className="ts-text-muted">{selectedZone.demographicsNote}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 font-mono">
            <div>
              <span className="ts-text-subtle text-[10px] block">Urban Heat Offset:</span>
              <strong className="text-orange-400">
                {selectedZone.baselineTempOffsetC > 0 ? `+${selectedZone.baselineTempOffsetC}°C` : `${selectedZone.baselineTempOffsetC}°C`}
              </strong>
            </div>
            <div>
              <span className="ts-text-subtle text-[10px] block">Vulnerability Index:</span>
              <strong className="ts-text-primary">{(selectedZone.vulnerabilityIndex * 100).toFixed(0)}/100</strong>
            </div>
            <div>
              <span className="ts-text-subtle text-[10px] block">District:</span>
              <strong className="ts-text-primary">{selectedZone.district}</strong>
            </div>
          </div>
          <div className="text-[10px] text-amber-400 font-mono pt-1">
            Scientific demonstration illustration only — not live physical sensors.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SCIENTIFIC TRANSPARENCY & CITIZEN PRECAUTIONS                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card A: How This Map Works */}
        <div className="p-6 rounded-3xl ts-card border ts-border space-y-4">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-black uppercase tracking-wider text-orange-500 font-mono">
              How This Heat Map Works
            </h3>
          </div>

          <div className="space-y-3 text-xs ts-text-muted leading-relaxed">
            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <strong className="ts-text-primary block mb-0.5">Tap-to-Explore:</strong>
              Click or tap anywhere on the map to move your monitoring point. The location is resolved via reverse geocoding and thermal data is refreshed automatically.
            </div>

            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <strong className="ts-text-primary block mb-0.5">Live vs Calculated Metrics:</strong>
              Air temperature, humidity, and wind are atmospheric readings. WBGT and Heat Index are calculated using peer-reviewed biometeorological equations (Stull wet-bulb and Rothfusz polynomial) from weather data.
            </div>

            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <strong className="ts-text-primary block mb-0.5">Mumbai Administrative Ward References:</strong>
              The 24 ward polygons display live calculated heat risk synchronized with municipal monitoring. Polygons are colored using the centralized heat risk scale (Low, Moderate, High, Extreme).
            </div>

            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <strong className="ts-text-primary block mb-0.5">Prototype Microclimate Layer:</strong>
              The optional demonstration layer illustrates modelled urban heat island (UHI) offsets for scientific research and education — not live physical sensors.
            </div>
          </div>
        </div>

        {/* Card B: Citizen Safety Precautions */}
        <div className="p-6 rounded-3xl ts-card border ts-border space-y-4">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-500 font-mono">
              Actionable Citizen Heat Defense
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
              <p className="ts-text-muted">
                <strong className="ts-text-primary">Hydrate Hourly:</strong> Ingest ~250–500 mL water or ORS every 20–30 minutes during midday, even before feeling thirsty.
              </p>
            </div>

            <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
              <p className="ts-text-muted">
                <strong className="ts-text-primary">Limit Midday Sun (12 PM – 4 PM):</strong> Reschedule heavy outdoor tasks or strenuous workouts away from the solar apex.
              </p>
            </div>

            <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
              <p className="ts-text-muted">
                <strong className="ts-text-primary">Light & Loose Attire:</strong> Wear light-colored, breathable cotton and carry an umbrella or wide-brim hat.
              </p>
            </div>

            <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">4</span>
              <p className="ts-text-muted">
                <strong className="ts-text-primary">Protect Vulnerable Family:</strong> Check on elderly relatives, pregnant women, and infants who cannot regulate body heat as rapidly.
              </p>
            </div>

            <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center shrink-0 text-[11px]">5</span>
              <p className="ts-text-muted">
                <strong className="ts-text-primary">Emergency Escalation (Call 108):</strong> If anyone exhibits confusion, stopped sweating, or fainting, move to shade and call 108 immediately.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs font-bold">
              <Link
                to="/personal-risk"
                className="text-orange-500 hover:underline flex items-center gap-1"
              >
                <span>Check Personal Risk Assessment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                to="/alerts"
                className="text-amber-500 hover:underline flex items-center gap-1"
              >
                <span>View Live Alerts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenHeatMap;
