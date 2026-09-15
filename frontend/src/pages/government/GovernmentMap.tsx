import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from '../../context/LocationContext';
import { useTranslation } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { ThermalResponse, RiskResponse, MapLocationRisk, AreaRiskItem, ThermalZone } from '../../types';
import { RiskMap } from '../../components/RiskMap';
import { LocationSearch } from '../../components/LocationSearch';
import { Card, CardHeader, CardContent, Badge, Button } from '../../components/ui';
import { DataRealityBadge, FallbackModeBanner, CalculationInfoTooltip } from '../../components/provenance';
import { translateRiskLevel } from '../../utils/translationHelpers';
import { MUMBAI_PROTOTYPE_ZONES } from '../../data/thermalZones';
import { CityHeatActionPlanning } from '../../components/government/CityHeatActionPlanning';
import {
  Compass,
  MapPin,
  RefreshCw,
  Layers,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Radio,
  HeartPulse,
  Sliders,
  Building2,
  Info,
  CheckCircle2,
  Map as MapIcon,
} from 'lucide-react';

const QUICK_GOV_CITIES = [
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777, zone: 'Western Coastal' },
  { name: 'New Delhi', state: 'Delhi NCR', lat: 28.6139, lon: 77.2090, zone: 'Northern Plains' },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lon: 72.5714, zone: 'Western Arid' },
  { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lon: 79.0882, zone: 'Central Plateau' },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707, zone: 'Southern Coastal' },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639, zone: 'Eastern Delta' },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873, zone: 'North-Western' },
];

export const GovernmentMap: React.FC = () => {
  const { coords, locationName, setCoordsAndName, setLocation, detectMyLocation, isLocating } = useLocation();
  const { t } = useTranslation();

  const [gisLayerMode, setGisLayerMode] = useState<'mumbai_zones' | 'national_centroids'>('mumbai_zones');
  const [selectedZone, setSelectedZone] = useState<ThermalZone | null>(MUMBAI_PROTOTYPE_ZONES[1]);
  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [mapLocations, setMapLocations] = useState<MapLocationRisk[]>([]);
  const [priorityAreas, setPriorityAreas] = useState<AreaRiskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Recently');

  const fetchMapData = async (lat: number, lon: number) => {
    setIsLoading(true);
    setMapError(null);
    try {
      const [thermalRes, riskRes, mapRes, areasRes] = await Promise.allSettled([
        api.getThermal(lat, lon),
        api.getRisk(lat, lon),
        api.getMapRisk([`${lat.toFixed(4)},${lon.toFixed(4)}`]),
        api.getAreasRiskOverview(),
      ]);

      if (thermalRes.status === 'fulfilled') setThermalData(thermalRes.value);
      if (riskRes.status === 'fulfilled') setRiskData(riskRes.value);
      if (mapRes.status === 'fulfilled') setMapLocations(mapRes.value.locations || []);
      if (areasRes.status === 'fulfilled') setPriorityAreas(areasRes.value.areas || []);

      setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    } catch (e: any) {
      setMapError(e.message || 'Failed to load geospatial layer telemetry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData(coords.lat, coords.lon);
  }, [coords.lat, coords.lon]);

  const handleCitySelect = (city: typeof QUICK_GOV_CITIES[0]) => {
    setCoordsAndName({ lat: city.lat, lon: city.lon }, `${city.name}, ${city.state}`);
  };

  const handlePriorityClick = (area: AreaRiskItem) => {
    setLocation({
      name: `${area.name}, ${area.state}`,
      latitude: area.latitude,
      longitude: area.longitude,
    });
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  const currentRiskLevel = thermalData?.thermal?.risk_assessment?.level || 'HIGH';
  const currentTemp = thermalData?.weather?.temperature ?? thermalData?.thermal?.input_summary?.temperature_c ?? 34;
  const feelsLike = thermalData?.thermal?.indices?.heat_index_c ?? thermalData?.thermal?.indices?.apparent_temperature_c ?? 39;

  // Sorted Priority Locations from real application data
  const topPriorityAreas = [...priorityAreas]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 4);

  // Plain-Language Area Attention Reasoning (telemetry-grounded)
  const getAreaAttentionReasoning = () => {
    const norm = (currentRiskLevel || 'HIGH').toUpperCase();
    const wbgtVal = thermalData?.thermal?.indices?.wbgt_c;
    const humVal = thermalData?.weather?.humidity;
    if (norm === 'EXTREME' || norm === 'CRITICAL') {
      return `Extreme ambient temperature (${currentTemp.toFixed(1)}°C) combined with elevated wet-bulb conditions (${wbgtVal ? wbgtVal.toFixed(1) + '°C WBGT' : 'high humidity'}) presents acute thermal strain risks. Hydration and shaded refuge staging are urgently required.`;
    }
    if (norm === 'HIGH') {
      return `High afternoon temperature (${currentTemp.toFixed(1)}°C) combined with ${humVal ? Math.round(humVal) + '%' : 'elevated'} humidity and strong solar exposure is increasing estimated thermal strain. Limit strenuous outdoor activity during peak heat hours.`;
    }
    if (norm === 'MODERATE') {
      return `Moderate heat stress observed (${currentTemp.toFixed(1)}°C). Vulnerable outdoor workers should maintain regular hydration and rest pacing during peak afternoon hours.`;
    }
    return `Conditions are within baseline physiological threshold limits (${currentTemp.toFixed(1)}°C). Standard regional reference monitoring active.`;
  };

  const isFallback = thermalData?.weather?.source_status === 'OFFLINE_FALLBACK' || thermalData?.weather?.is_fallback;

  return (
    <div className="space-y-8 pb-16">
      {/* Fallback indicator if live weather is unavailable */}
      {isFallback && (
        <FallbackModeBanner
          isFallback={true}
          sourceName={thermalData?.weather?.source_name}
          compact
          className="mb-2"
        />
      )}

      {/* SECTION 1 — MAP HEADER */}
      <div className="rounded-3xl ts-card p-6 sm:p-7 border ts-border shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center space-x-1">
                <Compass className="w-4 h-4" />
                <span>Authority GIS Intelligence</span>
              </span>
              <DataRealityBadge
                tier={isFallback ? 'OFFLINE_FALLBACK' : 'LIVE'}
                size="sm"
                customLabel={isFallback ? 'Offline Baseline' : 'Live Regional Feeds'}
              />
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                Updated {lastUpdatedTime}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black ts-text-primary tracking-tight font-sans mt-1">
              Geospatial Heat Stress Intelligence
            </h1>
            <p className="text-xs sm:text-sm ts-text-muted mt-1 leading-relaxed">
              Hyperlocal GIS monitoring workspace for city administrations, public health coordinators, and emergency response authorities.
            </p>
          </div>

          {/* GIS Layer Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-500/10 border ts-border text-xs self-start lg:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => setGisLayerMode('mumbai_zones')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                gisLayerMode === 'mumbai_zones'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'ts-text-muted hover:ts-text-primary'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Greater Mumbai Prototype Zones</span>
            </button>
            <button
              type="button"
              onClick={() => setGisLayerMode('national_centroids')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                gisLayerMode === 'national_centroids'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'ts-text-muted hover:ts-text-primary'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>National Reference Centroids</span>
            </button>
          </div>
        </div>

        {/* SECTION 2 — LOCATION SEARCH & QUICK ACCESS */}
        <div className="mt-4 space-y-3">
          {/* Location Search Bar */}
          <div className="relative z-30">
            <LocationSearch
              currentLocationName={locationName}
              onSelectLocation={(loc) => {
                setLocation(loc);
                setGisLayerMode('national_centroids');
              }}
              onUseMyLocation={detectMyLocation}
              isLocating={isLocating}
            />
          </div>

          {/* Quick Jump (Cities or Mumbai Zones) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
            <span className="ts-text-subtle font-bold whitespace-nowrap text-[11px]">
              {gisLayerMode === 'mumbai_zones' ? 'Prototype Zones:' : 'Quick City Jump:'}
            </span>

            {gisLayerMode === 'mumbai_zones'
              ? MUMBAI_PROTOTYPE_ZONES.map((zone) => {
                  const isSelected = selectedZone?.id === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setSelectedZone(zone)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary hover:bg-slate-500/10'
                      }`}
                    >
                      {zone.shortName}
                    </button>
                  );
                })
              : QUICK_GOV_CITIES.map((c) => {
                  const isSelected = Math.abs(coords.lat - c.lat) < 0.05 && Math.abs(coords.lon - c.lon) < 0.05;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleCitySelect(c)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary hover:bg-slate-500/10'
                      }`}
                    >
                      {c.name} ({c.zone})
                    </button>
                  );
                })}
          </div>
        </div>
      </div>

      {/* SECTION 3 — PRIMARY GEOGRAPHIC MAP */}
      <div className="space-y-4">
        <RiskMap
          center={
            gisLayerMode === 'mumbai_zones'
              ? selectedZone
                ? selectedZone.representativeCoords
                : [19.0760, 72.8777]
              : [coords.lat, coords.lon]
          }
          zoom={gisLayerMode === 'mumbai_zones' ? 11 : 6}
          locationName={
            gisLayerMode === 'mumbai_zones'
              ? selectedZone?.name || 'Greater Mumbai Prototype Thermal Zones'
              : locationName
          }
          temperature={
            gisLayerMode === 'mumbai_zones' && selectedZone
              ? currentTemp + selectedZone.baselineTempOffsetC
              : currentTemp
          }
          humidity={thermalData?.weather?.humidity}
          wbgt={thermalData?.thermal?.indices?.wbgt_c}
          riskLevel={currentRiskLevel}
          riskScore={thermalData?.thermal?.risk_assessment?.score}
          mapLocations={gisLayerMode === 'national_centroids' ? mapLocations : []}
          thermalZones={gisLayerMode === 'mumbai_zones' ? MUMBAI_PROTOTYPE_ZONES : []}
          selectedZoneId={gisLayerMode === 'mumbai_zones' ? selectedZone?.id : undefined}
          onSelectZone={(zone) => setSelectedZone(zone)}
          isLoadingMap={isLoading}
          mapError={mapError}
          title={
            gisLayerMode === 'mumbai_zones'
              ? 'Greater Mumbai Urban Thermal Zones (Prototype GIS Layer)'
              : 'National Heat Risk Reference Centroids'
          }
          subtitle={
            gisLayerMode === 'mumbai_zones'
              ? 'Interactive polygon visualization of microclimatic urban thermal zones and vulnerability factors'
              : 'Regional heat risk evaluated at curated municipal monitoring reference points'
          }
          onMapClick={(lat, lon) => {
            setCoordsAndName({ lat, lon }, `Custom Point (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`);
          }}
        />

        {/* Spatial Visualization Methodology Note */}
        <div className="p-3.5 rounded-2xl ts-card-subtle border ts-border text-xs ts-text-muted flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
          <div className="leading-relaxed">
            <strong className="ts-text-primary">Data Reality & Provenance Notice: </strong>
            {gisLayerMode === 'mumbai_zones' ? (
              <span>
                Greater Mumbai polygons represent <strong>Prototype Urban Thermal Zones</strong> calibrated with microclimate adjustments (Urban Heat Island offsets) and census-informed demographic vulnerability factors. They are not official administrative ward polygons and do not assume physical street sensor hardware.
              </span>
            ) : (
              <span>
                Reference pins represent curated municipal reference coordinates evaluated with live meteorological telemetry. Colored buffers are analytical risk envelopes, not continuous physical sensor grids.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4 — SELECTED AREA THERMAL RISK */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider text-orange-500">
                Selected Area Thermal Risk
              </span>
              <DataRealityBadge
                tier={gisLayerMode === 'mumbai_zones' ? 'MODELLED' : 'CALCULATED'}
                size="xs"
                customLabel={
                  gisLayerMode === 'mumbai_zones'
                    ? 'Modelled Prototype Thermal Zone'
                    : 'Calculated Regional Risk Estimate'
                }
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-black ts-text-primary mt-0.5">
              {gisLayerMode === 'mumbai_zones' && selectedZone
                ? selectedZone.name
                : `${locationName.split(',')[0]} Selected Area`}
            </h2>
            <div className="flex items-center gap-3 text-xs ts-text-subtle mt-1 flex-wrap">
              {gisLayerMode === 'mumbai_zones' && selectedZone ? (
                <>
                  <span><strong>District:</strong> {selectedZone.district}</span>
                  <span>•</span>
                  <span><strong>Zone Type:</strong> {selectedZone.zone}</span>
                  <span>•</span>
                  <span>
                    <strong>Microclimate Offset:</strong>{' '}
                    {selectedZone.baselineTempOffsetC >= 0
                      ? `+${selectedZone.baselineTempOffsetC}°C`
                      : `${selectedZone.baselineTempOffsetC}°C`}{' '}
                    UHI
                  </span>
                </>
              ) : (
                <>
                  <span><strong>Location:</strong> {locationName}</span>
                  <span>•</span>
                  <span className="font-mono">
                    <strong>Coordinates:</strong> {coords.lat.toFixed(4)}° N, {coords.lon.toFixed(4)}° E
                  </span>
                  <span>•</span>
                  <span><strong>Data Source:</strong> {isFallback ? 'Regional Baseline Fallback' : 'Live Meteorological Feeds'}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge riskLevel={currentRiskLevel} size="md" showDot showIcon>
              {translateRiskLevel(currentRiskLevel, t)}
            </Badge>
          </div>
        </div>

        {/* Derived Indicators Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Estimated WBGT
            </div>
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono mt-1">
              {thermalData?.thermal?.indices?.wbgt_c !== undefined
                ? `${(
                    thermalData.thermal.indices.wbgt_c +
                    (gisLayerMode === 'mumbai_zones' && selectedZone
                      ? selectedZone.baselineTempOffsetC * 0.7
                      : 0)
                  ).toFixed(1)}°C`
                : '--'}
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              Derived wet-bulb globe temp
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Apparent Heat Index
            </div>
            <div className="text-2xl font-black text-amber-500 font-mono mt-1">
              {(
                feelsLike +
                (gisLayerMode === 'mumbai_zones' && selectedZone
                  ? selectedZone.baselineTempOffsetC
                  : 0)
              ).toFixed(1)}°C
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              Effective physiological heat load
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Air Temperature
            </div>
            <div className="text-2xl font-black ts-text-primary font-mono mt-1">
              {(
                currentTemp +
                (gisLayerMode === 'mumbai_zones' && selectedZone
                  ? selectedZone.baselineTempOffsetC
                  : 0)
              ).toFixed(1)}°C
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              {gisLayerMode === 'mumbai_zones' && selectedZone && selectedZone.baselineTempOffsetC !== 0
                ? `Adjusted for ${selectedZone.baselineTempOffsetC >= 0 ? `+${selectedZone.baselineTempOffsetC}°C` : `${selectedZone.baselineTempOffsetC}°C`} UHI`
                : 'Ambient meteorological reading'}
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Vulnerability Index
            </div>
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono mt-1">
              {gisLayerMode === 'mumbai_zones' && selectedZone
                ? `${Math.round(selectedZone.vulnerabilityIndex * 100)}%`
                : '62%'}
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              Modelled demographic risk
            </div>
          </div>
        </div>

        {/* Vulnerability factors pill list if in prototype zone */}
        {gisLayerMode === 'mumbai_zones' && selectedZone && (
          <div className="mt-4 p-4 rounded-2xl ts-card-subtle border ts-border space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Zone Vulnerability Factors & Demographics:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedZone.vulnerabilityFactors.map((f, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs bg-orange-500/10 border border-orange-500/25 text-orange-700 dark:text-orange-300 font-medium"
                >
                  • {f}
                </span>
              ))}
            </div>
            <p className="text-xs ts-text-muted pt-1">
              <strong>Demographic Summary: </strong>
              {selectedZone.demographicsNote}
            </p>
          </div>
        )}

        {/* Plain-Language Interpretation: Why this area needs attention */}
        <div className="mt-4 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-start space-x-3">
          <Info className="w-5 h-5 text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Why this area requires attention
            </div>
            <p className="text-xs sm:text-sm ts-text-primary mt-1 leading-relaxed">
              {gisLayerMode === 'mumbai_zones' && selectedZone
                ? `Conditions in ${selectedZone.name} indicate elevated thermal stress. Authorities should review outdoor worker precautions, local cooling center access, and drinking water availability.`
                : getAreaAttentionReasoning()}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 5 — PRIORITY LOCATIONS & MUNICIPAL MATRIX LINK */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b ts-border">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-orange-500">
              Multi-Location Comparison
            </div>
            <h2 className="text-xl font-black ts-text-primary mt-0.5">
              Regional Priority Ranking
            </h2>
          </div>
          <Link
            to="/gov/matrix"
            className="text-xs font-extrabold text-orange-600 dark:text-orange-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>Open Full Municipal Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {topPriorityAreas.length === 0 ? (
          <div className="py-6 text-center text-xs ts-text-muted">
            Loading priority locations...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            {topPriorityAreas.map((area, idx) => (
              <div
                key={area.name}
                onClick={() => {
                  handlePriorityClick(area);
                  setGisLayerMode('national_centroids');
                }}
                className="p-4 rounded-2xl ts-card-subtle border ts-border hover:border-orange-500/50 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 font-mono">
                      #{idx + 1}
                    </span>
                    <Badge riskLevel={area.risk_level} size="sm">
                      {translateRiskLevel(area.risk_level, t)}
                    </Badge>
                  </div>
                  <h3 className="text-base font-black ts-text-primary mt-2 group-hover:text-orange-400">
                    {area.name}
                  </h3>
                  <p className="text-[11px] ts-text-muted mt-0.5">
                    {area.state} • {area.zone}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t ts-border flex items-center justify-between text-xs font-bold text-orange-600 dark:text-orange-400">
                  <span>Focus Map →</span>
                  <span className="font-mono text-[11px] ts-text-subtle font-normal">
                    {area.temperature_c.toFixed(1)}°C
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 6 — CITY HEAT ACTION PLANNING (OPERATIONAL RECOMMENDATIONS) */}
      <CityHeatActionPlanning
        locationName={locationName}
        temperature={
          gisLayerMode === 'mumbai_zones' && selectedZone
            ? currentTemp + selectedZone.baselineTempOffsetC
            : currentTemp
        }
        wbgt={thermalData?.thermal?.indices?.wbgt_c}
        heatIndex={feelsLike}
        humidity={thermalData?.weather?.humidity}
        riskLevel={currentRiskLevel}
        vulnerabilityIndex={
          gisLayerMode === 'mumbai_zones' && selectedZone
            ? selectedZone.vulnerabilityIndex
            : 0.65
        }
        isPrototypeZone={gisLayerMode === 'mumbai_zones'}
        zoneName={gisLayerMode === 'mumbai_zones' && selectedZone ? selectedZone.name : undefined}
      />

      {/* SECTION 7 — CONNECTED AUTHORITY ACTIONS */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Layers className="w-4 h-4 text-orange-500" />
          <h2 className="text-xs font-black uppercase tracking-wider ts-text-subtle">
            Connected Authority Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/gov/health-impact"
            className="p-4 rounded-2xl ts-card-elevated border ts-border hover:border-rose-500/50 transition-all group block"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center mb-2">
              <HeartPulse className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold ts-text-primary flex items-center justify-between">
              <span>Review Health Impact</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500" />
            </h3>
            <p className="text-[11px] ts-text-muted mt-1">
              Vulnerable population intelligence & health stress projections.
            </p>
          </Link>

          <Link
            to="/gov/dispatch"
            className="p-4 rounded-2xl ts-card-elevated border ts-border hover:border-purple-500/50 transition-all group block"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-500 flex items-center justify-center mb-2">
              <Radio className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold ts-text-primary flex items-center justify-between">
              <span>Manage Alerts & Dispatch</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500" />
            </h3>
            <p className="text-[11px] ts-text-muted mt-1">
              Trigger alerts, inspect background monitoring daemon & telemetry.
            </p>
          </Link>

          <Link
            to="/gov/interventions"
            className="p-4 rounded-2xl ts-card-elevated border ts-border hover:border-orange-500/50 transition-all group block"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-500 flex items-center justify-center mb-2">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold ts-text-primary flex items-center justify-between">
              <span>Run Intervention Simulator</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500" />
            </h3>
            <p className="text-[11px] ts-text-muted mt-1">
              Model cooling centers & work restrictions risk reduction.
            </p>
          </Link>

          <Link
            to="/gov/matrix"
            className="p-4 rounded-2xl ts-card-elevated border ts-border hover:border-emerald-500/50 transition-all group block"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-2">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold ts-text-primary flex items-center justify-between">
              <span>View Full Municipal Matrix</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500" />
            </h3>
            <p className="text-[11px] ts-text-muted mt-1">
              Comparative multi-area matrix across monitored zones.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GovernmentMap;

