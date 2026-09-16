import React, { useState, useEffect, useRef } from 'react';
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
  RotateCcw,
  Save,
  AlertCircle,
  ExternalLink,
  Calendar,
  ArrowRight,
  Sliders,
  Sun,
  ShieldAlert,
  Info,
  User,
  Shield,
  Baby,
  Cigarette,
  Brain,
  FlaskConical,
  Stethoscope,
  Zap,
  PersonStanding,
  Pill,
  Flame,
  MessageSquare,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useProfile } from '../context/ProfileContext';
import { api } from '../services/api';
import { PersonalRiskRequest, PersonalRiskResult } from '../types';
import { Card, CardHeader, CardContent, Badge, Button, EmptyState } from '../components/ui';
import { LoadingState } from '../components/LoadingState';
import { useTranslation } from '../context/LanguageContext';
import { DataRealityBadge, CalculationInfoTooltip } from '../components/provenance';

// Focused Personal Risk Subcomponents
import { PersonalRiskResultCard } from '../components/personal-risk/PersonalRiskResultCard';
import { PersonalRiskGuidance } from '../components/personal-risk/PersonalRiskGuidance';
import { PersonalRiskExplanation } from '../components/personal-risk/PersonalRiskExplanation';
import { PersonalSafetyChecklist } from '../components/personal-risk/PersonalSafetyChecklist';
import { PersonalRiskScience } from '../components/personal-risk/PersonalRiskScience';

// Each condition is passed to the backend health_conditions[] array.
// The 6 original conditions have explicit scoring weights in the engine.
// The 3 new additions pass through as named strings; the engine applies
// a validated additive burden for prior_heat_illness and uses the string
// for guidance context for the others.
const CONDITIONS_META: Array<{
  id: string;
  label: string;
  sublabel: string;
  Icon: React.FC<{ className?: string }>;
}> = [
  // ── Original 6 (engine-scored) ──────────────────────────────
  { id: 'heart_disease',   label: 'Heart Disease',           sublabel: 'Cardiovascular conditions',     Icon: HeartPulse },
  { id: 'hypertension',    label: 'Hypertension',            sublabel: 'High blood pressure',            Icon: Activity },
  { id: 'asthma',          label: 'Asthma / Respiratory',    sublabel: 'Breathing difficulties',         Icon: Stethoscope },
  { id: 'diabetes',        label: 'Diabetes',                sublabel: 'Blood sugar regulation',         Icon: Zap },
  { id: 'kidney_disease',  label: 'Kidney Disease',          sublabel: 'Renal / urinary conditions',     Icon: FlaskConical },
  { id: 'neurological',    label: 'Neurological / Mobility', sublabel: 'Movement-limiting conditions',   Icon: Brain },
  // ── New additions (heat-sensitivity evidence-backed) ────────
  { id: 'prior_heat_illness', label: 'Prior Heat Illness',      sublabel: 'Past heat stroke / exhaustion',  Icon: Flame },
  { id: 'mobility_limitation', label: 'Mobility / Disability',  sublabel: 'Limited ability to move to shade', Icon: PersonStanding },
  { id: 'heat_sensitive_medication', label: 'Heat-Sensitive Medication', sublabel: 'e.g. diuretics, beta-blockers', Icon: Pill },
];

export const PersonalRisk: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, loginWithGoogle } = useAuth();
  const [isDemoLoggingIn, setIsDemoLoggingIn] = useState<boolean>(false);
  const { coords, locationName } = useLocation();
  const { profile, updateProfile, updateHealthProfile, updateExposureProfile, completionPercentage } = useProfile();

  // Result Card Ref for automatic scrolling and focusing after recalculation (Prompt 15)
  const resultCardRef = useRef<HTMLDivElement>(null);
  const [isResultHighlighted, setIsResultHighlighted] = useState<boolean>(false);

  // Mode: 'saved_profile' | 'scenario'
  const [mode, setMode] = useState<'saved_profile' | 'scenario'>('saved_profile');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Biometric & Exposure State
  const [age, setAge] = useState<number>(profile.age || 34);
  const [smoking, setSmoking] = useState<boolean>(profile.health?.smoking || false);
  const [isPregnant, setIsPregnant] = useState<boolean>(profile.health?.isPregnant || false);
  const [isAcclimatized, setIsAcclimatized] = useState<boolean>(
    profile.exposure?.isAcclimatized !== undefined ? profile.exposure.isAcclimatized : true
  );
  // Free-text informational note — not scored, shown to user as disclaimer
  const [otherConditionNote, setOtherConditionNote] = useState<string>('');

  // Conditions list
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    profile.health?.conditions || []
  );

  const [physicalActivity, setPhysicalActivity] = useState<string>(
    profile.exposure?.activityLevel || 'moderate'
  );
  const [hydrationStatus, setHydrationStatus] = useState<string>(
    profile.exposure?.hydrationHabit || 'moderate'
  );

  // Exposure hours mapping
  const getInitialExposureHours = (): number => {
    if (profile.exposure?.dailyOutdoorTime === 'mostly_outdoors') return 6.0;
    if (profile.exposure?.dailyOutdoorTime === 'mixed') return 3.0;
    return 1.0;
  };

  const [outdoorExposureHours, setOutdoorExposureHours] = useState<number>(getInitialExposureHours());
  const [clothingType, setClothingType] = useState<string>(profile.exposure?.clothingType || 'standard');

  // Meteorological state
  const [temperature, setTemperature] = useState<number>(34.0);
  const [apparentTemp, setApparentTemp] = useState<number>(36.5);
  const [humidity, setHumidity] = useState<number>(65.0);
  const [wbgt, setWbgt] = useState<number>(28.5);
  const [uvIndex, setUvIndex] = useState<number>(7.5);
  const [windSpeed, setWindSpeed] = useState<number>(2.8);
  const [isSyncingWeather, setIsSyncingWeather] = useState<boolean>(false);

  // Calculation Results
  const [result, setResult] = useState<PersonalRiskResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync inputs with profile whenever profile updates (when in saved_profile mode)
  useEffect(() => {
    if (mode === 'saved_profile') {
      applyProfileToState();
    }
  }, [profile, mode]);

  const applyProfileToState = () => {
    setAge(profile.age || 34);
    setSmoking(profile.health?.smoking || false);
    setIsPregnant(profile.health?.isPregnant || false);
    setIsAcclimatized(profile.exposure?.isAcclimatized !== undefined ? profile.exposure.isAcclimatized : true);
    setSelectedConditions(profile.health?.conditions || []);
    setPhysicalActivity(profile.exposure?.activityLevel || 'moderate');
    setHydrationStatus(profile.exposure?.hydrationHabit || 'moderate');
    setOutdoorExposureHours(getInitialExposureHours());
    setClothingType(profile.exposure?.clothingType || 'standard');
  };

  const handleResetToProfile = () => {
    setMode('saved_profile');
    applyProfileToState();
    setSaveSuccessMsg(null);
  };

  const handleSaveScenarioToProfile = () => {
    updateProfile({ age });
    updateHealthProfile({
      smoking,
      isPregnant,
      conditions: selectedConditions,
    });
    updateExposureProfile({
      isAcclimatized,
      activityLevel: physicalActivity as 'sedentary' | 'light' | 'moderate' | 'heavy',
      clothingType: clothingType as 'light' | 'standard' | 'heavy_protective',
      hydrationHabit: hydrationStatus as 'well_hydrated' | 'moderate' | 'dehydrated',
      dailyOutdoorTime:
        outdoorExposureHours > 4
          ? 'mostly_outdoors'
          : outdoorExposureHours > 1.5
          ? 'mixed'
          : 'mostly_indoors',
    });
    setMode('saved_profile');
    setSaveSuccessMsg('Scenario factors successfully saved to your My Profile!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Automatically sync weather from active location on mount or coordinate change
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
        if (thermalRes.weather.apparent_temperature !== undefined) {
          setApparentTemp(thermalRes.weather.apparent_temperature);
        }
        if (thermalRes.weather.uv_index !== undefined) {
          setUvIndex(thermalRes.weather.uv_index);
        }
        if (thermalRes.weather.wind_speed !== undefined) {
          setWindSpeed(thermalRes.weather.wind_speed);
        }
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
    if (mode === 'saved_profile') setMode('scenario');
    setSelectedConditions((prev) =>
      prev.includes(conditionId)
        ? prev.filter((c) => c !== conditionId)
        : [...prev, conditionId]
    );
  };

  const handleCalculate = async (isManualClick = false) => {
    if (!isAuthenticated) return;
    setIsCalculating(true);
    setError(null);

    const payload: PersonalRiskRequest = {
      age,
      smoking,
      is_acclimatized: isAcclimatized,
      health_conditions: selectedConditions,
      physical_activity: physicalActivity,
      is_pregnant: isPregnant,
      hydration_status: hydrationStatus,
      outdoor_exposure_hours: outdoorExposureHours,
      clothing_type: clothingType,
      temperature_c: temperature,
      humidity_pct: humidity,
      wbgt_c: wbgt,
      uv_index: uvIndex,
      apparent_temperature_c: apparentTemp,
    };

    try {
      const res = await api.calculatePersonalRisk(payload);
      setResult(res);

      if (isManualClick) {
        setIsResultHighlighted(true);
        setTimeout(() => {
          resultCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          resultCardRef.current?.focus();
        }, 80);
        setTimeout(() => {
          setIsResultHighlighted(false);
        }, 2800);
      }
    } catch (err: any) {
      console.error('Calculation error:', err);
      if (err?.response?.status === 401) {
        setError('Authentication required to calculate personal heat risk. Please log in.');
      } else {
        setError(err?.response?.data?.detail || err?.message || 'Failed to compute personal risk score.');
      }
    } finally {
      setIsCalculating(false);
    }
  };

  // Run initial calculation when ready (only if authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      handleCalculate();
    }
  }, [isAuthenticated, wbgt, age, selectedConditions.length, physicalActivity]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <LoadingState message={t('common.loading', 'Verifying authorization...')} />
      </div>
    );
  }

  // Authentication Gate
  if (!isAuthenticated) {
    return (
      <div className="py-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          <HeartPulse className="w-4 h-4" />
          <span>ThermoShield Personal Heat Risk • How Weather Affects Your Body</span>
        </div>

        <Card
          variant="elevated"
          className="relative overflow-hidden border border-orange-500/30 dark:border-orange-500/20 bg-gradient-to-b from-white via-slate-50 to-orange-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 shadow-2xl p-6 sm:p-10 text-center"
        >
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-xl animate-pulse" />
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30 text-white">
              <Lock className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Members-Only Heat Safety Guidance</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black ts-text-primary font-sans tracking-tight">
            Personal Heat Risk Detector Is Protected
          </h1>

          <p className="text-xs sm:text-sm ts-text-muted mt-3 max-w-2xl mx-auto leading-relaxed">
            The Personal Heat Risk & Hydration Detector calculates biometric vulnerability, cardiovascular thermal strain, and OSHA work-rest cycles based on individual medical conditions. To protect your private health data, this tool is strictly available to registered ThermoShield users.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-8 text-left max-w-3xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border ts-border shadow-xs flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold ts-text-primary">Cardiovascular & Chronic Strain</h4>
                <p className="text-[11px] ts-text-muted mt-0.5 leading-snug">
                  Factors hypertension, heart disease, diabetes, asthma, and age into real-time heat strain scoring.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border ts-border shadow-xs flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold ts-text-primary">Dynamic Hydration Protocol</h4>
                <p className="text-[11px] ts-text-muted mt-0.5 leading-snug">
                  Hourly fluid intake targets (ml/hr) calibrated to local WBGT heat stress.
                </p>
              </div>
            </div>
          </div>

          {/* Instant Sample Citizen Access for Evaluators */}
          <div className="mt-6 pt-4 border-t ts-border/60 max-w-md mx-auto">
            <p className="text-[11px] ts-text-muted mb-2 font-medium">
              Exploring as an evaluator? Try with a sample citizen profile:
            </p>
            <button
              type="button"
              disabled={isDemoLoggingIn}
              onClick={async () => {
                setIsDemoLoggingIn(true);
                try {
                  await loginWithGoogle('dev_google_siddharth.patel@gmail.com', 'user');
                } catch (e) {
                  console.error(e);
                } finally {
                  setIsDemoLoggingIn(false);
                }
              }}
              className="w-full py-2 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>{isDemoLoggingIn ? 'Loading Sample Profile...' : 'Load Sample Citizen Profile (Siddharth Patel)'}</span>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t ts-border/60 flex flex-wrap items-center justify-center gap-4 text-[11px] ts-text-muted">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 256-Bit Encrypted Data
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-500" /> Zero Commercial Sharing
            </span>
          </div>
        </Card>
      </div>
    );
  }

  // Derive active conditions label
  const activeConditionsCount = selectedConditions.length;
  const isOutdoorWorker =
    profile.exposure?.dailyOutdoorTime === 'mostly_outdoors' ||
    outdoorExposureHours >= 4 ||
    profile.role === 'worker';

  // Clothing insulation clo estimation
  const cloValue = clothingType === 'light' ? 0.3 : clothingType === 'heavy_protective' ? 1.5 : 0.6;

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* SECTION 1 — ASSESSMENT CONTEXT */}
      <Card variant="elevated" className="p-4 sm:p-6 relative overflow-hidden shadow-sm">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b ts-border pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <HeartPulse className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 font-mono">
                {t('risk.pageBadge', 'My Heat Risk')}
              </span>
              <DataRealityBadge tier="CALCULATED" size="xs" />
              <CalculationInfoTooltip type="personal_risk" size="xs" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black ts-text-primary mt-1 font-sans">
              Personal Heat Risk Assessment
            </h1>
            <p className="text-xs sm:text-sm ts-text-muted mt-1 leading-relaxed">
              Personalized heat-safety guidance based on your physiological profile, activity, and outdoor exposure.
            </p>

            {/* Non-alarming Medical Disclaimer */}
            <div className="mt-2.5 p-2 rounded-lg bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-950 dark:text-cyan-200 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Heat-Safety Guidance: </strong>
                This assessment provides heat-safety guidance based on your profile and environmental conditions. It is not a medical diagnosis.
              </span>
            </div>
          </div>

          {/* Mode Selector Pill Buttons */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border ts-border text-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={handleResetToProfile}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg font-bold transition-all text-xs ${
                mode === 'saved_profile'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'ts-text-muted hover:ts-text-primary'
              }`}
            >
              {t('risk.savedProfileMode', 'My Saved Profile')}
            </button>
            <button
              type="button"
              onClick={() => setMode('scenario')}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg font-bold transition-all text-xs ${
                mode === 'scenario'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'ts-text-muted hover:ts-text-primary'
              }`}
            >
              {t('risk.scenarioMode', 'Try a Different Scenario')}
            </button>
          </div>
        </div>

        {/* Assessment Context Card Body */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Profile / Scenario Summary */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border ts-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold ts-text-primary">
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {mode === 'saved_profile'
                      ? t('risk.usingSavedProfile', 'Using Your Saved Profile')
                      : t('risk.testingScenarioMode', 'Custom Scenario Mode')}
                  </span>
                </div>
                {mode === 'saved_profile' && (
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    <span>{t('profile.edit', 'Edit Profile')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {mode === 'saved_profile' ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="ts-text-subtle text-[11px] block">Age:</span>
                    <span className="font-semibold ts-text-primary">{profile.age || 34} years</span>
                  </div>
                  <div>
                    <span className="ts-text-subtle text-[11px] block">Outdoor Activity:</span>
                    <span className="font-semibold ts-text-primary capitalize">
                      {profile.exposure?.activityLevel || 'Moderate'}
                    </span>
                  </div>
                  <div>
                    <span className="ts-text-subtle text-[11px] block">Daily Exposure:</span>
                    <span className="font-semibold ts-text-primary">
                      {outdoorExposureHours} hours / day
                    </span>
                  </div>
                  <div>
                    <span className="ts-text-subtle text-[11px] block">Health Considerations:</span>
                    <span className="font-semibold ts-text-primary truncate block">
                      {selectedConditions.length > 0
                        ? selectedConditions.join(', ')
                        : 'None declared'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs ts-text-muted space-y-1">
                  <p>
                    {t(
                      'risk.scenarioExplainer',
                      'Testing how today’s heat would affect someone with different health, activity, or exposure conditions.'
                    )}
                  </p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    Changes made here will not alter your saved profile.
                  </p>
                </div>
              )}
            </div>

            {mode === 'scenario' && (
              <div className="mt-3 pt-2 border-t ts-border flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToProfile}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-xs py-1 px-2"
                >
                  {t('risk.resetToProfile', 'Reset to Profile')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveScenarioToProfile}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                  className="text-xs py-1 px-2 text-orange-600 dark:text-orange-400 border-orange-500/40"
                >
                  {t('risk.saveToProfile', 'Save to My Profile')}
                </Button>
              </div>
            )}
          </div>

          {/* Today's Contextual Weather Card */}
          <div className="p-3.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700 dark:text-orange-400 font-mono uppercase">
                  <Sun className="w-4 h-4" />
                  <span>Conditions Used for Assessment</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={syncWeatherFromLocation}
                  disabled={isSyncingWeather}
                  className="text-xs p-1 h-6 w-6"
                  title="Refresh weather"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isSyncingWeather ? 'animate-spin text-orange-500' : 'ts-text-subtle'
                    }`}
                  />
                </Button>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black ts-text-primary font-mono">
                  {temperature.toFixed(1)}°C
                </span>
                <span className="text-xs font-semibold ts-text-muted">
                  Feels like {apparentTemp.toFixed(1)}°C
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mt-2 ts-text-muted">
                <div>
                  <span className="ts-text-subtle text-[11px] block">Humidity:</span>
                  <span className="font-semibold ts-text-primary">{Math.round(humidity)}% RH</span>
                </div>
                <div>
                  <span className="ts-text-subtle text-[11px] block">Wind Speed:</span>
                  <span className="font-semibold ts-text-primary">{windSpeed.toFixed(1)} m/s</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-orange-500/15 text-[11px] text-orange-800 dark:text-orange-300 font-medium truncate">
              Showing conditions for: <strong>{locationName}</strong>
            </div>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-3 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </Card>

      {/* ERROR STATE */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 2 — YOUR HEAT RISK TODAY */}
      {result ? (
        <PersonalRiskResultCard
          ref={resultCardRef}
          result={result}
          mode={mode}
          locationName={locationName}
          isHighlighted={isResultHighlighted}
        />
      ) : (
        <EmptyState
          icon={<HeartPulse className="w-8 h-8 text-orange-600 dark:text-orange-400" />}
          title={t('empty.awaitingCalculation', 'Awaiting Calculation')}
          description={t('risk.awaitingCalcDesc', "Calculating how today's weather affects your body...")}
        />
      )}

      {/* SECTION 3 — IMMEDIATE PERSONAL GUIDANCE */}
      {result && (
        <PersonalRiskGuidance
          result={result}
          isOutdoorWorker={isOutdoorWorker}
          hydrationStatus={hydrationStatus}
          hasHealthConditions={activeConditionsCount > 0}
          outdoorHours={outdoorExposureHours}
          physicalActivity={physicalActivity}
          coolingAccess={profile.preparedness?.hasCoolingAccess ?? false}
          hasFamilyVulnerable={profile.age ? profile.age >= 65 || profile.age <= 12 : false}
        />
      )}

      {/* SECTION 4 — WHY IS YOUR RISK AT THIS LEVEL? */}
      {result && (
        <PersonalRiskExplanation
          result={result}
          temperature={temperature}
          humidity={humidity}
          age={age}
          isPregnant={isPregnant}
          isSmoker={smoking}
          outdoorHours={outdoorExposureHours}
          selectedConditions={selectedConditions}
          hydrationStatus={hydrationStatus}
          coolingAccess={profile.preparedness?.hasCoolingAccess ? 'full' : 'limited'}
          isAcclimatized={isAcclimatized}
          clothingLevel={clothingType}
        />
      )}

      {/* SECTION 5 — CHECK A DIFFERENT SCENARIO (Logical 3-Group Progressive Controls) */}
      <Card variant="default" className="p-4 sm:p-6 border ts-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b ts-border pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 dark:bg-orange-400/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold ts-text-primary">
                {t('risk.adjustScenarioFactors', 'Check a Different Scenario')}
              </h3>
              <p className="text-xs ts-text-muted">
                {t(
                  'risk.adjustScenarioDesc',
                  'Test how age, health, exposure, and clothing modify your thermal risk.'
                )}
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleCalculate(true)}
            isLoading={isCalculating}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            {t('risk.recalculateBtn', 'Recalculate Personal Heat Risk')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* GROUP 1: PERSONAL FACTORS */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 font-mono flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>1. Personal Factors</span>
            </div>

            {/* Age Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="ts-text-muted font-medium">{t('risk.ageYears', 'Age')}</span>
                <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded bg-purple-500/10">
                  {age} years
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={95}
                value={age}
                onChange={(e) => {
                  if (mode === 'saved_profile') setMode('scenario');
                  setAge(parseInt(e.target.value));
                }}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-[10px] ts-text-subtle mt-1">
                <span>Child (1-12)</span>
                <span>Adult (13-59)</span>
                <span>Senior (60+)</span>
              </div>
            </div>

            {/* Pregnancy & Smoking Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (mode === 'saved_profile') setMode('scenario');
                  setIsPregnant(!isPregnant);
                }}
                className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                  isPregnant
                    ? 'bg-pink-500/15 border-pink-500/40 text-pink-700 dark:text-pink-300 font-bold'
                    : 'ts-card-subtle border ts-border ts-text-muted'
                }`}
              >
                <Baby className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">Pregnant</span>
                {isPregnant && <span className="text-pink-500 text-[10px]">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (mode === 'saved_profile') setMode('scenario');
                  setSmoking(!smoking);
                }}
                className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                  smoking
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold'
                    : 'ts-card-subtle border ts-border ts-text-muted'
                }`}
              >
                <Cigarette className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">Smoker</span>
                {smoking && <span className="text-amber-500 text-[10px]">✓</span>}
              </button>
            </div>

            {/* Pre-existing Health Conditions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold ts-text-muted">
                  Heat-Sensitive Conditions
                </span>
                <span className="text-[10px] font-mono text-purple-500 font-bold">
                  {selectedConditions.length} selected
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {CONDITIONS_META.map((cond) => {
                  const isSelected = selectedConditions.includes(cond.id);
                  const { Icon } = cond;
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => toggleCondition(cond.id)}
                      className={`p-2 rounded-lg border text-left text-[11px] transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-purple-500/12 border-purple-500/45 text-purple-700 dark:text-purple-300 font-semibold'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:border-purple-500/30'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-purple-500' : 'ts-text-subtle'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{cond.label}</div>
                        <div className="text-[9.5px] ts-text-subtle leading-none mt-0.5">{cond.sublabel}</div>
                      </div>
                      {isSelected && <span className="text-purple-500 text-[10px] shrink-0">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Free-text informational note — not scored */}
              <div className="mt-2">
                <label className="text-[10.5px] ts-text-subtle font-semibold flex items-center gap-1 mb-1">
                  <MessageSquare className="w-3 h-3" />
                  Other heat-sensitive condition (informational only, not scored)
                </label>
                <textarea
                  value={otherConditionNote}
                  onChange={(e) => setOtherConditionNote(e.target.value)}
                  placeholder="e.g. lupus, multiple sclerosis…"
                  rows={2}
                  className="w-full text-[11px] ts-input ts-text-primary rounded-lg p-1.5 resize-none focus:outline-none border ts-border"
                />
                <p className="text-[10px] ts-text-subtle mt-0.5 flex items-start gap-1">
                  <Info className="w-3 h-3 shrink-0 mt-0.5 text-cyan-500" />
                  This note is not used in scoring. If you have a heat-sensitive condition not listed above, discuss heat precautions with your doctor.
                </p>
              </div>
            </div>
          </div>

          {/* GROUP 2: ACTIVITY & EXPOSURE */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>2. Activity &amp; Exposure</span>
            </div>

            {/* Physical Activity Level */}
            <div>
              <label className="block text-xs font-medium ts-text-muted mb-1.5">
                {t('risk.activityLevel', 'Physical Activity Level')}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'sedentary', label: 'Sedentary', desc: 'Resting / Sitting' },
                  { id: 'light', label: 'Light', desc: 'Walking / Desk' },
                  { id: 'moderate', label: 'Moderate', desc: 'Active / Walking' },
                  { id: 'heavy', label: 'Heavy', desc: 'Manual Labor / Sport' },
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => {
                      if (mode === 'saved_profile') setMode('scenario');
                      setPhysicalActivity(act.id);
                    }}
                    className={`p-1.5 rounded-lg border text-left transition-all ${
                      physicalActivity === act.id
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-200 font-bold'
                        : 'ts-card-subtle border ts-border ts-text-muted'
                    }`}
                  >
                    <div className="text-xs font-semibold">{act.label}</div>
                    <div className="text-[9.5px] ts-text-subtle">{act.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Outdoor Hours */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="ts-text-muted font-medium">Daily Outdoor Exposure</span>
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
                onChange={(e) => {
                  if (mode === 'saved_profile') setMode('scenario');
                  setOutdoorExposureHours(parseFloat(e.target.value));
                }}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Clothing Attire */}
            <div>
              <label className="block text-xs font-medium ts-text-muted mb-1.5">
                Clothing Attire
              </label>
              <select
                value={clothingType}
                onChange={(e) => {
                  if (mode === 'saved_profile') setMode('scenario');
                  setClothingType(e.target.value);
                }}
                className="w-full p-2 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
              >
                <option value="light">Light Cotton (~0.3 clo)</option>
                <option value="standard">Standard Daily Clothing (~0.6 clo)</option>
                <option value="heavy_protective">Heavy Coveralls / PPE (~1.5 clo)</option>
              </select>
            </div>
          </div>

          {/* GROUP 3: PROTECTION & SENSITIVITY */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>3. Protection &amp; Heat Readiness</span>
            </div>

            {/* Hydration Habit */}
            <div>
              <label className="block text-xs font-medium ts-text-muted mb-1.5">
                Hydration Habit
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'well_hydrated', label: 'Well Hydrated', desc: 'Frequent water/fluids' },
                  { id: 'moderate', label: 'Moderate', desc: 'Drinks when thirsty' },
                  { id: 'dehydrated', label: 'Low / Dehydrated', desc: 'Infrequent fluids' },
                ].map((hyd) => (
                  <button
                    key={hyd.id}
                    type="button"
                    onClick={() => {
                      if (mode === 'saved_profile') setMode('scenario');
                      setHydrationStatus(hyd.id);
                    }}
                    className={`w-full p-2 rounded-lg border text-left transition-all flex items-center justify-between ${
                      hydrationStatus === hyd.id
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-800 dark:text-emerald-200 font-bold'
                        : 'ts-card-subtle border ts-border ts-text-muted'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{hyd.label}</div>
                      <div className="text-[10px] ts-text-subtle">{hyd.desc}</div>
                    </div>
                    {hydrationStatus === hyd.id && (
                      <span className="text-emerald-500 text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Heat Adaptation / Acclimatization Toggle */}
            <div>
              <label className="block text-xs font-medium ts-text-muted mb-1">
                Used to hot weather?
              </label>
              <p className="text-[10px] ts-text-subtle mb-1.5 leading-snug">
                People who've spent time in the heat (≥ 2 weeks) gradually sweat more efficiently and feel less strain. This can reduce estimated heat burden by ~10–15%.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (mode === 'saved_profile') setMode('scenario');
                  setIsAcclimatized(!isAcclimatized);
                }}
                className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                  isAcclimatized
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold'
                }`}
              >
                <div>
                  <span className="font-bold block">
                    {isAcclimatized ? 'Yes — Used to this level of heat' : 'No — New to hot climate / unusual heat'}
                  </span>
                  <span className="text-[10px] ts-text-subtle">
                    {isAcclimatized
                      ? 'Body has adjusted — sweat rate and circulation adapted'
                      : 'Recently arrived, start of season, or usually indoors in AC'}
                  </span>
                </div>
                <span className="text-xs">{isAcclimatized ? '✓' : '⚠️'}</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 6 — PRACTICAL PERSONAL SAFETY CHECKLIST */}
      <PersonalSafetyChecklist
        isOutdoorWorker={isOutdoorWorker}
        age={age}
        hasHealthConditions={activeConditionsCount > 0}
      />

      {/* SECTION 7 — EXPLORE SAFETY CHANGES (EXPLORATORY SIMULATOR ENTRY POINT) */}
      <Card
        variant="elevated"
        className="p-5 sm:p-6 border border-orange-500/30 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-transparent overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider font-mono">
              <Sliders className="w-4 h-4" />
              <span>Explore Safety Changes</span>
            </div>
            <h4 className="text-base sm:text-lg font-bold ts-text-primary">
              See how changes to your routine may reduce heat danger
            </h4>
            <p className="text-xs ts-text-muted max-w-xl leading-relaxed">
              See how changes such as rest, hydration, activity, clothing, or cooling conditions may affect your estimated heat stress.
            </p>
          </div>

          <Link
            to="/interventions"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all whitespace-nowrap"
          >
            <span>Try Safety Actions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>

      {/* SECTION 8 — PLANNING OUTDOOR ACTIVITY? CONTEXTUAL CTA (Replaces full SaferOutdoorWindowCard) */}
      <Card
        variant="elevated"
        className="p-5 sm:p-6 border border-sky-500/30 bg-gradient-to-r from-sky-500/5 via-transparent to-blue-500/5 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-bold uppercase tracking-wider font-mono">
              <Calendar className="w-4 h-4" />
              <span>Planning Outdoor Activity?</span>
            </div>
            <h4 className="text-base sm:text-lg font-bold ts-text-primary">
              See the safest hours to be outdoors today
            </h4>
            <p className="text-xs ts-text-muted max-w-xl">
              Check the hourly heat relief window, UV radiation curve, and forecasted thermal peak to schedule errands or physical work safely.
            </p>
          </div>

          <Link
            to="/forecast"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors shadow-sm whitespace-nowrap"
          >
            <span>View Safe Outdoor Hours</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>

      {/* SECTION 8 — LEARN THE SCIENCE (PROGRESSIVE DISCLOSURE COLLAPSED ACCORDION) */}
      <PersonalRiskScience
        wbgt={wbgt}
        cloValue={cloValue}
        activityLevel={physicalActivity}
      />
    </div>
  );
};

export default PersonalRisk;
