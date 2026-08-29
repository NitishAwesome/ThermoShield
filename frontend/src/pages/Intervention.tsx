import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { InterventionResponse, SimulationResponse } from '../types';
import { getRiskBadgeStyles } from '../utils/risk';
import { useLocation } from '../context/LocationContext';
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
} from 'lucide-react';

export const Intervention: React.FC = () => {
  const { coords, locationName } = useLocation();

  // Simulator inputs
  const [baselineRiskScore, setBaselineRiskScore] = useState<number>(35.0);
  const [temperature, setTemperature] = useState<number>(28.0);
  const [humidity, setHumidity] = useState<number>(65.0);
  const [hour, setHour] = useState<number>(new Date().getHours());
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

  // Execute policy simulation on backend with explicit or current state parameters
  const executeSimulation = async (params?: {
    risk_score: number;
    temperature: number;
    humidity: number;
    hour: number;
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
          vulnerable_population: vulnerablePopRatio,
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
      // Fetch live weather and ML risk prediction directly from backend
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

      // Update visible scenario inputs
      setTemperature(liveTemp);
      setHumidity(liveHumidity);
      setBaselineRiskScore(liveRisk);
      setHour(liveHour);

      // Re-run simulation with live values
      await executeSimulation({
        risk_score: liveRisk,
        temperature: liveTemp,
        humidity: liveHumidity,
        hour: liveHour,
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

  // Automatically sync live data and run baseline simulation when active city changes
  useEffect(() => {
    handleSyncLive();
  }, [coords.lat, coords.lon]);

  const baselineStyles = getRiskBadgeStyles(
    baselineRiskScore >= 75 ? 'EXTREME' : baselineRiskScore >= 50 ? 'HIGH' : baselineRiskScore >= 25 ? 'MODERATE' : 'LOW'
  );
  const projectedStyles = getRiskBadgeStyles(simulationData?.projected_level || 'LOW');

  // Count active policies for user visibility
  const activeCount = [coolingCenter, workRestriction, hydrationStations].filter(Boolean).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-sans">
            Civic Heat Mitigation & Intervention Simulator
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Simulate public health interventions, quantify projected risk reduction, and inspect automated heat action directives
          </p>
        </div>

        {/* Active City Location Badge & Sync Button */}
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl">
          <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="text-slate-400 block">Active City:</span>
            <span className="font-semibold text-slate-200">{locationName}</span>
          </div>
          <button
            onClick={handleSyncLive}
            disabled={isSyncing}
            title="Sync scenario with current live city temperature and ML risk"
            className="ml-2 px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
          >
            <Zap className={`w-3 h-3 text-cyan-400 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Live'}</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={handleSyncLive}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-bold text-red-200 flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Decision Support & Methodological Notice */}
      <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs flex items-start space-x-3">
        <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-cyan-100">Scenario estimate — not a guaranteed outcome: </strong>
          These values represent modeled policy impact for decision support, not measured real-world clinical outcomes. Quantifies simulated policy impact and modeled risk reduction for municipal heat action planning.
        </p>
      </div>

      {/* Simulator Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Scenario Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Baseline Condition Sliders */}
          <div className="p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-md space-y-5">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2 border-b border-slate-700/60 pb-3">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <span>1. Baseline Scenario Parameters</span>
            </h3>

            {/* Current Civic Risk */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Current Civic Risk:</span>
                <span className={`font-mono text-sm font-bold ${baselineStyles.text}`}>
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
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0 (Low)</span>
                <span>50 (High)</span>
                <span>100 (Extreme)</span>
              </div>
            </div>

            {/* Ambient Temperature */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Ambient Air Temperature:</span>
                <span className="text-orange-400 font-mono text-sm font-bold">{temperature.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="10"
                max="55"
                step="0.5"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>10°C (Cold)</span>
                <span>35°C (Warm)</span>
                <span>55°C (Extreme)</span>
              </div>
            </div>

            {/* Relative Humidity */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Relative Humidity:</span>
                <span className="text-teal-400 font-mono text-sm font-bold">{humidity.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                value={humidity}
                onChange={(e) => setHumidity(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>5% (Dry)</span>
                <span>50% (Comfort)</span>
                <span>100% (Saturated)</span>
              </div>
            </div>

            {/* Hour of the Day */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Time of Day (Hour):</span>
                <span className="text-purple-400 font-mono text-sm font-bold">{hour}:00 hrs</span>
              </div>
              <input
                type="range"
                min="0"
                max="23"
                step="1"
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>00:00 (Midnight)</span>
                <span>12:00 (Noon)</span>
                <span>23:00 (Night)</span>
              </div>
            </div>
          </div>

          {/* Intervention Toggles */}
          <div className="p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <span>2. Public Health Interventions</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                {activeCount} of 3 Selected
              </span>
            </div>

            {/* Cooling Centers */}
            <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
              coolingCenter ? 'bg-cyan-950/40 border-cyan-500/50' : 'bg-slate-900/60 border-slate-700/80 hover:bg-slate-700/40'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${coolingCenter ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-100">Activate Community Cooling Centers</p>
                  <p className="text-[10px] text-slate-400">Modeled reduction: ~10 pts</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={coolingCenter}
                onChange={(e) => setCoolingCenter(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </label>

            {/* Outdoor Work Restriction */}
            <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
              workRestriction ? 'bg-red-950/40 border-red-500/50' : 'bg-slate-900/60 border-slate-700/80 hover:bg-slate-700/40'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${workRestriction ? 'bg-red-500/30 text-red-300' : 'bg-slate-800 text-slate-400'}`}>
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-100">Outdoor Heavy Labor Suspension</p>
                  <p className="text-[10px] text-slate-400">Modeled reduction: ~15 pts</p>
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
            <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
              hydrationStations ? 'bg-teal-950/40 border-teal-500/50' : 'bg-slate-900/60 border-slate-700/80 hover:bg-slate-700/40'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${hydrationStations ? 'bg-teal-500/30 text-teal-300' : 'bg-slate-800 text-slate-400'}`}>
                  <GlassWater className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-100">Civic ORS & Hydration Hubs</p>
                  <p className="text-[10px] text-slate-400">Modeled reduction: ~8 pts</p>
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
            <button
              onClick={() => executeSimulation()}
              disabled={isLoading}
              className="mt-5 w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 active:scale-98 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Sparkles className="w-4 h-4 text-white" />
              )}
              <span>{isLoading ? 'Simulating Policy Impact...' : 'Apply & Run Policy Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Simulation Results & Impact Quantification */}
        <div className="lg:col-span-7 space-y-6">
          {/* Comparison Cards: Before vs After */}
          <div className="p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-md">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
              <span>Simulated Intervention Impact (Scenario Estimate)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Baseline Card */}
              <div className={`p-4 rounded-xl bg-slate-900/80 border ${baselineStyles.border} text-center`}>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Current Civic Risk
                </span>
                <span className={`text-3xl font-extrabold mt-1 block font-sans ${baselineStyles.text}`}>
                  {simulationData?.current_risk.toFixed(1) ?? baselineRiskScore.toFixed(1)}
                </span>
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${baselineStyles.badge}`}>
                  {baselineRiskScore >= 75 ? 'EXTREME' : baselineRiskScore >= 50 ? 'HIGH' : baselineRiskScore >= 25 ? 'MODERATE' : 'LOW'}
                </span>
              </div>

              {/* Reduction Arrow Indicator */}
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                  Modeled Reduction
                </span>
                <div className="flex items-center space-x-1 my-1 text-emerald-400 font-extrabold text-2xl">
                  <span>-</span>
                  <span>{simulationData?.risk_reduction.toFixed(1) ?? '0.0'}</span>
                  <span className="text-sm font-semibold">pts</span>
                </div>
                <span className="text-[10px] text-slate-300">
                  {activeCount === 0 ? 'No Policies Active' : `${activeCount} Policies Active`}
                </span>
              </div>

              {/* Projected Card */}
              <div className={`p-4 rounded-xl bg-slate-900/80 border ${projectedStyles.border} text-center`}>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Projected Civic Risk
                </span>
                <span className={`text-3xl font-extrabold mt-1 block font-sans ${projectedStyles.text}`}>
                  {simulationData?.projected_risk.toFixed(1) ?? baselineRiskScore.toFixed(1)}
                </span>
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${projectedStyles.badge}`}>
                  {simulationData?.projected_level || 'LOW'}
                </span>
              </div>
            </div>
          </div>

          {/* Automated Civic Recommendations */}
          <div className="p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <span>Recommended Heat Actions</span>
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                interventionData?.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-300' : 'bg-cyan-500/20 text-cyan-300'
              }`}>
                {interventionData?.priority || 'ACTIVE'} PRIORITY
              </span>
            </div>

            <div className="space-y-2.5">
              {interventionData?.recommendations?.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/70 flex items-start space-x-3 text-xs text-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                  <span className="leading-relaxed font-medium">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intervention;
