import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from '../../context/LocationContext';
import { useTranslation } from '../../context/LanguageContext';
import { api } from '../../services/api';
import {
  ThermalResponse,
  RiskResponse,
  MapLocationRisk,
  AreaRiskItem,
  ThermalZone,
  HeatRiskArea,
  RiskLevel,
  HeatActionPlanResponse,
  WardForecastSummary,
  GlobalHeatStation,
} from '../../types';
import { RiskMap } from '../../components/RiskMap';
import { LocationSearch } from '../../components/LocationSearch';
import { Card, CardHeader, CardContent, Badge, Button } from '../../components/ui';
import { DataRealityBadge, FallbackModeBanner, CalculationInfoTooltip } from '../../components/provenance';
import { translateRiskLevel } from '../../utils/translationHelpers';
import { MUMBAI_PROTOTYPE_ZONES } from '../../data/thermalZones';
import { MUMBAI_ADMIN_WARDS, BMC_WARD_PROVENANCE } from '../../data/mumbaiWards';
import { GLOBAL_REGIONS, GLOBAL_HEAT_STATIONS, getStationsByRegion } from '../../data/globalHeatHotspots';
import { getCityMunicipalAuthority, getOrGenerateCityWards, calculateWetBulb, calculateHeatIndex, findNearestMetroHub } from '../../utils/cityWardsGenerator';
import { getRiskStyle } from '../../utils/risk';
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
  Calendar,
  ShieldAlert,
  Sparkles,
  Globe,
  Flame,
  Landmark,
} from 'lucide-react';

const QUICK_GOV_CITIES = [
  { name: 'Mumbai', authority: 'BMC', state: 'Maharashtra', lat: 19.0760, lon: 72.8777, zone: 'Western Coastal' },
  { name: 'Pune', authority: 'PMC', state: 'Maharashtra', lat: 18.5204, lon: 73.8567, zone: 'Deccan Plateau' },
  { name: 'New Delhi', authority: 'MCD', state: 'Delhi NCR', lat: 28.6139, lon: 77.2090, zone: 'Northern Plains' },
  { name: 'Bengaluru', authority: 'BBMP', state: 'Karnataka', lat: 12.9716, lon: 77.5946, zone: 'Southern Plateau' },
  { name: 'Hyderabad', authority: 'GHMC', state: 'Telangana', lat: 17.3850, lon: 78.4867, zone: 'Deccan Central' },
  { name: 'Ahmedabad', authority: 'AMC', state: 'Gujarat', lat: 23.0225, lon: 72.5714, zone: 'Western Arid' },
  { name: 'Jaipur', authority: 'JMC', state: 'Rajasthan', lat: 26.9124, lon: 75.7873, zone: 'North-Western' },
  { name: 'Chennai', authority: 'GCC', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707, zone: 'Southern Coastal' },
  { name: 'Kolkata', authority: 'KMC', state: 'West Bengal', lat: 22.5726, lon: 88.3639, zone: 'Eastern Delta' },
  { name: 'Nagpur', authority: 'NMC', state: 'Maharashtra', lat: 21.1458, lon: 79.0882, zone: 'Central Plateau' },
  { name: 'Lucknow', authority: 'LMC', state: 'Uttar Pradesh', lat: 26.8467, lon: 80.9462, zone: 'Gangetic Plains' },
  { name: 'Surat', authority: 'SMC', state: 'Gujarat', lat: 21.1702, lon: 72.8311, zone: 'Western Coastal' },
];

export const GovernmentMap: React.FC = () => {
  const { coords, locationName, setCoordsAndName, setLocation, detectMyLocation, isLocating } = useLocation();
  const { t } = useTranslation();

  const [gisLayerMode, setGisLayerMode] = useState<'global_world' | 'official_wards' | 'mumbai_zones' | 'national_centroids'>('official_wards');
  const [selectedGlobalStation, setSelectedGlobalStation] = useState<GlobalHeatStation | null>(GLOBAL_HEAT_STATIONS[0]); // Default: Dubai
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<ThermalZone | null>(MUMBAI_PROTOTYPE_ZONES[1]);
  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [mapLocations, setMapLocations] = useState<MapLocationRisk[]>([]);
  const [priorityAreas, setPriorityAreas] = useState<AreaRiskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Recently');

  // Thermal & Meteorological Derived Readings
  const currentRiskLevel = thermalData?.thermal?.risk_assessment?.level || 'HIGH';
  const currentTemp = thermalData?.weather?.temperature ?? thermalData?.thermal?.input_summary?.temperature_c ?? 34;
  const feelsLike = thermalData?.thermal?.indices?.heat_index_c ?? thermalData?.thermal?.indices?.apparent_temperature_c ?? 39;

  // Active City Municipal Authority Metadata
  const municipalAuthority = useMemo(() => {
    return getCityMunicipalAuthority(locationName, coords.lat, coords.lon);
  }, [locationName, coords.lat, coords.lon]);

  // Dynamically generate or load official wards for current monitored city
  const activeCityWards = useMemo(() => {
    const humidity = thermalData?.weather?.humidity ?? 55;
    return getOrGenerateCityWards(locationName, coords.lat, coords.lon, currentTemp, humidity);
  }, [locationName, coords.lat, coords.lon, currentTemp, thermalData?.weather?.humidity]);

  const [selectedWard, setSelectedWard] = useState<HeatRiskArea | null>(null);

  // Sync selected ward when activeCityWards changes
  useEffect(() => {
    if (activeCityWards.length > 0) {
      const stillValid = selectedWard && activeCityWards.some((w) => w.id === selectedWard.id);
      if (!stillValid) {
        const topRisk = [...activeCityWards].sort((a, b) => b.risk.score - a.risk.score)[0];
        setSelectedWard(topRisk || activeCityWards[0]);
      }
    }
  }, [activeCityWards]);

  // 3-5 Day Forecast Mode & Heat Action Plan state
  const [forecastDayIdx, setForecastDayIdx] = useState<number>(0);
  const [wardsForecastSummary, setWardsForecastSummary] = useState<WardForecastSummary[]>([]);
  const [wardActionPlan, setWardActionPlan] = useState<HeatActionPlanResponse | null>(null);
  const [loadingWardHap, setLoadingWardHap] = useState<boolean>(false);

  const fetchMapData = async (lat: number, lon: number) => {
    setIsLoading(true);
    setMapError(null);
    try {
      const [thermalRes, riskRes, mapRes, areasRes, forecastRes] = await Promise.allSettled([
        api.getThermal(lat, lon),
        api.getRisk(lat, lon),
        api.getMapRisk([`${lat.toFixed(4)},${lon.toFixed(4)}`]),
        api.getAreasRiskOverview(),
        api.getWardsForecastSummary(),
      ]);

      if (thermalRes.status === 'fulfilled') setThermalData(thermalRes.value);
      if (riskRes.status === 'fulfilled') setRiskData(riskRes.value);
      if (mapRes.status === 'fulfilled') setMapLocations(mapRes.value.locations || []);
      if (areasRes.status === 'fulfilled') setPriorityAreas(areasRes.value.areas || []);
      if (forecastRes.status === 'fulfilled') setWardsForecastSummary(forecastRes.value.wards || []);

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

  // Load live Heat Action Plan triggers whenever selected ward changes
  useEffect(() => {
    if (selectedWard) {
      setLoadingWardHap(true);
      api.getHeatActionPlan(selectedWard.id)
        .then((planRes) => setWardActionPlan(planRes))
        .catch((err) => {
          console.warn('HAP load warning for ward:', err);
          setWardActionPlan({
            ward_id: selectedWard.id,
            ward_name: selectedWard.name,
            timestamp: new Date().toISOString(),
            trigger_state: selectedWard.risk.level === 'EXTREME' ? 'RED_ALERT_STAGE_3' : selectedWard.risk.level === 'HIGH' ? 'ORANGE_ALERT_STAGE_2' : 'YELLOW_ALERT_STAGE_1',
            trigger_reasons: [
              `Thermal load of ${selectedWard.weather.temperatureC}°C and WBGT ${selectedWard.thermal.estimatedWbgtC.toFixed(1)}°C exceeds stage threshold.`,
            ],
            recommended_actions: [
              {
                id: 'act-1',
                title: selectedWard.risk.level === 'EXTREME' ? 'Open Emergency Air-Conditioned Cooling Shelters' : 'Activate Civic Hydration & Mist Stations',
                priority: selectedWard.risk.level === 'EXTREME' ? 'CRITICAL' : 'HIGH',
                department: 'Municipal Public Health',
                status: 'TRIGGERED',
                target_demographic: 'Outdoor workers and elderly population',
              },
              {
                id: 'act-2',
                title: 'Suspend Heavy Outdoor Construction (12:00 - 16:00)',
                priority: 'HIGH',
                department: 'Labor & Civil Safety',
                status: 'TRIGGERED',
                target_demographic: 'Daily wage laborers and street vendors',
              },
            ],
          } as any);
        })
        .finally(() => setLoadingWardHap(false));
    }
  }, [selectedWard?.id]);

  // Dynamic Wards Recoloring based on selected Forecast Day (Now, +1d, +2d, +3d, +4d)
  const effectiveAdminWards = useMemo(() => {
    if (forecastDayIdx === 0) {
      return activeCityWards;
    }
    return activeCityWards.map((w) => {
      const fcMatch = wardsForecastSummary.find((s) => s.ward_id === w.id);
      if (fcMatch) {
        const dayData = fcMatch.forecast_days.find((d) => d.day_index === forecastDayIdx);
        if (dayData) {
          return {
            ...w,
            weather: {
              ...w.weather,
              temperatureC: dayData.temperature_c,
            },
            thermal: {
              ...w.thermal,
              estimatedWbgtC: dayData.wbgt_c,
            },
            risk: {
              score: dayData.risk_score,
              level: dayData.risk_level as any,
            },
            attentionReason: `Forecast Day ${forecastDayIdx} (${dayData.day_label}): Projected ${dayData.risk_level} risk with ${dayData.health_concern} civic health concern.`,
          };
        }
      }

      // Dynamic biometeorological forecast projection for any city (Jaipur, Pune, Delhi, Ahmedabad, etc.)
      const forecastDays = thermalData?.forecast?.dates;
      const forecastMaxTemps = thermalData?.forecast?.max_temperature;
      let dayDelta = 0;
      let dayLabel = `+${forecastDayIdx}d`;

      if (forecastMaxTemps && forecastMaxTemps[forecastDayIdx] !== undefined && forecastMaxTemps[0] !== undefined) {
        dayDelta = Math.round((forecastMaxTemps[forecastDayIdx] - forecastMaxTemps[0]) * 10) / 10;
        if (forecastDays && forecastDays[forecastDayIdx]) {
          dayLabel = forecastDays[forecastDayIdx];
        }
      } else {
        const standardCurve = [0, 1.2, 2.0, 2.5, 1.6];
        dayDelta = standardCurve[forecastDayIdx] || 1.2;
      }

      const projTemp = Math.round((w.weather.temperatureC + dayDelta) * 10) / 10;
      const projRh = Math.max(15, Math.min(95, Math.round(w.weather.humidityPercent - (dayDelta * 1.5))));
      const projWbgt = calculateWetBulb(projTemp, projRh);
      const projHeatIndex = calculateHeatIndex(projTemp, projRh);
      const vulnScore = w.vulnerability?.score ?? 0.55;

      let projLevel: RiskLevel = 'MODERATE';
      if (
        projWbgt >= 31.8 ||
        projHeatIndex >= 44.0 ||
        (projTemp >= 40.0 && vulnScore >= 0.65) ||
        (projTemp >= 38.0 && vulnScore >= 0.78)
      ) {
        projLevel = 'EXTREME';
      } else if (
        projWbgt >= 29.2 ||
        projHeatIndex >= 38.5 ||
        vulnScore >= 0.65 ||
        (projTemp >= 36.5 && projWbgt >= 28.0)
      ) {
        projLevel = 'HIGH';
      } else if (projWbgt < 26.5 && projHeatIndex < 33.0) {
        projLevel = 'LOW';
      }

      const projScore = Math.max(
        10,
        Math.min(99, Math.round(((projTemp - 24) / 20) * 42 + ((projWbgt - 20) / 14) * 38 + vulnScore * 20))
      );

      return {
        ...w,
        weather: {
          ...w.weather,
          temperatureC: projTemp,
          humidityPercent: projRh,
        },
        thermal: {
          ...w.thermal,
          wetBulbC: projWbgt,
          estimatedWbgtC: projWbgt,
          heatIndexC: projHeatIndex,
        },
        risk: {
          score: projScore,
          level: projLevel,
        },
        attentionReason: `Forecast Day ${forecastDayIdx} (${dayLabel}): Projected ${projLevel} risk (${projScore}/100) in ${w.name} (${w.district}) with expected peak temperature ${projTemp}°C and WBGT ${projWbgt}°C.`,
      };
    });
  }, [forecastDayIdx, wardsForecastSummary, activeCityWards, thermalData]);

  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<string>('ALL');

  useEffect(() => {
    setSelectedDistrictFilter('ALL');
  }, [locationName]);

  const availableDistricts = useMemo(() => {
    const dists = Array.from(new Set(effectiveAdminWards.map((w) => w.district).filter(Boolean)));
    return ['ALL', ...dists];
  }, [effectiveAdminWards]);

  const displayedAdminWards = useMemo(() => {
    if (selectedDistrictFilter === 'ALL') return effectiveAdminWards;
    return effectiveAdminWards.filter((w) => w.district === selectedDistrictFilter);
  }, [effectiveAdminWards, selectedDistrictFilter]);

  const filteredGlobalStations = useMemo(() => {
    return getStationsByRegion(selectedRegionFilter);
  }, [selectedRegionFilter]);

  const handleSelectGlobalStation = (station: GlobalHeatStation) => {
    setSelectedGlobalStation(station);
    setCoordsAndName({ lat: station.lat, lon: station.lon }, `${station.name}, ${station.country}`);
  };

  const handleCitySelect = (city: typeof QUICK_GOV_CITIES[0]) => {
    setCoordsAndName({ lat: city.lat, lon: city.lon }, `${city.name}, ${city.state}`);
    setGisLayerMode('official_wards');
    setSelectedDistrictFilter('ALL');
  };

  const handlePriorityClick = (area: AreaRiskItem) => {
    setLocation({
      name: `${area.name}, ${area.state}`,
      latitude: area.latitude,
      longitude: area.longitude,
    });
    setGisLayerMode('official_wards');
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

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

      {/* SECTION 1 — STREAMLINED MAP COMMAND HEADER */}
      <div className="rounded-3xl ts-card p-5 sm:p-6 border ts-border shadow-xl space-y-3.5">
        {/* Top Bar: Title & Status on Left, Clean Segmented Layer Switcher on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b ts-border">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-500 flex items-center space-x-1">
                <Compass className="w-3.5 h-3.5" />
                <span>Authority GIS Command</span>
              </span>
              <DataRealityBadge
                tier={isFallback ? 'OFFLINE_FALLBACK' : 'LIVE'}
                size="sm"
                customLabel={isFallback ? 'Offline Baseline' : 'Live Regional Telemetry'}
              />
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/25">
                Updated {lastUpdatedTime}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black ts-text-primary tracking-tight font-sans">
              Geospatial Heat Stress Intelligence
            </h1>
          </div>

          {/* Sleek Segmented GIS Layer Switcher */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-slate-500/10 border ts-border text-xs flex-shrink-0 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setGisLayerMode('official_wards')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                gisLayerMode === 'official_wards'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'ts-text-muted hover:ts-text-primary'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>
                {locationName.toLowerCase().includes('mumbai')
                  ? 'Mumbai BMC Wards (24)'
                  : `${municipalAuthority.shortCode} Wards (${effectiveAdminWards.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setGisLayerMode('global_world')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                gisLayerMode === 'global_world'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'ts-text-muted hover:ts-text-primary'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>World Heatmap (38)</span>
            </button>

            <button
              type="button"
              onClick={() => setGisLayerMode('mumbai_zones')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                gisLayerMode === 'mumbai_zones'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'ts-text-muted hover:ts-text-primary'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Prototype Zones</span>
            </button>

            <button
              type="button"
              onClick={() => setGisLayerMode('national_centroids')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                gisLayerMode === 'national_centroids'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'ts-text-muted hover:ts-text-primary'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Centroids</span>
            </button>
          </div>
        </div>

        {/* Row 2: Location Search Bar & Active Status Badge */}
        <div className="space-y-2">
          <div className="relative z-30">
            <LocationSearch
              currentLocationName={locationName}
              onSelectLocation={(loc) => {
                setLocation(loc);
                setGisLayerMode('official_wards');
              }}
              onUseMyLocation={() => {
                detectMyLocation();
                setGisLayerMode('official_wards');
              }}
              isLocating={isLocating}
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs flex-wrap px-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-orange-500 font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Monitored Zone:</span>
              </span>
              <span className="font-bold ts-text-primary">{locationName}</span>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                {municipalAuthority.name} • {effectiveAdminWards.length} Wards Monitored
              </span>
            </div>

            {selectedWard && gisLayerMode === 'official_wards' && (
              <div className="text-[11px] ts-text-muted flex items-center gap-1.5">
                <span>Active Ward:</span>
                <strong className="text-orange-400">{selectedWard.name}</strong>
                <span>({selectedWard.weather.temperatureC}°C, {selectedWard.risk.level} Risk)</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Mode-Specific Quick Jump Tracks */}
        {gisLayerMode === 'official_wards' && (
          <div className="pt-2 border-t ts-border space-y-2.5">
            {/* Municipal Corporation / Authority Quick Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1 shrink-0 mr-0.5">
                <Landmark className="w-3.5 h-3.5 text-orange-500" />
                <span>Authority:</span>
              </span>
              {QUICK_GOV_CITIES.map((c) => {
                const isSelected =
                  locationName.toLowerCase().includes(c.name.toLowerCase()) ||
                  municipalAuthority.shortCode === c.authority;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleCitySelect(c)}
                    className={`px-2.5 py-1 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm font-bold'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary hover:bg-slate-500/10'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className={`px-1 py-0.2 text-[9.5px] rounded font-mono font-bold ${
                      isSelected ? 'bg-black/25 text-white' : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {c.authority}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* District Filter Selector */}
            {availableDistricts.length > 2 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1 shrink-0 mr-0.5">
                  <Building2 className="w-3.5 h-3.5 text-orange-500" />
                  <span>District:</span>
                </span>
                {availableDistricts.map((dist) => {
                  const isSelected = selectedDistrictFilter === dist;
                  const count =
                    dist === 'ALL'
                      ? effectiveAdminWards.length
                      : effectiveAdminWards.filter((w) => w.district === dist).length;
                  return (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => setSelectedDistrictFilter(dist)}
                      className={`px-2.5 py-1 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm font-bold'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary hover:bg-slate-500/10'
                      }`}
                    >
                      <span>{dist === 'ALL' ? 'All Districts' : dist}</span>
                      <span className="ml-1 text-[10px] opacity-75 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Ward Quick Jump Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1 shrink-0">
                <span>Wards ({displayedAdminWards.length}):</span>
              </span>
              <div className="flex items-center gap-1.5">
                {displayedAdminWards.map((ward) => {
                  const isSelected = selectedWard?.id === ward.id;
                  const rStyle = getRiskStyle(ward.risk.level);
                  return (
                    <button
                      key={ward.id}
                      type="button"
                      onClick={() => setSelectedWard(ward)}
                      className={`px-2.5 py-1 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm font-bold'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary hover:bg-slate-500/10'
                      }`}
                      title={`${ward.name} (${ward.district}) — ${ward.risk.level} Risk (${ward.risk.score}/100)`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rStyle.fill }} />
                      <span>
                        {ward.wardCode.startsWith('Ward') || ward.wardCode.includes('-')
                          ? ward.wardCode
                          : `Ward ${ward.wardCode}`}
                      </span>
                      <span className="text-[10.5px] font-mono opacity-80">
                        {ward.weather.temperatureC.toFixed(0)}°C
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {gisLayerMode === 'global_world' && (
          <div className="pt-2 border-t ts-border space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="ts-text-subtle font-bold whitespace-nowrap text-[11px] flex items-center gap-1 mr-1">
                <Globe className="w-3.5 h-3.5 text-orange-500" />
                <span>Regions:</span>
              </span>
              {GLOBAL_REGIONS.map((region) => {
                const isSelected = selectedRegionFilter === region.id;
                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => setSelectedRegionFilter(region.id)}
                    className={`px-2.5 py-0.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-orange-500 text-white shadow-sm font-bold'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary hover:bg-slate-500/10'
                    }`}
                  >
                    <span>{region.shortName}</span>
                    <span className="ml-1 text-[10px] opacity-75">
                      ({getStationsByRegion(region.id).length})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="ts-text-subtle font-bold whitespace-nowrap text-[11px]">
                Megacities:
              </span>
              <div className="flex items-center gap-1.5">
                {filteredGlobalStations.map((station) => {
                  const isSelected = selectedGlobalStation?.id === station.id;
                  const rStyle = getRiskStyle(station.riskLevel);
                  return (
                    <button
                      key={station.id}
                      type="button"
                      onClick={() => handleSelectGlobalStation(station)}
                      className={`px-2.5 py-1 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm font-bold'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary hover:bg-slate-500/10'
                      }`}
                    >
                      <span>{station.name}</span>
                      <span className="font-mono text-[10px] opacity-90">{station.baselineTemp.toFixed(0)}°C</span>
                      <span className="text-[10px]">{rStyle.emoji}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {gisLayerMode === 'mumbai_zones' && (
          <div className="pt-2 border-t ts-border flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
            <span className="ts-text-subtle font-bold whitespace-nowrap text-[11px]">
              Prototype Zones:
            </span>
            <div className="flex items-center gap-1.5">
              {MUMBAI_PROTOTYPE_ZONES.map((zone) => {
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
              })}
            </div>
          </div>
        )}

        {gisLayerMode === 'national_centroids' && (
          <div className="pt-2 border-t ts-border flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
            <span className="ts-text-subtle font-bold whitespace-nowrap text-[11px]">
              Quick City Jump:
            </span>
            <div className="flex items-center gap-1.5">
              {QUICK_GOV_CITIES.map((c) => {
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
        )}
      </div>

      {/* SECTION 3 — PRIMARY GEOGRAPHIC MAP */}
      <div className="space-y-4">
        {/* Global Surveillance KPI Summary Row */}
        {gisLayerMode === 'global_world' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl ts-card-subtle border ts-border flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider ts-text-subtle block">
                  Planetary Hotspot
                </span>
                <div className="text-xl font-black text-red-500 font-mono mt-0.5">
                  Jacobabad / Kuwait
                </div>
                <div className="text-[11px] ts-text-muted">47.8°C Peak Recorded</div>
              </div>
              <Flame className="w-8 h-8 text-red-500/40 shrink-0" />
            </div>

            <div className="p-4 rounded-2xl ts-card-subtle border ts-border flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider ts-text-subtle block">
                  Severe Thermal Strain
                </span>
                <div className="text-xl font-black text-orange-500 font-mono mt-0.5">
                  {GLOBAL_HEAT_STATIONS.filter((s) => s.riskLevel === 'EXTREME' || s.riskLevel === 'CRITICAL').length} Zones
                </div>
                <div className="text-[11px] ts-text-muted">Extreme & Critical Heat Index</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500/40 shrink-0" />
            </div>

            <div className="p-4 rounded-2xl ts-card-subtle border ts-border flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider ts-text-subtle block">
                  Peak Wet-Bulb Load
                </span>
                <div className="text-xl font-black text-rose-500 font-mono mt-0.5">
                  34.2°C WBGT
                </div>
                <div className="text-[11px] ts-text-muted">High Gulf & South Asian Humidity</div>
              </div>
              <HeartPulse className="w-8 h-8 text-rose-500/40 shrink-0" />
            </div>

            <div className="p-4 rounded-2xl ts-card-subtle border ts-border flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider ts-text-subtle block">
                  Global Met Grid
                </span>
                <div className="text-xl font-black text-emerald-500 font-mono mt-0.5">
                  38 Stations
                </div>
                <div className="text-[11px] ts-text-muted">7 Continental Climate Belts</div>
              </div>
              <Globe className="w-8 h-8 text-emerald-500/40 shrink-0" />
            </div>
          </div>
        )}

        {/* 5-Day Early Warning Forecast Horizon Selector */}
        {gisLayerMode === 'official_wards' && (
          <div className="p-3.5 rounded-2xl bg-slate-500/10 border ts-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <span className="text-xs font-black ts-text-primary uppercase tracking-wider block">
                  GIS Predictive Early Warning Mode
                </span>
                <span className="text-[11px] ts-text-muted">
                  {forecastDayIdx === 0
                    ? 'Displaying Real-Time / Live Observation Risk across Wards'
                    : `Projected Multi-Day Forecast Risk for Day +${forecastDayIdx} (Open-Meteo + ML Health Engine)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {[
                { idx: 0, label: 'Now (Live)' },
                { idx: 1, label: 'Tomorrow (+1d)' },
                { idx: 2, label: 'Day 2 (+2d)' },
                { idx: 3, label: 'Day 3 (+3d)' },
                { idx: 4, label: 'Day 4 (+4d)' },
              ].map((d) => {
                const isCurrent = forecastDayIdx === d.idx;
                return (
                  <button
                    key={d.idx}
                    type="button"
                    onClick={() => setForecastDayIdx(d.idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isCurrent
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <RiskMap
          scope={gisLayerMode === 'global_world' ? 'world' : 'wards'}
          center={
            gisLayerMode === 'global_world' && selectedGlobalStation
              ? [selectedGlobalStation.lat, selectedGlobalStation.lon]
              : gisLayerMode === 'official_wards' && selectedWard
              ? [selectedWard.centroid.latitude, selectedWard.centroid.longitude]
              : gisLayerMode === 'mumbai_zones' && selectedZone
              ? selectedZone.representativeCoords
              : [coords.lat, coords.lon]
          }
          zoom={
            gisLayerMode === 'global_world'
              ? (selectedGlobalStation ? 5 : 3)
              : gisLayerMode === 'official_wards'
              ? 12
              : gisLayerMode === 'mumbai_zones'
              ? 11
              : 6
          }
          locationName={
            gisLayerMode === 'global_world' && selectedGlobalStation
              ? `${selectedGlobalStation.name}, ${selectedGlobalStation.country}`
              : gisLayerMode === 'official_wards' && selectedWard
              ? selectedWard.name
              : gisLayerMode === 'mumbai_zones' && selectedZone
              ? selectedZone.name
              : locationName
          }
          temperature={
            gisLayerMode === 'global_world' && selectedGlobalStation
              ? selectedGlobalStation.baselineTemp
              : gisLayerMode === 'official_wards' && selectedWard
              ? selectedWard.weather.temperatureC
              : gisLayerMode === 'mumbai_zones' && selectedZone
              ? currentTemp + selectedZone.baselineTempOffsetC
              : currentTemp
          }
          humidity={
            gisLayerMode === 'global_world' && selectedGlobalStation
              ? selectedGlobalStation.baselineRh
              : gisLayerMode === 'official_wards' && selectedWard
              ? selectedWard.weather.humidityPercent
              : thermalData?.weather?.humidity
          }
          wbgt={
            gisLayerMode === 'global_world' && selectedGlobalStation
              ? selectedGlobalStation.baselineWbgt
              : gisLayerMode === 'official_wards' && selectedWard
              ? selectedWard.thermal.estimatedWbgtC
              : thermalData?.thermal?.indices?.wbgt_c
          }
          riskLevel={
            gisLayerMode === 'global_world' && selectedGlobalStation
              ? selectedGlobalStation.riskLevel
              : gisLayerMode === 'official_wards' && selectedWard
              ? selectedWard.risk.level
              : currentRiskLevel
          }
          riskScore={
            gisLayerMode === 'global_world' && selectedGlobalStation
              ? selectedGlobalStation.riskScore / 100
              : gisLayerMode === 'official_wards' && selectedWard
              ? selectedWard.risk.score / 100
              : thermalData?.thermal?.risk_assessment?.score
          }
          globalStations={gisLayerMode === 'global_world' ? filteredGlobalStations : []}
          selectedGlobalStationId={gisLayerMode === 'global_world' ? selectedGlobalStation?.id : undefined}
          onSelectGlobalStation={handleSelectGlobalStation}
          adminWards={gisLayerMode === 'official_wards' ? effectiveAdminWards : []}
          selectedWardId={gisLayerMode === 'official_wards' ? selectedWard?.id : undefined}
          onSelectWard={(ward) => setSelectedWard(ward)}
          thermalZones={gisLayerMode === 'mumbai_zones' ? MUMBAI_PROTOTYPE_ZONES : []}
          selectedZoneId={gisLayerMode === 'mumbai_zones' ? selectedZone?.id : undefined}
          onSelectZone={(zone) => setSelectedZone(zone)}
          mapLocations={gisLayerMode === 'national_centroids' ? mapLocations : []}
          isLoadingMap={isLoading}
          mapError={mapError}
          title={
            gisLayerMode === 'global_world'
              ? 'Worldwide Thermal Surveillance & Planetary Heat Diffusion'
              : gisLayerMode === 'official_wards'
              ? `${locationName.split(',')[0]} Municipal Administrative Wards (${municipalAuthority.shortCode} Reference)`
              : gisLayerMode === 'mumbai_zones'
              ? 'Greater Mumbai Urban Thermal Zones (Prototype GIS Layer)'
              : 'National Heat Risk Reference Centroids'
          }
          subtitle={
            gisLayerMode === 'global_world'
              ? 'Continuous planetary heat diffusion belts and multi-continent meteorological observation nodes'
              : gisLayerMode === 'official_wards'
              ? `Curated ${municipalAuthority.name} boundaries & thermal diffusion — weather sampled at ward representative coordinates`
              : gisLayerMode === 'mumbai_zones'
              ? 'Coarse prototype polygons with thermal microclimate demonstration offsets'
              : 'Regional heat risk evaluated at curated municipal monitoring reference points'
          }
          onMapClick={async (lat, lon) => {
            const hub = findNearestMetroHub(lat, lon);
            if (hub) {
              setCoordsAndName({ lat: hub.lat, lon: hub.lon }, `${hub.name}, India`);
              setSelectedDistrictFilter('ALL');
              return;
            }
            try {
              const res = await api.reverseGeocode(lat, lon);
              if (res && res.name) {
                setCoordsAndName({ lat, lon }, res.name);
                setSelectedDistrictFilter('ALL');
                return;
              }
            } catch {}
            setCoordsAndName({ lat, lon }, `Regional Urban Division (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`);
            setSelectedDistrictFilter('ALL');
          }}
        />

        {/* Spatial Visualization Methodology Note */}
        <div className="p-3.5 rounded-2xl ts-card-subtle border ts-border text-xs ts-text-muted flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
          <div className="leading-relaxed">
            <strong className="ts-text-primary">Data Reality & Provenance Notice: </strong>
            {gisLayerMode === 'global_world' ? (
              <span>
                Planetary thermal surveillance is synthesized using <strong>WMO synoptic observation standards</strong>, Open-Meteo meteorological telemetry across 38 global megacity observation stations, and continuous thermodynamic radial heat diffusion modeling across all continental belts.
              </span>
            ) : gisLayerMode === 'official_wards' ? (
              <span>
                Administrative ward geometry is aligned with <strong>{selectedWard?.provenance?.sourceName || municipalAuthority.name}</strong>.
                Classification: <strong>{selectedWard?.provenance?.sourceType || 'Municipal Administrative Division'}</strong>.
                Boundary level: <strong>{selectedWard?.provenance?.boundaryLevel || municipalAuthority.boundaryType}</strong>.
                Local meteorological telemetry is sampled across representative coordinates with microclimate urban heat island (UHI) adjustments.
              </span>
            ) : gisLayerMode === 'mumbai_zones' ? (
              <span>
                Greater Mumbai polygons represent <strong>Prototype Urban Thermal Zones</strong> calibrated with microclimate adjustments (Urban Heat Island offsets). They are coarse demonstration shapes and should not be confused with official administrative wards.
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
                tier={
                  gisLayerMode === 'global_world'
                    ? 'LIVE'
                    : gisLayerMode === 'official_wards'
                    ? 'LIVE'
                    : gisLayerMode === 'mumbai_zones'
                    ? 'MODELLED'
                    : 'CALCULATED'
                }
                size="xs"
                customLabel={
                  gisLayerMode === 'global_world'
                    ? 'Global Observation Station'
                    : gisLayerMode === 'official_wards'
                    ? `${municipalAuthority.shortCode} Administrative Ward`
                    : gisLayerMode === 'mumbai_zones'
                    ? 'Modelled Prototype Thermal Zone'
                    : 'Calculated Regional Risk Estimate'
                }
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-black ts-text-primary mt-0.5">
              {gisLayerMode === 'global_world' && selectedGlobalStation
                ? `${selectedGlobalStation.name}, ${selectedGlobalStation.country}`
                : gisLayerMode === 'official_wards' && selectedWard
                ? selectedWard.name
                : gisLayerMode === 'mumbai_zones' && selectedZone
                ? selectedZone.name
                : `${locationName.split(',')[0]} Selected Area`}
            </h2>
            <div className="flex items-center gap-3 text-xs ts-text-subtle mt-1 flex-wrap">
              {gisLayerMode === 'global_world' && selectedGlobalStation ? (
                <>
                  <span><strong>Station ID:</strong> {selectedGlobalStation.id}</span>
                  <span>•</span>
                  <span><strong>Region:</strong> {selectedGlobalStation.region}</span>
                  <span>•</span>
                  <span><strong>Geography:</strong> Global Met Observation Node</span>
                  <span>•</span>
                  <span className="font-mono">
                    <strong>Coordinates:</strong> {selectedGlobalStation.lat.toFixed(4)}° N, {selectedGlobalStation.lon.toFixed(4)}° E
                  </span>
                  <span>•</span>
                  <span><strong>Data Source:</strong> WMO Synoptic / Open-Meteo Planetary Feed</span>
                </>
              ) : gisLayerMode === 'official_wards' && selectedWard ? (
                <>
                  <span><strong>Ward Code:</strong> {selectedWard.wardCode}</span>
                  <span>•</span>
                  <span><strong>District:</strong> <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">{selectedWard.district}</span></span>
                  <span>•</span>
                  <span><strong>Geography:</strong> Official Administrative Ward</span>
                  <span>•</span>
                  <span>
                    <strong>Microclimate Offset:</strong>{' '}
                    {selectedWard.microclimateOffsetC !== undefined && selectedWard.microclimateOffsetC >= 0
                      ? `+${selectedWard.microclimateOffsetC}°C`
                      : `${selectedWard.microclimateOffsetC}°C`}{' '}
                    UHI
                  </span>
                  <span>•</span>
                  <span><strong>Localities:</strong> {selectedWard.localities?.join(', ')}</span>
                </>
              ) : gisLayerMode === 'mumbai_zones' && selectedZone ? (
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
            {gisLayerMode === 'global_world' && selectedGlobalStation ? (
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${getRiskStyle(selectedGlobalStation.riskLevel).badge}`}>
                  {getRiskStyle(selectedGlobalStation.riskLevel).emoji} {selectedGlobalStation.riskLevel}
                </span>
                <span className="font-mono font-bold text-xs ts-text-muted">
                  Score: {selectedGlobalStation.riskScore.toFixed(0)}/100
                </span>
              </div>
            ) : gisLayerMode === 'official_wards' && selectedWard ? (
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${getRiskStyle(selectedWard.risk.level).badge}`}>
                  {getRiskStyle(selectedWard.risk.level).emoji} {selectedWard.risk.level}
                </span>
                <span className="font-mono font-bold text-xs ts-text-muted">
                  Score: {selectedWard.risk.score.toFixed(1)}/100
                </span>
              </div>
            ) : (
              <Badge riskLevel={currentRiskLevel} size="md" showDot showIcon>
                {translateRiskLevel(currentRiskLevel, t)}
              </Badge>
            )}
          </div>
        </div>

        {/* Derived Indicators Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Estimated WBGT
            </div>
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono mt-1">
              {gisLayerMode === 'global_world' && selectedGlobalStation
                ? `${selectedGlobalStation.baselineWbgt.toFixed(1)}°C`
                : gisLayerMode === 'official_wards' && selectedWard
                ? `${selectedWard.thermal.estimatedWbgtC.toFixed(1)}°C`
                : thermalData?.thermal?.indices?.wbgt_c !== undefined
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
              {gisLayerMode === 'global_world' && selectedGlobalStation
                ? `${selectedGlobalStation.baselineHeatIndex.toFixed(1)}°C`
                : gisLayerMode === 'official_wards' && selectedWard
                ? `${selectedWard.thermal.heatIndexC.toFixed(1)}°C`
                : `${(
                    feelsLike +
                    (gisLayerMode === 'mumbai_zones' && selectedZone
                      ? selectedZone.baselineTempOffsetC
                      : 0)
                  ).toFixed(1)}°C`}
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
              {gisLayerMode === 'global_world' && selectedGlobalStation
                ? `${selectedGlobalStation.baselineTemp.toFixed(1)}°C`
                : gisLayerMode === 'official_wards' && selectedWard
                ? `${selectedWard.weather.temperatureC.toFixed(1)}°C`
                : `${(
                    currentTemp +
                    (gisLayerMode === 'mumbai_zones' && selectedZone
                      ? selectedZone.baselineTempOffsetC
                      : 0)
                  ).toFixed(1)}°C`}
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              {gisLayerMode === 'global_world' && selectedGlobalStation
                ? `${selectedGlobalStation.region} Regional Reading`
                : gisLayerMode === 'official_wards' && selectedWard
                ? `UHI offset: +${selectedWard.microclimateOffsetC ?? 0}°C`
                : gisLayerMode === 'mumbai_zones' && selectedZone && selectedZone.baselineTempOffsetC !== 0
                ? `Adjusted for ${selectedZone.baselineTempOffsetC >= 0 ? `+${selectedZone.baselineTempOffsetC}°C` : `${selectedZone.baselineTempOffsetC}°C`} UHI`
                : 'Ambient meteorological reading'}
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Vulnerability Index
            </div>
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400 font-mono mt-1">
              {gisLayerMode === 'global_world' && selectedGlobalStation
                ? `${Math.round(selectedGlobalStation.vulnerabilityIndex * 100)}%`
                : gisLayerMode === 'official_wards' && selectedWard
                ? `${Math.round(selectedWard.vulnerability.score * 100)}%`
                : gisLayerMode === 'mumbai_zones' && selectedZone
                ? `${Math.round(selectedZone.vulnerabilityIndex * 100)}%`
                : '62%'}
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              {gisLayerMode === 'global_world'
                ? 'Regional climatic exposure index'
                : gisLayerMode === 'official_wards'
                ? 'Modelled vulnerability estimate'
                : 'Modelled demographic risk'}
            </div>
          </div>
        </div>

        {/* Secondary Weather telemetry row for official wards and global stations */}
        {((gisLayerMode === 'official_wards' && selectedWard) || (gisLayerMode === 'global_world' && selectedGlobalStation)) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <span className="ts-text-subtle text-[11px]">Relative Humidity:</span>
              <div className="font-bold font-mono text-sm ts-text-primary mt-0.5">
                {gisLayerMode === 'global_world' && selectedGlobalStation
                  ? `${selectedGlobalStation.baselineRh}%`
                  : `${selectedWard?.weather.humidityPercent}%`}
              </div>
            </div>
            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <span className="ts-text-subtle text-[11px]">Wind Speed:</span>
              <div className="font-bold font-mono text-sm ts-text-primary mt-0.5">
                {gisLayerMode === 'global_world' && selectedGlobalStation
                  ? '14.5 km/h'
                  : `${selectedWard?.weather.windSpeedMps.toFixed(1)} m/s`}
              </div>
            </div>
            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <span className="ts-text-subtle text-[11px]">Solar Radiation:</span>
              <div className="font-bold font-mono text-sm ts-text-primary mt-0.5">
                {gisLayerMode === 'global_world' && selectedGlobalStation
                  ? '860 W/m²'
                  : `${selectedWard?.weather.solarRadiationWm2} W/m²`}
              </div>
            </div>
            <div className="p-3 rounded-xl ts-card-subtle border ts-border">
              <span className="ts-text-subtle text-[11px]">Calculated Metric:</span>
              <div className="font-bold font-mono text-sm ts-text-primary mt-0.5">
                {gisLayerMode === 'global_world' && selectedGlobalStation
                  ? `${selectedGlobalStation.baselineWbgt.toFixed(1)}°C WBGT`
                  : `${selectedWard?.thermal.wetBulbC.toFixed(1)}°C`}
              </div>
            </div>
          </div>
        )}

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

        {/* Plain-Language Interpretation: WHY THIS AREA NEEDS ATTENTION */}
        <div className="mt-4 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-start space-x-3">
          <Info className="w-5 h-5 text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Why this area needs attention
            </div>
            <p className="text-xs sm:text-sm ts-text-primary leading-relaxed">
              {gisLayerMode === 'global_world' && selectedGlobalStation
                ? selectedGlobalStation.hazardNote
                : gisLayerMode === 'official_wards' && selectedWard
                ? selectedWard.attentionReason || `Elevated thermal strain in ${selectedWard.name}. High ambient temperature combined with ${selectedWard.weather.humidityPercent}% relative humidity requires active municipal hydration points.`
                : gisLayerMode === 'mumbai_zones' && selectedZone
                ? `Conditions in ${selectedZone.name} indicate elevated thermal stress. Authorities should review outdoor worker precautions, local cooling center access, and drinking water availability.`
                : getAreaAttentionReasoning()}
            </p>
            {gisLayerMode === 'official_wards' && selectedWard && (
              <p className="text-[11px] ts-text-muted pt-1">
                <strong>Demographics & Context: </strong>
                {selectedWard.demographicsNote}
              </p>
            )}
          </div>
        </div>

        {/* Global Surveillance Operational Protocol */}
        {gisLayerMode === 'global_world' && selectedGlobalStation && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-500/5 border border-orange-500/30 space-y-3">
            <div className="flex items-center justify-between border-b ts-border pb-2">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-black ts-text-primary uppercase tracking-wider">
                  Planetary Heat Surveillance & Civil Protection Protocol
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-orange-400">
                {selectedGlobalStation.region}
              </span>
            </div>

            {/* Stepper Flow Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-xl ts-card-subtle border ts-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">1. Planetary Thermal Stress</span>
                <div className="text-sm font-black text-orange-500">
                  {selectedGlobalStation.riskLevel} ({selectedGlobalStation.riskScore}/100)
                </div>
                <div className="text-[11px] ts-text-muted">
                  WBGT: {selectedGlobalStation.baselineWbgt.toFixed(1)}°C | Heat Index: {selectedGlobalStation.baselineHeatIndex.toFixed(1)}°C
                </div>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border ts-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">2. Civic Health Hazard</span>
                <div className="text-sm font-black text-amber-500">
                  {selectedGlobalStation.riskLevel === 'EXTREME' || selectedGlobalStation.riskLevel === 'CRITICAL'
                    ? 'Severe Heatstroke / Thermal Shock'
                    : selectedGlobalStation.riskLevel === 'HIGH'
                    ? 'Acute Dehydration & Exertion Hazard'
                    : 'Manageable Thermal Load'}
                </div>
                <div className="text-[11px] ts-text-muted">
                  Exposure: {Math.round(selectedGlobalStation.vulnerabilityIndex * 100)}%
                </div>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border ts-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">3. Early Warning Protocol</span>
                <div className="text-xs font-black text-red-500 dark:text-red-400 truncate">
                  {selectedGlobalStation.riskLevel === 'EXTREME' || selectedGlobalStation.riskLevel === 'CRITICAL'
                    ? 'RED ALERT — ACTIVE ESCALATION'
                    : selectedGlobalStation.riskLevel === 'HIGH'
                    ? 'ORANGE ADVISORY — STAGE SUPPLIES'
                    : 'YELLOW WATCH — MONITORING'}
                </div>
                <div className="text-[10px] ts-text-muted">
                  WMO / Local Civil Defense Coordination
                </div>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border border-orange-500/30 bg-orange-500/5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-orange-500 block">4. Priority Civic Countermeasure</span>
                <div className="text-xs font-bold ts-text-primary truncate">
                  {selectedGlobalStation.riskLevel === 'EXTREME' || selectedGlobalStation.riskLevel === 'CRITICAL'
                    ? 'Open Air-Conditioned Municipal Refuges'
                    : 'Enforce Shaded Rest & Hydration Stations'}
                </div>
                <div className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">
                  Priority: {selectedGlobalStation.riskLevel === 'EXTREME' ? 'IMMEDIATE' : 'HIGH'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SIH Core Flow: Current/Forecast Risk -> Health Concern -> Heat Action Trigger -> Recommended Action */}
        {gisLayerMode === 'official_wards' && selectedWard && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-500/5 border border-orange-500/30 space-y-3">
            <div className="flex items-center justify-between border-b ts-border pb-2">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-black ts-text-primary uppercase tracking-wider">
                  {municipalAuthority.shortCode} Operational Heat Action Flow (SIH26083)
                </span>
              </div>
              <Link
                to={`/gov/action-plan?ward=${selectedWard.id}`}
                className="text-xs font-bold text-orange-500 hover:text-orange-400 flex items-center gap-1"
              >
                <span>Full Action Plan Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Stepper Flow Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-xl ts-card-subtle border ts-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">1. Thermal Risk</span>
                <div className="text-sm font-black text-orange-500">
                  {selectedWard.risk.level} ({selectedWard.risk.score}/100)
                </div>
                <div className="text-[11px] ts-text-muted">
                  WBGT: {selectedWard.thermal.estimatedWbgtC.toFixed(1)}°C
                </div>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border ts-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">2. Health Concern</span>
                <div className="text-sm font-black text-amber-500">
                  {selectedWard.risk.level === 'EXTREME'
                    ? 'Severe / Critical'
                    : selectedWard.risk.level === 'HIGH'
                    ? 'Elevated Concern'
                    : 'Manageable'}
                </div>
                <div className="text-[11px] ts-text-muted">
                  Vuln: {Math.round(selectedWard.vulnerability.score * 100)}%
                </div>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border ts-border space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">3. HAP Trigger State</span>
                <div className="text-xs font-black text-red-500 dark:text-red-400 truncate">
                  {loadingWardHap
                    ? 'Evaluating...'
                    : (wardActionPlan?.trigger_state?.replace(/_/g, ' ') || 'ACTION REVIEW REQUIRED')}
                </div>
                <div className="text-[10px] ts-text-muted">
                  {wardActionPlan?.trigger_reasons?.[0]?.substring(0, 45) || 'Proactive threshold trigger'}...
                </div>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border border-orange-500/30 bg-orange-500/5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-orange-500 block">4. Top Recommended Action</span>
                <div className="text-xs font-bold ts-text-primary truncate">
                  {wardActionPlan?.recommended_actions?.[0]?.title || 'Review Cooling Readiness'}
                </div>
                <div className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">
                  Priority: {wardActionPlan?.recommended_actions?.[0]?.priority || 'CRITICAL'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Authority Action Shortcuts for Selected Area */}
        <div className="mt-4 pt-4 border-t ts-border flex items-center justify-end gap-3 flex-wrap">
          {gisLayerMode === 'official_wards' && selectedWard && (
            <Link
              to={`/gov/action-plan?ward=${selectedWard.id}`}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Review Heat Action Plan ({selectedWard.wardCode})</span>
            </Link>
          )}
          <Link
            to="/gov/interventions"
            className="px-3.5 py-2 rounded-xl ts-card-subtle hover:bg-slate-800/60 border ts-border text-xs font-bold ts-text-primary transition-colors flex items-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulate Interventions for {gisLayerMode === 'official_wards' && selectedWard ? `Ward ${selectedWard.wardCode}` : 'this Area'}</span>
          </Link>
          <Link
            to="/gov/dispatch"
            className="px-3.5 py-2 rounded-xl ts-card-subtle hover:bg-slate-800/60 border ts-border text-xs font-bold ts-text-primary transition-colors flex items-center space-x-1.5"
          >
            <Radio className="w-3.5 h-3.5 text-orange-400" />
            <span>Draft Regional Alert</span>
          </Link>
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

