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
} from 'lucide-react';
import { AreaRiskItem } from '../types';
import { api } from '../services/api';
import { getRiskColor, getRiskBgColor } from '../utils/risk';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface AreaRiskShowcaseProps {
  onSelectArea?: (area: AreaRiskItem) => void;
  title?: string;
  subtitle?: string;
  isGuestView?: boolean;
}

export const AreaRiskShowcase: React.FC<AreaRiskShowcaseProps> = ({
  onSelectArea,
  title = 'Multi-Area Heat Risk Intelligence Matrix',
  subtitle = 'Comprehensive biometeorological strain & civic healthcare vulnerability across major Indian regions',
  isGuestView = false,
}) => {
  const { locationName, setLocation } = useLocation();
  const { isAuthenticated } = useAuth();

  const [areas, setAreas] = useState<AreaRiskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const fetchAreas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAreasRiskOverview();
      setAreas(res.areas);
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

  const filteredAreas = useMemo(() => {
    return areas.filter((area) => {
      const matchesSearch =
        area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        area.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        area.vulnerability_tag.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesZone = selectedZone === 'ALL' || area.zone === selectedZone;

      const matchesSeverity =
        selectedSeverity === 'ALL' ||
        (selectedSeverity === 'CRITICAL_HIGH' &&
          (area.risk_level === 'EXTREME' || area.risk_level === 'HIGH' || area.risk_level === 'CRITICAL')) ||
        area.risk_level === selectedSeverity;

      return matchesSearch && matchesZone && matchesSeverity;
    });
  }, [areas, searchQuery, selectedZone, selectedSeverity]);

  const stats = useMemo(() => {
    const total = areas.length;
    const severeCount = areas.filter(
      (a) => a.risk_level === 'EXTREME' || a.risk_level === 'HIGH' || a.risk_level === 'CRITICAL'
    ).length;
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

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800/90 p-5 sm:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Guest Mode Callout Header */}
      {(!isAuthenticated || isGuestView) && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-orange-950/40 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Compass className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                  Guest Public Explorer Mode
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                  Live Multi-Area Risk
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                You are viewing the regional heat risk overview across all municipal areas. 
                To calculate your <strong className="text-orange-400">Personalized Individual Heat Health Risk</strong> based on your age, pre-existing health conditions, and work hours, sign in to your account.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2.5 w-full md:w-auto flex-shrink-0">
            <Link
              to="/personal-risk"
              className="flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-md shadow-orange-500/20 transition-all flex items-center justify-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Individual Calculator</span>
            </Link>
            <Link
              to="/login"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center space-x-1"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">{title}</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">{subtitle}</p>
        </div>

        <button
          onClick={fetchAreas}
          disabled={isLoading}
          className="self-start lg:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh All Areas</span>
        </button>
      </div>

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <div className="text-[11px] font-medium text-slate-400">Total Areas Monitored</div>
          <div className="text-2xl font-black text-white mt-0.5">{stats.total} Areas</div>
          <div className="text-[10px] text-cyan-400 mt-0.5">India National Network</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <div className="text-[11px] font-medium text-slate-400">High / Extreme Alerts</div>
          <div className="text-2xl font-black text-orange-400 mt-0.5">{stats.severeCount} Areas</div>
          <div className="text-[10px] text-orange-300/80 mt-0.5">Actionable Warning Active</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <div className="text-[11px] font-medium text-slate-400">Average Air Temp</div>
          <div className="text-2xl font-black text-amber-400 mt-0.5">{stats.avgTemp}°C</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Regional Macro Average</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
          <div className="text-[11px] font-medium text-slate-400">Average Wet-Bulb Globe</div>
          <div className="text-2xl font-black text-cyan-300 mt-0.5">{stats.avgWbgt}°C</div>
          <div className="text-[10px] text-cyan-400/80 mt-0.5">ISO 7243 Human Heat Load</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by city, state, or vulnerability tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>

        {/* Zone Selector */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-[11px] text-slate-400 whitespace-nowrap pl-1">Zone:</span>
          {uniqueZones.map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedZone === zone
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {zone === 'ALL' ? 'All Zones' : zone}
            </button>
          ))}
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={() => setSelectedSeverity('ALL')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedSeverity === 'ALL'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Severities
          </button>
          <button
            onClick={() => setSelectedSeverity('CRITICAL_HIGH')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
              selectedSeverity === 'CRITICAL_HIGH'
                ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                : 'bg-slate-900 text-red-400 hover:bg-red-500/10 border border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>High/Extreme Alerts</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAreas} className="underline hover:text-white font-bold ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Grid of Areas */}
      {isLoading && areas.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p>Synthesizing biometeorological observations across all regional municipal nodes...</p>
        </div>
      ) : filteredAreas.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/80">
          <p>No area matches the current search or severity filter.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedZone('ALL');
              setSelectedSeverity('ALL');
            }}
            className="mt-2 text-cyan-400 hover:underline font-bold"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAreas.map((area) => {
            const riskColor = getRiskColor(area.risk_level);
            const riskBg = getRiskBgColor(area.risk_level);
            const isActive = Boolean(
              locationName &&
              (locationName.toLowerCase().includes(area.name.toLowerCase()) ||
               area.name.toLowerCase().includes(locationName.toLowerCase().split(',')[0].trim()))
            );

            return (
              <div
                key={area.name}
                className={`group relative rounded-2xl transition-all p-4 flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-0.5 duration-200 ${
                  isActive
                    ? 'bg-slate-800/95 border-2 border-cyan-400 ring-2 ring-cyan-400/30 shadow-cyan-500/10'
                    : 'bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600'
                }`}
              >
                {/* Top: City & State + Risk Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h3 className={`text-base font-bold transition-colors ${isActive ? 'text-cyan-300' : 'text-white group-hover:text-cyan-300'}`}>
                          {area.name}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-700/80 text-slate-300">
                          {area.state}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 flex items-center space-x-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <span>Active Focus</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {area.zone}
                      </span>
                    </div>

                    <span
                      className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm flex items-center space-x-1 flex-shrink-0"
                      style={{ backgroundColor: riskColor }}
                    >
                      {area.risk_level === 'EXTREME' || area.risk_level === 'CRITICAL' ? (
                        <Flame className="w-3 h-3 text-white animate-pulse" />
                      ) : null}
                      <span>{area.risk_level}</span>
                    </span>
                  </div>

                  {/* Risk Score Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400 text-[11px]">Civic Health Risk Score</span>
                      <span className="font-mono font-bold text-slate-200">
                        {area.risk_score.toFixed(1)} / 100
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-700/80 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(5, area.risk_score))}%`,
                          backgroundColor: riskColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Weather Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2 mt-3.5 py-2 px-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-center space-x-0.5">
                        <Thermometer className="w-2.5 h-2.5 text-amber-400" />
                        <span>Temp</span>
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {area.temperature_c.toFixed(1)}°C
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-center space-x-0.5">
                        <Droplets className="w-2.5 h-2.5 text-cyan-400" />
                        <span>Humidity</span>
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {Math.round(area.humidity_pct)}%
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-center space-x-0.5">
                        <Flame className="w-2.5 h-2.5 text-orange-400" />
                        <span>WBGT</span>
                      </div>
                      <div className="text-xs font-bold text-orange-300 mt-0.5">
                        {area.wbgt_c.toFixed(1)}°C
                      </div>
                    </div>
                  </div>

                  {/* Vulnerability Tag */}
                  <div className="mt-3 text-[11px] text-slate-300 flex items-start space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-tight">{area.vulnerability_tag}</span>
                  </div>

                  {/* Concise Advisory */}
                  <div className="mt-2 text-[10px] text-slate-400 italic line-clamp-2">
                    "{area.summary_advisory}"
                  </div>
                </div>

                {/* Card Action Button: Inspect this area */}
                <button
                  type="button"
                  onClick={() => handleSelect(area)}
                  className={`mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 group/btn cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                      : 'bg-slate-700/60 hover:bg-cyan-500/20 border border-slate-600/80 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300'
                  }`}
                >
                  <span>{isActive ? '✓ Focused — Scroll to View Dashboard' : 'Focus Area on Dashboard & Map'}</span>
                  <ArrowUpRight className={`w-3.5 h-3.5 transition-transform ${isActive ? '' : 'group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5'}`} />
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
