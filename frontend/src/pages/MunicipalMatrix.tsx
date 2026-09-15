import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  RefreshCw,
  MapPin,
  Compass,
  HeartPulse,
  Sliders,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Layers,
  Shield,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Badge, Button } from '../components/ui';
import { DataRealityBadge, CalculationInfoTooltip } from '../components/provenance';
import { useLocation } from '../context/LocationContext';
import { useTranslation } from '../context/LanguageContext';
import { api } from '../services/api';
import { AreaRiskItem } from '../types';
import { translateRiskLevel, translateZone, translateVulnerabilityTag } from '../utils/translationHelpers';

type SortOption = 'risk' | 'feels_like' | 'temp' | 'humidity' | 'wbgt';

export const MunicipalMatrix: React.FC = () => {
  const { locationName, setLocation } = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [areas, setAreas] = useState<AreaRiskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Recently');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('risk');
  const [showTechnicalMetrics, setShowTechnicalMetrics] = useState<boolean>(false);

  // Selected Locations for Side-by-Side Comparison (Max 4)
  const [selectedLocationNames, setSelectedLocationNames] = useState<string[]>([]);

  const fetchMatrixData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAreasRiskOverview();
      const loadedAreas = res.areas || [];
      setAreas(loadedAreas);
      setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));

      // Default selection: Top 2 highest risk areas for immediate comparison if none selected
      if (loadedAreas.length >= 2 && selectedLocationNames.length === 0) {
        const sorted = [...loadedAreas].sort((a, b) => b.risk_score - a.risk_score);
        setSelectedLocationNames([sorted[0].name, sorted[1].name]);
      }
    } catch (err: any) {
      console.error('Failed to load municipal matrix:', err);
      setError(err.message || 'Failed to fetch regional matrix telemetry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrixData();
  }, []);

  // Compute Heat Index / Feels Like (°C)
  const calculateFeelsLike = (tempC: number, humidityPct: number): number => {
    if (tempC < 25) return tempC;
    const T = tempC * 1.8 + 32;
    const R = humidityPct;
    const c1 = -42.379, c2 = 2.04901523, c3 = 10.14333127, c4 = -0.22475541;
    const c5 = -0.00683783, c6 = -0.05481717, c7 = 0.00122874, c8 = 0.00085282, c9 = -0.00000199;
    const hi = c1 + c2 * T + c3 * R + c4 * T * R + c5 * T * T + c6 * R * R + c7 * T * T * R + c8 * T * R * R + c9 * T * T * R * R;
    const hiC = (hi - 32) / 1.8;
    return Math.round(hiC * 10) / 10;
  };

  // Unique Zones for filtering
  const availableZones = useMemo(() => {
    const zones = new Set(areas.map((a) => a.zone));
    return ['ALL', ...Array.from(zones)];
  }, [areas]);

  // Filtered and Sorted Areas
  const processedAreas = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = areas.filter((area) => {
      const matchSearch =
        !q ||
        area.name.toLowerCase().includes(q) ||
        area.state.toLowerCase().includes(q) ||
        area.vulnerability_tag.toLowerCase().includes(q);
      const matchZone = selectedZone === 'ALL' || area.zone === selectedZone;
      return matchSearch && matchZone;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'feels_like': {
          const flA = calculateFeelsLike(a.temperature_c, a.humidity_pct);
          const flB = calculateFeelsLike(b.temperature_c, b.humidity_pct);
          return flB - flA;
        }
        case 'temp':
          return b.temperature_c - a.temperature_c;
        case 'humidity':
          return b.humidity_pct - a.humidity_pct;
        case 'wbgt':
          return b.wbgt_c - a.wbgt_c;
        case 'risk':
        default:
          return b.risk_score - a.risk_score;
      }
    });
  }, [areas, searchQuery, selectedZone, sortBy]);

  // Section 2: Priority Comparison Summary
  const prioritySummary = useMemo(() => {
    if (areas.length === 0) return null;
    const sortedByRisk = [...areas].sort((a, b) => b.risk_score - a.risk_score);
    const highestConcern = sortedByRisk[0];
    const lowestConcern = sortedByRisk[sortedByRisk.length - 1];

    // Find fastest rising / acute burden (highest WBGT or second highest)
    const sortedByWbgt = [...areas].sort((a, b) => b.wbgt_c - a.wbgt_c);
    const acuteBurden = sortedByWbgt[0]?.name !== highestConcern.name ? sortedByWbgt[0] : sortedByWbgt[1] || sortedByWbgt[0];

    return { highestConcern, acuteBurden, lowestConcern };
  }, [areas]);

  // Multi-Selection Toggle
  const toggleSelectLocation = (name: string) => {
    setSelectedLocationNames((prev) => {
      if (prev.includes(name)) {
        return prev.filter((n) => n !== name);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), name];
      }
      return [...prev, name];
    });
  };

  // Selected Areas Array
  const selectedAreasList = useMemo(() => {
    return areas.filter((a) => selectedLocationNames.includes(a.name));
  }, [areas, selectedLocationNames]);

  // Navigate & Focus
  const handleInspectOnMap = (area: AreaRiskItem) => {
    setLocation({
      name: `${area.name}, ${area.state}`,
      latitude: area.latitude,
      longitude: area.longitude,
    });
    navigate('/gov/map');
  };

  return (
    <div className="space-y-8 pb-16 animate-fadeIn">
      {/* ========================================================================= */}
      {/* SECTION 1 — MUNICIPAL COMPARISON HEADER                                   */}
      {/* ========================================================================= */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center space-x-1.5 font-mono">
                <Building2 className="w-4 h-4" />
                <span>Regional Urban Reference Monitoring</span>
              </span>
              <DataRealityBadge tier="CALCULATED" size="xs" customLabel="Curated Reference Points" />
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                Updated {lastUpdatedTime}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black ts-text-primary tracking-tight font-sans mt-2">
              Curated Urban Monitoring Locations
            </h1>
            <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-3xl leading-relaxed">
              Compare evaluated thermal conditions, biometeorological stress, and intervention priorities across curated regional urban reference coordinates.
            </p>
          </div>

          {/* Header Metadata Chips */}
          <div className="flex items-center space-x-3 self-start lg:self-auto flex-shrink-0">
            <div className="px-3.5 py-2 rounded-2xl ts-card-subtle border ts-border text-xs">
              <span className="ts-text-subtle text-[11px] block">Reference Locations</span>
              <span className="font-extrabold ts-text-primary font-mono text-sm">
                {areas.length} Locations
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMatrixData}
              disabled={isLoading}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />}
              className="text-xs font-bold"
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs ts-text-muted flex-wrap gap-2">
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
            <span>Active Command Jurisdiction: <strong className="ts-text-primary">{locationName}</strong></span>
          </div>
          <div className="text-[11px] ts-text-subtle flex items-center gap-1.5">
            <span className="font-bold text-orange-500 font-mono">Data Basis:</span>
            <span>Live meteorological conditions + Biometeorological calculations + Composite risk modelling</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2 — PRIORITY COMPARISON SUMMARY                                   */}
      {/* ========================================================================= */}
      {prioritySummary && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-orange-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-orange-500">
              Priority Comparison Summary
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Highest Current Concern */}
            <div className="p-5 rounded-3xl ts-card-elevated border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-transparent to-orange-500/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-mono">
                    Highest Current Concern
                  </span>
                  <Badge riskLevel={prioritySummary.highestConcern.risk_level} size="sm">
                    {translateRiskLevel(prioritySummary.highestConcern.risk_level, t)}
                  </Badge>
                </div>
                <h3 className="text-lg font-black ts-text-primary mt-2">
                  {prioritySummary.highestConcern.name}
                </h3>
                <p className="text-xs ts-text-muted mt-0.5">
                  {prioritySummary.highestConcern.state} • {prioritySummary.highestConcern.zone}
                </p>
                <div className="mt-3 text-xs ts-text-primary bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 leading-relaxed">
                  Composite Risk: <strong className="font-mono font-black text-rose-600 dark:text-rose-400">{prioritySummary.highestConcern.risk_score.toFixed(1)}/100</strong>. Critical afternoon solar loading requires immediate shade and hydration staging.
                </div>
              </div>

              <div className="mt-4 pt-3 border-t ts-border flex items-center justify-between text-xs">
                <span className="font-mono ts-text-subtle">
                  Temp: {prioritySummary.highestConcern.temperature_c.toFixed(1)}°C
                </span>
                <button
                  type="button"
                  onClick={() => handleInspectOnMap(prioritySummary.highestConcern)}
                  className="font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Focus on Map</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Card 2: Fastest Rising Risk / Acute Burden */}
            <div className="p-5 rounded-3xl ts-card-elevated border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-transparent to-yellow-500/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                    Acute Thermal Burden
                  </span>
                  <Badge riskLevel={prioritySummary.acuteBurden.risk_level} size="sm">
                    {translateRiskLevel(prioritySummary.acuteBurden.risk_level, t)}
                  </Badge>
                </div>
                <h3 className="text-lg font-black ts-text-primary mt-2">
                  {prioritySummary.acuteBurden.name}
                </h3>
                <p className="text-xs ts-text-muted mt-0.5">
                  {prioritySummary.acuteBurden.state} • {prioritySummary.acuteBurden.zone}
                </p>
                <div className="mt-3 text-xs ts-text-primary bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
                  High wet-bulb burden (<strong className="font-mono">{prioritySummary.acuteBurden.wbgt_c.toFixed(1)}°C WBGT</strong>). Thermal strain accelerating ahead of the 12 PM – 4 PM peak exposure window.
                </div>
              </div>

              <div className="mt-4 pt-3 border-t ts-border flex items-center justify-between text-xs">
                <span className="font-mono ts-text-subtle">
                  Humidity: {prioritySummary.acuteBurden.humidity_pct}%
                </span>
                <button
                  type="button"
                  onClick={() => handleInspectOnMap(prioritySummary.acuteBurden)}
                  className="font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Focus on Map</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Card 3: Lowest Relative Risk */}
            <div className="p-5 rounded-3xl ts-card-elevated border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
                    Lowest Relative Burden
                  </span>
                  <Badge riskLevel={prioritySummary.lowestConcern.risk_level} size="sm">
                    {translateRiskLevel(prioritySummary.lowestConcern.risk_level, t)}
                  </Badge>
                </div>
                <h3 className="text-lg font-black ts-text-primary mt-2">
                  {prioritySummary.lowestConcern.name}
                </h3>
                <p className="text-xs ts-text-muted mt-0.5">
                  {prioritySummary.lowestConcern.state} • {prioritySummary.lowestConcern.zone}
                </p>
                <div className="mt-3 text-xs ts-text-primary bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 leading-relaxed">
                  Baseline monitoring active. Environmental heat index remains within standard physiological tolerance envelope under routine pacing.
                </div>
              </div>

              <div className="mt-4 pt-3 border-t ts-border flex items-center justify-between text-xs">
                <span className="font-mono ts-text-subtle">
                  Score: {prioritySummary.lowestConcern.risk_score.toFixed(1)}/100
                </span>
                <button
                  type="button"
                  onClick={() => handleInspectOnMap(prioritySummary.lowestConcern)}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Focus on Map</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4 — SORTING, INVESTIGATION & CONTROLS                             */}
      {/* ========================================================================= */}
      <div className="rounded-3xl ts-card p-5 sm:p-6 border ts-border shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, state, or vulnerability tag (e.g. Urban Slums, Labor Hub)..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl ts-card-subtle border ts-border text-xs ts-text-primary placeholder:ts-text-subtle focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Zone Filter */}
            <div className="flex items-center space-x-1 text-xs">
              <span className="ts-text-subtle text-[11px] font-semibold">Zone:</span>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="py-2 px-3 rounded-xl ts-card-subtle border ts-border text-xs ts-text-primary focus:outline-none"
              >
                {availableZones.map((z) => (
                  <option key={z} value={z}>
                    {z === 'ALL' ? 'All Monitored Zones' : translateZone(z, t)}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dimension */}
            <div className="flex items-center space-x-1 text-xs">
              <span className="ts-text-subtle text-[11px] font-semibold">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="py-2 px-3 rounded-xl ts-card-subtle border ts-border text-xs ts-text-primary focus:outline-none font-semibold text-orange-600 dark:text-orange-400"
              >
                <option value="risk">Highest Risk Score</option>
                <option value="feels_like">Highest Feels-Like (Heat Index)</option>
                <option value="temp">Highest Temperature</option>
                <option value="humidity">Highest Humidity</option>
                <option value="wbgt">Highest Wet-Bulb (WBGT)</option>
              </select>
            </div>

            {/* Progressive Disclosure Toggle for Raw Telemetry */}
            <button
              type="button"
              onClick={() => setShowTechnicalMetrics(!showTechnicalMetrics)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                showTechnicalMetrics
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-600 dark:text-orange-300'
                  : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showTechnicalMetrics ? 'Hide Raw Scientific Data' : 'Show Raw Scientific Data'}</span>
            </button>
          </div>
        </div>

        {/* Multi-Selection Counter & Quick Clear */}
        <div className="flex items-center justify-between text-xs pt-2 border-t ts-border">
          <span className="ts-text-muted">
            Showing <strong className="ts-text-primary">{processedAreas.length}</strong> of {areas.length} locations. Select checkboxes to compare up to 4 locations side-by-side.
          </span>
          {selectedLocationNames.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
                {selectedLocationNames.length} selected for comparison
              </span>
              <button
                type="button"
                onClick={() => setSelectedLocationNames([])}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3 — FULL MUNICIPAL MATRIX (DETAILED COMPARISON TABLE)             */}
      {/* ========================================================================= */}
      <div className="rounded-3xl ts-card border ts-border shadow-xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b ts-border flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black ts-text-primary">
              Regional Urban Monitoring Reference Matrix
            </h3>
            <p className="text-xs ts-text-muted mt-0.5">
              Evaluated thermal indicators across curated regional reference locations. Derived metrics calculated from live meteorological telemetry.
            </p>
          </div>
          <div className="text-xs font-mono ts-text-subtle hidden md:block">
            SIH26083 Regional Monitoring Pipeline
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-xs text-rose-500">
            {error}
          </div>
        ) : processedAreas.length === 0 ? (
          <div className="p-12 text-center text-xs ts-text-muted">
            No monitored locations matched your filter query. Try selecting "All Monitored Zones".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b ts-border bg-slate-500/5 text-slate-400 uppercase text-[10.5px] tracking-wider font-mono">
                  <th className="py-3 px-4 w-10 text-center">Select</th>
                  <th className="py-3 px-4">Reference Location & Zone</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Temperature</th>
                  <th className="py-3 px-4">Feels Like</th>
                  <th className="py-3 px-4">Humidity</th>
                  <th className="py-3 px-4">Wind</th>
                  <th className="py-3 px-4">Peak Danger Period</th>
                  <th className="py-3 px-4">Trend</th>
                  <th className="py-3 px-4">Priority Status</th>
                  {showTechnicalMetrics && (
                    <>
                      <th className="py-3 px-4">
                        <span className="inline-flex items-center gap-1">
                          <span>Est. WBGT (°C)</span>
                          <CalculationInfoTooltip type="wbgt" />
                        </span>
                      </th>
                      <th className="py-3 px-4">Vulnerability Tag</th>
                    </>
                  )}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y ts-border">
                {processedAreas.map((area) => {
                  const isSelected = selectedLocationNames.includes(area.name);
                  const feelsLike = calculateFeelsLike(area.temperature_c, area.humidity_pct);
                  const isSevere = area.risk_level === 'HIGH' || area.risk_level === 'EXTREME' || area.risk_level === 'CRITICAL';

                  const trendLabel = isSevere ? 'Rising Pre-Peak' : area.risk_level === 'MODERATE' ? 'Steady' : 'Baseline';
                  const priorityStatus = isSevere ? 'Stage 2 HAP Action' : area.risk_level === 'MODERATE' ? 'Elevated Watch' : 'Routine Monitoring';

                  return (
                    <tr
                      key={area.name}
                      className={`hover:bg-slate-500/5 transition-colors ${
                        isSelected ? 'bg-orange-500/5 dark:bg-orange-950/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectLocation(area.name)}
                          className="text-orange-500 hover:scale-110 transition-transform cursor-pointer"
                          aria-label={`Select ${area.name} for comparison`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-orange-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Location & Zone */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold ts-text-primary text-sm flex items-center gap-1.5 flex-wrap">
                          <span>{area.name}</span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          )}
                          {area.area_type === 'prototype_zone' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                              Prototype Zone
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                              Regional Centroid
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] ts-text-subtle">
                          {area.state} • {translateZone(area.zone, t)}
                        </div>
                      </td>

                      {/* Risk Level Badge */}
                      <td className="py-3 px-4">
                        <Badge riskLevel={area.risk_level} size="sm">
                          {translateRiskLevel(area.risk_level, t)}
                        </Badge>
                      </td>

                      {/* Ambient Temp */}
                      <td className="py-3 px-4 font-mono font-bold ts-text-primary text-xs">
                        {area.temperature_c.toFixed(1)}°C
                      </td>

                      {/* Feels Like */}
                      <td className="py-3 px-4 font-mono font-extrabold text-amber-500 text-xs">
                        {feelsLike.toFixed(1)}°C
                      </td>

                      {/* Humidity */}
                      <td className="py-3 px-4 font-mono ts-text-muted">
                        {area.humidity_pct}% RH
                      </td>

                      {/* Wind Speed */}
                      <td className="py-3 px-4 font-mono ts-text-muted">
                        {area.wind_speed_mps !== undefined ? `${area.wind_speed_mps.toFixed(1)} m/s` : '—'}
                      </td>

                      {/* Peak Danger Period */}
                      <td className="py-3 px-4 font-mono text-[11px] ts-text-muted">
                        12:00 PM – 4:00 PM
                      </td>

                      {/* Trend */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          {isSevere ? (
                            <TrendingUp className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          ) : area.risk_level === 'MODERATE' ? (
                            <Minus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          <span
                            className={`text-[11px] font-semibold ${
                              isSevere
                                ? 'text-red-500'
                                : area.risk_level === 'MODERATE'
                                ? 'text-amber-500'
                                : 'text-emerald-500'
                            }`}
                          >
                            {trendLabel}
                          </span>
                        </div>
                      </td>

                      {/* Priority Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isSevere
                              ? 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30'
                              : area.risk_level === 'MODERATE'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {priorityStatus}
                        </span>
                      </td>

                      {/* Optional Raw Scientific Metrics */}
                      {showTechnicalMetrics && (
                        <>
                          <td className="py-3 px-4 font-mono text-orange-600 dark:text-orange-400 font-bold">
                            {area.wbgt_c.toFixed(1)}°C
                          </td>
                          <td className="py-3 px-4 text-[11px] ts-text-muted max-w-[140px] truncate">
                            {translateVulnerabilityTag(area.vulnerability_tag, t)}
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleInspectOnMap(area)}
                          className="px-2.5 py-1 rounded-lg border ts-border ts-card-subtle hover:bg-orange-500/10 hover:border-orange-500/30 text-[11px] font-bold ts-text-primary transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Map</span>
                          <ArrowRight className="w-3 h-3 text-orange-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 5 — COMPARE SELECTED LOCATIONS (FOCUSED SIDE-BY-SIDE)              */}
      {/* ========================================================================= */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-orange-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-orange-500">
                Side-by-Side Comparison Workspace
              </h2>
            </div>
            <h3 className="text-lg font-black ts-text-primary mt-1">
              Compare Selected Locations
            </h3>
            <p className="text-xs ts-text-muted mt-0.5">
              Detailed side-by-side contrast of thermal parameters and connected decision routes.
            </p>
          </div>

          {selectedAreasList.length > 0 && (
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
              Comparing {selectedAreasList.length} of 4 Sectors
            </span>
          )}
        </div>

        {selectedAreasList.length === 0 ? (
          <div className="p-8 text-center rounded-2xl ts-card-subtle border ts-border text-xs ts-text-muted">
            No locations selected. Check 2 to 4 locations in the matrix table above to compare them side-by-side.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {selectedAreasList.map((area) => {
              const feelsLike = calculateFeelsLike(area.temperature_c, area.humidity_pct);
              return (
                <div
                  key={area.name}
                  className="p-5 rounded-3xl ts-card-elevated border ts-border flex flex-col justify-between space-y-4 hover:border-orange-500/40 transition-all"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-black ts-text-primary">
                        {area.name}
                      </h4>
                      <Badge riskLevel={area.risk_level} size="sm">
                        {translateRiskLevel(area.risk_level, t)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-xs ts-text-muted">
                        {area.state} • {translateZone(area.zone, t)}
                      </span>
                      {area.area_type === 'prototype_zone' ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                          Prototype Zone
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                          Regional Centroid
                        </span>
                      )}
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2.5 mt-4 text-xs font-mono">
                      <div className="p-2.5 rounded-xl ts-card-subtle border ts-border">
                        <span className="text-[10px] uppercase font-bold ts-text-subtle block font-sans">
                          Temp
                        </span>
                        <span className="text-base font-black ts-text-primary">
                          {area.temperature_c.toFixed(1)}°C
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl ts-card-subtle border ts-border">
                        <span className="text-[10px] uppercase font-bold ts-text-subtle block font-sans">
                          Feels Like
                        </span>
                        <span className="text-base font-black text-amber-500">
                          {feelsLike.toFixed(1)}°C
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl ts-card-subtle border ts-border">
                        <span className="text-[10px] uppercase font-bold ts-text-subtle block font-sans">
                          Humidity
                        </span>
                        <span className="text-base font-bold ts-text-muted">
                          {area.humidity_pct}%
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl ts-card-subtle border ts-border">
                        <span className="text-[10px] uppercase font-bold ts-text-subtle block font-sans">
                          WBGT
                        </span>
                        <span className="text-base font-black text-orange-600 dark:text-orange-400">
                          {area.wbgt_c.toFixed(1)}°C
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl ts-card-subtle border ts-border col-span-2 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold ts-text-subtle font-sans">
                          Wind Speed
                        </span>
                        <span className="text-sm font-bold font-mono ts-text-primary">
                          {area.wind_speed_mps !== undefined ? `${area.wind_speed_mps.toFixed(1)} m/s` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Vulnerability Driver & Attention Reasoning */}
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-500/5 border ts-border text-[11px] leading-relaxed space-y-1">
                      <div>
                        <span className="font-bold ts-text-primary">Driver Profile: </span>
                        <span className="ts-text-muted">{translateVulnerabilityTag(area.vulnerability_tag, t)}</span>
                      </div>
                      <div className="text-[10.5px] text-orange-600 dark:text-orange-400 font-medium">
                        {area.risk_score >= 70
                          ? `Acute thermal strain: Elevated ${area.wbgt_c.toFixed(1)}°C WBGT with ${feelsLike.toFixed(1)}°C Heat Index requires stage-2 municipal interventions.`
                          : area.risk_score >= 50
                          ? `Elevated burden: Midday solar intensity and humidity accelerate fatigue for outdoor laborers.`
                          : `Baseline conditions: Standard physiological monitoring adequate.`}
                      </div>
                    </div>
                  </div>

                  {/* Connected Actions per Selected Location */}
                  <div className="pt-3 border-t ts-border space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleInspectOnMap(area)}
                      className="w-full py-1.5 px-2.5 rounded-lg border ts-border ts-card-subtle hover:bg-cyan-500/10 hover:border-cyan-500/30 text-xs font-bold ts-text-primary transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-cyan-500" />
                        <span>View on Map</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-cyan-500" />
                    </button>

                    <Link
                      to="/gov/health-impact"
                      className="w-full py-1.5 px-2.5 rounded-lg border ts-border ts-card-subtle hover:bg-rose-500/10 hover:border-rose-500/30 text-xs font-bold ts-text-primary transition-all flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                        <span>Review Health Impact</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-rose-500" />
                    </Link>

                    <Link
                      to="/gov/interventions"
                      className="w-full py-1.5 px-2.5 rounded-lg border ts-border ts-card-subtle hover:bg-orange-500/10 hover:border-orange-500/30 text-xs font-bold ts-text-primary transition-all flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-orange-500" />
                        <span>Evaluate Interventions</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 6 — WHAT TO REVIEW NEXT                                           */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <CheckCircle2 className="w-4 h-4 text-orange-500" />
          <h2 className="text-xs font-black uppercase tracking-wider ts-text-subtle">
            What to Review Next
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/gov/map"
            className="p-5 rounded-2xl ts-card-elevated border ts-border hover:border-cyan-500/50 hover:shadow-lg transition-all group block"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold ts-text-primary flex items-center justify-between">
              <span>Geographic Investigation</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
            </h3>
            <p className="text-xs ts-text-muted mt-1 leading-relaxed">
              Open the Heat Risk Map to inspect geographic clustering, solar loading patterns, and location intelligence.
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
              <span>Population Vulnerability</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 transition-colors" />
            </h3>
            <p className="text-xs ts-text-muted mt-1 leading-relaxed">
              Open Health Impact to evaluate health stress projections, demographic sensitivity, and dispensary readiness.
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
              <span>Simulate Interventions</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500 transition-colors" />
            </h3>
            <p className="text-xs ts-text-muted mt-1 leading-relaxed">
              Open the Intervention Simulator to model risk reductions from cooling shelters, work pauses, and water tankers.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MunicipalMatrix;

