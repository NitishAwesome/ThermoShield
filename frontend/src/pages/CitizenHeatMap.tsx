import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { RiskMap } from '../components/RiskMap';
import { LocationSearch } from '../components/LocationSearch';
import { Badge, Button } from '../components/ui';
import { DataRealityBadge } from '../components/provenance';
import { useLocation } from '../context/LocationContext';
import { useProfile } from '../context/ProfileContext';
import { api } from '../services/api';
import { ThermalResponse, RiskLevel, ThermalZone, MapLocationRisk } from '../types';
import { MUMBAI_PROTOTYPE_ZONES } from '../data/thermalZones';

// Popular Indian reference regions for rapid citizen exploration
const REGIONAL_PRESETS = [
  { name: 'Central Mumbai (UHI)', lat: 19.0400, lon: 72.8550 },
  { name: 'South Mumbai (Coastal)', lat: 18.9320, lon: 72.8340 },
  { name: 'Delhi NCR', lat: 28.6139, lon: 77.2090 },
  { name: 'Ahmedabad (Dry Heat)', lat: 23.0225, lon: 72.5714 },
  { name: 'Kolkata (Humid Delta)', lat: 22.5726, lon: 88.3639 },
  { name: 'Chennai (Coastal Heat)', lat: 13.0827, lon: 80.2707 },
];

export const CitizenHeatMap: React.FC = () => {
  const { coords, locationName, setLocation, detectMyLocation, isLocating } = useLocation();
  const { profile } = useProfile();

  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<ThermalZone | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);

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

  // Weather and thermal readings with safe fallbacks
  const tempC = thermalData?.weather?.temperature ?? 33.5;
  const humidity = thermalData?.weather?.humidity ?? 65;
  const windMps = thermalData?.weather?.wind_speed ?? 2.4;
  const wbgtC = thermalData?.thermal?.indices?.wbgt_c ?? 29.2;
  const heatIndexC = thermalData?.thermal?.indices?.heat_index_c ?? 38.1;
  const rawRiskLevel = thermalData?.thermal?.risk_assessment?.level || 'MODERATE';
  const riskLevel = (['LOW', 'MODERATE', 'HIGH', 'EXTREME', 'CRITICAL'].includes(rawRiskLevel)
    ? rawRiskLevel
    : 'MODERATE') as RiskLevel;

  // Derive human-friendly advice based on WBGT
  const getHumanAdvice = (wbgt: number) => {
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

  const advice = getHumanAdvice(wbgtC);

  // Map locations for surrounding reference
  const mapLocations: MapLocationRisk[] = [
    {
      latitude: coords.lat,
      longitude: coords.lon,
      risk_score: thermalData?.thermal?.risk_assessment?.score
        ? Math.round(thermalData.thermal.risk_assessment.score * 100)
        : 55,
      risk_level: riskLevel,
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-7xl mx-auto px-2 sm:px-4">
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
              <DataRealityBadge tier="CALCULATED" size="xs" customLabel="Heat Stress Model" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black ts-text-primary tracking-tight font-sans mt-2">
              Local Heat Map
            </h1>
            <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-2xl leading-relaxed">
              Estimated thermal stress and heat conditions around your monitored location.
              {' '}
              <span className="inline-flex items-center gap-1 text-orange-400 font-semibold">
                <MousePointerClick className="w-3.5 h-3.5" />
                Tap the map to explore any area.
              </span>
            </p>
          </div>

          {/* Location Search Bar with integrated GPS */}
          <div className="max-w-md w-full">
            <LocationSearch
              currentLocationName={locationName}
              onSelectLocation={setLocation}
              onUseMyLocation={detectMyLocation}
              isLocating={isLocating}
            />
          </div>
        </div>

        {/* Regional Quick Select Presets */}
        <div className="mt-4 pt-3 border-t ts-border flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="ts-text-subtle text-[11px] font-semibold whitespace-nowrap flex items-center gap-1">
            <Compass className="w-3 h-3 text-orange-500" />
            <span>Sample Areas:</span>
          </span>
          {REGIONAL_PRESETS.map((preset) => (
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
            {tempC.toFixed(1)}°C
          </div>
          <div className="text-[10.5px] ts-text-muted mt-0.5">Live atmospheric observation</div>
        </div>

        {/* Relative Humidity */}
        <div className="p-4 rounded-2xl ts-card border ts-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs ts-text-subtle font-medium">
            <span>Humidity</span>
            <Droplets className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="mt-2 font-mono font-black text-2xl text-cyan-400">
            {humidity}%
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
            {heatIndexC.toFixed(1)}°C
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
            {wbgtC.toFixed(1)}°C
          </div>
          <div className="text-[10.5px] ts-text-muted mt-0.5">Liljegren solar-shade metric</div>
        </div>

        {/* Wind Speed */}
        <div className="p-4 rounded-2xl ts-card border ts-border col-span-2 sm:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs ts-text-subtle font-medium">
            <span>Wind Speed</span>
            <Wind className="w-4 h-4 text-teal-500" />
          </div>
          <div className="mt-2 font-mono font-black text-2xl text-teal-400">
            {windMps.toFixed(1)} m/s
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
      <RiskMap
        center={[coords.lat, coords.lon]}
        zoom={11}
        locationName={locationName}
        temperature={tempC}
        humidity={humidity}
        wbgt={wbgtC}
        riskLevel={riskLevel}
        mapLocations={mapLocations}
        thermalZones={MUMBAI_PROTOTYPE_ZONES}
        selectedZoneId={selectedZone?.id}
        onSelectZone={(zone) => setSelectedZone(zone)}
        onMapClick={handleMapClick}
        isLoadingMap={isLoading}
        mapError={error}
        isCitizenView={true}
        title="Local Heat Stress Map"
        subtitle={`Displaying conditions around ${locationName} — tap the map to explore`}
      />

      {/* Selected Prototype Zone Details (if user selects a zone on map) */}
      {selectedZone && (
        <div className="p-5 rounded-2xl ts-card border border-purple-500/30 bg-purple-500/5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-400 uppercase text-[11px] font-mono">
              Selected Prototype Urban Thermal Zone
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
              Air temperature, humidity, and wind are atmospheric readings. WBGT and Heat Index are calculated using the Liljegren equations from weather and humidity models.
            </div>

            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <strong className="ts-text-primary block mb-0.5">Prototype Urban Zones:</strong>
              The demonstration polygons in Greater Mumbai illustrate how building density, corrugated roofing, and sea breezes alter localized thermal stress — not live sensor data.
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
