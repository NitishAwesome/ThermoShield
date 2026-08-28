import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { InterventionResponse, SimulationResponse } from '../types';
import { LoadingState } from '../components/LoadingState';
import {
  Sliders,
  Sparkles,
  TrendingDown,
  ShieldAlert,
  Building2,
  Ban,
  GlassWater,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { getRiskBadgeStyles } from '../utils/risk';

export const Intervention: React.FC = () => {
  // Simulator inputs
  const [baselineRiskScore, setBaselineRiskScore] = useState<number>(65.0);
  const [temperature, setTemperature] = useState<number>(38.0);
  const [humidity, setHumidity] = useState<number>(60.0);
  const [hour, setHour] = useState<number>(14);
  const [vulnerablePopRatio, setVulnerablePopRatio] = useState<number>(0.35);

  // Intervention switches
  const [coolingCenter, setCoolingCenter] = useState<boolean>(true);
  const [workRestriction, setWorkRestriction] = useState<boolean>(true);
  const [hydrationStations, setHydrationStations] = useState<boolean>(true);

  const [interventionData, setInterventionData] = useState<InterventionResponse | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch recommendations and simulation results
  const runSimulation = async () => {
    setIsLoading(true);
    try {
      const [interventionsRes, simulationRes] = await Promise.all([
        api.getInterventions({
          risk_score: baselineRiskScore,
          temperature,
          humidity,
          hour,
          vulnerable_population: vulnerablePopRatio,
        }),
        api.simulateIntervention({
          risk_score: baselineRiskScore,
          cooling_center: coolingCenter,
          outdoor_work_restriction: workRestriction,
          hydration_stations: hydrationStations,
        }),
      ]);
      setInterventionData(interventionsRes);
      setSimulationData(simulationRes);
    } catch (err) {
      console.error('Simulation call error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run once on mount for initial baseline
  useEffect(() => {
    runSimulation();
  }, []);

  const baselineStyles = getRiskBadgeStyles(
    baselineRiskScore >= 75 ? 'EXTREME' : baselineRiskScore >= 50 ? 'HIGH' : baselineRiskScore >= 25 ? 'MODERATE' : 'LOW'
  );
  const projectedStyles = getRiskBadgeStyles(simulationData?.projected_level || 'LOW');

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-sans">
          Civic Heat Mitigation & Intervention Simulator
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Simulate public health interventions, quantify projected risk reduction, and inspect automated heat action directives
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

            {/* Baseline Risk Score */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Baseline Risk Score:</span>
                <span className="text-cyan-400 font-mono text-sm">{baselineRiskScore.toFixed(0)} / 100</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={baselineRiskScore}
                onChange={(e) => setBaselineRiskScore(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>10 (Low)</span>
                <span>50 (High)</span>
                <span>100 (Extreme)</span>
              </div>
            </div>

            {/* Ambient Temperature */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Ambient Air Temperature:</span>
                <span className="text-orange-400 font-mono text-sm">{temperature.toFixed(0)}°C</span>
              </div>
              <input
                type="range"
                min="25"
                max="50"
                step="1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            {/* Relative Humidity */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Relative Humidity:</span>
                <span className="text-teal-400 font-mono text-sm">{humidity.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                step="1"
                value={humidity}
                onChange={(e) => setHumidity(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            {/* Hour of the Day */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>Time of Day (Hour):</span>
                <span className="text-purple-400 font-mono text-sm">{hour}:00 hrs</span>
              </div>
              <input
                type="range"
                min="6"
                max="20"
                step="1"
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>

          {/* Intervention Toggles */}
          <div className="p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-md space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2 border-b border-slate-700/60 pb-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>2. Deployable Heat Interventions</span>
            </h3>

            {/* Cooling Centers */}
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700/80 cursor-pointer hover:bg-slate-700/40 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-100">Activate Community Cooling Centers</p>
                  <p className="text-[10px] text-slate-400">Reduces strain score by ~10 pts</p>
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
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700/80 cursor-pointer hover:bg-slate-700/40 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-100">Outdoor Heavy Labor Suspension</p>
                  <p className="text-[10px] text-slate-400">Reduces strain score by ~15 pts</p>
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
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700/80 cursor-pointer hover:bg-slate-700/40 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
                  <GlassWater className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-100">Civic ORS & Hydration Hubs</p>
                  <p className="text-[10px] text-slate-400">Reduces strain score by ~8 pts</p>
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
              onClick={runSimulation}
              disabled={isLoading}
              className="mt-5 w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 active:scale-98 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Sparkles className="w-4 h-4 text-white" />
              )}
              <span>{isLoading ? 'Simulating Impact...' : 'Apply & Run Policy Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Simulation Results & Impact Quantification */}
        <div className="lg:col-span-7 space-y-6">
          {/* Comparison Cards: Before vs After */}
          <div className="p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-md">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
              <span>Simulated Intervention Impact Quantification</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Baseline Card */}
              <div className={`p-4 rounded-xl bg-slate-900/80 border ${baselineStyles.border} text-center`}>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Baseline Risk
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
                  Total Impact
                </span>
                <div className="flex items-center space-x-1 my-1 text-emerald-400 font-extrabold text-2xl">
                  <span>-</span>
                  <span>{simulationData?.risk_reduction.toFixed(1) ?? '0.0'}</span>
                  <span className="text-sm font-semibold">pts</span>
                </div>
                <span className="text-[10px] text-slate-300">Projected Risk Reduction</span>
              </div>

              {/* Projected Card */}
              <div className={`p-4 rounded-xl bg-slate-900/80 border ${projectedStyles.border} text-center`}>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Projected Risk
                </span>
                <span className={`text-3xl font-extrabold mt-1 block font-sans ${projectedStyles.text}`}>
                  {simulationData?.projected_risk.toFixed(1) ?? '0.0'}
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
                <span>Triggered Actionable Recommendations (/intervention)</span>
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                interventionData?.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-300' : 'bg-cyan-500/20 text-cyan-300'
              }`}>
                {interventionData?.priority} PRIORITY
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
