import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AreaRiskItem } from '../types';
import { api } from '../services/api';
import { getRiskColor, getRiskBgColor } from '../utils/risk';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { Badge } from './ui';
import { translateZone, translateVulnerabilityTag, translateSummaryAdvisory, translateRiskLevel } from '../utils/translationHelpers';

interface AreaRiskShowcaseProps {
  onSelectArea?: (area: AreaRiskItem) => void;
  title?: string;
  subtitle?: string;
  isGuestView?: boolean;
}

export const AreaRiskShowcase: React.FC<AreaRiskShowcaseProps> = ({
  onSelectArea,
  title,
  subtitle,
  isGuestView = false,
}) => {
  const { locationName, setLocation } = useLocation();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const displayTitle = title || t('matrix.title');
  const displaySubtitle = subtitle || t('matrix.subtitle');

  const containerRef = useRef<HTMLDivElement>(null);
  const [areas, setAreas] = useState<AreaRiskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'CRITICAL_HIGH'>('ALL');
  const [showAllAreas, setShowAllAreas] = useState<boolean>(false);

  // Responsive initial limit: 3 cards on mobile (< 768px), 6 cards on tablet/desktop
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initialLimit = isMobile ? 3 : 6;

  const fetchAreas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAreasRiskOverview();
      setAreas(res.areas || []);
    } catch (err: any) {
      console.error('Failed to load multi-area risk overview:', err);
      setError(t('matrix.fetchFallbackWarning'));
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

  // Helper for priority ranking: EXTREME/CRITICAL = 4, HIGH = 3, MODERATE = 2, LOW = 1
  const getSeverityRank = (level: string) => {
    const norm = (level || '').toUpperCase().trim();
    if (norm === 'EXTREME' || norm === 'CRITICAL') return 4;
    if (norm === 'HIGH') return 3;
    if (norm === 'MODERATE') return 2;
    return 1;
  };

  // Prioritize:
  // 1. User's active monitored location (always at the very top)
  // 2. Highest heat risk level (Extreme > High > Moderate > Low)
  // 3. Highest risk_score
  // 4. Highest WBGT
  const prioritizedFilteredAreas = useMemo(() => {
    const currentCityName = locationName ? locationName.toLowerCase().split(',')[0].trim() : '';

    return [...filteredAreas].sort((a, b) => {
      // 1. Active / currently focused location first
      const aActive = Boolean(
        currentCityName &&
        (a.name.toLowerCase().includes(currentCityName) || currentCityName.includes(a.name.toLowerCase()))
      );
      const bActive = Boolean(
        currentCityName &&
        (b.name.toLowerCase().includes(currentCityName) || currentCityName.includes(b.name.toLowerCase()))
      );
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;

      // 2. Highest heat risk level
      const aRank = getSeverityRank(a.risk_level);
      const bRank = getSeverityRank(b.risk_level);
      if (aRank !== bRank) return bRank - aRank;

      // 3. Highest risk score
      if (b.risk_score !== a.risk_score) {
        return b.risk_score - a.risk_score;
      }

      // 4. Highest WBGT
      return b.wbgt_c - a.wbgt_c;
    });
  }, [filteredAreas, locationName]);

  // Sliced items for display based on progressive limit
  const displayedAreas = useMemo(() => {
    if (showAllAreas || prioritizedFilteredAreas.length <= initialLimit) {
      return prioritizedFilteredAreas;
    }
    return prioritizedFilteredAreas.slice(0, initialLimit);
  }, [prioritizedFilteredAreas, showAllAreas, initialLimit]);

  const handleToggleShowAll = () => {
    if (showAllAreas && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < 0) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    setShowAllAreas((prev) => !prev);
  };

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
    <div ref={containerRef} className="rounded-3xl ts-card p-5 sm:p-7 shadow-2xl relative overflow-hidden">
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
                  {t('matrix.guestExplorer')}
                </span>
                <Badge variant="brand" size="sm">
                  {t('matrix.nationalSurveillance')}
                </Badge>
              </div>
              <p className="text-xs ts-text-muted mt-1 max-w-2xl leading-relaxed">
                {t('matrix.guestExplorerDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2.5 w-full md:w-auto flex-shrink-0">
            <Link
              to="/personal-risk"
              className="flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('nav.myRisk')}</span>
            </Link>
            <Link
              to="/login"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold ts-text-muted hover:ts-text-primary ts-card-subtle border ts-border transition-colors flex items-center space-x-1"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t('auth.signIn')}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b ts-border">
        <div>
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight ts-text-primary">{displayTitle}</h2>
          </div>
          <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-3xl">{displaySubtitle}</p>
        </div>

        <button
          type="button"
          onClick={fetchAreas}
          disabled={isLoading}
          className="self-start lg:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ts-card-subtle hover:bg-white/[0.05] border ts-border text-xs font-medium ts-text-muted hover:ts-text-primary transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
          <span>{t('matrix.refreshAll')}</span>
        </button>
      </div>

      {/* Summary KPI Counters (Clickable for quick filtering) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-5">
        <div
          onClick={() => {
            setSelectedSeverity('ALL');
            setSelectedZone('ALL');
          }}
          className={`p-3.5 rounded-2xl ts-card-subtle border transition-all cursor-pointer ${
            selectedSeverity === 'ALL' ? 'border-orange-500/40 shadow-sm' : 'ts-border hover:border-slate-500/50'
          }`}
        >
          <div className="text-[11px] font-medium ts-text-subtle">{t('matrix.totalMonitored')}</div>
          <div className="text-xl sm:text-2xl font-black ts-text-primary mt-0.5">{stats.total}</div>
          <div className="text-[10.5px] text-sky-400 font-medium mt-0.5">{t('matrix.allZones')}</div>
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
            <span>{t('matrix.severeAlerts')}</span>
            <Flame className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-400 mt-0.5">{stats.severeCount}</div>
          <div className="text-[10.5px] text-red-400 font-medium mt-0.5">
            {selectedSeverity === 'CRITICAL_HIGH' ? t('status.active') : t('matrix.severeAlerts')}
          </div>
        </div>

        <div className="p-3.5 rounded-xl ts-card-subtle border ts-border">
          <div className="text-[11px] font-medium ts-text-subtle">{t('matrix.avgAirTemp')}</div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">{stats.avgTemp}°C</div>
          <div className="text-[10.5px] ts-text-subtle mt-0.5">{t('weatherCard.dryBulb')}</div>
        </div>

        <div className="p-3.5 rounded-xl ts-card-subtle border ts-border">
          <div className="text-[11px] font-medium ts-text-subtle">{t('matrix.avgWbgt')}</div>
          <div className="text-xl sm:text-2xl font-black text-orange-400 mt-0.5">{stats.avgWbgt}°C</div>
          <div className="text-[10.5px] ts-text-subtle mt-0.5">{t('dashboard.heatStressIndex')}</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 p-3 rounded-2xl ts-card-subtle border ts-border">
        {/* Search */}
        <div className="relative flex-1 min-w-0 w-full md:w-auto">
          <Search className="w-4 h-4 ts-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('matrix.searchArea')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 ts-input text-xs ts-text-primary placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Zone Selector */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none max-w-full">
          <span className="text-[11px] ts-text-subtle whitespace-nowrap pl-1">{t('matrix.zoneLabel')}:</span>
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
              {zone === 'ALL' ? t('matrix.allZones') : translateZone(zone, t)}
            </button>
          ))}
        </div>

        {/* Severity Filter Toggle Button */}
        <div className="flex items-center flex-wrap gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSelectedSeverity('ALL')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedSeverity === 'ALL'
                ? 'bg-orange-500 text-white font-bold shadow-sm'
                : 'ts-card border ts-border ts-text-muted hover:ts-text-primary'
            }`}
          >
            {t('matrix.allSeverities')}
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
            <span>{t('matrix.severeAlerts')}</span>
            {selectedSeverity === 'CRITICAL_HIGH' && <span className="ml-1 text-[10px]">✓</span>}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={fetchAreas} className="underline hover:text-amber-900 dark:hover:text-white font-bold ml-2 cursor-pointer">
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Grid of Areas */}
      {isLoading && areas.length === 0 ? (
        <div className="py-16 text-center ts-text-muted text-sm">
          <RefreshCw className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-3" />
          <p>{t('common.loading')}</p>
        </div>
      ) : prioritizedFilteredAreas.length === 0 ? (
        <div className="py-12 text-center ts-text-muted text-xs ts-card-subtle rounded-2xl border ts-border p-6">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
          <p className="font-semibold ts-text-primary text-sm">
            {selectedSeverity === 'CRITICAL_HIGH'
              ? t('matrix.noSevereDetected')
              : t('matrix.noAreasMatch')}
          </p>
          <p className="ts-text-subtle mt-1">
            {selectedSeverity === 'CRITICAL_HIGH'
              ? t('matrix.allOperatingBaseline')
              : t('matrix.tryClearingFilters')}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedZone('ALL');
              setSelectedSeverity('ALL');
              setShowAllAreas(true);
            }}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-orange-400 border border-orange-500/30 hover:bg-orange-500/10 transition-colors cursor-pointer"
          >
            {t('common.showMore')}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedAreas.map((area, index) => {
              const isExtraCard = index >= initialLimit;
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
                return t('matrix.explanationExtreme');
              }
              if (norm === 'HIGH') {
                return t('matrix.explanationHigh');
              }
              if (norm === 'MODERATE') {
                return t('matrix.explanationModerate');
              }
              return t('matrix.explanationLow');
            };

            return (
              <div
                key={area.name}
                className={`group relative rounded-2xl transition-all p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow-md duration-150 h-full ${
                  isExtraCard ? 'animate-ts-fade-in' : ''
                } ${
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
                            <span>{t('matrix.activeFocus')}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] ts-text-muted font-medium block mt-0.5">
                        {translateZone(area.zone, t)} • Lat {area.latitude.toFixed(2)}, Lon {area.longitude.toFixed(2)}
                      </span>
                    </div>

                    {/* Risk Status Badge with High Contrast */}
                    <Badge riskLevel={area.risk_level} size="sm" showDot showIcon>
                      {translateRiskLevel(area.risk_level, t)}
                    </Badge>
                  </div>

                  {/* 3. One-line Risk Explanation */}
                  <p className="text-xs ts-text-muted font-normal mt-2.5 line-clamp-2 leading-relaxed">
                    {getRiskExplanation(area.risk_level)}
                  </p>

                  {/* 4. Key Contributing Condition(s) */}
                  <div className="mt-3.5 pt-3 border-t ts-border">
                    <div className="text-[11px] font-semibold ts-text-muted mb-2 flex items-center justify-between">
                      <span>{t('matrix.keyConditions')}</span>
                      <span className="text-[10px] ts-text-subtle font-mono">WBGT {area.wbgt_c.toFixed(1)}°C</span>
                    </div>

                    {/* Weather Metrics Strip */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-xl ts-card-subtle border ts-border text-center">
                      <div>
                        <div className="text-[10px] ts-text-subtle flex items-center justify-center space-x-0.5 font-medium">
                          <Thermometer className="w-3 h-3 text-amber-400" />
                          <span>{t('matrix.airTemp')}</span>
                        </div>
                        <div className="text-xs font-bold ts-text-primary mt-0.5 font-mono">
                          {area.temperature_c.toFixed(1)}°C
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] ts-text-subtle flex items-center justify-center space-x-0.5 font-medium">
                          <Droplets className="w-3 h-3 text-sky-400" />
                          <span>{t('matrix.humidity')}</span>
                        </div>
                        <div className="text-xs font-bold ts-text-primary mt-0.5 font-mono">
                          {Math.round(area.humidity_pct)}%
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] ts-text-subtle flex items-center justify-center space-x-0.5 font-medium">
                          <Flame className="w-3 h-3 text-orange-400" />
                          <span>{t('matrix.wetBulb')}</span>
                        </div>
                        <div className="text-xs font-bold text-orange-400 mt-0.5 font-mono">
                          {area.wbgt_c.toFixed(1)}°C
                        </div>
                      </div>
                    </div>

                    {/* Primary Vulnerability Factor */}
                    <div className="mt-2.5 text-xs ts-text-muted flex items-start space-x-1.5 leading-snug">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <span><strong className="ts-text-primary font-semibold">{t('matrix.localVulnerability')}:</strong> {translateVulnerabilityTag(area.vulnerability_tag, t)}</span>
                    </div>
                  </div>

                  {/* 5. Primary Recommended Action */}
                  <div className="mt-3 text-xs ts-text-primary bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30 p-2.5 rounded-xl flex items-start space-x-2 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-orange-600 dark:text-orange-400 mr-1">{t('matrix.publicAction')}:</span>
                      <span className="ts-text-primary">{translateSummaryAdvisory(area.summary_advisory, t)}</span>
                    </div>
                  </div>

                  {/* Supporting Scientific Metric: Risk Score Progress Bar (Visually Secondary) */}
                  <div className="mt-3.5 pt-2.5 border-t ts-border">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="ts-text-subtle font-medium">{t('matrix.civicHealthRiskIndex')}</span>
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
                  <span>{isActive ? `✓ ${t('matrix.focusAreaBtn')}` : t('matrix.focusAreaBtn')}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

          {/* Show All / Show Less Progressive Control */}
          {prioritizedFilteredAreas.length > initialLimit && (
            <div className="mt-6 flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={handleToggleShowAll}
                aria-expanded={showAllAreas}
                className="group px-6 py-3 rounded-2xl ts-card-elevated hover:border-orange-500/50 border ts-border text-xs sm:text-sm font-bold ts-text-primary hover:text-orange-400 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer min-h-[44px]"
              >
                <span>
                  {showAllAreas
                    ? `${t('common.showLess')} ↑`
                    : `${t('common.showMore')} (${prioritizedFilteredAreas.length}) ↓`}
                </span>
                {showAllAreas ? (
                  <ChevronUp className="w-4 h-4 text-orange-400 transition-transform group-hover:-translate-y-0.5" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-orange-400 transition-transform group-hover:translate-y-0.5" />
                )}
              </button>
              {!showAllAreas && (
                <span className="text-[11px] ts-text-subtle mt-2 font-medium">
                  Displaying top {initialLimit} priority zones · {prioritizedFilteredAreas.length - initialLimit} more available
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AreaRiskShowcase;
