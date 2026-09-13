import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Sliders,
  BellOff,
  Flame,
  Droplets,
  SunDim,
  MapPin,
  Users,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Info,
  ExternalLink,
  Building2,
  Activity,
  Heart,
  Clock,
  CloudSun,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useTranslation } from '../context/LanguageContext';
import { useNotificationPreferences } from '../context/ProfileContext';
import { NotificationMode } from '../types';
import { NotificationDecisionFeed } from '../components/NotificationDecisionFeed';

export const NotificationSettings: React.FC = () => {
  const { t } = useTranslation();
  const {
    preferences,
    mode,
    setMode,
    updatePreferences,
    resetPreferences,
    isSaving,
    role,
  } = useNotificationPreferences();

  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleModeChange = async (newMode: NotificationMode) => {
    await setMode(newMode);
    triggerSavedNotice();
  };

  const triggerSavedNotice = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleToggle = async (
    category: 'heatSafety' | 'personalReminders' | 'preferredConditions' | 'locationContext' | 'familyProtection',
    key: string,
    currentValue: boolean
  ) => {
    // If user is currently in a preset mode and toggles something, automatically switch to personalized mode
    const isPreset = mode !== 'personalized';
    
    const updatedCategory = {
      ...preferences[category],
      [key]: !currentValue,
    };

    if (isPreset) {
      await updatePreferences({
        mode: 'personalized',
        [category]: updatedCategory,
      });
    } else {
      await updatePreferences({
        [category]: updatedCategory,
      });
    }
    triggerSavedNotice();
  };

  const handleReset = async () => {
    await resetPreferences();
    triggerSavedNotice();
  };

  const isPersonalized = mode === 'personalized';

  // Toggle Switch Component
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

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              to="/profile"
              className="inline-flex items-center gap-1 text-xs font-semibold ts-text-muted hover:ts-text-primary transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('profile.title', 'My Profile')}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black ts-text-primary">
                  {t('notif.title', 'Notification & Safety Preferences')}
                </h1>
                <Badge variant="low" size="sm">
                  {t('notif.badge', 'Health Decision Support')}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm ts-text-muted mt-0.5 leading-relaxed max-w-2xl">
                {t(
                  'notif.subtitle',
                  'Control what heat safety alerts and personal health reminders you receive, grounded in real-time thermal conditions.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Reset & Status Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {savedFeedback && (
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{t('notif.statusSaved', 'Preferences Saved')}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isSaving}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            {t('notif.resetToDefaults', 'Reset to Defaults')}
          </Button>
        </div>
      </div>

      {/* Role-Specific Context Notice */}
      {role === 'responder' && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs flex items-start gap-3 text-orange-900 dark:text-orange-200">
          <ShieldAlert className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">{t('role.responder', 'Field Responder')}</div>
            <p className="mt-0.5 leading-relaxed">{t('notif.roleResponderNotice')}</p>
          </div>
        </div>
      )}

      {role === 'official' && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs flex items-start gap-3 text-cyan-900 dark:text-cyan-200">
          <Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">{t('role.healthOfficial', 'Municipal Official')}</div>
            <p className="mt-0.5 leading-relaxed">{t('notif.roleOfficialNotice')}</p>
          </div>
        </div>
      )}

      {role === 'analyst' && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs flex items-start gap-3 text-purple-900 dark:text-purple-200">
          <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">{t('role.analyst', 'Meteorological Analyst')}</div>
            <p className="mt-0.5 leading-relaxed">{t('notif.roleAnalystNotice')}</p>
          </div>
        </div>
      )}

      {/* 1. NOTIFICATION MODE SELECTOR */}
      <Card variant="elevated">
        <CardHeader
          title={t('notif.modeTitle', 'Notification Mode')}
          subtitle={t(
            'notif.modeSubtitle',
            'Choose how actively ThermoShield manages your heat reminders and safety advisories.'
          )}
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* ESSENTIAL */}
            <button
              type="button"
              onClick={() => handleModeChange('essential')}
              className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                mode === 'essential'
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
                    {t('notif.essentialBadge', 'Essential')}
                  </span>
                </div>
                <div className="text-sm font-bold ts-text-primary">
                  {t('notif.modeEssential', 'Essential')}
                </div>
                <p className="text-[11px] ts-text-muted mt-1 leading-relaxed">
                  {t(
                    'notif.modeEssentialDesc',
                    'Only critical life-safety warnings. No routine reminders or ambient updates.'
                  )}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t ts-border text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                • 0% Noise · Max Safety
              </div>
            </button>

            {/* SMART (Recommended) */}
            <button
              type="button"
              onClick={() => handleModeChange('smart')}
              className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                mode === 'smart'
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
                    {t('notif.recommendedBadge', 'Recommended')}
                  </span>
                </div>
                <div className="text-sm font-bold ts-text-primary flex items-center gap-1.5">
                  <span>{t('notif.modeSmart', 'Smart')}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400 font-mono">
                    AI
                  </span>
                </div>
                <p className="text-[11px] ts-text-muted mt-1 leading-relaxed">
                  {t(
                    'notif.modeSmartDesc',
                    'Intelligently timed guidance based on your personal risk, predicted heat, and exposure.'
                  )}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t ts-border text-[10.5px] font-semibold text-orange-700 dark:text-orange-400">
                • Biometeorological Decisions
              </div>
            </button>

            {/* PERSONALIZED */}
            <button
              type="button"
              onClick={() => handleModeChange('personalized')}
              className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                mode === 'personalized'
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
                    {t('notif.optionalBadge', 'Custom')}
                  </span>
                </div>
                <div className="text-sm font-bold ts-text-primary">
                  {t('notif.modePersonalized', 'Personalized')}
                </div>
                <p className="text-[11px] ts-text-muted mt-1 leading-relaxed">
                  {t(
                    'notif.modePersonalizedDesc',
                    'Full manual control over every notification category and reminder threshold.'
                  )}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t ts-border text-[10.5px] font-semibold text-sky-700 dark:text-sky-400">
                • Individual Controls Active
              </div>
            </button>

            {/* QUIET */}
            <button
              type="button"
              onClick={() => handleModeChange('quiet')}
              className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                mode === 'quiet'
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
                    Silent
                  </span>
                </div>
                <div className="text-sm font-bold ts-text-primary">
                  {t('notif.modeQuiet', 'Quiet')}
                </div>
                <p className="text-[11px] ts-text-muted mt-1 leading-relaxed">
                  {t(
                    'notif.modeQuietDesc',
                    'Suppresses routine reminders. Severe heatwave warnings remain distinguishable.'
                  )}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t ts-border text-[10.5px] font-semibold text-amber-700 dark:text-amber-400">
                • Red Alerts Only
              </div>
            </button>
          </div>

          {/* Active Preset Information Strip */}
          {!isPersonalized && (
            <div className="p-3 rounded-xl ts-card-subtle border ts-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 ts-text-muted">
                <Info className="w-4 h-4 text-orange-500 shrink-0" />
                <span>
                  {t(
                    'notif.activeModeNotice',
                    'Current mode automatically manages these settings. Switch to Personalized mode for individual control.'
                  )}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleModeChange('personalized')}
                leftIcon={<Sliders className="w-3.5 h-3.5" />}
                className="text-xs shrink-0"
              >
                {t('notif.customizeBtn', 'Customize These Settings')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. HOW YOUR ALERTS WORK — Tier Transparency Preview */}
      <Card variant="elevated" className="p-4 sm:p-5 border-l-4 border-l-orange-500">
        <div className="flex items-center space-x-2.5 mb-3">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold ts-text-primary">
              {t('notif.howAlertsWorkTitle', 'How Your Alerts Work')}
            </h3>
            <p className="text-[11px] ts-text-muted">
              {t('notif.howAlertsWorkSubtitle', 'Notifications are evaluated against your profile and anti-spam cooldowns before delivery.')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          {/* CRITICAL */}
          <div className="p-3 rounded-xl ts-card-subtle border border-red-500/30 bg-red-500/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/40">
                CRITICAL
              </span>
              <span className="text-[9.5px] ts-text-subtle font-medium">{t('notif.mandatorySafety', 'Mandatory')}</span>
            </div>
            <p className="font-semibold ts-text-primary text-xs leading-snug">
              "{t('notif.exampleCritical', 'Extreme heat risk expected in the next 2 hours.')}"
            </p>
            <p className="text-[10.5px] ts-text-muted mt-1 leading-relaxed">
              {t('notif.exampleCriticalDesc', 'Sudden escalations or dangerous thermal conditions. Cannot be silenced.')}
            </p>
          </div>

          {/* IMPORTANT */}
          <div className="p-3 rounded-xl ts-card-subtle border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40">
                IMPORTANT
              </span>
              <span className="text-[9.5px] ts-text-subtle font-medium">{t('notif.smartDecision', 'Smart Action')}</span>
            </div>
            <p className="font-semibold ts-text-primary text-xs leading-snug">
              "{t('notif.exampleImportant', 'Conditions may become safer for outdoor activity after 6:30 PM.')}"
            </p>
            <p className="text-[10.5px] ts-text-muted mt-1 leading-relaxed">
              {t('notif.exampleImportantDesc', 'Thermal relief windows, ISO 7243 rest pacing, and significant condition shifts.')}
            </p>
          </div>

          {/* ROUTINE */}
          <div className="p-3 rounded-xl ts-card-subtle border border-sky-500/30 bg-sky-500/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/40">
                ROUTINE
              </span>
              <span className="text-[9.5px] ts-text-subtle font-medium">{t('notif.optionalPersonal', 'Optional')}</span>
            </div>
            <p className="font-semibold ts-text-primary text-xs leading-snug">
              "{t('notif.exampleRoutine', 'Time to take a short hydration break.')}"
            </p>
            <p className="text-[10.5px] ts-text-muted mt-1 leading-relaxed">
              {t('notif.exampleRoutineDesc', 'Personalized fluid replenishment and voluntary check-in reminders.')}
            </p>
          </div>
        </div>
      </Card>

      {/* 3. LIVE DECISION ENGINE STATUS & PREVIEW */}
      <NotificationDecisionFeed variant="settings_preview" showSimulations={true} />

      {/* 3. CATEGORY A: HEAT & SAFETY ALERTS */}
      <Card variant="elevated">
        <CardHeader
          title={t('notif.catA_Title', 'Heat & Safety Alerts')}
          subtitle={t(
            'notif.catA_Desc',
            'Critical biometeorological warnings to protect against extreme thermal stress and heat stroke.'
          )}
          badge={
            <Badge variant="extreme" size="sm">
              {t('notif.essentialBadge', 'Essential Safety')}
            </Badge>
          }
        />
        <CardContent className="space-y-3">
          <ToggleItem
            id="catA-critical"
            title={t('notif.critRiskTitle', 'Critical Heat Risk Changes')}
            description={t(
              'notif.critRiskDesc',
              'Instant alert when monitored area shifts into dangerous or extreme risk tiers.'
            )}
            checked={preferences.heatSafety.criticalRiskChanges}
            onChange={() =>
              handleToggle('heatSafety', 'criticalRiskChanges', preferences.heatSafety.criticalRiskChanges)
            }
            badge={t('notif.essentialBadge', 'Essential')}
            isEssential
            icon={Flame}
          />
          <ToggleItem
            id="catA-extreme"
            title={t('notif.extremeWarnTitle', 'Extreme Heatwave Warnings')}
            description={t(
              'notif.extremeWarnDesc',
              'Official IMD / NDMA red alerts and high-intensity heatwave declarations.'
            )}
            checked={preferences.heatSafety.extremeWarnings}
            onChange={() =>
              handleToggle('heatSafety', 'extremeWarnings', preferences.heatSafety.extremeWarnings)
            }
            badge={t('notif.essentialBadge', 'Essential')}
            isEssential
            icon={ShieldAlert}
          />
          <ToggleItem
            id="catA-sudden"
            title={t('notif.suddenWorsenTitle', 'Sudden Worsening Conditions')}
            description={t(
              'notif.suddenWorsenDesc',
              'Early warnings when humidity spikes or solar load amplifies thermal stress rapidly.'
            )}
            checked={preferences.heatSafety.suddenWorsening}
            onChange={() =>
              handleToggle('heatSafety', 'suddenWorsening', preferences.heatSafety.suddenWorsening)
            }
            badge={t('notif.recommendedBadge', 'Recommended')}
            icon={Activity}
          />
          <ToggleItem
            id="catA-personal"
            title={t('notif.persRiskTitle', 'Personal Risk Level Changes')}
            description={t(
              'notif.persRiskDesc',
              'Notification when your calculated individual physiological strain level escalates.'
            )}
            checked={preferences.heatSafety.personalRiskChanges}
            onChange={() =>
              handleToggle('heatSafety', 'personalRiskChanges', preferences.heatSafety.personalRiskChanges)
            }
            badge={t('notif.recommendedBadge', 'Recommended')}
            icon={Heart}
          />
        </CardContent>
      </Card>

      {/* 3. CATEGORY B: PERSONAL REMINDERS */}
      <Card variant="elevated">
        <CardHeader
          title={t('notif.catB_Title', 'Personal Reminders')}
          subtitle={t(
            'notif.catB_Desc',
            'Intelligent, context-aware reminders tuned to your outdoor exposure and hydration status.'
          )}
          badge={
            <Badge variant="high" size="sm">
              {t('notif.recommendedBadge', 'Smart Health')}
            </Badge>
          }
        />
        <CardContent className="space-y-3">
          <ToggleItem
            id="catB-hydration"
            title={t('notif.smartHydrationTitle', 'Smart Hydration Prompts')}
            description={t(
              'notif.smartHydrationDesc',
              'Timely suggestions to drink fluids based on actual environmental heat and sweat rate.'
            )}
            checked={preferences.personalReminders.smartHydration}
            onChange={() =>
              handleToggle('personalReminders', 'smartHydration', preferences.personalReminders.smartHydration)
            }
            badge={t('notif.recommendedBadge', 'Recommended')}
            icon={Droplets}
          />
          <ToggleItem
            id="catB-rest"
            title={t('notif.restBreaksTitle', 'Work-Rest Break Reminders')}
            description={t(
              'notif.restBreaksDesc',
              'Reminders to take shaded recovery breaks during peak heat hours (ISO 7243 aligned).'
            )}
            checked={preferences.personalReminders.restBreaks}
            onChange={() =>
              handleToggle('personalReminders', 'restBreaks', preferences.personalReminders.restBreaks)
            }
            badge={t('notif.recommendedBadge', 'Recommended')}
            icon={Clock}
          />
          <ToggleItem
            id="catB-exposure"
            title={t('notif.outdoorExposureTitle', 'Peak Solar Exposure Alerts')}
            description={t(
              'notif.outdoorExposureDesc',
              'Alerts to seek shade when UV index and direct solar radiation reach peak danger levels.'
            )}
            checked={preferences.personalReminders.outdoorExposure}
            onChange={() =>
              handleToggle('personalReminders', 'outdoorExposure', preferences.personalReminders.outdoorExposure)
            }
            icon={SunDim}
          />
          <ToggleItem
            id="catB-actions"
            title={t('notif.safetyActionsTitle', 'Heat Safety Action Directives')}
            description={t(
              'notif.safetyActionsDesc',
              'Actionable reminders for cool showers, ORS replenishment, and proper ventilation.'
            )}
            checked={preferences.personalReminders.safetyActions}
            onChange={() =>
              handleToggle('personalReminders', 'safetyActions', preferences.personalReminders.safetyActions)
            }
            icon={Sparkles}
          />
        </CardContent>
      </Card>

      {/* 4. CATEGORY C: PREFERRED CONDITIONS */}
      <Card variant="elevated">
        <CardHeader
          title={t('notif.catC_Title', 'Preferred Conditions')}
          subtitle={t(
            'notif.catC_Desc',
            'Comfort and planning updates when outdoor weather becomes more favorable.'
          )}
          badge={
            <Badge variant="neutral" size="sm">
              {t('notif.optionalBadge', 'Comfort & Planning')}
            </Badge>
          }
        />
        <CardContent className="space-y-3">
          <ToggleItem
            id="catC-safer"
            title={t('notif.saferWindowTitle', 'Safer Conditions Window')}
            description={t(
              'notif.saferWindowDesc',
              'Notify me when cooler morning or evening hours begin for outdoor chores or exercise.'
            )}
            checked={preferences.preferredConditions.saferConditionsWindow}
            onChange={() =>
              handleToggle(
                'preferredConditions',
                'saferConditionsWindow',
                preferences.preferredConditions.saferConditionsWindow
              )
            }
            icon={CloudSun}
          />
          <ToggleItem
            id="catC-sunlight"
            title={t('notif.sunlightDecTitle', 'Sunlight Intensity Decrease')}
            description={t(
              'notif.sunlightDecDesc',
              'Notice when harsh direct solar radiation declines in late afternoon.'
            )}
            checked={preferences.preferredConditions.sunlightDecrease}
            onChange={() =>
              handleToggle(
                'preferredConditions',
                'sunlightDecrease',
                preferences.preferredConditions.sunlightDecrease
              )
            }
            icon={SunDim}
          />
          <ToggleItem
            id="catC-temp"
            title={t('notif.tempThresholdTitle', 'Comfortable Temperature Range')}
            description={t(
              'notif.tempThresholdDesc',
              'Alert when ambient temperatures fall back within a comfortable thermal range.'
            )}
            checked={preferences.preferredConditions.temperatureThreshold}
            onChange={() =>
              handleToggle(
                'preferredConditions',
                'temperatureThreshold',
                preferences.preferredConditions.temperatureThreshold
              )
            }
            icon={Sparkles}
          />
          <ToggleItem
            id="catC-rain"
            title={t('notif.rainAlertTitle', 'Precipitation & Cooling Alerts')}
            description={t(
              'notif.rainAlertDesc',
              'Alerts for monsoon showers or convective cooling that relieve ambient heat.'
            )}
            checked={preferences.preferredConditions.rainConditions}
            onChange={() =>
              handleToggle(
                'preferredConditions',
                'rainConditions',
                preferences.preferredConditions.rainConditions
              )
            }
            icon={Droplets}
          />
          <ToggleItem
            id="catC-shade"
            title={t('notif.shadeHoursTitle', 'Cloud & Shade Opportunities')}
            description={t(
              'notif.shadeHoursDesc',
              'Notice when cloud cover provides natural relief from intense radiant heat.'
            )}
            checked={preferences.preferredConditions.shadeFriendlyHours}
            onChange={() =>
              handleToggle(
                'preferredConditions',
                'shadeFriendlyHours',
                preferences.preferredConditions.shadeFriendlyHours
              )
            }
            icon={CloudSun}
          />
        </CardContent>
      </Card>

      {/* 5. CATEGORY D: LOCATION & CONTEXT */}
      <Card variant="elevated">
        <CardHeader
          title={t('notif.catD_Title', 'Location & Context')}
          subtitle={t(
            'notif.catD_Desc',
            'Hyperlocal monitoring and proactive safety check-ins tailored to where you are.'
          )}
          badge={
            <Badge variant="low" size="sm">
              Hyperlocal
            </Badge>
          }
        />
        <CardContent className="space-y-3">
          <ToggleItem
            id="catD-autoloc"
            title={t('notif.autoLocationTitle', 'Auto-Update Location Monitoring')}
            description={t(
              'notif.autoLocationDesc',
              'Update heat risk baselines automatically when moving between districts or cities.'
            )}
            checked={preferences.locationContext.autoLocationMonitoring}
            onChange={() =>
              handleToggle(
                'locationContext',
                'autoLocationMonitoring',
                preferences.locationContext.autoLocationMonitoring
              )
            }
            icon={MapPin}
          />
          <ToggleItem
            id="catD-currentloc"
            title={t('notif.currentLocAlertsTitle', 'Current Location Personalized Alerts')}
            description={t(
              'notif.currentLocAlertsDesc',
              'Use precise ward coordinates to deliver localized microclimate warnings.'
            )}
            checked={preferences.locationContext.useCurrentLocationForAlerts}
            onChange={() =>
              handleToggle(
                'locationContext',
                'useCurrentLocationForAlerts',
                preferences.locationContext.useCurrentLocationForAlerts
              )
            }
            badge={t('notif.recommendedBadge', 'Recommended')}
            icon={MapPin}
          />
          <ToggleItem
            id="catD-checkin"
            title={t('notif.severeCheckInTitle', 'Severe Heat Safety Check-In')}
            description={t(
              'notif.severeCheckInDesc',
              'Ask for a quick wellness confirmation during prolonged extreme heatwave events.'
            )}
            checked={preferences.locationContext.severeHeatCheckIn}
            onChange={() =>
              handleToggle(
                'locationContext',
                'severeHeatCheckIn',
                preferences.locationContext.severeHeatCheckIn
              )
            }
            icon={ShieldCheck}
          />

          {/* Privacy Callout */}
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs flex items-start gap-2.5 ts-text-primary">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              {t(
                'notif.privacyNotice',
                'Your location is evaluated locally on your device for heat stress assessment. Continuous background tracking is never enabled without your consent.'
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 6. CATEGORY E: FAMILY & VULNERABLE PROTECTION */}
      <Card variant="elevated">
        <CardHeader
          title={t('notif.catE_Title', 'Family & Vulnerable Protection')}
          subtitle={t(
            'notif.catE_Desc',
            'Proactive alerts to ensure dependent family members, seniors, and children stay safe.'
          )}
          badge={
            <Badge variant="low" size="sm">
              Dependents & Elders
            </Badge>
          }
        />
        <CardContent className="space-y-3">
          <ToggleItem
            id="catE-family"
            title={t('notif.vulnFamilyTitle', 'Check Vulnerable Family Members')}
            description={t(
              'notif.vulnFamilyDesc',
              'Prompts to call elderly relatives, infants, or sick family members during heat spikes.'
            )}
            checked={preferences.familyProtection.vulnerableFamilyReminders}
            onChange={() =>
              handleToggle(
                'familyProtection',
                'vulnerableFamilyReminders',
                preferences.familyProtection.vulnerableFamilyReminders
              )
            }
            badge={t('notif.recommendedBadge', 'Recommended')}
            icon={Users}
          />
          <ToggleItem
            id="catE-profiles"
            title={t('notif.selectedProfilesTitle', 'Dependent Risk Notifications')}
            description={t(
              'notif.selectedProfilesDesc',
              'Specific guidance tailored for outdoor-working relatives or heat-sensitive family.'
            )}
            checked={preferences.familyProtection.selectedProfilesAlerts}
            onChange={() =>
              handleToggle(
                'familyProtection',
                'selectedProfilesAlerts',
                preferences.familyProtection.selectedProfilesAlerts
              )
            }
            icon={Heart}
          />
          <ToggleItem
            id="catE-emergency"
            title={t('notif.severeFamilyCheckTitle', 'Emergency Family Safety Reminders')}
            description={t(
              'notif.severeFamilyCheckDesc',
              'Urgent protocol reminders when community cooling shelters open.'
            )}
            checked={preferences.familyProtection.severeHeatFamilyCheck}
            onChange={() =>
              handleToggle(
                'familyProtection',
                'severeHeatFamilyCheck',
                preferences.familyProtection.severeHeatFamilyCheck
              )
            }
            badge={t('notif.essentialBadge', 'Essential')}
            icon={ShieldAlert}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
