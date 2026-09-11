import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { InterventionResponse, SimulationResponse } from '../types';
import { useLocation } from '../context/LocationContext';
import { useTranslation } from '../context/LanguageContext';
import {
  Sliders,
  Sparkles,
  TrendingDown,
  Building2,
  Ban,
  GlassWater,
  CheckCircle2,
  RefreshCw,
  MapPin,
  AlertTriangle,
  Zap,
  Info,
  Droplets,
  Clock,
  ShieldAlert,
  Users,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button } from '../components/ui';

// Intelligent grouping of backend recommendations to eliminate robotic repetition
interface GroupedDirective {
  category: string;
  icon: React.ReactNode;
  badge: string;
  items: {
    raw: string;
    action: string;
    explanation: string;
  }[];
}

const groupRecommendations = (
  recs: string[],
  t: (key: string, params?: Record<string, string | number>, fallback?: string) => string
): GroupedDirective[] => {
  const groups: { [key: string]: GroupedDirective } = {
    hydration: {
      category: t('intervention.categoryHydration'),
      icon: <Droplets className="w-4 h-4 text-sky-400" />,
      badge: t('intervention.badgeHydration'),
      items: [],
    },
    work: {
      category: t('intervention.categoryWork'),
      icon: <Clock className="w-4 h-4 text-amber-400" />,
      badge: t('intervention.badgeExposure'),
      items: [],
    },
    protocols: {
      category: t('intervention.categoryProtocols'),
      icon: <ShieldAlert className="w-4 h-4 text-orange-400" />,
      badge: t('intervention.badgeEmergency'),
      items: [],
    },
    vulnerable: {
      category: t('intervention.categoryVulnerable'),
      icon: <Users className="w-4 h-4 text-emerald-400" />,
      badge: t('intervention.badgeProtection'),
      items: [],
    },
  };

  recs.forEach((rec) => {
    const lower = rec.toLowerCase();
    if (lower.includes('hydration') || lower.includes('evaporative cooling')) {
      let explanation = t('intervention.actionHydrationBreak');
      if (lower.includes('evaporative cooling')) {
        explanation = t('intervention.actionEvaporativeCooling');
      } else if (lower.includes('facilities')) {
        explanation = t('intervention.actionWaterFacilities');
      }
      groups.hydration.items.push({
        raw: rec,
        action: rec,
        explanation,
      });
    } else if (
      lower.includes('outdoor') ||
      lower.includes('rest breaks') ||
      lower.includes('activities') ||
      lower.includes('exposure')
    ) {
      let explanation = t('intervention.actionSunExposure');
      if (lower.includes('11 am and 4 pm') || lower.includes('11') || lower.includes('4')) {
        explanation = t('intervention.actionPeakHeatHours');
      } else if (lower.includes('non-essential')) {
        explanation = t('intervention.actionNonEssentialLabor');
      }
      groups.work.items.push({
        raw: rec,
        action: rec,
        explanation,
      });
    } else if (lower.includes('vulnerable') || lower.includes('elderly')) {
      groups.vulnerable.items.push({
        raw: rec,
        action: rec,
        explanation: t('intervention.actionVulnerableOutreach'),
      });
    } else {
      let explanation = t('intervention.actionStandardProtocols');
      if (lower.includes('cooling centres') || lower.includes('cooling centers')) {
        explanation = t('intervention.actionCoolingShelters');
      } else if (lower.includes('critical') || lower.includes('high')) {
        explanation = t('intervention.actionEmergencyAlert');
      }
      groups.protocols.items.push({
        raw: rec,
        action: rec,
        explanation,
      });
    }
  });

  return Object.values(groups).filter((g) => g.items.length > 0);
};

export const Intervention: React.FC = () => {
  const { coords, locationName } = useLocation();
  const { t } = useTranslation();

  // Simulator inputs (All 5 interactive scenario sliders)
  const [baselineRiskScore, setBaselineRiskScore] = useState<number>(37.4);
  const [temperature, setTemperature] = useState<number>(28.4);
  const [humidity, setHumidity] = useState<number>(78.0);
  const [hour, setHour] = useState<number>(13);
  const [vulnerablePopRatio, setVulnerablePopRatio] = useState<number>(0.35);

  // Intervention policy switches
  const [coolingCenter, setCoolingCenter] = useState<boolean>(true);
  const [workRestriction, setWorkRestriction] = useState<boolean>(true);
  const [hydrationStations, setHydrationStations] = useState<boolean>(true);

  const [interventionData, setInterventionData] = useState<InterventionResponse | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce ref for live slider recalculations
  const debounceTimerRef = useRef<any>(null);

  // Execute policy simulation on backend
  const executeSimulation = async (params?: {
    risk_score: number;
    temperature: number;
    humidity: number;
    hour: number;
    vulnerable_population?: number;
    cooling_center: boolean;
    outdoor_work_restriction: boolean;
    hydration_stations: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    const activeRiskScore = params ? params.risk_score : baselineRiskScore;
    const activeTemp = params ? params.temperature : temperature;
    const activeHumidity = params ? params.humidity : humidity;
    const activeHour = params ? params.hour : hour;
    const activeVuln = params?.vulnerable_population !== undefined ? params.vulnerable_population : vulnerablePopRatio;
    const activeCooling = params ? params.cooling_center : coolingCenter;
    const activeWork = params ? params.outdoor_work_restriction : workRestriction;
    const activeHydration = params ? params.hydration_stations : hydrationStations;

    try {
      const [interventionsRes, simulationRes] = await Promise.all([
        api.getInterventions({
          risk_score: activeRiskScore,
          temperature: activeTemp,
          humidity: activeHumidity,
          hour: activeHour,
          vulnerable_population: activeVuln,
        }),
        api.simulateIntervention({
          risk_score: activeRiskScore,
          cooling_center: activeCooling,
          outdoor_work_restriction: activeWork,
          hydration_stations: activeHydration,
        }),
      ]);
      setInterventionData(interventionsRes);
      setSimulationData(simulationRes);
    } catch (err: any) {
      console.error('Simulation execution error:', err);
      setError(err.message || 'Failed to execute policy simulation on backend.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch live meteorological and ML risk values from backend for currently active location
  const handleSyncLive = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const [thermalRes, riskRes] = await Promise.all([
        api.getThermal(coords.lat, coords.lon),
        api.getRisk(coords.lat, coords.lon),
      ]);

      const liveTemp = Math.round(thermalRes.weather.temperature * 10) / 10;
      const liveHumidity = Math.round(thermalRes.weather.humidity);
      const liveRisk = Math.round(riskRes.risk.risk_score * 10) / 10;

      let liveHour = new Date().getHours();
      if (thermalRes.weather.time) {
        const parsedHour = new Date(thermalRes.weather.time).getHours();
        if (!isNaN(parsedHour)) {
          liveHour = parsedHour;
        }
      }

      setTemperature(liveTemp);
      setHumidity(liveHumidity);
      setBaselineRiskScore(liveRisk);
      setHour(liveHour);

      await executeSimulation({
        risk_score: liveRisk,
        temperature: liveTemp,
        humidity: liveHumidity,
        hour: liveHour,
        vulnerable_population: vulnerablePopRatio,
        cooling_center: coolingCenter,
        outdoor_work_restriction: workRestriction,
        hydration_stations: hydrationStations,
      });
    } catch (err: any) {
      console.error('Sync live error:', err);
      setError(err.message || 'Failed to sync live conditions for active city.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Initial sync on mount or location change
  useEffect(() => {
    handleSyncLive();
  }, [coords.lat, coords.lon]);

  // Reactive simulation trigger on slider or policy changes (debounced 250ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      executeSimulation();
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [baselineRiskScore, temperature, humidity, hour, vulnerablePopRatio, coolingCenter, workRestriction, hydrationStations]);

  const activeCount = [coolingCenter, workRestriction, hydrationStations].filter(Boolean).length;
  const currentRiskLevel =
    baselineRiskScore >= 75
      ? 'EXTREME'
      : baselineRiskScore >= 50
      ? 'HIGH'
      : baselineRiskScore >= 25
      ? 'MODERATE'
      : 'LOW';

  const groupedDirectives = interventionData?.recommendations
    ? groupRecommendations(interventionData.recommendations, t)
    : [];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
              {t('intervention.decisionSupportEngine')}
            </span>
            <Badge variant="brand" size="sm">
              {t('intervention.policySimulatorBadge')}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold ts-text-primary font-sans mt-0.5">
            {t('intervention.title')}
          </h1>
          <p className="text-sm ts-text-muted mt-1">
            {t('intervention.subtitle')}
          </p>
        </div>

        {/* Active City Location Badge & Sync Button */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 ts-card-elevated border ts-border px-3 sm:px-3.5 py-2 rounded-xl">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <div className="text-xs">
              <span className="ts-text-subtle block text-[11px]">{t('nav.activeZone')}:</span>
              <span className="font-semibold ts-text-primary">{locationName.split(',')[0]}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSyncLive}
            disabled={isSyncing}
            leftIcon={<Zap className={`w-3.5 h-3.5 text-orange-600 dark:text-orange-400 ${isSyncing ? 'animate-bounce' : ''}`} />}
            className="ml-auto sm:ml-1 text-xs cursor-pointer"
          >
            {isSyncing ? t('common.loading') : t('intervention.syncLiveBtn')}
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSyncLive} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {/* Decision Support & Methodological Notice */}
      <div className="p-4 rounded-xl ts-card-subtle border ts-border text-xs ts-text-muted flex items-start space-x-3">
        <Info className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed">
          <strong className="ts-text-primary">{t('intervention.disclaimerTitle')}: </strong>
          {t('intervention.disclaimerText')}
        </p>
      </div>

      {/* MAIN SIMULATION GRID: 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: SCENARIO PARAMETERS & POLICY COUNTERMEASURES (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Baseline Scenario Conditions */}
          <Card>
            <CardHeader
              title={t('intervention.section1Title')}
              subtitle={t('intervention.section1Subtitle')}
            />
            <CardContent className="space-y-4">
              {/* Current Civic Risk Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold ts-text-muted mb-1.5">
                  <span>{t('intervention.baselineRisk')}:</span>
                  <span className="font-mono text-sm font-bold text-amber-400">
                    {baselineRiskScore.toFixed(1)} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={baselineRiskScore}
                  onChange={(e) => setBaselineRiskScore(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-[10px] ts-text-subtle font-mono mt-1">
                  <span>0 ({t('intervention.tickLow')})</span>
                  <span>50 ({t('intervention.tickHigh')})</span>
                  <span>100 ({t('intervention.tickExtreme')})</span>
                </div>
              </div>

              {/* Ambient Air Temperature Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold ts-text-muted mb-1.5">
                  <span>{t('matrix.airTemp')}:</span>
                  <span className="text-orange-400 font-mono text-sm font-bold">{temperature.toFixed(1)}°C</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="55"
                  step="0.5"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-[10px] ts-text-subtle font-mono mt-1">
                  <span>10°C</span>
                  <span>35°C</span>
                  <span>55°C</span>
                </div>
              </div>

              {/* Relative Humidity Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold ts-text-muted mb-1.5">
                  <span>{t('matrix.humidity')}:</span>
                  <span className="text-teal-400 font-mono text-sm font-bold">{humidity.toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={humidity}
                  onChange={(e) => setHumidity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-[10px] ts-text-subtle font-mono mt-1">
                  <span>5% ({t('intervention.tickDry')})</span>
                  <span>50% ({t('intervention.tickComfort')})</span>
                  <span>100% ({t('intervention.tickSaturated')})</span>
                </div>
              </div>

              {/* Time of Day Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold ts-text-muted mb-1.5">
                  <span>{t('intervention.timeOfDay')}:</span>
                  <span className="text-purple-400 font-mono text-sm font-bold">{hour}:00 hrs</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="23"
                  step="1"
                  value={hour}
                  onChange={(e) => setHour(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] ts-text-subtle font-mono mt-1">
                  <span>00:00 ({t('intervention.timeMidnight')})</span>
                  <span>12:00 ({t('intervention.timeNoon')})</span>
                  <span>23:00 ({t('intervention.timeNight')})</span>
                </div>
              </div>

              {/* People Needing Extra Protection Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold ts-text-muted mb-1.5">
                  <span>{t('intervention.vulnerablePopulation')}:</span>
                  <span className="text-amber-400 font-mono text-sm font-bold">{Math.round(vulnerablePopRatio * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.80"
                  step="0.05"
                  value={vulnerablePopRatio}
                  onChange={(e) => setVulnerablePopRatio(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] ts-text-subtle font-mono mt-1">
                  <span>5% ({t('intervention.tickLow')})</span>
                  <span>30% ({t('intervention.tickThreshold')})</span>
                  <span>80% ({t('intervention.tickHigh')})</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Response Measures */}
          <Card className="border-orange-500/30">
            <CardHeader
              title={t('intervention.section2Title')}
              subtitle={t('intervention.section2Subtitle')}
              badge={
                <Badge variant="brand" size="sm">
                  {t('intervention.selectedCount', { count: activeCount })}
                </Badge>
              }
            />
            <CardContent className="space-y-3">
              {/* Cooling Center */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  coolingCenter
                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-700 dark:text-orange-300'
                    : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      coolingCenter ? 'bg-orange-500/20 text-orange-400' : 'ts-card border ts-border text-slate-400'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold ts-text-primary">{t('intervention.coolingCentersToggle')}</p>
                    <p className="text-[11px] ts-text-subtle">{t('intervention.modeledReduction', { pts: 10 })}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={coolingCenter}
                  onChange={(e) => setCoolingCenter(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                />
              </label>

              {/* Work Restriction */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  workRestriction
                    ? 'bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-300'
                    : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      workRestriction ? 'bg-red-500/20 text-red-400' : 'ts-card border ts-border text-slate-400'
                    }`}
                  >
                    <Ban className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold ts-text-primary">{t('intervention.workSuspensionToggle')}</p>
                    <p className="text-[11px] ts-text-subtle">{t('intervention.modeledReduction', { pts: 15 })}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={workRestriction}
                  onChange={(e) => setWorkRestriction(e.target.checked)}
                  className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                />
              </label>

              {/* Hydration Stations */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  hydrationStations
                    ? 'bg-teal-500/10 border-teal-500/50 text-teal-700 dark:text-teal-300'
                    : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      hydrationStations ? 'bg-teal-500/20 text-teal-400' : 'ts-card border ts-border text-slate-400'
                    }`}
                  >
                    <GlassWater className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold ts-text-primary">{t('intervention.hydrationHubsToggle')}</p>
                    <p className="text-[11px] ts-text-subtle">{t('intervention.modeledReduction', { pts: 8 })}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={hydrationStations}
                  onChange={(e) => setHydrationStations(e.target.checked)}
                  className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                />
              </label>

              {/* Explicit Action Button */}
              <Button
                variant="primary"
                size="md"
                onClick={() => executeSimulation()}
                isLoading={isLoading}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="w-full mt-2 cursor-pointer"
              >
                {isLoading ? t('intervention.simulating') : t('intervention.applySimulation')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: SIMULATION RESULTS & OPERATIONAL DIRECTIVES (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 3: Simulated Intervention Impact (Scenario Estimate) */}
          <Card variant="elevated">
            <CardHeader
              title={t('intervention.impactTitle')}
              subtitle={t('intervention.impactSubtitle')}
              badge={
                <Badge variant="brand" size="sm">
                  {t('intervention.scenarioEstimateBadge')}
                </Badge>
              }
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-stretch">
                {/* Baseline Card */}
                <div className="p-4 rounded-xl ts-card-subtle border ts-border text-center flex flex-col justify-between">
                  <span className="text-[11px] font-semibold ts-text-subtle uppercase tracking-wider block">
                    {t('intervention.baselineRisk')}
                  </span>
                  <span className="text-3xl font-extrabold my-2 block font-mono ts-text-primary">
                    {simulationData?.current_risk.toFixed(1) ?? baselineRiskScore.toFixed(1)}
                  </span>
                  <div>
                    <Badge riskLevel={currentRiskLevel} size="sm">
                      {currentRiskLevel}
                    </Badge>
                  </div>
                </div>

                {/* Total Impact Reduction */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider block">
                    {t('intervention.simulatedReduction')}
                  </span>
                  <div className="flex items-center justify-center my-2 text-emerald-400 font-black text-3xl font-mono">
                    <span>-</span>
                    <span>{simulationData?.risk_reduction.toFixed(1) ?? '0.0'}</span>
                    <span className="text-sm font-semibold ml-1">pts</span>
                  </div>
                  <span className="text-[11px] text-emerald-300/80 font-medium">
                    {activeCount === 0 ? t('intervention.noPoliciesActive') : t('intervention.policiesActive', { count: activeCount })}
                  </span>
                </div>

                {/* Projected Card */}
                <div className="p-4 rounded-xl ts-card-subtle border ts-border text-center flex flex-col justify-between">
                  <span className="text-[11px] font-semibold ts-text-subtle uppercase tracking-wider block">
                    {t('intervention.projectedRisk')}
                  </span>
                  <span className="text-3xl font-extrabold my-2 block font-mono text-emerald-400">
                    {simulationData?.projected_risk.toFixed(1) ?? baselineRiskScore.toFixed(1)}
                  </span>
                  <div>
                    <Badge riskLevel={simulationData?.projected_level || 'LOW'} size="sm">
                      {simulationData?.projected_level || 'LOW'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Recommended Heat Actions (Intelligently Grouped, Complete Output) */}
          <Card>
            <CardHeader
              title={t('intervention.recommendedActions')}
              subtitle={t('intervention.recommendedActionsSubtitle')}
              badge={
                <Badge
                  variant={interventionData?.priority === 'CRITICAL' ? 'extreme' : 'brand'}
                  size="sm"
                >
                  {interventionData?.priority || 'MODERATE'} {t('alerts.priorityBadge')}
                </Badge>
              }
            />
            <CardContent>
              {groupedDirectives.length > 0 ? (
                <div className="space-y-4">
                  {groupedDirectives.map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="p-4 rounded-xl ts-card-subtle border ts-border space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b ts-border pb-2">
                        <div className="flex items-center space-x-2">
                          {group.icon}
                          <span className="text-xs font-bold ts-text-primary tracking-wide">
                            {group.category}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded ts-card border ts-border ts-text-muted">
                          {group.badge}
                        </span>
                      </div>

                      <div className="space-y-2 pt-1">
                        {group.items.map((item, iIdx) => (
                          <div key={iIdx} className="flex items-start space-x-2.5 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                            <div>
                              <span className="font-semibold ts-text-primary block">
                                {item.action}
                              </span>
                              <span className="ts-text-muted text-[11px] leading-relaxed block mt-0.5">
                                {item.explanation}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center ts-card-subtle rounded-xl border ts-border">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-semibold ts-text-primary">{t('intervention.conditionsStable')}</p>
                  <p className="text-[11px] ts-text-subtle mt-1">
                    {t('intervention.conditionsStableDesc')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default Intervention;
