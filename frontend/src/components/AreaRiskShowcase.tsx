import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  AlertTriangle,
  Flame,
  Thermometer,
  Droplets,
  ShieldCheck,
  Search,
  ArrowUpRight,
  Sparkles,
  Lock,
  Compass,
  RefreshCw,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { AreaRiskItem } from '../types';
import { api } from '../services/api';
import { getRiskColor, getRiskBgColor } from '../utils/risk';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Badge } from './ui';

interface AreaRiskShowcaseProps {
  onSelectArea?: (area: AreaRiskItem) => void;
  title?: string;
  subtitle?: string;
  isGuestView?: boolean;
}

export const AreaRiskShowcase: React.FC<AreaRiskShowcaseProps> = ({
  onSelectArea,
  title = 'All-Area Municipal Heat Risk Matrix',
  subtitle = 'Multi-city surveillance: Track which municipal zones face acute heat stress, why the risk exists, and immediate public safety actions.',
  isGuestView = false,
}) => {
  const { locationName, setLocation } = useLocation();
  const { isAuthenticated } = useAuth();

  const [areas, setAreas] = useState<AreaRiskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'CRITICAL_HIGH'>('ALL');

  const fetchAreas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAreasRiskOverview();
      setAreas(res.areas || []);
    } catch (err: any) {
      console.error('Failed to load multi-area risk overview:', err);
      setError('Unable to fetch live multi-area risk matrix. Retrying with fallback cache.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const uniqueZones = useMemo(() => {
    const zones = new Set(areas.map((a) => a.zone));
    return ['ALL', ...Array.from(zones)];
  }, [areas]);

  // Strict, unambiguous filter logic:
  // If CRITICAL_HIGH is active, only areas with normalized level of HIGH, EXTREME, or CRITICAL are included.
  const filteredAreas = useMemo(() => {
    return areas.filter((area) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        area.name.toLowerCase().includes(query) ||
        area.state.toLowerCase().includes(query) ||
        area.vulnerability_tag.toLowerCase().includes(query);

      const matchesZone = selectedZone === 'ALL' || area.zone === selectedZone;

      const level = (area.risk_level || '').toUpperCase().trim();
      const matchesSeverity =
        selectedSeverity === 'ALL'
          ? true
          : level === 'HIGH' || level === 'EXTREME' || level === 'CRITICAL';

      return matchesSearch && matchesZone && matchesSeverity;
    });
  }, [areas, searchQuery, selectedZone, selectedSeverity]);

  const stats = useMemo(() => {
    const total = areas.length;
    const severeCount = areas.filter((a) => {
      const level = (a.risk_level || '').toUpperCase().trim();
      return level === 'HIGH' || level === 'EXTREME' || level === 'CRITICAL';
    }).length;

    const avgTemp =
      total > 0
        ? (areas.reduce((acc, curr) => acc + curr.temperature_c, 0) / total).toFixed(1)
        : '0.0';
    const avgWbgt =
      total > 0
        ? (areas.reduce((acc, curr) => acc + curr.wbgt_c, 0) / total).toFixed(1)
        : '0.0';

    return { total, severeCount, avgTemp, avgWbgt };
  }, [areas]);

  const handleSelect = (area: AreaRiskItem) => {
    setLocation({
      name: `${area.name}, ${area.state}`,
      latitude: area.latitude,
      longitude: area.longitude,
    });
    if (onSelectArea) {
      onSelectArea(area);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleHighExtreme = () => {
    setSelectedSeverity((prev) => (prev === 'CRITICAL_HIGH' ? 'ALL' : 'CRITICAL_HIGH'));
  };

  return (
    <div className="rounded-3xl ts-card p-5 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Guest Mode Callout Header */}
      {(!isAuthenticated || isGuestView) && (
        <div className="mb-6 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Compass className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-orange-400">
                  Guest Public Explorer
                </span>
                <Badge variant="brand" size="sm">
                  Live National Surveillance
                </Badge>
              </div>
              <p className="text-xs ts-text-muted mt-1 max-w-2xl leading-relaxed">
                Viewing regional municipal heat risks. To calculate your{' '}
                <strong className="ts-text-primary">Personalized Heat Stress Index</strong> based on your age, health conditions, and work hours, sign in to your profile.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2.5 w-full md:w-auto flex-shrink-0">
            <Link
              to="/personal-risk"
              className="flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personal Risk</span>
            </Link>
            <Link
              to="/login"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold ts-text-muted hover:ts-text-primary ts-card-subtle border ts-border transition-colors flex items-center space-x-1"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b ts-border">
        <div>
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight ts-text-primary">{title}</h2>
          </div>
          <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-3xl">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={fetchAreas}
          disabled={isLoading}
          className="self-start lg:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ts-card-subtle hover:bg-white/[0.05] border ts-border text-xs font-medium ts-text-muted hover:ts-text-primary transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
          <span>Refresh All Areas</span>
        </button>
      </div>

      {/* Summary KPI Counters (Clickable for quick filtering) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div
          onClick={() => {
            setSelectedSeverity('ALL');
            setSelectedZone('ALL');
          }}
          className={`p-3.5 rounded-2xl ts-card-subtle border transition-all cursor-pointer ${
            selectedSeverity === 'ALL' ? 'border-orange-500/40 shadow-sm' : 'ts-border hover:border-slate-500/50'
          }`}
        >
          <div className="text-[11px] font-medium ts-text-subtle">Total Areas Monitored</div>
          <div className="text-2xl font-black ts-text-primary mt-0.5">{stats.total} Areas</div>
          <div className="text-[10.5px] text-sky-400 font-medium mt-0.5">National Surveillance</div>
        </div>

        <div
          onClick={toggleHighExtreme}
          className={`p-3.5 rounded-2xl ts-card-subtle border transition-all cursor-pointer ${
            selectedSeverity === 'CRITICAL_HIGH'
              ? 'border-red-500/60 bg-red-500/10 shadow-sm'
              : 'ts-border hover:border-red-500/40'
          }`}
          title="Click to toggle High/Extreme alerts filter"
        >
          <div className="text-[11px] font-medium ts-text-subtle flex items-center justify-between">
            <span>High / Extreme Alerts</span>
            <Flame className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-0.5">{stats.severeCount} Areas</div>
          <div className="text-[10.5px] text-red-400 font-medium mt-0.5">
            {selectedSeverity === 'CRITICAL_HIGH' ? 'Filter Active (Click to Show All)' : 'Click to Filter Severe Areas'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl ts-card-subtle border ts-border">
          <div className="text-[11px] font-medium ts-text-subtle">Average Air Temp</div>
          <div className="text-2xl font-black text-amber-400 mt-0.5">{stats.avgTemp}°C</div>
          <div className="text-[10.5px] ts-text-subtle mt-0.5">Regional Mean</div>
        </div>

        <div className="p-3.5 rounded-2xl ts-card-subtle border ts-border">
          <div className="text-[11px] font-medium ts-text-subtle">Average Wet-Bulb (WBGT)</div>
          <div className="text-2xl font-black text-orange-400 mt-0.5">{stats.avgWbgt}°C</div>
          <div className="text-[10.5px] ts-text-subtle mt-0.5">Human Heat Load</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 p-3 rounded-2xl ts-card-subtle border ts-border">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 ts-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by city, state, or vulnerability tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 ts-input text-xs ts-text-primary placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Zone Selector */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] ts-text-subtle whitespace-nowrap pl-1">Zone:</span>
          {uniqueZones.map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => setSelectedZone(zone)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedZone === zone
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold'
                  : 'ts-card border ts-border ts-text-muted hover:ts-text-primary'
              }`}
            >
              {zone === 'ALL' ? 'All Zones' : zone}
            </button>
          ))}
        </div>

        {/* Severity Filter Toggle Button */}
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSelectedSeverity('ALL')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedSeverity === 'ALL'
                ? 'bg-orange-500 text-white font-bold shadow-sm'
                : 'ts-card border ts-border ts-text-muted hover:ts-text-primary'
            }`}
          >
            All Severities
          </button>
          <button
            type="button"
            onClick={toggleHighExtreme}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
              selectedSeverity === 'CRITICAL_HIGH'
                ? 'bg-red-500 text-white shadow-sm border border-red-600'
                : 'ts-card border border-red-500/30 text-red-400 hover:bg-red-500/10'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>High/Extreme Alerts</span>
            {selectedSeverity === 'CRITICAL_HIGH' && <span className="ml-1 text-[10px]">✓</span>}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={fetchAreas} className="underline hover:text-amber-900 dark:hover:text-white font-bold ml-2 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Grid of Areas */}
      {isLoading && areas.length === 0 ? (
        <div className="py-16 text-center ts-text-muted text-sm">
          <RefreshCw className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-3" />
          <p>Synthesizing biometeorological observations across all municipal nodes...</p>
        </div>
      ) : filteredAreas.length === 0 ? (
        <div className="py-12 text-center ts-text-muted text-xs ts-card-subtle rounded-2xl border ts-border p-6">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
          <p className="font-semibold ts-text-primary text-sm">
            {selectedSeverity === 'CRITICAL_HIGH'
              ? 'No High or Extreme heat risks currently detected.'
              : 'No areas match the current search or zone filters.'}
          </p>
          <p className="ts-text-subtle mt-1">
            {selectedSeverity === 'CRITICAL_HIGH'
              ? 'All monitored municipal zones are currently operating within Low or Moderate baseline heat thresholds.'
              : 'Try clearing your search query or selecting All Zones.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedZone('ALL');
              setSelectedSeverity('ALL');
            }}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 transition-colors cursor-pointer"
          >
            Show All Monitored Areas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAreas.map((area) => {
            const riskColor = getRiskColor(area.risk_level);
            const isActive = Boolean(
              locationName &&
              (locationName.toLowerCase().includes(area.name.toLowerCase()) ||
               area.name.toLowerCase().includes(locationName.toLowerCase().split(',')[0].trim()))
            );

            // One-line risk explanation based on severity
            const getRiskExplanation = (level: string) => {
              const norm = (level || '').toUpperCase().trim();
              if (norm === 'EXTREME' || norm === 'CRITICAL') {
                return 'Dangerous thermal burden; acute risk of heat exhaustion and clinical emergency.';
              }
              if (norm === 'HIGH') {
                return 'Substantial physiological strain; dangerous for outdoor workers and vulnerable groups.';
              }
              if (norm === 'MODERATE') {
                return 'Elevated thermal discomfort; sensitive individuals should restrict continuous outdoor exposure.';
              }
              return 'Minimal heat hazard; conditions are currently within safe baseline margins.';
            };

            return (
              <div
                key={area.name}
                className={`group relative rounded-2xl transition-all p-5 flex flex-col justify-between shadow-sm hover:shadow-md duration-150 h-full ${
                  isActive
                    ? 'ts-card-elevated border-2 border-orange-500 ring-2 ring-orange-500/20'
                    : 'ts-card hover:border-slate-500/50'
                }`}
              >
                <div>
                  {/* 1. Location Name + Region & 2. Risk Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h3 className="text-base font-extrabold ts-text-primary transition-colors group-hover:text-orange-400">
                          {area.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold ts-card-subtle border ts-border ts-text-muted">
                          {area.state}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-500/15 text-orange-400 border border-orange-500/40 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                            <span>Active Focus</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] ts-text-muted font-medium block mt-0.5">
                        {area.zone} Zone • Lat {area.latitude.toFixed(2)}, Lon {area.longitude.toFixed(2)}
                      </span>
                    </div>

                    {/* Risk Status Badge with High Contrast */}
                    <Badge riskLevel={area.risk_level} size="sm" showDot showIcon>
                      {area.risk_level}
                    </Badge>
                  </div>

                  {/* 3. One-line Risk Explanation */}
                  <p className="text-xs ts-text-muted font-normal mt-2.5 line-clamp-2 leading-relaxed">
                    {getRiskExplanation(area.risk_level)}
                  </p>

                  {/* 4. Key Contributing Condition(s) */}
                  <div className="mt-3.5 pt-3 border-t ts-border">
                    <div className="text-[11px] font-semibold ts-text-muted mb-2 flex items-center justify-between">
                      <span>Key Contributing Conditions</span>
                      <span className="text-[10px] ts-text-subtle font-mono">WBGT {area.wbgt_c.toFixed(1)}°C</span>
                    </div>

                    {/* Weather Metrics Strip */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-xl ts-card-subtle border ts-border text-center">
                      <div>
                        <div className="text-[10px] ts-text-subtle flex items-center justify-center space-x-0.5 font-medium">
                          <Thermometer className="w-3 h-3 text-amber-400" />
                          <span>Air Temp</span>
                        </div>
                        <div className="text-xs font-bold ts-text-primary mt-0.5 font-mono">
                          {area.temperature_c.toFixed(1)}°C
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] ts-text-subtle flex items-center justify-center space-x-0.5 font-medium">
                          <Droplets className="w-3 h-3 text-sky-400" />
                          <span>Humidity</span>
                        </div>
                        <div className="text-xs font-bold ts-text-primary mt-0.5 font-mono">
                          {Math.round(area.humidity_pct)}%
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] ts-text-subtle flex items-center justify-center space-x-0.5 font-medium">
                          <Flame className="w-3 h-3 text-orange-400" />
                          <span>Wet-Bulb</span>
                        </div>
                        <div className="text-xs font-bold text-orange-400 mt-0.5 font-mono">
                          {area.wbgt_c.toFixed(1)}°C
                        </div>
                      </div>
                    </div>

                    {/* Primary Vulnerability Factor */}
                    <div className="mt-2.5 text-xs ts-text-muted flex items-start space-x-1.5 leading-snug">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <span><strong className="ts-text-primary font-semibold">Local Vulnerability:</strong> {area.vulnerability_tag}</span>
                    </div>
                  </div>

                  {/* 5. Primary Recommended Action */}
                  <div className="mt-3 text-xs ts-text-primary bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30 p-2.5 rounded-xl flex items-start space-x-2 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-orange-600 dark:text-orange-400 mr-1">Public Action:</span>
                      <span className="ts-text-primary">{area.summary_advisory}</span>
                    </div>
                  </div>

                  {/* Supporting Scientific Metric: Risk Score Progress Bar (Visually Secondary) */}
                  <div className="mt-3.5 pt-2.5 border-t ts-border">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="ts-text-subtle font-medium">Civic Health Risk Index</span>
                      <span className="font-mono font-bold ts-text-muted text-xs">
                        {area.risk_score.toFixed(1)} <span className="ts-text-subtle font-normal text-[10px]">/ 100</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(5, area.risk_score))}%`,
                          backgroundColor: riskColor,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <button
                  type="button"
                  onClick={() => handleSelect(area)}
                  className={`mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md'
                      : 'ts-card-subtle hover:bg-white/[0.05] border ts-border ts-text-primary hover:text-orange-400'
                  }`}
                >
                  <span>{isActive ? '✓ Focused on Dashboard' : 'Focus Area on Dashboard & Map'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AreaRiskShowcase;
