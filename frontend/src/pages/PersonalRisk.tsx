import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Droplets,
  Activity,
  Clock,
  RefreshCw,
  Lock,
  UserCheck,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Info,
  ShieldAlert,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { api } from '../services/api';
import { PersonalRiskRequest, PersonalRiskResult } from '../types';
import { getRiskColor } from '../utils/risk';
import { Card, CardHeader, CardContent, Badge, Button, EmptyState } from '../components/ui';

const AVAILABLE_CONDITIONS = [
  { id: 'heart_disease', label: 'Cardiovascular / Heart Condition', icon: '❤️' },
  { id: 'asthma', label: 'Asthma / Respiratory Sensitivity', icon: '🫁' },
  { id: 'diabetes', label: 'Diabetes', icon: '🩸' },
  { id: 'kidney_disease', label: 'Kidney Vulnerability', icon: '🧪' },
  { id: 'hypertension', label: 'Hypertension (High BP)', icon: '🩺' },
  { id: 'neurological', label: 'Neurological / Mobility Concern', icon: '🧠' },
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

  // Run initial calculation when weather ready
  useEffect(() => {
    handleCalculate();
  }, [wbgt]);

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Banner: What does today's heat mean for you? */}
      <Card variant="elevated" className="p-6 sm:p-7 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <HeartPulse className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Personalized Advisory
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black ts-text-primary mt-1 font-sans">
              Personal Heat Exposure & Health Risk
            </h1>
            <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-2xl leading-relaxed">
              Understand how today's weather in <span className="ts-text-primary font-semibold">{locationName.split(',')[0]}</span> impacts your body based on your daily routine, physical activity, and personal vulnerability factors.
            </p>
          </div>

          {/* User Auth Status Badge */}
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex-shrink-0">
              <UserCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-bold ts-text-primary">
                  Profile: {user.name}
                </div>
                <div className="text-[11px] text-emerald-300/80">
                  Risk profile saved ({user.role})
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 p-2.5 rounded-xl ts-card-subtle border ts-border flex-shrink-0">
              <Lock className="w-4 h-4 text-orange-400" />
              <span className="text-xs ts-text-muted">Interactive Guest Mode</span>
              <Link
                to="/login"
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-900 bg-orange-400 hover:bg-orange-300 transition-colors ml-1"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </Card>

      {/* Main Grid: Form Inputs (Left) + Calculated Output (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Personal Inputs (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <Card>
            <CardHeader
              title="Personal Profile & Sensitivities"
              subtitle="Factors that alter your physiological thermoregulation."
            />
            <CardContent className="space-y-4">
              {/* Age Slider */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="ts-text-muted font-semibold">Age (Years):</span>
                  <span className="font-mono text-sm font-black text-orange-400 px-2.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                    {age} yrs
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={95}
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-[10px] ts-text-subtle mt-1">
                  <span>Children (&lt;12)</span>
                  <span>Adults (18–64)</span>
                  <span>Seniors (65+)</span>
                </div>
              </div>

              {/* Toggles: Pregnancy & Smoking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPregnant(!isPregnant)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isPregnant
                      ? 'bg-pink-500/15 border-pink-500/40 text-pink-700 dark:text-pink-300'
                      : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center space-x-2">
                    <span>🤰</span>
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
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center space-x-2">
                    <span>🚬</span>
                    <span>Smoking / Tobacco</span>
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

              {/* Pre-existing Health Sensitivities */}
              <div className="pt-1">
                <label className="block text-xs font-semibold ts-text-muted mb-2">
                  Health Sensitivities:
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
                            ? 'bg-orange-500/15 border-orange-500/50 text-orange-700 dark:text-orange-300'
                            : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                        }`}
                      >
                        <span className="flex items-center space-x-2">
                          <span>{cond.icon}</span>
                          <span>{cond.label}</span>
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity, Hydration & Attire */}
          <Card>
            <CardHeader
              title="Daily Activity & Environment"
              subtitle="Physical effort, hydration level, and exposure window."
            />
            <CardContent className="space-y-4">
              {/* Physical Activity */}
              <div>
                <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                  Physical Activity Level:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'sedentary', label: 'Sedentary', desc: 'Resting / Desk' },
                    { id: 'light', label: 'Light', desc: 'Walking / Chores' },
                    { id: 'moderate', label: 'Moderate', desc: 'Active Labor' },
                    { id: 'heavy', label: 'Heavy', desc: 'Heavy Outdoor' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setPhysicalActivity(act.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        physicalActivity === act.id
                          ? 'bg-orange-500/20 border-orange-500/50 text-orange-700 dark:text-orange-300 font-bold'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                      }`}
                    >
                      <div className="text-xs">{act.label}</div>
                      <div className="text-[10px] ts-text-subtle mt-0.5">{act.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hydration Status */}
              <div>
                <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                  Hydration Status:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'well_hydrated', label: 'Well Hydrated', icon: '💧' },
                    { id: 'moderate', label: 'Moderate', icon: '🥤' },
                    { id: 'dehydrated', label: 'Dehydrated', icon: '⚠️' },
                  ].map((hyd) => (
                    <button
                      key={hyd.id}
                      type="button"
                      onClick={() => setHydrationStatus(hyd.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        hydrationStatus === hyd.id
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-700 dark:text-sky-300 font-bold'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                      }`}
                    >
                      <div className="text-xs flex items-center justify-center space-x-1">
                        <span>{hyd.icon}</span>
                        <span>{hyd.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Outdoor Exposure & Attire */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="ts-text-muted font-semibold">Outdoor Exposure:</span>
                    <span className="font-mono text-xs font-bold ts-text-primary px-2 py-0.5 rounded ts-card-subtle border ts-border">
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
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    Attire / Clothing:
                  </label>
                  <select
                    value={clothingType}
                    onChange={(e) => setClothingType(e.target.value)}
                    className="w-full p-2 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                  >
                    <option value="light">Light Cotton (~0.3 clo)</option>
                    <option value="standard">Standard Uniform (~0.7 clo)</option>
                    <option value="heavy_protective">Heavy PPE / Coverall (~1.8 clo)</option>
                  </select>
                </div>
              </div>

              {/* Ambient Meteorological Context & Calculate Button */}
              <div className="pt-2 border-t ts-border">
                <div className="flex items-center justify-between text-xs ts-text-muted mb-3">
                  <span>Current Weather Sync:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono ts-text-primary font-semibold">{temperature.toFixed(1)}°C · {Math.round(humidity)}% RH</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={syncWeatherFromLocation}
                      disabled={isSyncingWeather}
                      className="text-xs p-1"
                      title="Sync current weather"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWeather ? 'animate-spin text-orange-400' : ''}`} />
                    </Button>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCalculate}
                  isLoading={isCalculating}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  className="w-full"
                >
                  Calculate Personal Heat Risk
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Calculated Risk & Recommendations (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {result ? (
            <>
              {/* Primary Personal Risk Score Card */}
              <Card variant="elevated" className="p-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider ts-text-muted">
                    Your Heat Exposure Result
                  </span>
                  <Badge riskLevel={result.risk_level} size="sm" showDot>
                    {result.risk_level}
                  </Badge>
                </div>

                {/* Score Circular Gauge */}
                <div className="my-5 flex flex-col items-center justify-center text-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="52"
                        stroke="var(--border-app)"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="52"
                        stroke={getRiskColor(result.risk_level)}
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray="327"
                        strokeDashoffset={327 - (327 * Math.min(100, result.risk_score)) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black ts-text-primary font-mono">
                        {result.risk_score.toFixed(0)}
                      </span>
                      <span className="text-[10px] ts-text-subtle font-semibold uppercase">out of 100</span>
                    </div>
                  </div>

                  <h4 className="text-base font-bold ts-text-primary mt-2">{result.heat_strain_level}</h4>
                  <p className="text-xs ts-text-muted mt-1 px-4 leading-relaxed">{result.alert}</p>
                </div>

                {/* Directives Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t ts-border">
                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <div className="flex items-center space-x-1.5 text-xs text-sky-400 font-bold">
                      <Droplets className="w-4 h-4" />
                      <span>Water Intake Target</span>
                    </div>
                    <div className="text-xl font-black ts-text-primary mt-1 font-mono">
                      {result.recommended_water_intake_ml_hr}{' '}
                      <span className="text-xs font-normal ts-text-muted">mL/hr</span>
                    </div>
                    <div className="text-[10.5px] ts-text-subtle mt-0.5">Drink regular small sips</div>
                  </div>

                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <div className="flex items-center space-x-1.5 text-xs text-orange-400 font-bold">
                      <Clock className="w-4 h-4" />
                      <span>Work-Rest Cycle</span>
                    </div>
                    <div className="text-xs font-bold ts-text-primary mt-1.5 leading-snug">
                      {result.work_rest_cycle.split(';')[0]}
                    </div>
                    <div className="text-[10.5px] ts-text-subtle mt-0.5">OSHA / ACGIH Recommended</div>
                  </div>
                </div>
              </Card>

              {/* Main Contributors / Exposure Factor Breakdown */}
              <Card>
                <CardHeader
                  title="Main Contributing Factors"
                  subtitle="How personal biometrics and environment adjust your risk score."
                />
                <CardContent className="space-y-2">
                  {result.risk_factors_breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl ts-card-subtle border ts-border flex items-center justify-between text-xs"
                    >
                      <div className="pr-3">
                        <div className="font-bold ts-text-primary">{item.factor}</div>
                        <div className="text-[11px] ts-text-muted mt-0.5">{item.description}</div>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg flex-shrink-0 ${
                          item.contribution > 0
                            ? 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {item.contribution > 0 ? `+${item.contribution}` : `${item.contribution}`} pts
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recommended Precautions */}
              <Card>
                <CardHeader
                  title="Recommended Precautions"
                  subtitle="Custom safety guidelines for your exposure profile."
                  badge={
                    <Badge variant="low" size="sm">
                      Action Guide
                    </Badge>
                  }
                />
                <CardContent>
                  <ul className="space-y-2 text-xs ts-text-muted">
                    {result.safety_recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start space-x-2.5 p-2.5 rounded-xl ts-card-subtle border ts-border">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed ts-text-primary">{rec}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10.5px] ts-text-subtle mt-3 pt-2.5 border-t ts-border leading-snug">
                    Informational decision-support guide for occupational and citizen heat stress prevention.
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              icon={<HeartPulse className="w-8 h-8 text-orange-400" />}
              title="Awaiting Calculation"
              description="Adjust your personal factors and click calculate to view your customized heat health profile."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalRisk;
