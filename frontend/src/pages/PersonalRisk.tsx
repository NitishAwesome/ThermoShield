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
  ChevronDown,
  RotateCcw,
  Save,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useProfile } from '../context/ProfileContext';
import { api } from '../services/api';
import { PersonalRiskRequest, PersonalRiskResult } from '../types';
import { getRiskColor } from '../utils/risk';
import { Card, CardHeader, CardContent, Badge, Button, EmptyState } from '../components/ui';
import { useTranslation } from '../context/LanguageContext';
import {
  translateSafetyRecommendation,
  translateRiskFactor,
  translateHeatStrainLevel,
  translatePersonalAlert,
  translateWorkRestCycle,
  translateFactorDescription,
  translateRiskLevel,
} from '../utils/translationHelpers';

const CONDITIONS_META = [
  { id: 'heart_disease', key: 'risk.condition.cardiovascular', icon: '❤️' },
  { id: 'asthma', key: 'risk.condition.asthma', icon: '🫁' },
  { id: 'diabetes', key: 'risk.condition.diabetes', icon: '🩸' },
  { id: 'kidney_disease', key: 'risk.condition.kidney', icon: '🧪' },
  { id: 'hypertension', key: 'risk.condition.hypertension', icon: '🩺' },
  { id: 'neurological', key: 'risk.condition.neurological', icon: '🧠' },
];

export const PersonalRisk: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { coords, locationName } = useLocation();
  const { profile, updateProfile, updateHealthProfile, updateExposureProfile, completionPercentage } = useProfile();

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

  // Conditions list from profile
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
  const [isSyncingWeather, setIsSyncingWeather] = useState<boolean>(false);

  // Calculation Results
  const [result, setResult] = useState<PersonalRiskResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Accordion for scientific details
  const [showScientificDetails, setShowScientificDetails] = useState<boolean>(false);

  // Sync inputs with profile whenever profile updates (and in saved_profile mode)
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
    // Reverse map state to profile
    updateProfile({ age });
    updateHealthProfile({
      smoking,
      isPregnant,
      conditions: selectedConditions,
    });
    updateExposureProfile({
      isAcclimatized,
      activityLevel: (physicalActivity as 'sedentary' | 'light' | 'moderate' | 'heavy'),
      clothingType: (clothingType as 'light' | 'standard' | 'heavy_protective'),
      hydrationHabit: (hydrationStatus as 'well_hydrated' | 'moderate' | 'dehydrated'),
      dailyOutdoorTime: outdoorExposureHours > 4 ? 'mostly_outdoors' : outdoorExposureHours > 1.5 ? 'mixed' : 'mostly_indoors',
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

  const handleCalculate = async () => {
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
  }, [wbgt, age, selectedConditions.length, physicalActivity]);

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Banner: Connected Profile Status */}
      <Card variant="elevated" className="p-4 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <HeartPulse className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                {t('risk.advisoryTitle', 'Personalized Heat Advisory')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black ts-text-primary mt-1 font-sans">
              {t('risk.advisoryTitle', 'How Heat May Affect You Today')}
            </h1>
            <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-2xl leading-relaxed">
              {t('risk.advisorySubtitle', 'Personalized guidance based on your health factors, daily activity, and real-time weather.')}
            </p>
          </div>

          {/* Connected Profile Status Box */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex-1 sm:flex-initial">
              <UserCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-bold ts-text-primary flex items-center gap-1.5">
                  <span>{profile.fullName || user?.name || t('role.citizen', 'My Profile')}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                    {profile.role}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-300/80">
                  {completionPercentage}% complete · {profile.age || 'Age unverified'}
                </div>
              </div>
            </div>

            <Link
              to="/profile"
              className="inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-xl border ts-border text-xs font-semibold ts-text-primary hover:bg-slate-500/10 transition-colors whitespace-nowrap"
            >
              <span>{t('profile.title', 'Edit My Profile')}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Incomplete Profile Helper Callout */}
        {completionPercentage < 70 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-amber-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {t('risk.incompleteProfileNotice', 'Your heat risk estimate can be more accurate when we know your age, health, and cooling access.')}
              </span>
            </div>
            <Link
              to="/profile"
              className="font-bold text-amber-400 hover:text-amber-300 whitespace-nowrap underline ml-2"
            >
              {t('risk.completeProfileCTA', 'Complete Profile')} →
            </Link>
          </div>
        )}

        {/* Mode Selector: MY SAVED PROFILE vs TRY A DIFFERENT SCENARIO */}
        <div className="mt-5 pt-4 border-t ts-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider ts-text-muted">{t('risk.assessmentMode')}:</span>
            <div className="inline-flex p-1 rounded-xl bg-slate-200 dark:bg-slate-800 border ts-border text-xs">
              <button
                type="button"
                onClick={handleResetToProfile}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
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
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  mode === 'scenario'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'ts-text-muted hover:ts-text-primary'
                }`}
              >
                {t('risk.scenarioMode', 'Try a Different Scenario')}
              </button>
            </div>
          </div>

          {/* Mode Contextual Status / Controls */}
          {mode === 'saved_profile' ? (
            <div className="flex items-center space-x-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('risk.basedOnSavedProfile', 'Your assessment is currently based on your saved profile.')}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-amber-300">{t('risk.testingScenario', 'Testing temporary scenario')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetToProfile}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs py-1 px-2.5"
              >
                {t('risk.resetToProfile', 'Reset to Saved Profile')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveScenarioToProfile}
                leftIcon={<Save className="w-3.5 h-3.5" />}
                className="text-xs py-1 px-2.5 text-orange-400 border-orange-500/40 hover:bg-orange-500/10"
              >
                {t('risk.saveToProfile', 'Save to My Profile')}
              </Button>
            </div>
          )}
        </div>

        {saveSuccessMsg && (
          <div className="mt-3 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </Card>

      {/* Main Grid: Form Inputs (Left) + Calculated Plain-Language Output (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Personal Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader
              title={mode === 'saved_profile' ? t('risk.profileFactorsApplied') : t('risk.adjustScenarioFactors')}
              subtitle={
                mode === 'saved_profile'
                  ? t('risk.profileFactorsDesc')
                  : t('risk.adjustScenarioDesc')
              }
            />
            <CardContent className="space-y-4">
              {/* Age Slider */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="ts-text-muted font-semibold">{t('risk.ageYears')}</span>
                  <span className="font-mono text-sm font-black text-orange-400 px-2.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                    {t('risk.ageYearsVal', { age })}
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
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-[10px] ts-text-subtle mt-1">
                  <span>{t('risk.ageBracketChildren')}</span>
                  <span>{t('risk.ageBracketAdults')}</span>
                  <span>{t('risk.ageBracketSeniors')}</span>
                </div>
              </div>

              {/* Toggles: Pregnancy, Smoking, Acclimatization */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'saved_profile') setMode('scenario');
                    setIsPregnant(!isPregnant);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isPregnant
                      ? 'bg-pink-500/15 border-pink-500/40 text-pink-700 dark:text-pink-300'
                      : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center space-x-1.5">
                    <span>🤰</span>
                    <span>{t('risk.pregnant')}</span>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                      isPregnant ? 'border-pink-400 bg-pink-500 text-white' : 'border-slate-600'
                    }`}
                  >
                    {isPregnant ? '✓' : ''}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'saved_profile') setMode('scenario');
                    setSmoking(!smoking);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    smoking
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center space-x-1.5">
                    <span>🚬</span>
                    <span>{t('risk.smoker')}</span>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                      smoking ? 'border-amber-400 bg-amber-500 text-white' : 'border-slate-600'
                    }`}
                  >
                    {smoking ? '✓' : ''}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (mode === 'saved_profile') setMode('scenario');
                    setIsAcclimatized(!isAcclimatized);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    !isAcclimatized
                      ? 'bg-red-500/15 border-red-500/40 text-red-400'
                      : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center space-x-1.5">
                    <span>🌍</span>
                    <span>{!isAcclimatized ? t('risk.unacclimatized') : t('risk.acclimatized')}</span>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                      !isAcclimatized ? 'border-red-400 bg-red-500 text-white' : 'border-slate-600'
                    }`}
                  >
                    {!isAcclimatized ? '!' : '✓'}
                  </div>
                </button>
              </div>

              {/* Pre-existing Health Sensitivities */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold ts-text-muted">
                    {t('risk.healthConsiderations')}
                  </label>
                  <span className="text-[10.5px] ts-text-subtle">
                    {t('risk.activeCount', { count: selectedConditions.length })}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CONDITIONS_META.map((cond) => {
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
                        <span className="flex items-center space-x-2 truncate">
                          <span>{cond.icon}</span>
                          <span className="truncate">{t(cond.key)}</span>
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 flex-shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Physical Activity */}
              <div>
                <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                  {t('risk.activityLevel')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'sedentary', label: t('risk.activity.sedentary'), desc: t('risk.activity.sedentaryDesc') },
                    { id: 'light', label: t('risk.activity.light'), desc: t('risk.activity.lightDesc') },
                    { id: 'moderate', label: t('risk.activity.moderate'), desc: t('risk.activity.moderateDesc') },
                    { id: 'heavy', label: t('risk.activity.heavy'), desc: t('risk.activity.heavyDesc') },
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        if (mode === 'saved_profile') setMode('scenario');
                        setPhysicalActivity(act.id);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        physicalActivity === act.id
                          ? 'bg-orange-500/20 border-orange-500/50 text-orange-700 dark:text-orange-300 font-bold'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                      }`}
                    >
                      <div className="text-xs">{act.label}</div>
                      <div className="text-[9.5px] ts-text-subtle mt-0.5">{act.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hydration Status */}
              <div>
                <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                  {t('risk.hydrationStatus')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'well_hydrated', label: t('risk.hydration.wellHydrated'), icon: '💧' },
                    { id: 'moderate', label: t('risk.hydration.moderate'), icon: '🥤' },
                    { id: 'dehydrated', label: t('risk.hydration.dehydrated'), icon: '⚠️' },
                  ].map((hyd) => (
                    <button
                      key={hyd.id}
                      type="button"
                      onClick={() => {
                        if (mode === 'saved_profile') setMode('scenario');
                        setHydrationStatus(hyd.id);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        hydrationStatus === hyd.id
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-700 dark:text-sky-300 font-bold'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                      }`}
                    >
                      <div className="text-xs flex items-center justify-center space-x-1">
                        <span>{hyd.icon}</span>
                        <span className="truncate">{hyd.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Outdoor Hours & Clothing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="ts-text-muted font-semibold">{t('risk.outdoorHours')}:</span>
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
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    {t('risk.attireUniform')}:
                  </label>
                  <select
                    value={clothingType}
                    onChange={(e) => {
                      if (mode === 'saved_profile') setMode('scenario');
                      setClothingType(e.target.value);
                    }}
                    className="w-full p-2 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                  >
                    <option value="light">{t('risk.lightCotton')}</option>
                    <option value="standard">{t('risk.standardClothing')}</option>
                    <option value="heavy_protective">{t('risk.heavyCoverall')}</option>
                  </select>
                </div>
              </div>

              {/* Calculate Button */}
              <div className="pt-2 border-t ts-border">
                <div className="flex items-center justify-between text-xs ts-text-muted mb-2.5">
                  <span>{t('risk.weatherSync')}:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono ts-text-primary font-semibold">
                      {temperature.toFixed(1)}°C · {Math.round(humidity)}% RH
                    </span>
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
                  {t('risk.recalculateBtn', 'Recalculate Personal Heat Risk')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Clear, Plain-Language Decision Support (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <>
              {/* SECTION 1: YOUR HEAT RISK TODAY */}
              <Card variant="elevated" className="p-4 sm:p-6 relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                      SECTION 1
                    </span>
                    <h3 className="text-lg font-black ts-text-primary">
                      {t('risk.section1Title', 'Your Heat Risk Today')}
                    </h3>
                  </div>
                  <Badge riskLevel={result.risk_level} size="md" showDot>
                    {translateRiskLevel(result.risk_level, t)} {t('dashboard.alert')}
                  </Badge>
                </div>

                {/* Score Circular Gauge & Plain Headline */}
                <div className="my-5 flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="45"
                        stroke="var(--border-app)"
                        strokeWidth="9"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="45"
                        stroke={getRiskColor(result.risk_level)}
                        strokeWidth="9"
                        fill="transparent"
                        strokeDasharray="283"
                        strokeDashoffset={283 - (283 * Math.min(100, result.risk_score)) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black ts-text-primary font-mono">
                        {result.risk_score.toFixed(0)}
                      </span>
                      <span className="text-[9px] ts-text-subtle font-semibold uppercase">{t('risk.outOf100')}</span>
                    </div>
                  </div>

                  <div className="text-center sm:text-left space-y-1.5 flex-1">
                    <div className="text-sm font-black ts-text-primary">
                      {translateHeatStrainLevel(result.heat_strain_level, t)}
                    </div>
                    <p className="text-xs ts-text-muted leading-relaxed">
                      {translatePersonalAlert(result.alert, t)}
                    </p>
                    <div className="text-[11px] text-emerald-400/90 font-medium">
                      {t('risk.calculatedUsing', {
                        source: mode === 'saved_profile' ? t('risk.savedProfileMode') : t('risk.scenarioMode'),
                        location: profile.city ? `${profile.city}, ${profile.state}` : locationName
                      })}
                    </div>
                  </div>
                </div>

                {/* Directives Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t ts-border">
                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <div className="flex items-center space-x-1.5 text-xs text-sky-400 font-bold">
                      <Droplets className="w-4 h-4" />
                      <span>{t('risk.waterIntakeTarget', 'Recommended Water Intake')}</span>
                    </div>
                    <div className="text-xl font-black ts-text-primary mt-1 font-mono">
                      {result.recommended_water_intake_ml_hr}{' '}
                      <span className="text-xs font-normal ts-text-muted">mL / hour</span>
                    </div>
                    <div className="text-[10.5px] ts-text-subtle mt-0.5">{t('risk.drinkBeforeThirsty')}</div>
                  </div>

                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <div className="flex items-center space-x-1.5 text-xs text-orange-400 font-bold">
                      <Clock className="w-4 h-4" />
                      <span>{t('risk.workRestCycle', 'Work-Rest Cycle')}</span>
                    </div>
                    <div className="text-xs font-bold ts-text-primary mt-1.5 leading-snug">
                      {translateWorkRestCycle(result.work_rest_cycle.split(';')[0], t)}
                    </div>
                    <div className="text-[10.5px] ts-text-subtle mt-0.5">{t('risk.recommendedBreakPeak')}</div>
                  </div>
                </div>
              </Card>

              {/* SECTION 2: WHY YOUR RISK IS AT THIS LEVEL */}
              <Card>
                <CardHeader
                  title={t('risk.section2Title', 'Why is your risk at this level?')}
                  subtitle={t('risk.section2Subtitle')}
                />
                <CardContent className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs leading-relaxed ts-text-primary">
                    {result.risk_level.toUpperCase() === 'LOW' ? (
                      <span>{t('risk.whyAtThisLevelComfort')}</span>
                    ) : (
                      <span>
                        {t('risk.whyAtThisLevel', {
                          level: result.risk_level.toUpperCase(),
                          temp: temperature.toFixed(1),
                          humidity: Math.round(humidity),
                          conditionsPart: selectedConditions.length > 0
                            ? t('risk.whyAtThisLevelConditions', {
                                conditions: selectedConditions.map(c => {
                                  const item = CONDITIONS_META.find(m => m.id === c);
                                  return item ? t(item.key) : c.replace('_', ' ');
                                }).join(', ')
                              })
                            : '',
                          exposurePart: outdoorExposureHours > 2
                            ? t('risk.whyAtThisLevelExposure', { hours: outdoorExposureHours })
                            : ''
                        })}
                      </span>
                    )}
                  </div>

                  {/* Top contributing factors */}
                  <div className="space-y-2 pt-1">
                    {result.risk_factors_breakdown.slice(0, 4).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl ts-card-subtle border ts-border flex items-center justify-between text-xs"
                      >
                        <div className="pr-3">
                          <div className="font-bold ts-text-primary">{translateRiskFactor(item.factor, t)}</div>
                          <div className="text-[11px] ts-text-muted mt-0.5">{translateFactorDescription(item.description, t)}</div>
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
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 3: WHAT YOU CAN DO NOW */}
              <Card>
                <CardHeader
                  title={t('risk.section3Title', 'What you can do now')}
                  subtitle={t('risk.actionChecklistSubtitle')}
                  badge={
                    <Badge variant="low" size="sm">
                      {t('risk.actionChecklist')}
                    </Badge>
                  }
                />
                <CardContent>
                  <ul className="space-y-2 text-xs ts-text-muted">
                    {result.safety_recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start space-x-2.5 p-2.5 rounded-xl ts-card-subtle border ts-border">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed ts-text-primary">{translateSafetyRecommendation(rec, t)}</span>
                      </li>
                    ))}
                  </ul>

                  {profile.preparedness && (
                    <div className="mt-4 pt-3 border-t ts-border">
                      <div className="text-[11px] font-bold ts-text-muted mb-2 uppercase tracking-wider">
                        {t('risk.emergencyResourcesOnHand')}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {profile.preparedness.hasDrinkingWaterAccess && (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                            {t('risk.resourceWater')}
                          </span>
                        )}
                        {profile.preparedness.hasCoolingAccess && (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                            {t('risk.resourceCooler')}
                          </span>
                        )}
                        {profile.preparedness.hasShadeAccess && (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                            {t('risk.resourceShade')}
                          </span>
                        )}
                        {profile.preparedness.knowsCoolingCenter && (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                            {t('risk.resourceCoolingCenter')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-[10.5px] ts-text-subtle mt-3 pt-2.5 border-t ts-border leading-snug">
                    {t('risk.medicalDisclaimer')}
                  </p>
                </CardContent>
              </Card>

              {/* SECTION 4: SCIENTIFIC DETAILS ACCORDION */}
              <Card>
                <button
                  type="button"
                  onClick={() => setShowScientificDetails(!showScientificDetails)}
                  className="w-full p-4 flex items-center justify-between text-left transition-colors hover:bg-slate-500/5 rounded-2xl"
                >
                  <div className="flex items-center space-x-2.5">
                    <Info className="w-4 h-4 text-orange-400" />
                    <div>
                      <div className="text-xs font-bold ts-text-primary">
                        {t('risk.section4Title', 'Scientific & Occupational Methodology Details')}
                      </div>
                      <div className="text-[11px] ts-text-subtle">
                        {t('risk.scientificAccordionDesc', 'Expand to inspect WBGT, clo ratings, and OSHA/ACGIH index parameters.')}
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 ts-text-muted transition-transform duration-200 ${
                      showScientificDetails ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>

                {showScientificDetails && (
                  <CardContent className="pt-0 border-t ts-border space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs">
                      <div className="p-2 rounded-lg ts-card-subtle border ts-border">
                        <span className="text-[10px] ts-text-subtle block">Wet Bulb Globe (WBGT)</span>
                        <span className="font-mono font-bold ts-text-primary text-sm">{wbgt.toFixed(1)}°C</span>
                      </div>
                      <div className="p-2 rounded-lg ts-card-subtle border ts-border">
                        <span className="text-[10px] ts-text-subtle block">{t('dashboard.apparentTemp')}</span>
                        <span className="font-mono font-bold ts-text-primary text-sm">{apparentTemp.toFixed(1)}°C</span>
                      </div>
                      <div className="p-2 rounded-lg ts-card-subtle border ts-border">
                        <span className="text-[10px] ts-text-subtle block">{t('risk.attireUniform')}</span>
                        <span className="font-mono font-bold ts-text-primary text-sm">
                          {clothingType === 'light' ? '0.3 clo' : clothingType === 'heavy_protective' ? '1.8 clo' : '0.7 clo'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg ts-card-subtle border ts-border">
                        <span className="text-[10px] ts-text-subtle block">UV Index</span>
                        <span className="font-mono font-bold ts-text-primary text-sm">{uvIndex.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="text-[11px] ts-text-muted leading-relaxed p-2.5 rounded-lg ts-card-subtle border ts-border">
                      {t('risk.methodologyNote')}
                    </div>
                  </CardContent>
                )}
              </Card>
            </>
          ) : (
            <EmptyState
              icon={<HeartPulse className="w-8 h-8 text-orange-400" />}
              title={t('empty.awaitingCalculation', 'Awaiting Calculation')}
              description={t('risk.awaitingCalcDesc')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalRisk;
