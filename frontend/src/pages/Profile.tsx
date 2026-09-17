import React, { useState, useEffect } from 'react';
import { RegionalAlertsPanel } from '../components/RegionalAlertsPanel';
import {
  User,
  HeartPulse,
  MapPin,
  Shield,
  ShieldCheck,
  ShieldAlert,
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
  Bell,
  Sliders,
  BellOff,
  SunDim,
  CloudSun,
  Users,
  RotateCcw,
  LogOut,
  Lock,
  Shirt,
  Wind,
  HelpCircle,
  Activity,
  Heart,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile, useNotificationPreferences } from '../context/ProfileContext';
import { useLocation } from '../context/LocationContext';
import { useLanguage, useTranslation } from '../context/LanguageContext';
import { LanguageCode } from '../i18n/types';
import { Card, CardHeader, CardContent, Badge, Button } from '../components/ui';
import {
  translateProfileSection,
  translateProfileExplanation,
  translateActiveFactor,
} from '../utils/translationHelpers';
import { NotificationDecisionFeed } from '../components/NotificationDecisionFeed';
import { useNotificationDecision } from '../context/NotificationDecisionContext';
import { NotificationMode } from '../types';
import { NotificationChannelLegend } from '../components/alerts/NotificationChannelLegend';

export type ProfileTab =
  | 'personal'
  | 'health'
  | 'exposure'
  | 'preparedness'
  | 'alerts'
  | 'account'
  | 'professional';

interface ProfileProps {
  initialTab?: ProfileTab;
}

export const Profile: React.FC<ProfileProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { locationName, setCoordsAndName, isLocating, detectMyLocation, coords } = useLocation();
  const { currentLanguage, languages, setLanguage } = useLanguage();

  const {
    profile,
    updateProfile,
    updateHealthProfile,
    updateExposureProfile,
    updatePreparedness,
    resetToDefaultProfile,
    completionPercentage,
    isProfileComplete,
    completedSections,
    missingSections,
    personalizationSummary,
    isSaving,
  } = useProfile();

  const {
    preferences: notifPreferences,
    mode: notifMode,
    setMode: setNotifMode,
    updatePreferences: updateNotifPreferences,
    resetPreferences: resetNotifPreferences,
    isSaving: isSavingNotif,
    role,
  } = useNotificationPreferences();

  // Tab State
  const urlTab = searchParams.get('tab') as ProfileTab | null;
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => {
    if (initialTab) return initialTab;
    if (
      urlTab &&
      ['personal', 'health', 'exposure', 'preparedness', 'alerts', 'account', 'professional'].includes(urlTab)
    ) {
      return urlTab;
    }
    return 'personal';
  });

  // Sync tab with URL search parameter
  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // Section 1: Personal info
  const [fullName, setFullName] = useState(profile.fullName || '');
  const [age, setAge] = useState<number | string>(profile.age ?? '');
  const [gender, setGender] = useState(profile.gender || '');
  const [city, setCity] = useState(profile.city || '');
  const [state, setState] = useState(profile.state || '');
  const [district, setDistrict] = useState(profile.district || '');
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferences?.preferredLanguage || 'English');

  // Section 2: Health factors
  const [selectedConditions, setSelectedConditions] = useState<string[]>(profile.health?.conditions || []);
  const [isPregnant, setIsPregnant] = useState(profile.health?.isPregnant || false);
  const [isOutdoorWorker, setIsOutdoorWorker] = useState(profile.health?.isOutdoorWorker || false);
  const [hasHeatIllnessHistory, setHasHeatIllnessHistory] = useState(profile.health?.hasHeatIllnessHistory || false);
  const [takesMedication, setTakesMedication] = useState(profile.health?.takesMedication || false);
  const [smoking, setSmoking] = useState(profile.health?.smoking || false);

  // Section 3: Exposure
  const [dailyOutdoorTime, setDailyOutdoorTime] = useState(profile.exposure?.dailyOutdoorTime || 'mixed');
  const [activityLevel, setActivityLevel] = useState(profile.exposure?.activityLevel || 'moderate');
  const [typicalPeakExposure, setTypicalPeakExposure] = useState(profile.exposure?.typicalPeakExposure || 'afternoon');
  const [isAcclimatized, setIsAcclimatized] = useState(profile.exposure?.isAcclimatized ?? true);

  // Section 4: Clothing, Cooling & Preparedness
  const [clothingType, setClothingType] = useState(profile.exposure?.clothingType || 'standard');
  const [coolingAccess, setCoolingAccess] = useState(profile.exposure?.coolingAccess || 'limited');
  const [hydrationHabit, setHydrationHabit] = useState(profile.exposure?.hydrationHabit || 'moderate');
  const [hasDrinkingWater, setHasDrinkingWater] = useState(profile.preparedness?.hasDrinkingWaterAccess ?? true);
  const [hasCooling, setHasCooling] = useState(profile.preparedness?.hasCoolingAccess ?? false);
  const [hasShade, setHasShade] = useState(profile.preparedness?.hasShadeAccess ?? true);
  const [knowsCoolingCenter, setKnowsCoolingCenter] = useState(profile.preparedness?.knowsCoolingCenter ?? false);

  // Professional fields
  const [organization, setOrganization] = useState(profile.organization || '');
  const [jurisdiction, setJurisdiction] = useState(profile.jurisdiction || '');
  const [department, setDepartment] = useState(profile.department || '');

  // UI state
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [showCloExplainer, setShowCloExplainer] = useState(false);
  const [showDecisionFeed, setShowDecisionFeed] = useState(false);
  const [testNotifSent, setTestNotifSent] = useState(false);

  // Device Notifications integration (Prompt 16)
  const { devicePermission, requestDevicePermission, sendTestNotification } = useNotificationDecision();

  const isCitizen = !profile.role || profile.role === 'user';

  // Sync state whenever profile switches
  useEffect(() => {
    setFullName(profile.fullName || '');
    setAge(profile.age ?? '');
    setGender(profile.gender || '');
    setCity(profile.city || '');
    setState(profile.state || '');
    setDistrict(profile.district || '');
    setPreferredLanguage(profile.preferences?.preferredLanguage || 'English');
    setSelectedConditions(profile.health?.conditions || []);
    setIsPregnant(profile.health?.isPregnant || false);
    setIsOutdoorWorker(profile.health?.isOutdoorWorker || false);
    setHasHeatIllnessHistory(profile.health?.hasHeatIllnessHistory || false);
    setTakesMedication(profile.health?.takesMedication || false);
    setSmoking(profile.health?.smoking || false);
    setDailyOutdoorTime(profile.exposure?.dailyOutdoorTime || 'mixed');
    setActivityLevel(profile.exposure?.activityLevel || 'moderate');
    setTypicalPeakExposure(profile.exposure?.typicalPeakExposure || 'afternoon');
    setIsAcclimatized(profile.exposure?.isAcclimatized ?? true);
    setClothingType(profile.exposure?.clothingType || 'standard');
    setCoolingAccess(profile.exposure?.coolingAccess || 'limited');
    setHydrationHabit(profile.exposure?.hydrationHabit || 'moderate');
    setHasDrinkingWater(profile.preparedness?.hasDrinkingWaterAccess ?? true);
    setHasCooling(profile.preparedness?.hasCoolingAccess ?? false);
    setHasShade(profile.preparedness?.hasShadeAccess ?? true);
    setKnowsCoolingCenter(profile.preparedness?.knowsCoolingCenter ?? false);
    setOrganization(profile.organization || '');
    setJurisdiction(profile.jurisdiction || '');
    setDepartment(profile.department || '');
  }, [profile]);

  const toggleCondition = (condId: string) => {
    setSelectedConditions((prev) =>
      prev.includes(condId) ? prev.filter((c) => c !== condId) : [...prev, condId]
    );
  };

  const handleSetHomeFromMonitored = () => {
    if (!locationName) return;
    const parts = locationName.split(',').map((p) => p.trim());
    if (parts[0]) setCity(parts[0]);
    if (parts[1]) setState(parts[1]);
    setSaveSuccessMsg(`Home location set to "${locationName}". Click "Save Changes" to persist to your profile.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleSyncSessionToHome = () => {
    if (!city) {
      alert('Please enter your home city and state first.');
      return;
    }
    const targetName = state ? `${city}, ${state}` : city;
    setCoordsAndName(coords, targetName);
    setSaveSuccessMsg(`Switched active session monitored area to your home: ${targetName}.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
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

    setSaveSuccessMsg('Profile updated successfully! Changes are active across ThermoShield.');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Notification Preferences handlers
  const handleModeChange = async (newMode: NotificationMode) => {
    await setNotifMode(newMode);
    setSaveSuccessMsg('Your changes were saved.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleToggleNotif = async (
    category: 'heatSafety' | 'personalReminders' | 'preferredConditions' | 'locationContext' | 'familyProtection',
    key: string,
    currentValue: boolean
  ) => {
    const isPreset = notifMode !== 'personalized';
    const updatedCategory = {
      ...notifPreferences[category],
      [key]: !currentValue,
    };

    if (isPreset) {
      await updateNotifPreferences({
        mode: 'personalized',
        [category]: updatedCategory,
      });
    } else {
      await updateNotifPreferences({
        [category]: updatedCategory,
      });
    }
    setSaveSuccessMsg('Your changes were saved.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleResetNotif = async () => {
    await resetNotifPreferences();
    setSaveSuccessMsg('Notification preferences reset to defaults.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleResetProfile = () => {
    if (window.confirm('Are you sure you want to reset your profile to default settings?')) {
      resetToDefaultProfile();
      setSaveSuccessMsg('Profile reset to default settings.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  // Health Conditions Metadata
  const HEALTH_CONDITIONS_LIST = [
    {
      id: 'heart_disease',
      label: t('profile.condHeart', 'Cardiovascular & Heart Condition'),
      desc: t('profile.condHeartDesc', 'Heat increases cardiac output demand and heart rate strain.'),
      icon: '❤️',
    },
    {
      id: 'hypertension',
      label: t('profile.condHypertension', 'High Blood Pressure (Hypertension)'),
      desc: t('profile.condHypertensionDesc', 'Impacts peripheral vascular expansion and salt balance.'),
      icon: '🩺',
    },
    {
      id: 'asthma',
      label: t('profile.condBreathing', 'Asthma or Respiratory Sensitivity'),
      desc: t('profile.condBreathingDesc', 'Hot air and summer ground ozone aggravate airway resistance.'),
      icon: '🫁',
    },
    {
      id: 'diabetes',
      label: t('profile.condDiabetes', 'Diabetes or Metabolic Condition'),
      desc: t('profile.condDiabetesDesc', 'May reduce sweating efficiency and accelerate fluid loss.'),
      icon: '🩸',
    },
    {
      id: 'kidney_disease',
      label: t('profile.condKidney', 'Kidney or Renal Sensitivity'),
      desc: t('profile.condKidneyDesc', 'Rapid dehydration increases vulnerability to acute kidney injury.'),
      icon: '🧪',
    },
    {
      id: 'mobility',
      label: t('profile.condMobility', 'Mobility or Neurological Limitation'),
      desc: t('profile.condMobilityDesc', 'May restrict quick physical access to cool respite shelters.'),
      icon: '🧠',
    },
  ];

  // Accessible Notification Toggle Item Component
  const ToggleItem = ({
    id,
    title,
    description,
    checked,
    onChange,
    badge,
    icon: Icon,
    isEssential = false,
  }: {
    id: string;
    title: string;
    description: string;
    checked: boolean;
    onChange: () => void;
    badge?: string;
    icon?: React.ComponentType<{ className?: string }>;
    isEssential?: boolean;
  }) => {
    return (
      <div
        onClick={onChange}
        className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
          checked
            ? 'ts-card-elevated border-orange-500/30 hover:border-orange-500/50'
            : 'ts-card-subtle border ts-border opacity-75 hover:opacity-100'
        }`}
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange();
          }
        }}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {Icon && (
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                checked
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                  : 'ts-card-subtle ts-text-muted'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span id={`${id}-label`} className="text-xs sm:text-sm font-bold ts-text-primary">
                {title}
              </span>
              {badge && (
                <span
                  className={`text-[9.5px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                    isEssential
                      ? 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {badge}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs ts-text-muted mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Switch Knob */}
        <div className="shrink-0 pt-0.5">
          <div
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
              checked ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                checked ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>
    );
  };

  // Tab definitions
  const tabs: { id: ProfileTab; label: string; icon: any; badge?: number }[] = [
    { id: 'personal', label: '1. My Information', icon: User },
    {
      id: 'health',
      label: '2. Health & Heat Sensitivity',
      icon: HeartPulse,
      badge: selectedConditions.length > 0 ? selectedConditions.length : undefined,
    },
    { id: 'exposure', label: '3. Daily Heat Exposure', icon: Sun },
    { id: 'preparedness', label: '4. Cooling & Preparedness', icon: ShieldCheck },
    { id: 'alerts', label: '5. Alert Preferences', icon: Bell },
    { id: 'account', label: '6. Privacy & Account', icon: Lock },
    ...(!isCitizen
      ? [{ id: 'professional' as ProfileTab, label: '7. Civic Jurisdiction & Role', icon: Building2 }]
      : []),
  ];

  const currentTabIndex = tabs.findIndex((t) => t.id === activeTab);
  const nextTab = currentTabIndex < tabs.length - 1 ? tabs[currentTabIndex + 1] : null;
  const prevTab = currentTabIndex > 0 ? tabs[currentTabIndex - 1] : null;

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
              Personalized Civic Protection • SIH26083
            </span>
            <Badge variant="brand" size="sm">
              {profile.role.toUpperCase()}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold ts-text-primary font-sans mt-0.5">
            My Profile & Safety Preferences
          </h1>
          <p className="text-sm ts-text-muted mt-1 max-w-2xl">
            Manage what information ThermoShield knows about your routine and health, and choose what early-warning alerts and hydration prompts you receive.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start md:self-auto flex-wrap gap-y-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => handleSaveAll()}
            isLoading={isSaving || isSavingNotif}
            leftIcon={saveSuccessMsg ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
            className="shadow-md"
          >
            {saveSuccessMsg ? 'Saved' : 'Save Changes'}
          </Button>

          <Link
            to="/personal-risk"
            className="px-3.5 py-2 rounded-xl text-xs font-bold ts-card-subtle hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 border ts-border ts-text-primary transition-all flex items-center space-x-1.5"
          >
            <HeartPulse className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span>View Personal Risk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200">{saveSuccessMsg}</p>
              <p className="text-emerald-700 dark:text-emerald-300/80 mt-0.5">
                Your personal risk calculations, work-rest cycles, and notification delivery are calibrated with your latest settings.
              </p>
            </div>
          </div>
          <Badge variant="low" size="sm">Active</Badge>
        </div>
      )}

      {/* Profile Completeness & Personalization Transparency Card */}
      <Card variant="elevated" className="p-4 sm:p-6 border-orange-500/30 overflow-hidden relative shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Profile Setup & Health Calibration
              </span>
              <span className="text-xs font-mono font-bold ts-text-primary">
                {completionPercentage}% Complete
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
                ? 'Your profile is complete! ThermoShield is generating high-accuracy personalized heat advisories and calibrated work-rest cycles.'
                : `Your profile is ${completionPercentage}% complete. Adding your outdoor activity, health factors, and cooling access helps calibrate personal heat strain and hydration targets.`}
            </p>

            {/* Completed & Missing Section Chips */}
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
                  <span>Missing: {translateProfileSection(item, t)}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Personalization Transparency Box */}
          <div className="w-full lg:w-80 p-3.5 rounded-2xl ts-card-subtle border ts-border shrink-0 text-xs">
            <div className="font-bold ts-text-primary flex items-center justify-between pb-2 border-b ts-border">
              <span>How ThermoShield Personalizes</span>
              <Badge
                variant={personalizationSummary.status === 'full' ? 'low' : 'moderate'}
                size="sm"
              >
                {personalizationSummary.status === 'full' ? 'Personalized' : 'General Baseline'}
              </Badge>
            </div>
            <div className="mt-2 text-[11px] ts-text-muted space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Grounded in your physiological parameters:</span>
              </div>
              <div className="grid grid-cols-2 gap-1 pt-1 font-medium ts-text-primary">
                <span className="flex items-center gap-1">✓ Age & Sensitivities</span>
                <span className="flex items-center gap-1">✓ Work Pacing (ISO 7243)</span>
                <span className="flex items-center gap-1">✓ Cooling & Attire (clo)</span>
                <span className="flex items-center gap-1">✓ Local Monitored Weather</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* NAVIGATION TABS: Responsive 6-Part Architecture */}
      <div className="flex items-center space-x-1.5 border-b ts-border pb-2 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                isActive
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'ts-card-subtle ts-text-muted hover:ts-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}
      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* ========================================================= */}
        {/* SECTION 1 — MY INFORMATION                                */}
        {/* ========================================================= */}
        {activeTab === 'personal' && (
          <Card>
            <CardHeader
              title="1. My Information & Monitored Location"
              subtitle="Who you are and where ThermoShield should monitor local heat conditions for you."
            />
            <CardContent className="space-y-5">
              {/* Location Architecture: Clear separation between Active Session Monitored Area & Permanent Home Location */}
              <div className="p-4 rounded-2xl ts-card-subtle border ts-border space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b ts-border">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-bold ts-text-primary">
                      Location Strategy: Monitored vs. Permanent Home
                    </span>
                  </div>
                  <Badge variant="brand" size="sm">Separated</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {/* Active Monitored Area */}
                  <div className="p-3 rounded-xl ts-card border ts-border flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                        Active Monitored Area (Current Session)
                      </div>
                      <div className="text-sm font-bold ts-text-primary mt-1">
                        {locationName || 'GPS Location Not Detected'}
                      </div>
                      <p className="text-[10.5px] ts-text-subtle mt-1 leading-relaxed">
                        The area currently powering your heat map, weather widgets, and live thermal strain calculations.
                      </p>
                    </div>
                    <div className="pt-3 mt-2 border-t ts-border flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSetHomeFromMonitored}
                        leftIcon={<Home className="w-3.5 h-3.5 text-orange-500" />}
                        className="text-[11px] w-full"
                      >
                        Copy this Area to Home
                      </Button>
                    </div>
                  </div>

                  {/* Permanent Home Location */}
                  <div className="p-3 rounded-xl ts-card border ts-border flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Permanent Home Location (Saved in Profile)
                      </div>
                      <div className="text-sm font-bold ts-text-primary mt-1">
                        {city ? `${city}${state ? `, ${state}` : ''}` : 'Not configured yet'}
                      </div>
                      <p className="text-[10.5px] ts-text-subtle mt-1 leading-relaxed">
                        Used for baseline vulnerability, morning alerts, and personalized civic protection.
                      </p>
                    </div>
                    <div className="pt-3 mt-2 border-t ts-border flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!city}
                        onClick={handleSyncSessionToHome}
                        leftIcon={<Compass className="w-3.5 h-3.5 text-emerald-500" />}
                        className="text-[11px] w-full"
                      >
                        Sync Active Session to Home
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] ts-text-muted leading-relaxed pt-1">
                  💡 <strong>Privacy & Exploration Rule:</strong> Searching or exploring other cities (e.g. Delhi, Mumbai, Jaipur) on the heat map or forecast updates your temporary session only — your permanent home profile is never overwritten silently.
                </p>
              </div>

              {/* Personal Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    Full Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                  />
                </div>

                {/* Age */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold ts-text-muted">
                      Age (Years):
                    </label>
                    <span className="text-[11px] ts-text-subtle">
                      Used to calibrate cardiovascular thermal strain
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={110}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 34"
                    className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none font-mono"
                  />
                  <div className="flex justify-between text-[10px] ts-text-subtle mt-1 px-1">
                    <span>Child (&lt;12)</span>
                    <span>Adult (13–64)</span>
                    <span>Senior (65+)</span>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    Gender (Optional):
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full p-2.5 ts-input text-xs ts-text-primary rounded-xl focus:outline-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                {/* Advisory Language */}
                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    Preferred Advisory Language / भाषा:
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

              {/* Location Fields */}
              <div className="pt-3 border-t ts-border">
                <label className="block text-xs font-bold ts-text-primary mb-2">
                  Profile Home Location Details:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold ts-text-muted mb-1">City / Town:</label>
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
                    <label className="block text-xs font-semibold ts-text-muted mb-1">State:</label>
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
                    <label className="block text-xs font-semibold ts-text-muted mb-1">District / Ward (Optional):</label>
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

        {/* ========================================================= */}
        {/* SECTION 2 — HEALTH & HEAT SENSITIVITY                     */}
        {/* ========================================================= */}
        {activeTab === 'health' && (
          <Card>
            <CardHeader
              title="2. Health Conditions & Heat Sensitivity"
              subtitle="Are there health or life-stage factors that may make heat harder for you?"
              badge={
                <Badge variant="brand" size="sm">
                  Informational Only
                </Badge>
              }
            />
            <CardContent className="space-y-4">
              {/* Respectful Health Privacy Callout */}
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs ts-text-muted flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                <div className="leading-relaxed">
                  <strong className="ts-text-primary font-semibold">Why do we ask? </strong>
                  Select anything that applies to you. These details help make your heat-risk guidance more relevant. This may increase your risk during very hot weather. They are not used to diagnose illness.
                </div>
              </div>

              {/* Conditions List */}
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
                      <span className="text-xl shrink-0 mt-0.5">{cond.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isChecked ? 'text-orange-700 dark:text-orange-400' : 'ts-text-primary'}`}>
                            {cond.label}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ml-1 shrink-0 ${
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

              {/* Life-Stage & Sensitivities */}
              <div className="pt-3 border-t ts-border">
                <label className="block text-xs font-semibold ts-text-muted mb-2">
                  Life Stage & Daily Sensitivities:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPregnant(!isPregnant)}
                    className={`p-3 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all cursor-pointer ${
                      isPregnant
                        ? 'bg-pink-500/15 border-pink-500/50 text-pink-700 dark:text-pink-300'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>🤰</span>
                        <span>Currently Pregnant</span>
                      </div>
                      <div className="text-[10.5px] ts-text-subtle mt-0.5">Higher core thermal strain</div>
                    </div>
                    {isPregnant && <Check className="w-4 h-4 text-pink-500 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTakesMedication(!takesMedication)}
                    className={`p-3 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all cursor-pointer ${
                      takesMedication
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>💊</span>
                        <span>Heat-Sensitive Medication</span>
                      </div>
                      <div className="text-[10.5px] ts-text-subtle mt-0.5">Diuretics or blood pressure meds</div>
                    </div>
                    {takesMedication && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasHeatIllnessHistory(!hasHeatIllnessHistory)}
                    className={`p-3 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all cursor-pointer ${
                      hasHeatIllnessHistory
                        ? 'bg-red-500/15 border-red-500/50 text-red-700 dark:text-red-300'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>⚠️</span>
                        <span>Past Heat Exhaustion</span>
                      </div>
                      <div className="text-[10.5px] ts-text-subtle mt-0.5">Prior heat stroke or collapse</div>
                    </div>
                    {hasHeatIllnessHistory && <Check className="w-4 h-4 text-red-500 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSmoking(!smoking)}
                    className={`p-3 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all cursor-pointer ${
                      smoking
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>🚬</span>
                        <span>Regular Smoker</span>
                      </div>
                      <div className="text-[10.5px] ts-text-subtle mt-0.5">Limits vascular heat dissipation</div>
                    </div>
                    {smoking && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOutdoorWorker(!isOutdoorWorker)}
                    className={`p-3 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all cursor-pointer ${
                      isOutdoorWorker
                        ? 'bg-orange-500/15 border-orange-500/50 text-orange-700 dark:text-orange-300'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>👷</span>
                        <span>Regular Outdoor Worker</span>
                      </div>
                      <div className="text-[10.5px] ts-text-subtle mt-0.5">Agriculture, delivery, construction</div>
                    </div>
                    {isOutdoorWorker && <Check className="w-4 h-4 text-orange-500 shrink-0" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================= */}
        {/* SECTION 3 — DAILY HEAT EXPOSURE                           */}
        {/* ========================================================= */}
        {activeTab === 'exposure' && (
          <Card>
            <CardHeader
              title="3. Daily Heat Exposure & Activity Routine"
              subtitle="How much heat are you normally exposed to, and when are you outside?"
            />
            <CardContent className="space-y-5">
              {/* Daily Outdoor Routine */}
              <div>
                <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                  Typical Daily Outdoor Exposure:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'mostly_indoors', label: 'Mostly Indoors', desc: 'Less than 1 hour outdoors per day (offices, home, enclosed spaces)' },
                    { id: 'mixed', label: 'Mixed Indoor & Outdoor', desc: '1 to 4 hours in open air (commuting, errands, periodic outdoor periods)' },
                    { id: 'mostly_outdoors', label: 'Mostly Outdoors', desc: 'Over 4 hours under direct sun (fieldwork, delivery, manual labor)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDailyOutdoorTime(item.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        dailyOutdoorTime === item.id
                          ? 'bg-orange-500/20 border-orange-500/60 font-bold ts-text-primary shadow-sm'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10.5px] ts-text-subtle mt-1 leading-snug">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                  Typical Activity Level During Peak Hours:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'sedentary', label: 'Mostly Resting', desc: 'Desk work, seated, reading' },
                    { id: 'light', label: 'Light Activity', desc: 'Walking, teaching, light chores' },
                    { id: 'moderate', label: 'Moderate Activity', desc: 'Brisk walking, cycling, active tasks' },
                    { id: 'heavy', label: 'Heavy Physical Activity', desc: 'Vigorous construction, farming, sports' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setActivityLevel(act.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        activityLevel === act.id
                          ? 'bg-orange-500/20 border-orange-500/60 font-bold text-orange-600 dark:text-orange-400'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                      }`}
                    >
                      <div className="text-xs font-bold">{act.label}</div>
                      <div className="text-[10px] ts-text-subtle mt-0.5">{act.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Peak Exposure Hours */}
              <div>
                <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                  When are you usually outside?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'morning', label: 'Morning', desc: 'Before 11:00 AM' },
                    { id: 'afternoon', label: 'Afternoon', desc: '11:00 AM – 4:00 PM (Peak Heat)' },
                    { id: 'evening', label: 'Evening', desc: 'After 4:00 PM' },
                    { id: 'mixed', label: 'Mixed Shifts', desc: 'Varies throughout the day' },
                  ].map((peak) => (
                    <button
                      key={peak.id}
                      type="button"
                      onClick={() => setTypicalPeakExposure(peak.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        typicalPeakExposure === peak.id
                          ? 'bg-orange-500/20 border-orange-500/60 font-bold text-orange-600 dark:text-orange-400'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                      }`}
                    >
                      <div className="text-xs font-bold">{peak.label}</div>
                      <div className="text-[10px] ts-text-subtle mt-0.5">{peak.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Acclimatization Status */}
              <div className="p-4 rounded-xl ts-card-subtle border ts-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold ts-text-primary block">
                    Used to hot weather? (Heat Adaptation)
                  </span>
                  <span className="text-[11px] ts-text-muted mt-0.5 block leading-relaxed">
                    Helps calculate how your body responds to thermal stress. Living in hot weather for 2+ weeks allows sweat mechanisms to adapt.
                  </span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAcclimatized(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isAcclimatized
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    ✓ Used to Hot Weather
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAcclimatized(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !isAcclimatized
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    ⚠️ New to Hot Climate
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================= */}
        {/* SECTION 4 — COOLING, CLOTHING & PREPAREDNESS             */}
        {/* ========================================================= */}
        {activeTab === 'preparedness' && (
          <Card>
            <CardHeader
              title="4. Clothing, Cooling & Preparedness"
              subtitle="Practical resources that help your body dissipate heat and stay hydrated."
            />
            <CardContent className="space-y-5">
              {/* Typical Clothing Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold ts-text-muted">
                    Typical Work & Daily Attire:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCloExplainer(!showCloExplainer)}
                    className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showCloExplainer ? 'Hide Details' : 'Learn more (Clothing insulation / clo)'}</span>
                  </button>
                </div>

                {showCloExplainer && (
                  <div className="p-3 mb-3 rounded-xl bg-orange-500/10 border border-orange-500/25 text-xs ts-text-muted leading-relaxed">
                    <strong className="ts-text-primary">Clothing insulation (clo rating): </strong>
                    This helps estimate how easily your body can lose heat through sweat evaporation and airflow. Standard clothing has an insulation value of ~0.6–0.7 clo, while heavy protective uniforms can exceed 1.5 clo, trapping substantial metabolic heat.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'light', label: 'Light, Loose Clothing', desc: 'Cotton, breathable fabrics, open sandals (~0.3 clo)' },
                    { id: 'standard', label: 'Standard Work/School Clothing', desc: 'Shirts, pants, standard closed work uniform (~0.7 clo)' },
                    { id: 'heavy_protective', label: 'Heavy Protective Clothing', desc: 'Overalls, boots, helmet, PPE or safety gear (~1.8 clo)' },
                  ].map((cloth) => (
                    <button
                      key={cloth.id}
                      type="button"
                      onClick={() => setClothingType(cloth.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        clothingType === cloth.id
                          ? 'bg-orange-500/20 border-orange-500/60 font-bold ts-text-primary shadow-sm'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                      }`}
                    >
                      <div className="text-xs font-bold">{cloth.label}</div>
                      <div className="text-[10.5px] ts-text-subtle mt-1 leading-snug">{cloth.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cooling Access */}
              <div className="pt-3 border-t ts-border">
                <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                  Do you have a cool place to rest during the hottest hours?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'reliable', label: 'Yes, Usually', desc: 'Air conditioning or cool indoor sanctuary accessible' },
                    { id: 'limited', label: 'Sometimes / Limited', desc: 'Fans or shaded rooms, but can get quite warm' },
                    { id: 'none', label: 'No Reliable Cool Place', desc: 'Direct heat exposure, unshaded hot spaces' },
                  ].map((cool) => (
                    <button
                      key={cool.id}
                      type="button"
                      onClick={() => setCoolingAccess(cool.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        coolingAccess === cool.id
                          ? 'bg-orange-500/20 border-orange-500/60 font-bold ts-text-primary shadow-sm'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                      }`}
                    >
                      <div className="text-xs font-bold">{cool.label}</div>
                      <div className="text-[10.5px] ts-text-subtle mt-1 leading-snug">{cool.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Emergency Preparedness Checklist */}
              <div className="pt-3 border-t ts-border">
                <label className="block text-xs font-bold ts-text-primary mb-2">
                  Emergency Preparedness & Water Access:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-start space-x-3 p-3.5 rounded-xl ts-card-subtle border ts-border cursor-pointer hover:border-orange-500/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={hasDrinkingWater}
                      onChange={(e) => setHasDrinkingWater(e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold ts-text-primary block">Drinking Water Always Available</span>
                      <span className="text-[11px] ts-text-muted">Clean potable water readily accessible throughout work hours</span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3.5 rounded-xl ts-card-subtle border ts-border cursor-pointer hover:border-orange-500/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={hasShade}
                      onChange={(e) => setHasShade(e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold ts-text-primary block">Shaded Rest Area Available</span>
                      <span className="text-[11px] ts-text-muted">Can take shaded breathers during outdoor work shifts</span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3.5 rounded-xl ts-card-subtle border ts-border cursor-pointer hover:border-orange-500/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={hasCooling}
                      onChange={(e) => setHasCooling(e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold ts-text-primary block">Air Cooler or Air Conditioner</span>
                      <span className="text-[11px] ts-text-muted">Active mechanical cooling at living quarters or workspace</span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3.5 rounded-xl ts-card-subtle border ts-border cursor-pointer hover:border-orange-500/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={knowsCoolingCenter}
                      onChange={(e) => setKnowsCoolingCenter(e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold ts-text-primary block">Aware of Nearest Cooling Centre</span>
                      <span className="text-[11px] ts-text-muted">Know location of community respite hall or public cooling station</span>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================= */}
        {/* SECTION 5 — ALERT PREFERENCES                             */}
        {/* ========================================================= */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* CHANNEL DELIVERY REALITY — shown first so preferences are contextualized */}
            <NotificationChannelLegend />
            <RegionalAlertsPanel />

            {/* DEVICE NOTIFICATIONS DELIVERY CONTROLS */}
            <Card variant="elevated">
              <CardHeader
                title="Browser Notifications (Web Notification API)"
                subtitle="Browser Notifications via the Web Notification API. These are not background Web Push notifications and do not provide service-worker push delivery after the web application is closed."
                badge={
                  devicePermission === 'granted' ? (
                    <Badge variant="low" size="sm">
                      Active
                    </Badge>
                  ) : devicePermission === 'denied' ? (
                    <Badge variant="extreme" size="sm">
                      Blocked
                    </Badge>
                  ) : devicePermission === 'unsupported' ? (
                    <Badge variant="neutral" size="sm">
                      Unsupported
                    </Badge>
                  ) : (
                    <Badge variant="high" size="sm">
                      Available
                    </Badge>
                  )
                }
              />
              <CardContent className="space-y-4">
                {devicePermission === 'granted' && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-bold ts-text-primary flex items-center gap-1.5">
                          <span>Device notifications enabled</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <p className="text-xs ts-text-muted mt-0.5 leading-relaxed">
                          Browser Notifications via the Web Notification API are enabled. Alerts are delivered while ThermoShield is open in the browser. These are not background Web Push notifications.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const ok = sendTestNotification();
                          if (ok) {
                            setTestNotifSent(true);
                            setTimeout(() => setTestNotifSent(false), 4000);
                          }
                        }}
                        leftIcon={<Bell className="w-3.5 h-3.5 text-emerald-500" />}
                        className="text-xs font-bold"
                      >
                        {testNotifSent ? 'Test Sent!' : 'Send Test Notification'}
                      </Button>
                    </div>
                  </div>
                )}

                {devicePermission === 'default' && (
                  <div className="p-4 rounded-2xl ts-card-subtle border ts-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <Bell className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-bold ts-text-primary">
                          Browser notifications are available but not enabled.
                        </div>
                        <p className="text-xs ts-text-muted mt-0.5 leading-relaxed">
                          Enable browser notification permission to receive urgent thermal stress warnings while ThermoShield is open or in a background tab. Requires an active browser session.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={requestDevicePermission}
                      leftIcon={<Bell className="w-3.5 h-3.5" />}
                      className="text-xs font-bold shrink-0"
                    >
                      Enable Device Notifications
                    </Button>
                  </div>
                )}

                {devicePermission === 'denied' && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-bold text-red-700 dark:text-red-300">
                          Notifications are blocked by your browser settings.
                        </div>
                        <p className="text-xs ts-text-muted mt-1 leading-relaxed">
                          Update notification permissions in your browser settings to enable alerts. In-app notification feeds will continue operating normally.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {devicePermission === 'unsupported' && (
                  <div className="p-4 rounded-2xl ts-card-subtle border ts-border flex items-start space-x-3">
                    <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold ts-text-primary">
                        Browser notifications are not supported in this browser.
                      </div>
                      <p className="text-xs ts-text-muted mt-0.5 leading-relaxed">
                        Your current browser does not support the Web Notification API. ThermoShield will continue delivering all approved alerts through the in-app notification feed.
                      </p>
                    </div>
                  </div>
                )}

                <div className="text-[11px] ts-text-subtle flex items-center space-x-1.5 pt-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Browser Notifications via the Web Notification API respect all cooldowns, quiet hours, and your selected preference mode. These are not background Web Push notifications and do not provide service-worker push delivery after the web application is closed.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Notification Mode Selector */}
            <Card variant="elevated">
              <CardHeader
                title="How much should ThermoShield notify you?"
                subtitle="Choose the notification balance that fits your day. Warnings are grounded in live thermal data and anti-spam cooldowns."
                badge={
                  <Badge variant="brand" size="sm">
                    Mode: {notifMode.toUpperCase()}
                  </Badge>
                }
              />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* ESSENTIAL */}
                  <button
                    type="button"
                    onClick={() => handleModeChange('essential')}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      notifMode === 'essential'
                        ? 'bg-orange-500/15 border-orange-500 shadow-md ring-2 ring-orange-500/20'
                        : 'ts-card-subtle border ts-border hover:border-slate-400/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 ts-text-subtle uppercase">
                          Essential
                        </span>
                      </div>
                      <div className="text-sm font-bold ts-text-primary">Essential Only</div>
                      <p className="text-[11px] ts-text-muted mt-1 leading-relaxed">
                        Important heat warnings and emergencies only. 0% noise, max safety.
                      </p>
                    </div>
                  </button>

                  {/* SMART (Recommended) */}
                  <button
                    type="button"
                    onClick={() => handleModeChange('smart')}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      notifMode === 'smart'
                        ? 'bg-orange-500/15 border-orange-500 shadow-md ring-2 ring-orange-500/20'
                        : 'ts-card-subtle border ts-border hover:border-slate-400/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-xl bg-orange-500/20 text-orange-600 dark:text-orange-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-700 dark:text-orange-300 uppercase">
                          Recommended
                        </span>
                      </div>
                      <div className="text-sm font-bold ts-text-primary">Smart Balanced</div>
                      <p className="text-[11px] ts-text-muted mt-1 leading-relaxed">
                        Warnings + reminders based on your personal risk, predicted heat, and exposure.
                      </p>
                    </div>
                  </button>

                  {/* PERSONALIZED */}
                  <button
                    type="button"
                    onClick={() => handleModeChange('personalized')}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      notifMode === 'personalized'
                        ? 'bg-orange-500/15 border-orange-500 shadow-md ring-2 ring-orange-500/20'
                        : 'ts-card-subtle border ts-border hover:border-slate-400/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Sliders className="w-4 h-4 text-sky-500" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 ts-text-subtle uppercase">
                          Custom
                        </span>
                      </div>
                      <div className="text-sm font-bold ts-text-primary">Personalized</div>
                      <p className="text-[11px] ts-text-muted mt-1 leading-relaxed">
                        Full manual control over each individual notification category below.
                      </p>
                    </div>
                  </button>

                  {/* QUIET */}
                  <button
                    type="button"
                    onClick={() => handleModeChange('quiet')}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      notifMode === 'quiet'
                        ? 'bg-orange-500/15 border-orange-500 shadow-md ring-2 ring-orange-500/20'
                        : 'ts-card-subtle border ts-border hover:border-slate-400/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <BellOff className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 ts-text-subtle uppercase">
                          Quiet
                        </span>
                      </div>
                      <div className="text-sm font-bold ts-text-primary">Quiet Hours</div>
                      <p className="text-[11px] ts-text-muted mt-1 leading-relaxed">
                        Suppresses routine alerts. Extreme emergency heat warnings remain active.
                      </p>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* CATEGORY 1: IMPORTANT HEAT WARNINGS (Mandatory / Essential) */}
            <Card variant="elevated">
              <CardHeader
                title="Important Heat Warnings"
                subtitle="Life-safety alerts that protect against severe thermal stress, dehydration collapse, and heat stroke."
                badge={
                  <Badge variant="extreme" size="sm">
                    Critical Safety
                  </Badge>
                }
              />
              <CardContent className="space-y-3">
                <ToggleItem
                  id="notif-crit-risk"
                  title="High or Extreme Heat Risk Alerts"
                  description="Instant advisory when your monitored region shifts into dangerous or extreme thermal risk tiers."
                  checked={notifPreferences.heatSafety.criticalRiskChanges}
                  onChange={() =>
                    handleToggleNotif('heatSafety', 'criticalRiskChanges', notifPreferences.heatSafety.criticalRiskChanges)
                  }
                  badge="Essential"
                  isEssential
                  icon={Flame}
                />
                <ToggleItem
                  id="notif-extreme-warn"
                  title="Official Extreme Heatwave Warnings"
                  description="High-priority declarations aligned with meteorological red alerts and disaster management protocols."
                  checked={notifPreferences.heatSafety.extremeWarnings}
                  onChange={() =>
                    handleToggleNotif('heatSafety', 'extremeWarnings', notifPreferences.heatSafety.extremeWarnings)
                  }
                  badge="Essential"
                  isEssential
                  icon={ShieldAlert}
                />
                <ToggleItem
                  id="notif-sudden-worsen"
                  title="Sudden Worsening Heat Conditions"
                  description="Proactive warnings when humidity surges or radiant sun temperature spikes unexpectedly."
                  checked={notifPreferences.heatSafety.suddenWorsening}
                  onChange={() =>
                    handleToggleNotif('heatSafety', 'suddenWorsening', notifPreferences.heatSafety.suddenWorsening)
                  }
                  badge="Recommended"
                  icon={Activity}
                />
                <ToggleItem
                  id="notif-pers-risk"
                  title="Personal Risk Level Escalation"
                  description="Alerts triggered when your personal biometric factors indicate escalating cardiovascular thermal strain."
                  checked={notifPreferences.heatSafety.personalRiskChanges}
                  onChange={() =>
                    handleToggleNotif('heatSafety', 'personalRiskChanges', notifPreferences.heatSafety.personalRiskChanges)
                  }
                  badge="Recommended"
                  icon={Heart}
                />
              </CardContent>
            </Card>

            {/* CATEGORY 2: PERSONAL REMINDERS (Optional) */}
            <Card variant="elevated">
              <CardHeader
                title="Personal Health Reminders"
                subtitle="Context-aware prompts tuned to your daily outdoor activity, hydration, and pacing."
                badge={
                  <Badge variant="high" size="sm">
                    Optional
                  </Badge>
                }
              />
              <CardContent className="space-y-3">
                <ToggleItem
                  id="notif-hydration"
                  title="Hydration Reminders"
                  description="Timely suggestions to drink water and electrolytes (ORS) based on temperature and sweat rate."
                  checked={notifPreferences.personalReminders.smartHydration}
                  onChange={() =>
                    handleToggleNotif('personalReminders', 'smartHydration', notifPreferences.personalReminders.smartHydration)
                  }
                  badge="Recommended"
                  icon={Droplets}
                />
                <ToggleItem
                  id="notif-rest"
                  title="Rest Break Reminders"
                  description="Prompts to take shaded recovery breaks during peak heat hours (ISO 7243 work-rest cycles)."
                  checked={notifPreferences.personalReminders.restBreaks}
                  onChange={() =>
                    handleToggleNotif('personalReminders', 'restBreaks', notifPreferences.personalReminders.restBreaks)
                  }
                  badge="Recommended"
                  icon={Clock}
                />
                <ToggleItem
                  id="notif-exposure"
                  title="Outdoor Exposure Reminders"
                  description="Alerts when peak solar radiation (UV index) makes unprotected outdoor exposure dangerous."
                  checked={notifPreferences.personalReminders.outdoorExposure}
                  onChange={() =>
                    handleToggleNotif('personalReminders', 'outdoorExposure', notifPreferences.personalReminders.outdoorExposure)
                  }
                  icon={SunDim}
                />
                <ToggleItem
                  id="notif-actions"
                  title="Heat Safety Action Directives"
                  description="Practical reminders for cool showers, protective headgear, and adequate room ventilation."
                  checked={notifPreferences.personalReminders.safetyActions}
                  onChange={() =>
                    handleToggleNotif('personalReminders', 'safetyActions', notifPreferences.personalReminders.safetyActions)
                  }
                  icon={Sparkles}
                />
              </CardContent>
            </Card>

            {/* CATEGORY 3: SAFER OUTDOOR CONDITIONS */}
            <Card variant="elevated">
              <CardHeader
                title="Safer Outdoor Conditions"
                subtitle="Planning notifications when outdoor weather becomes cooler or more favorable."
                badge={
                  <Badge variant="neutral" size="sm">
                    Planning
                  </Badge>
                }
              />
              <CardContent className="space-y-3">
                <ToggleItem
                  id="notif-safer-window"
                  title="Safer Outdoor Window Notifications"
                  description="Tell me when cooler morning or evening hours begin for outdoor chores, exercise, or commuting."
                  checked={notifPreferences.preferredConditions.saferConditionsWindow}
                  onChange={() =>
                    handleToggleNotif('preferredConditions', 'saferConditionsWindow', notifPreferences.preferredConditions.saferConditionsWindow)
                  }
                  icon={CloudSun}
                />
                <ToggleItem
                  id="notif-sunlight-dec"
                  title="Lower Sunlight Intensity Alerts"
                  description="Tell me when harsh direct solar radiation declines in the late afternoon."
                  checked={notifPreferences.preferredConditions.sunlightDecrease}
                  onChange={() =>
                    handleToggleNotif('preferredConditions', 'sunlightDecrease', notifPreferences.preferredConditions.sunlightDecrease)
                  }
                  icon={SunDim}
                />
                <ToggleItem
                  id="notif-temp-thresh"
                  title="Comfortable Temperature Range"
                  description="Alert me when ambient temperatures fall back within a comfortable, safe range."
                  checked={notifPreferences.preferredConditions.temperatureThreshold}
                  onChange={() =>
                    handleToggleNotif('preferredConditions', 'temperatureThreshold', notifPreferences.preferredConditions.temperatureThreshold)
                  }
                  icon={Sparkles}
                />
                <ToggleItem
                  id="notif-rain"
                  title="Precipitation & Cooling Showers"
                  description="Alerts for monsoon showers or cooling breezes that bring ambient temperature relief."
                  checked={notifPreferences.preferredConditions.rainConditions}
                  onChange={() =>
                    handleToggleNotif('preferredConditions', 'rainConditions', notifPreferences.preferredConditions.rainConditions)
                  }
                  icon={Droplets}
                />
              </CardContent>
            </Card>

            {/* CATEGORY 4: LOCATION & CONTEXT */}
            <Card variant="elevated">
              <CardHeader
                title="Location & Context Alerts"
                subtitle="Hyperlocal monitoring and safety check-ins tailored to your current coordinates."
              />
              <CardContent className="space-y-3">
                <ToggleItem
                  id="notif-autoloc"
                  title="Auto-Update Location Monitoring"
                  description="Update heat risk baselines automatically when you travel between districts or cities."
                  checked={notifPreferences.locationContext.autoLocationMonitoring}
                  onChange={() =>
                    handleToggleNotif('locationContext', 'autoLocationMonitoring', notifPreferences.locationContext.autoLocationMonitoring)
                  }
                  icon={MapPin}
                />
                <ToggleItem
                  id="notif-currentloc"
                  title="Use My Current Location for Heat Alerts"
                  description="Deliver microclimate warnings grounded in your active device GPS position."
                  checked={notifPreferences.locationContext.useCurrentLocationForAlerts}
                  onChange={() =>
                    handleToggleNotif('locationContext', 'useCurrentLocationForAlerts', notifPreferences.locationContext.useCurrentLocationForAlerts)
                  }
                  badge="Recommended"
                  icon={Compass}
                />
                <ToggleItem
                  id="notif-checkin"
                  title="Safety Check-In During Severe Heat"
                  description="Prompts for a quick safety confirmation during prolonged extreme heatwave events."
                  checked={notifPreferences.locationContext.severeHeatCheckIn}
                  onChange={() =>
                    handleToggleNotif('locationContext', 'severeHeatCheckIn', notifPreferences.locationContext.severeHeatCheckIn)
                  }
                  icon={ShieldCheck}
                />
              </CardContent>
            </Card>

            {/* CATEGORY 5: FAMILY & VULNERABLE PROTECTION */}
            <Card variant="elevated">
              <CardHeader
                title="Household Safety Profile & Dependent Protection"
                subtitle="Proactive reminders to check elderly family members, infants, and dependents. ThermoShield does not remotely track individuals or collect biometric data."
              />
              <CardContent className="space-y-3">
                <ToggleItem
                  id="notif-family"
                  title="Remind Me to Check Vulnerable Family Members"
                  description="Suggestions to call elderly parents, young children, or heat-sensitive relatives during peak hours."
                  checked={notifPreferences.familyProtection.vulnerableFamilyReminders}
                  onChange={() =>
                    handleToggleNotif('familyProtection', 'vulnerableFamilyReminders', notifPreferences.familyProtection.vulnerableFamilyReminders)
                  }
                  badge="Recommended"
                  icon={Users}
                />
                <ToggleItem
                  id="notif-profiles"
                  title="Send Extra Reminders for People Marked Vulnerable"
                  description="Targeted alerts tailored for relatives with cardiovascular, asthma, or outdoor labor vulnerabilities."
                  checked={notifPreferences.familyProtection.selectedProfilesAlerts}
                  onChange={() =>
                    handleToggleNotif('familyProtection', 'selectedProfilesAlerts', notifPreferences.familyProtection.selectedProfilesAlerts)
                  }
                  icon={Heart}
                />
              </CardContent>
            </Card>

            {/* Decision Feed Toggle & Reset */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl ts-card-subtle border ts-border">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDecisionFeed(!showDecisionFeed)}
                  leftIcon={<Activity className="w-3.5 h-3.5 text-orange-400" />}
                  className="text-xs"
                >
                  {showDecisionFeed ? 'Hide Decision Feed' : 'Inspect Live Decision Engine Feed'}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetNotif}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Reset Alert Preferences to Defaults
              </Button>
            </div>

            {showDecisionFeed && (
              <NotificationDecisionFeed variant="settings_preview" showSimulations={true} />
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SECTION 6 — PRIVACY & ACCOUNT                             */}
        {/* ========================================================= */}
        {activeTab === 'account' && (
          <Card>
            <CardHeader
              title="6. Privacy, Trust & Account Settings"
              subtitle="Review how your information is handled and manage your ThermoShield account."
            />
            <CardContent className="space-y-5">
              {/* Account Status */}
              <div className="p-4 rounded-2xl ts-card-subtle border ts-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b ts-border">
                  <div>
                    <span className="text-xs font-bold ts-text-primary block">Signed In Account:</span>
                    <span className="text-xs ts-text-muted font-mono">{profile.email || user?.email || 'guest@thermoshield.org'}</span>
                  </div>
                  <Badge variant="brand" size="sm">
                    {isAuthenticated ? 'Authenticated Member' : 'Local Guest Profile'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="ts-text-subtle block">Assigned Role:</span>
                    <span className="font-bold ts-text-primary capitalize">{profile.role}</span>
                  </div>
                  <div>
                    <span className="ts-text-subtle block">Data Storage:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Encrypted Local Browser Storage</span>
                  </div>
                </div>
              </div>

              {/* Privacy Explanation */}
              <div className="p-4 rounded-2xl bg-slate-500/5 border ts-border space-y-2 text-xs">
                <div className="font-bold ts-text-primary flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>How ThermoShield Uses Your Information</span>
                </div>
                <p className="text-xs ts-text-muted leading-relaxed">
                  Your profile details are used strictly to calculate personal heat risk, calibrate dehydration rates, and deliver relevant safety alerts for your location.
                </p>
                <p className="text-[11px] ts-text-subtle leading-relaxed">
                  It does not replace professional medical advice. Your personal health details and location are never sold or shared with commercial advertisers.
                </p>
              </div>

              {/* Account Actions */}
              <div className="pt-3 border-t ts-border flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetProfile}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5 text-amber-500" />}
                  className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                >
                  Reset Profile to Default Values
                </Button>

                {isAuthenticated && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    leftIcon={<LogOut className="w-3.5 h-3.5 text-red-500" />}
                    className="text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10"
                  >
                    Sign Out of ThermoShield
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========================================================= */}
        {/* SECTION 7 — PROFESSIONAL DETAILS (FOR GOVERNMENT ROLES)   */}
        {/* ========================================================= */}
        {activeTab === 'professional' && !isCitizen && (
          <Card>
            <CardHeader
              title="Civic Jurisdiction & Command Role"
              subtitle="Configures your administrative node for regional monitoring, heat emergency response, and command directives."
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold ts-text-muted mb-1.5">
                    Organization / Ministry:
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
                    Assigned Region / Jurisdiction:
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
                    Division / Branch:
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

        {/* ========================================================= */}
        {/* BOTTOM ACTION & STEPPING BAR                              */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl ts-card-elevated border ts-border">
          <div className="text-xs ts-text-muted">
            <span className="font-semibold ts-text-primary">Profile & Safety Preferences Hub</span>
            <span className="block text-[11px] ts-text-subtle">
              Updates immediately calibrate your Personal Heat Risk and early-warning delivery.
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            {prevTab && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleTabChange(prevTab.id)}
                className="text-xs"
              >
                ← Previous
              </Button>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving || isSavingNotif}
              leftIcon={<Save className="w-4 h-4" />}
              className="w-full sm:w-auto shadow-md"
            >
              {saveSuccessMsg ? 'Saved' : 'Save Changes'}
            </Button>

            {nextTab && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTabChange(nextTab.id)}
                className="text-xs"
              >
                Next: {nextTab.label.split('.')[1]?.trim() || nextTab.label} →
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default Profile;
