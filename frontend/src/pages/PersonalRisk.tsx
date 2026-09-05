import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Thermometer,
  Droplets,
  Activity,
  Clock,
  ShieldAlert,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Lock,
  UserCheck,
  CheckCircle2,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Flame,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { api } from '../services/api';
import { PersonalRiskRequest, PersonalRiskResult } from '../types';
import { getRiskColor, getRiskBgColor } from '../utils/risk';

const AVAILABLE_CONDITIONS = [
  { id: 'heart_disease', label: 'Cardiovascular / Heart Disease', icon: '❤️' },
  { id: 'asthma', label: 'Asthma / Respiratory / COPD', icon: '🫁' },
  { id: 'diabetes', label: 'Diabetes', icon: '🩸' },
  { id: 'kidney_disease', label: 'Chronic Kidney Disease', icon: '🧪' },
  { id: 'hypertension', label: 'Hypertension (High BP)', icon: '🩺' },
  { id: 'neurological', label: 'Neurological Condition', icon: '🧠' },
];

export const PersonalRisk: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { coords, locationName } = useLocation();

  // Biometric & Exposure State
  const [age, setAge] = useState<number>(34);
  const [smoking, setSmoking] = useState<boolean>(false);
  const [isPregnant, setIsPregnant] = useState<boolean>(false);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [physicalActivity, setPhysicalActivity] = useState<string>('moderate');
  const [hydrationStatus, setHydrationStatus] = useState<string>('moderate');
  const [outdoorExposureHours, setOutdoorExposureHours] = useState<number>(2.0);
  const [clothingType, setClothingType] = useState<string>('standard');

  // Weather Environmental Coupling
  const [temperature, setTemperature] = useState<number>(34.0);
  const [humidity, setHumidity] = useState<number>(65.0);
  const [wbgt, setWbgt] = useState<number>(28.5);
  const [isSyncingWeather, setIsSyncingWeather] = useState<boolean>(false);

  // Calculation Results
  const [result, setResult] = useState<PersonalRiskResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically sync weather from active location on mount
  useEffect(() => {
    syncWeatherFromLocation();
  }, [coords.lat, coords.lon]);

  const syncWeatherFromLocation = async () => {
    setIsSyncingWeather(true);
    try {
      const thermalRes = await api.getThermal(coords.lat, coords.lon);
      if (thermalRes?.weather) {
        setTemperature(thermalRes.weather.temperature);
        setHumidity(thermalRes.weather.humidity);
      }
      if (thermalRes?.thermal?.indices?.wbgt_c) {
        setWbgt(thermalRes.thermal.indices.wbgt_c);
      }
    } catch (err) {
      console.warn('Could not auto-sync weather for personal risk:', err);
    } finally {
      setIsSyncingWeather(false);
    }
  };

  const toggleCondition = (conditionId: string) => {
    setSelectedConditions((prev) =>
      prev.includes(conditionId)
        ? prev.filter((c) => c !== conditionId)
        : [...prev, conditionId]
    );
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);

    const payload: PersonalRiskRequest = {
      age,
      smoking,
      health_conditions: selectedConditions,
      physical_activity: physicalActivity,
      is_pregnant: isPregnant,
      hydration_status: hydrationStatus,
      outdoor_exposure_hours: outdoorExposureHours,
      clothing_type: clothingType,
      temperature_c: temperature,
      humidity_pct: humidity,
      wbgt_c: wbgt,
    };

    try {
      const res = await api.calculatePersonalRisk(payload);
      setResult(res);
    } catch (err: any) {
      console.error('Calculation error:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to compute personal risk score.');
    } finally {
      setIsCalculating(false);
    }
  };

  // Run initial calculation when ready
  useEffect(() => {
    handleCalculate();
  }, [wbgt]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Status */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-gradient-to-br from-orange-500/20 to-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <HeartPulse className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Personal Thermal Stress Intelligence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Individual Heat Health Risk Calculator
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Calculates your personal physiological vulnerability by fusing biometrics, medical profile, and physical activity with real-time biometeorological conditions.
            </p>
          </div>

          {/* User Auth Status Badge */}
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <UserCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-white flex items-center space-x-1">
                  <span>Logged in as {user.name}</span>
                </div>
                <div className="text-[11px] text-emerald-300/80">
                  Individual risk profile enabled ({user.role})
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/30">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-200">Guest Interactive Demo</span>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-900 bg-cyan-400 hover:bg-cyan-300 transition-colors"
                >
                  Sign In to Save
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Form Inputs (Left 7 Cols) + Calculated Intelligence (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Biometrics */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-base font-bold text-white flex items-center space-x-2 pb-3 border-b border-slate-800">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>1. Biometrics & Personal Factors</span>
            </h3>

            <div className="space-y-4 mt-4">
              {/* Age Slider */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-slate-300 font-semibold">Age (Years):</span>
                  <span className="font-mono text-sm font-black text-orange-400 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                    {age} yrs
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={95}
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Children (High Vulnerability)</span>
                  <span>Adults (18-49)</span>
                  <span>Seniors 65+ (High Vulnerability)</span>
                </div>
              </div>

              {/* Toggles: Pregnancy & Smoking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPregnant(!isPregnant)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isPregnant
                      ? 'bg-pink-500/15 border-pink-500/40 text-pink-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">
                    <span className="mr-1.5">🤰</span>
                    <span>Currently Pregnant</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                      isPregnant ? 'border-pink-400 bg-pink-500 text-white' : 'border-slate-600'
                    }`}
                  >
                    {isPregnant ? '✓' : ''}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSmoking(!smoking)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    smoking
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">
                    <span className="mr-1.5">🚬</span>
                    <span>Smoking / Tobacco Use</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                      smoking ? 'border-amber-400 bg-amber-500 text-white' : 'border-slate-600'
                    }`}
                  >
                    {smoking ? '✓' : ''}
                  </div>
                </button>
              </div>

              {/* Pre-existing Health Conditions */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Pre-existing Chronic Conditions (Select all that apply):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_CONDITIONS.map((cond) => {
                    const isSelected = selectedConditions.includes(cond.id);
                    return (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => toggleCondition(cond.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 shadow-sm'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center space-x-1.5">
                          <span>{cond.icon}</span>
                          <span>{cond.label}</span>
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Occupational & Lifestyle Factors */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-base font-bold text-white flex items-center space-x-2 pb-3 border-b border-slate-800">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>2. Exertion, Exposure & Attire</span>
            </h3>

            <div className="space-y-4 mt-4">
              {/* Physical Activity */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Physical Activity / Labor Intensity:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'sedentary', label: 'Sedentary', desc: 'Resting/Office' },
                    { id: 'light', label: 'Light', desc: 'Walking/Inspecting' },
                    { id: 'moderate', label: 'Moderate', desc: 'Active Labor' },
                    { id: 'heavy', label: 'Heavy', desc: 'Construction/Agri' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setPhysicalActivity(act.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        physicalActivity === act.id
                          ? 'bg-orange-500/20 border-orange-500/50 text-orange-200 font-bold'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs">{act.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{act.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hydration Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Current Hydration Status:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'well_hydrated', label: 'Well Hydrated', desc: 'Fluid balance optimal', icon: '💧' },
                    { id: 'moderate', label: 'Moderate', desc: 'Regular fluid intake', icon: '🥤' },
                    { id: 'dehydrated', label: 'Dehydrated / Fasting', desc: 'High thermal danger', icon: '⚠️' },
                  ].map((hyd) => (
                    <button
                      key={hyd.id}
                      type="button"
                      onClick={() => setHydrationStatus(hyd.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        hydrationStatus === hyd.id
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-bold'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs">
                        <span className="mr-1">{hyd.icon}</span>
                        <span>{hyd.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">{hyd.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Outdoor Exposure & Clothing Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-300 font-semibold">Outdoor Exposure Hours:</span>
                    <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-slate-800">
                      {outdoorExposureHours} hrs
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={outdoorExposureHours}
                    onChange={(e) => setOutdoorExposureHours(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Attire / PPE Level:
                  </label>
                  <select
                    value={clothingType}
                    onChange={(e) => setClothingType(e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="light">Light Breathable Cotton (~0.3 clo)</option>
                    <option value="standard">Standard Workwear / Uniform (~0.7 clo)</option>
                    <option value="heavy_protective">Heavy PPE / Protective Gear (~1.8 clo)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Weather Coupling */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-xl backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>3. Environmental Heat Stress Synchronization</span>
              </h3>
              <button
                type="button"
                onClick={syncWeatherFromLocation}
                disabled={isSyncingWeather}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-300 transition-all border border-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWeather ? 'animate-spin' : ''}`} />
                <span>Sync from {locationName.split(',')[0]}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-[11px] text-slate-400">Air Temperature</div>
                <div className="text-lg font-black text-amber-400 mt-0.5">{temperature.toFixed(1)}°C</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-[11px] text-slate-400">Relative Humidity</div>
                <div className="text-lg font-black text-cyan-300 mt-0.5">{Math.round(humidity)}%</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-[11px] text-slate-400">Estimated WBGT (ISO 7243)</div>
                <div className="text-lg font-black text-orange-400 mt-0.5">{wbgt.toFixed(1)}°C</div>
              </div>
            </div>

            {/* Calculate Button */}
            <button
              type="button"
              onClick={handleCalculate}
              disabled={isCalculating}
              className="mt-5 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
              <span>{isCalculating ? 'Evaluating Physiological Thermal Strain...' : 'Calculate My Personal Risk'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Calculated Individual Intelligence */}
        <div className="lg:col-span-5 space-y-6">
          {result && (
            <>
              {/* Primary Personal Risk Gauge Card */}
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Personalized Heat Health Index
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-black uppercase text-white shadow-sm"
                    style={{ backgroundColor: getRiskColor(result.risk_level) }}
                  >
                    {result.risk_level}
                  </span>
                </div>

                {/* Score Circle Display */}
                <div className="my-6 flex flex-col items-center justify-center text-center">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    {/* Background SVG Gauge Ring */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        stroke="#1e293b"
                        strokeWidth="12"
                        fill="transparent"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        stroke={getRiskColor(result.risk_level)}
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray="377"
                        strokeDashoffset={377 - (377 * Math.min(100, result.risk_score)) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white font-mono">
                        {result.risk_score.toFixed(0)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">out of 100</span>
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-white mt-3">{result.heat_strain_level}</h4>
                  <p className="text-xs text-slate-300 mt-1 px-4 leading-relaxed">{result.alert}</p>
                </div>

                {/* Directives Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-800">
                  <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                    <div className="flex items-center space-x-1.5 text-xs text-cyan-300 font-bold">
                      <Droplets className="w-4 h-4 text-cyan-400" />
                      <span>Water Intake Quota</span>
                    </div>
                    <div className="text-xl font-black text-white mt-1">
                      {result.recommended_water_intake_ml_hr}{' '}
                      <span className="text-xs font-normal text-slate-400">mL/hr</span>
                    </div>
                    <div className="text-[10px] text-cyan-300/80 mt-0.5">Sip every 15-20 minutes</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-orange-950/40 border border-orange-500/30">
                    <div className="flex items-center space-x-1.5 text-xs text-orange-300 font-bold">
                      <Clock className="w-4 h-4 text-orange-400" />
                      <span>Work-Rest Cycle</span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1.5 leading-snug">
                      {result.work_rest_cycle.split(';')[0]}
                    </div>
                    <div className="text-[10px] text-orange-300/80 mt-0.5">OSHA / ACGIH Aligned</div>
                  </div>
                </div>
              </div>

              {/* Contributing Risk Factors Breakdown */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl backdrop-blur-md">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span>Risk Contribution Breakdown</span>
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                </h4>

                <div className="space-y-2.5">
                  {result.risk_factors_breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between text-xs"
                    >
                      <div className="pr-2">
                        <div className="font-bold text-slate-200">{item.factor}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.description}</div>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                          item.contribution > 0
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {item.contribution > 0 ? `+${item.contribution}` : `${item.contribution}`} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Medical & Safety Advisories */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl backdrop-blur-md">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Personalized Actionable Advisories</span>
                </h4>

                <ul className="space-y-2 text-xs text-slate-300">
                  {result.safety_recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-cyan-400 font-bold mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalRisk;
