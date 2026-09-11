import React, { useState, useEffect } from 'react';
import {
  User,
  HeartPulse,
  MapPin,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Flame,
  Droplets,
  Building2,
  Sparkles,
  Info,
  Clock,
  Home,
  Save,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Eye,
  Check,
  Compass,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useLocation } from '../context/LocationContext';
import { useLanguage, useTranslation } from '../context/LanguageContext';
import { LanguageCode } from '../i18n/types';
import { Card, CardHeader, CardContent, Badge, Button } from '../components/ui';
import {
  translateProfileSection,
  translateProfileExplanation,
  translateActiveFactor,
} from '../utils/translationHelpers';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { coords, locationName, setCoordsAndName, isLocating, detectMyLocation } = useLocation();
  const { currentLanguage, languages, setLanguage } = useLanguage();
  const {
    profile,
    updateProfile,
    updateHealthProfile,
    updateExposureProfile,
    updatePreparedness,
    completionPercentage,
    isProfileComplete,
    completedSections,
    missingSections,
    personalizationSummary,
    isSaving,
  } = useProfile();

  // Local form state initialized from profile
  const [fullName, setFullName] = useState(profile.fullName || '');
  const [age, setAge] = useState<number | string>(profile.age ?? '');
  const [gender, setGender] = useState(profile.gender || '');
  const [city, setCity] = useState(profile.city || '');
  const [state, setState] = useState(profile.state || '');
  const [district, setDistrict] = useState(profile.district || '');
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferences?.preferredLanguage || 'English');

  // Professional fields
  const [organization, setOrganization] = useState(profile.organization || '');
  const [jurisdiction, setJurisdiction] = useState(profile.jurisdiction || '');
  const [department, setDepartment] = useState(profile.department || '');

  // Health conditions
  const [selectedConditions, setSelectedConditions] = useState<string[]>(profile.health?.conditions || []);
  const [isPregnant, setIsPregnant] = useState(profile.health?.isPregnant || false);
  const [isOutdoorWorker, setIsOutdoorWorker] = useState(profile.health?.isOutdoorWorker || false);
  const [hasHeatIllnessHistory, setHasHeatIllnessHistory] = useState(profile.health?.hasHeatIllnessHistory || false);
  const [takesMedication, setTakesMedication] = useState(profile.health?.takesMedication || false);
  const [smoking, setSmoking] = useState(profile.health?.smoking || false);

  // Exposure
  const [dailyOutdoorTime, setDailyOutdoorTime] = useState(profile.exposure?.dailyOutdoorTime || 'mixed');
  const [activityLevel, setActivityLevel] = useState(profile.exposure?.activityLevel || 'moderate');
  const [typicalPeakExposure, setTypicalPeakExposure] = useState(profile.exposure?.typicalPeakExposure || 'afternoon');
  const [coolingAccess, setCoolingAccess] = useState(profile.exposure?.coolingAccess || 'limited');
  const [clothingType, setClothingType] = useState(profile.exposure?.clothingType || 'standard');
  const [isAcclimatized, setIsAcclimatized] = useState(profile.exposure?.isAcclimatized ?? true);
  const [hydrationHabit, setHydrationHabit] = useState(profile.exposure?.hydrationHabit || 'moderate');

  // Emergency preparedness
  const [hasDrinkingWater, setHasDrinkingWater] = useState(profile.preparedness?.hasDrinkingWaterAccess ?? true);
  const [hasCooling, setHasCooling] = useState(profile.preparedness?.hasCoolingAccess ?? false);
  const [hasShade, setHasShade] = useState(profile.preparedness?.hasShadeAccess ?? true);
  const [knowsCoolingCenter, setKnowsCoolingCenter] = useState(profile.preparedness?.knowsCoolingCenter ?? false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'health' | 'exposure' | 'professional'>('personal');

  const isCitizen = !profile.role || profile.role === 'user';

  // Sync state whenever profile switches (e.g. persona switch)
  useEffect(() => {
    setFullName(profile.fullName || '');
    setAge(profile.age ?? '');
    setGender(profile.gender || '');
    setCity(profile.city || '');
    setState(profile.state || '');
    setDistrict(profile.district || '');
    setPreferredLanguage(profile.preferences?.preferredLanguage || 'English');
    setOrganization(profile.organization || '');
    setJurisdiction(profile.jurisdiction || '');
    setDepartment(profile.department || '');
    setSelectedConditions(profile.health?.conditions || []);
    setIsPregnant(profile.health?.isPregnant || false);
    setIsOutdoorWorker(profile.health?.isOutdoorWorker || false);
    setHasHeatIllnessHistory(profile.health?.hasHeatIllnessHistory || false);
    setTakesMedication(profile.health?.takesMedication || false);
    setSmoking(profile.health?.smoking || false);
    setDailyOutdoorTime(profile.exposure?.dailyOutdoorTime || 'mixed');
    setActivityLevel(profile.exposure?.activityLevel || 'moderate');
    setTypicalPeakExposure(profile.exposure?.typicalPeakExposure || 'afternoon');
    setCoolingAccess(profile.exposure?.coolingAccess || 'limited');
    setClothingType(profile.exposure?.clothingType || 'standard');
    setIsAcclimatized(profile.exposure?.isAcclimatized ?? true);
    setHydrationHabit(profile.exposure?.hydrationHabit || 'moderate');
    setHasDrinkingWater(profile.preparedness?.hasDrinkingWaterAccess ?? true);
    setHasCooling(profile.preparedness?.hasCoolingAccess ?? false);
    setHasShade(profile.preparedness?.hasShadeAccess ?? true);
    setKnowsCoolingCenter(profile.preparedness?.knowsCoolingCenter ?? false);
  }, [profile]);

  const toggleCondition = (condId: string) => {
    if (condId === 'none') {
      setSelectedConditions([]);
      return;
    }
    setSelectedConditions((prev) =>
      prev.includes(condId) ? prev.filter((c) => c !== condId) : [...prev.filter((c) => c !== 'none'), condId]
    );
  };

  const handleUseMyLocation = () => {
    detectMyLocation();
    if (locationName) {
      const parts = locationName.split(',').map((p) => p.trim());
      if (parts[0]) setCity(parts[0]);
      if (parts[1]) setState(parts[1]);
    }
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedAge = age === '' || isNaN(Number(age)) ? null : parseInt(String(age), 10);

    await updateProfile({
      fullName,
      age: parsedAge,
      gender,
      city,
      state,
      district,
      organization,
      jurisdiction,
      department,
      preferences: {
        ...profile.preferences,
        preferredLanguage,
      },
      health: {
        ...profile.health,
        conditions: selectedConditions,
        isPregnant,
        isOutdoorWorker,
        hasHeatIllnessHistory,
        takesMedication,
        smoking,
        isOlderAdult: parsedAge ? parsedAge >= 65 : false,
        isChild: parsedAge ? parsedAge <= 12 : false,
      },
      exposure: {
        ...profile.exposure,
        dailyOutdoorTime,
        activityLevel,
        typicalPeakExposure,
        coolingAccess,
        clothingType,
        isAcclimatized,
        hydrationHabit,
      },
      preparedness: {
        ...profile.preparedness,
        hasDrinkingWaterAccess: hasDrinkingWater,
        hasCoolingAccess: hasCooling,
        hasShadeAccess: hasShade,
        knowsCoolingCenter,
      },
    });

    // Also update LocationContext if city and state are provided
    if (city && state && coords) {
      setCoordsAndName(coords, `${city}, ${state}`);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const HEALTH_CONDITIONS_LIST = [
    {
      id: 'heart_disease',
      label: t('profile.condHeart'),
      desc: t('profile.condHeartDesc'),
      icon: '❤️',
    },
    {
      id: 'hypertension',
      label: t('profile.condHypertension'),
      desc: t('profile.condHypertensionDesc'),
      icon: '🩺',
    },
    {
      id: 'asthma',
      label: t('profile.condBreathing'),
      desc: t('profile.condBreathingDesc'),
      icon: '🫁',
    },
    {
      id: 'diabetes',
      label: t('profile.condDiabetes'),
      desc: t('profile.condDiabetesDesc'),
      icon: '🩸',
    },
    {
      id: 'kidney_disease',
      label: t('profile.condKidney'),
      desc: t('profile.condKidneyDesc'),
      icon: '🧪',
    },
    {
      id: 'mobility',
      label: t('profile.condMobility'),
      desc: t('profile.condMobilityDesc'),
      icon: '🧠',
    },
  ];

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
              {t('profile.accountTab', 'Account & Personalization')}
            </span>
            <Badge variant="brand" size="sm">
              {profile.role.toUpperCase()}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold ts-text-primary font-sans mt-0.5">
            {t('profile.title', 'My ThermoShield Profile')}
          </h1>
          <p className="text-sm ts-text-muted mt-1">
            {t('profile.subtitle', 'Personalize your heat warning experience. We use your routine, location, and health profile to keep your safety guidance accurate and relevant.')}
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start md:self-auto flex-wrap gap-y-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => handleSaveAll()}
            isLoading={isSaving}
            leftIcon={savedSuccess ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
            className="shadow-md"
          >
            {savedSuccess ? t('profile.changesSaved', 'Changes Saved!') : t('profile.saveProfile', 'Save Profile')}
          </Button>

          <Link
            to="/personal-risk"
            className="px-3.5 py-2 rounded-xl text-xs font-bold ts-card-subtle hover:bg-orange-500/10 hover:text-orange-400 border ts-border ts-text-primary transition-all flex items-center space-x-1.5"
          >
            <HeartPulse className="w-4 h-4 text-orange-400" />
            <span>{t('profile.viewPersonalRisk', 'View Personal Risk')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Success Banner */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-ts-fade-in shadow-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-emerald-200">{t('profile.savedSuccessToast', 'Profile Updated Successfully')}</p>
              <p className="text-emerald-300/80 mt-0.5">
                {t('profile.completeAdvisory', 'Your personal risk scores, alerts, and dashboard guidance are now updated with your latest profile information.')}
              </p>
            </div>
          </div>
          <Badge variant="low" size="sm">{t('status.active')}</Badge>
        </div>
      )}

      {/* Profile Completeness & Transparency Card */}
      <Card variant="elevated" className="p-4 sm:p-6 border-orange-500/30 overflow-hidden relative shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {t('profile.setupAccuracy', 'Profile Setup & Accuracy')}
              </span>
              <span className="text-xs font-mono font-bold ts-text-primary">
                {t('profile.complete', { percent: completionPercentage })}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <p className="text-xs ts-text-muted leading-relaxed pt-1">
              {isProfileComplete
                ? t('profile.completeAdvisory', 'Great job! Your profile is complete and ThermoShield is generating high-accuracy personalized heat advisories.')
                : t('profile.incompleteAdvisory', 'Your heat risk estimate can be more accurate when we know your age and health information.')}
            </p>

            {/* Completed & Missing Chips */}
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              {completedSections.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center space-x-1"
                >
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>{translateProfileSection(item, t)}</span>
                </span>
              ))}
              {missingSections.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center space-x-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>{t('profile.missing', { item: translateProfileSection(item, t) })}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Personalization Transparency Box */}
          <div className="w-full lg:w-80 p-3.5 rounded-2xl ts-card-subtle border ts-border flex-shrink-0 text-xs">
            <div className="font-bold ts-text-primary flex items-center justify-between pb-2 border-b ts-border">
              <span>{t('profile.setupAccuracy', 'Current Assessment Status')}</span>
              <Badge
                variant={personalizationSummary.status === 'full' ? 'low' : 'moderate'}
                size="sm"
              >
                {personalizationSummary.status === 'full' ? t('status.active', 'Personalized') : t('status.incomplete', 'General Baseline')}
              </Badge>
            </div>
            <p className="text-[11px] ts-text-muted mt-2 leading-relaxed">
              {translateProfileExplanation(personalizationSummary.explanation, t)}
            </p>
            <div className="mt-2.5 pt-2 border-t ts-border space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider ts-text-subtle block">
                {t('profile.activeFactorsLabel')}
              </span>
              <ul className="text-[11px] ts-text-primary space-y-1">
                {personalizationSummary.activeFactors.slice(0, 3).map((factor, idx) => (
                  <li key={idx} className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                    <span className="truncate">{translateActiveFactor(factor, t)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs for Easy Section Browsing */}
      <div className="flex items-center space-x-2 border-b ts-border pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'personal'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'ts-card-subtle ts-text-muted hover:ts-text-primary'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t('profile.personalLocationTab', 'Basic Details & Location')}</span>
        </button>

        {isCitizen ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('health')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'ts-card-subtle ts-text-muted hover:ts-text-primary'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>{t('profile.healthVulnerabilityTab', 'Health & Sensitivities')}</span>
              {selectedConditions.length > 0 && (
                <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px]">
                  {selectedConditions.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('exposure')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'exposure'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'ts-card-subtle ts-text-muted hover:ts-text-primary'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>{t('profile.exposureWorkTab', 'Daily Exposure & Routine')}</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab('professional')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'professional'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'ts-card-subtle ts-text-muted hover:ts-text-primary'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t('profile.professionalTab', 'Civic Jurisdiction & Role')}</span>
          </button>
        )}
      </div>

      {/* FORM SECTIONS */}
      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* SECTION 1 — BASIC INFORMATION & LOCATION */}
        {(activeTab === 'personal' || !isCitizen) && (
          <Card>
            <CardHeader
              title={t('profile.personalLocationTab', '1. Personal Information & Primary Location')}
              subtitle={t('profile.basicDetailsSubtitle')}
            />
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    {t('profile.fullNameLabel', 'Full Name:')}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    {t('profile.emailLabel')}
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full p-2.5 ts-input text-xs ts-text-subtle rounded-xl opacity-75 cursor-not-allowed"
                  />
                </div>

                {/* Age */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold ts-text-muted">
                      {t('profile.ageLabel', 'Age (Years):')}
                    </label>
                    <span className="text-[11px] ts-text-subtle">
                      {t('profile.thermalStrainAgeNote')}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={110}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none font-mono"
                  />
                  <div className="flex justify-between text-[10px] ts-text-subtle mt-1 px-1">
                    <span>{t('profile.childBracket')}</span>
                    <span>{t('profile.adultBracket')}</span>
                    <span>{t('profile.seniorBracket')}</span>
                  </div>
                </div>

                {/* Preferred Language */}
                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    {t('profile.languageLabel', 'Preferred Advisory Language / भाषा:')}
                  </label>
                  <select
                    value={currentLanguage}
                    onChange={(e) => {
                      const code = e.target.value as LanguageCode;
                      setLanguage(code);
                      const opt = languages.find((l) => l.code === code);
                      if (opt) setPreferredLanguage(opt.englishLabel);
                    }}
                    className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label} ({lang.englishLabel})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PRIMARY LOCATION SUB-SECTION */}
              <div className="pt-4 border-t ts-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold ts-text-primary flex items-center space-x-1.5">
                      <MapPin className="w-4 h-4 text-orange-400" />
                      <span>{t('profile.personalLocationTab', 'Primary Home / Work Location')}</span>
                    </h3>
                    <p className="text-xs ts-text-muted mt-0.5">
                      {t('profile.primaryLocationSubtitle')}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseMyLocation}
                    disabled={isLocating}
                    leftIcon={<Compass className={`w-3.5 h-3.5 text-orange-400 ${isLocating ? 'animate-spin' : ''}`} />}
                    className="text-xs self-start sm:self-auto"
                  >
                    {isLocating ? 'Detecting...' : t('profile.useCurrentLocation', 'Use My Current Location')}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold ts-text-muted mb-1">{t('profile.cityLabel', 'City / Town:')}</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Jaipur"
                      className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold ts-text-muted mb-1">{t('profile.stateLabel', 'State:')}</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Rajasthan"
                      className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold ts-text-muted mb-1">{t('profile.districtLabel', 'Ward / Neighborhood (Optional):')}</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Civil Lines Zone"
                      className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PROFESSIONAL CONTEXT (FOR OFFICIALS, RESPONDERS, ANALYSTS) */}
        {(!isCitizen || activeTab === 'professional') && (
          <Card>
            <CardHeader
              title={t('profile.professionalTab', 'Professional & Operational Jurisdiction')}
              subtitle={t('profile.civicRoleSubtitle', 'Configures your administrative node for city surveillance and command directives.')}
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    {t('profile.organizationLabel', 'Organization / Ministry:')}
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Ministry of Health & Family Welfare"
                    className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    {t('profile.jurisdictionLabel', 'Assigned Region / Jurisdiction:')}
                  </label>
                  <input
                    type="text"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    placeholder="e.g. Jaipur Metropolitan Zone"
                    className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    {t('profile.departmentLabel', 'Division / Branch:')}
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Heat Disaster Coordination"
                    className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 2 — HEALTH & VULNERABILITY PROFILE (FOR CITIZENS) */}
        {isCitizen && (activeTab === 'health' || activeTab === 'personal') && (
          <Card>
            <CardHeader
              title={t('profile.healthVulnerabilityTab', '2. Health Considerations & Heat Sensitivities')}
              subtitle={t('profile.healthConditionsSubtitle', 'Select any conditions that apply. This helps ThermoShield provide respectful, personalized heat-safety tips.')}
              badge={
                <Badge variant="brand" size="sm">
                  {t('profile.informationalOnly', 'Informational Only')}
                </Badge>
              }
            />
            <CardContent className="space-y-4">
              {/* Informational Disclaimer */}
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs ts-text-muted flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <p className="leading-relaxed">
                  <strong className="ts-text-primary font-semibold">{t('profile.privacySafetyNoteTitle', 'Privacy & Safety Note:')} </strong>
                  {t('profile.privacySafetyNoteText', 'This information helps estimate how strongly heat may affect your body and customizes your recommended water intake and rest breaks. It does not replace medical advice from a doctor.')}
                </p>
              </div>

              {/* Health Conditions Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {HEALTH_CONDITIONS_LIST.map((cond) => {
                  const isChecked = selectedConditions.includes(cond.id);
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => toggleCondition(cond.id)}
                      className={`p-3 rounded-2xl border text-left transition-all duration-150 flex items-start space-x-3 cursor-pointer ${
                        isChecked
                          ? 'bg-orange-500/15 border-orange-500/50 shadow-sm'
                          : 'ts-card-subtle border ts-border hover:border-slate-500/40'
                      }`}
                    >
                      <span className="text-xl flex-shrink-0 mt-0.5">{cond.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isChecked ? 'text-orange-500 dark:text-orange-400' : 'ts-text-primary'}`}>
                            {cond.label}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ml-1 flex-shrink-0 ${
                              isChecked ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-500/50'
                            }`}
                          >
                            {isChecked && '✓'}
                          </div>
                        </div>
                        <p className="text-[11px] ts-text-subtle mt-0.5 leading-snug">
                          {cond.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Vulnerability Factors Chips */}
              <div className="pt-3 border-t ts-border">
                <label className="block text-xs font-semibold ts-text-muted mb-2">
                  {t('profile.additionalFactors', 'Additional Heat Vulnerability Factors:')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPregnant(!isPregnant)}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all ${
                      isPregnant
                        ? 'bg-pink-500/15 border-pink-500/50 text-pink-700 dark:text-pink-300'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    <span>🤰 {t('profile.currentlyPregnant', 'Currently Pregnant')}</span>
                    {isPregnant && <Check className="w-3.5 h-3.5 text-pink-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOutdoorWorker(!isOutdoorWorker)}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all ${
                      isOutdoorWorker
                        ? 'bg-orange-500/15 border-orange-500/50 text-orange-700 dark:text-orange-300'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    <span>👷 {t('profile.outdoorLaborer', 'Outdoor Laborer / Delivery')}</span>
                    {isOutdoorWorker && <Check className="w-3.5 h-3.5 text-orange-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasHeatIllnessHistory(!hasHeatIllnessHistory)}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all ${
                      hasHeatIllnessHistory
                        ? 'bg-red-500/15 border-red-500/50 text-red-700 dark:text-red-300'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    <span>⚠️ {t('profile.pastHeatIllness', 'Past Heat Exhaustion')}</span>
                    {hasHeatIllnessHistory && <Check className="w-3.5 h-3.5 text-red-400" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 3 — DAILY EXPOSURE & ROUTINE (FOR CITIZENS) */}
        {isCitizen && (activeTab === 'exposure' || activeTab === 'personal') && (
          <Card>
            <CardHeader
              title={t('profile.exposureWorkTab', '3. Daily Exposure, Physical Effort & Cooling Access')}
              subtitle={t('profile.exposureSubtitle', 'Heat risk depends greatly on where you spend your day and when you are outside.')}
            />
            <CardContent className="space-y-4">
              {/* Daily Outdoor Time */}
              <div>
                <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                  {t('profile.timeSpentOutdoors', 'Typical Time Spent Outdoors Daily:')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'mostly_indoors', label: t('profile.mostlyIndoors', 'Mostly Indoors'), desc: t('profile.mostlyIndoorsDesc', 'Less than 1 hour outdoors per day') },
                    { id: 'mixed', label: t('profile.mixedOutdoors', 'Mixed Indoor & Outdoor'), desc: t('profile.mixedOutdoorsDesc', '1 to 4 hours in open air / commuting') },
                    { id: 'mostly_outdoors', label: t('profile.mostlyOutdoors', 'Mostly Outdoors'), desc: t('profile.mostlyOutdoorsDesc', 'Over 4 hours under the sun / physical work') },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDailyOutdoorTime(item.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        dailyOutdoorTime === item.id
                          ? 'bg-orange-500/20 border-orange-500/60 font-bold ts-text-primary shadow-sm'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                      }`}
                    >
                      <div className="text-xs">{item.label}</div>
                      <div className="text-[10px] ts-text-subtle mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Activity Level */}
              <div>
                <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                  {t('profile.physicalEffortLevel', 'Physical Effort Level During Peak Heat:')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'sedentary', label: t('profile.effortSedentary', 'Sedentary'), desc: t('profile.effortSedentaryDesc', 'Desk / Resting') },
                    { id: 'light', label: t('profile.effortLight', 'Light'), desc: t('profile.effortLightDesc', 'Walking / Chores') },
                    { id: 'moderate', label: t('profile.effortModerate', 'Moderate'), desc: t('profile.effortModerateDesc', 'Active Labor') },
                    { id: 'heavy', label: t('profile.effortHeavy', 'Heavy'), desc: t('profile.effortHeavyDesc', 'Strenuous Labor') },
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setActivityLevel(act.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        activityLevel === act.id
                          ? 'bg-orange-500/20 border-orange-500/60 font-bold text-orange-500 dark:text-orange-400'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                      }`}
                    >
                      <div className="text-xs">{act.label}</div>
                      <div className="text-[10px] ts-text-subtle mt-0.5">{act.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cooling Access & Peak Time Window */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    {t('profile.coolingAccessLabel', 'Access to Air-Conditioning / Cooling:')}
                  </label>
                  <select
                    value={coolingAccess}
                    onChange={(e) => setCoolingAccess(e.target.value as any)}
                    className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                  >
                    <option value="reliable">{t('profile.coolingReliable', 'Reliable (AC at home and workspace)')}</option>
                    <option value="limited">{t('profile.coolingLimited', 'Sometimes Limited (Fans only, partial cooling)')}</option>
                    <option value="none">{t('profile.coolingNone', 'No Reliable Cooling (Uncooled shelter)')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    {t('profile.peakExposureLabel', 'Typical Peak Exposure Period:')}
                  </label>
                  <select
                    value={typicalPeakExposure}
                    onChange={(e) => setTypicalPeakExposure(e.target.value as any)}
                    className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                  >
                    <option value="morning">{t('profile.peakMorning', 'Morning (Before 11:00 AM)')}</option>
                    <option value="afternoon">{t('profile.peakAfternoon', 'Afternoon (11:00 AM – 4:00 PM peak heat)')}</option>
                    <option value="evening">{t('profile.peakEvening', 'Evening (After 4:00 PM)')}</option>
                    <option value="multiple">{t('profile.peakMultiple', 'Multiple shifts throughout day')}</option>
                  </select>
                </div>
              </div>

              {/* Acclimatization Toggle */}
              <div className="pt-2 border-t ts-border flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold ts-text-primary block">
                    {t('profile.acclimatizationLabel', 'Accustomed to Local Climate (Acclimatization)')}
                  </span>
                  <span className="text-[11px] ts-text-subtle">
                    {t('profile.acclimatizationQuestion', 'Have you lived in this region for more than 2 weeks this season?')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAcclimatized(!isAcclimatized)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isAcclimatized
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                      : 'bg-red-500/15 border border-red-500/40 text-red-400'
                  }`}
                >
                  {isAcclimatized ? `✓ ${t('status.active')}` : `⚠️ ${t('status.incomplete')}`}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 4 — EMERGENCY PREPAREDNESS (OPTIONAL) */}
        {isCitizen && (
          <Card>
            <CardHeader
              title={t('profile.emergencyPrepTab', '4. Heat Preparedness & Respite Resources')}
              subtitle={t('profile.preparednessSubtitle', 'Quick check of your immediate hydration and cooling readiness.')}
            />
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center space-x-2.5 p-3 rounded-xl ts-card-subtle border ts-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDrinkingWater}
                    onChange={(e) => setHasDrinkingWater(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  <div className="text-xs">
                    <span className="font-semibold ts-text-primary block">{t('alerts.hydrationProtocol')}</span>
                    <span className="text-[11px] ts-text-subtle">{t('profile.prepWaterDesc', 'Readily accessible throughout the day')}</span>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 p-3 rounded-xl ts-card-subtle border ts-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasShade}
                    onChange={(e) => setHasShade(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  <div className="text-xs">
                    <span className="font-semibold ts-text-primary block">{t('alerts.activityPacing')}</span>
                    <span className="text-[11px] ts-text-subtle">{t('profile.prepShadeDesc', 'Covered rest area during outdoor work')}</span>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 p-3 rounded-xl ts-card-subtle border ts-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCooling}
                    onChange={(e) => setHasCooling(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  <div className="text-xs">
                    <span className="font-semibold ts-text-primary block">{t('intervention.coolingCentersToggle')}</span>
                    <span className="text-[11px] ts-text-subtle">{t('profile.prepCoolingDesc', 'Home or work refuge under heatwaves')}</span>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 p-3 rounded-xl ts-card-subtle border ts-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={knowsCoolingCenter}
                    onChange={(e) => setKnowsCoolingCenter(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  <div className="text-xs">
                    <span className="font-semibold ts-text-primary block">{t('alerts.vulnerableProtection')}</span>
                    <span className="text-[11px] ts-text-subtle">{t('profile.prepStationDesc', 'Aware of designated civic cooling station')}</span>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* BOTTOM ACTION BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl ts-card-elevated border ts-border">
          <div className="text-xs ts-text-muted">
            <span>{t('profile.footerSecure', 'Profile stored securely in your private browser profile.')}</span>
            <span className="block text-[11px] ts-text-subtle">
              {t('profile.footerCalibrate', 'Updates immediately calibrate Personal Heat Risk and Dashboard alerts.')}
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              {t('profile.saveProfile', 'Save Profile Changes')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Profile;
