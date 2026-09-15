import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslation } from '../context/LanguageContext';
import { SituationalContextType, RiskLevel } from '../types';
import {
  Home,
  Sun,
  Car,
  EyeOff,
  ShieldCheck,
  Droplets,
  Clock,
  Wind,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  HeartPulse,
  Info,
  ChevronRight,
  Shield,
  Calendar,
} from 'lucide-react';
import { Button, Badge } from './ui';
import { Link } from 'react-router-dom';

interface SevereHeatCheckInCardProps {
  currentRiskLevel?: RiskLevel;
  temperature?: number;
  wbgt?: number;
  className?: string;
}

export const SevereHeatCheckInCard: React.FC<SevereHeatCheckInCardProps> = ({
  currentRiskLevel,
  temperature,
  wbgt,
  className = '',
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, situationalCheckIn, updateSituationalCheckIn, dismissSituationalCheckIn, resetSituationalCheckIn } =
    useProfile();

  const [isChanging, setIsChanging] = useState<boolean>(false);

  // Severe/Elevated heat condition trigger: Active check-in, Moderate/High/Extreme/Critical heat, or Temp >= 32°C
  const isSevereHeat =
    situationalCheckIn.currentContext !== null ||
    currentRiskLevel === 'MODERATE' ||
    currentRiskLevel === 'HIGH' ||
    currentRiskLevel === 'EXTREME' ||
    currentRiskLevel === 'CRITICAL' ||
    (temperature !== undefined && temperature >= 32) ||
    (wbgt !== undefined && wbgt >= 28.0);

  // Citizen role verification: only citizens receive domestic situational check-ins
  const activeRole = (user?.role || profile.role || 'citizen').toLowerCase();
  const isCitizen = activeRole === 'user' || activeRole === 'citizen';

  // Preference toggle check
  const isCheckInEnabled =
    profile.notificationPreferences?.locationContext?.severeHeatCheckIn ?? true;

  // Check if check-in was dismissed within cooldown (e.g. 4 hours)
  const isDismissed =
    situationalCheckIn.dismissedUntil !== null && Date.now() < situationalCheckIn.dismissedUntil;

  // If not severe heat, or not citizen, or disabled, or dismissed without a selected context, do not render
  if (!isSevereHeat || !isCitizen || !isCheckInEnabled || (isDismissed && !situationalCheckIn.currentContext)) {
    return null;
  }

  const currentContext = situationalCheckIn.currentContext;

  const handleSelectOption = (option: SituationalContextType) => {
    updateSituationalCheckIn(option);
    setIsChanging(false);
  };

  const formatCheckedInTime = () => {
    if (!situationalCheckIn.checkedInAt) return '';
    const diffMinutes = Math.floor((Date.now() - situationalCheckIn.checkedInAt) / 60000);
    if (diffMinutes < 1) return t('common.justNow', 'Just now');
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div
      className={`rounded-2xl border ts-card-elevated overflow-hidden shadow-xl transition-all ${
        currentRiskLevel === 'EXTREME'
          ? 'border-red-500/40 bg-gradient-to-b from-red-500/5 to-transparent'
          : 'border-orange-500/30 bg-gradient-to-b from-orange-500/5 to-transparent'
      } ${className}`}
    >
      {/* Top Banner Header */}
      <div className="p-4 sm:p-5 border-b ts-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                {t('contextSafety.checkInBadge', 'Severe Heat Safety Check-In')}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30">
                {t('contextSafety.contextualTuning', 'Contextual Advice')}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black ts-text-primary mt-0.5">
              {currentContext && !isChanging
                ? t('contextSafety.activeGuidanceTitle', 'Personalized Heat-Health Guidance')
                : t('contextSafety.promptQuestion', 'High heat conditions are active. Are you currently indoors or outdoors?')}
            </h2>
          </div>
        </div>

        {/* Status / Dismiss button */}
        {currentContext && !isChanging ? (
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-[11px] ts-text-muted">
              {formatCheckedInTime()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChanging(true)}
              leftIcon={<RotateCcw className="w-3 h-3" />}
              className="text-xs"
            >
              {t('contextSafety.changeStatus', 'Change Status')}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => dismissSituationalCheckIn(4)}
            className="text-xs ts-text-muted hover:ts-text-primary transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 self-end sm:self-auto"
          >
            {t('common.dismissFor4Hours', 'Remind Later')}
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5">
        {/* Step 1: User Needs to Choose Current Situation */}
        {(!currentContext || isChanging) && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm ts-text-muted leading-relaxed">
              {t(
                'contextSafety.promptSubtitle',
                'Your voluntary response calibrates shade, hydration, and recovery advice to your immediate environment without tracking your location.'
              )}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Option 1: Indoors */}
              <button
                onClick={() => handleSelectOption('indoors')}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-emerald-500/10 transition-all flex flex-col items-center text-center group"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Home className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-bold ts-text-primary">
                  {t('contextSafety.optionIndoors', 'Indoors')}
                </span>
                <span className="text-[10px] ts-text-muted mt-0.5">
                  {t('contextSafety.optionIndoorsSub', 'Home or work')}
                </span>
              </button>

              {/* Option 2: Outdoors */}
              <button
                onClick={() => handleSelectOption('outdoors')}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-orange-500/10 transition-all flex flex-col items-center text-center group"
              >
                <div className="w-11 h-11 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Sun className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-bold ts-text-primary">
                  {t('contextSafety.optionOutdoors', 'Outdoors')}
                </span>
                <span className="text-[10px] ts-text-muted mt-0.5">
                  {t('contextSafety.optionOutdoorsSub', 'Field, street, transit')}
                </span>
              </button>

              {/* Option 3: Travelling */}
              <button
                onClick={() => handleSelectOption('travelling')}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-indigo-500/10 transition-all flex flex-col items-center text-center group"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Car className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-bold ts-text-primary">
                  {t('contextSafety.optionTravelling', 'Travelling')}
                </span>
                <span className="text-[10px] ts-text-muted mt-0.5">
                  {t('contextSafety.optionTravellingSub', 'Commuting / vehicle')}
                </span>
              </button>

              {/* Option 4: Prefer not to say */}
              <button
                onClick={() => handleSelectOption('prefer_not_to_say')}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-500/50 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-500/10 transition-all flex flex-col items-center text-center group"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <EyeOff className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-bold ts-text-primary">
                  {t('contextSafety.optionPreferNotToSay', 'Prefer not to say')}
                </span>
                <span className="text-[10px] ts-text-muted mt-0.5">
                  {t('contextSafety.optionPreferNotToSaySub', 'Standard guidance')}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Contextual Guidance Display */}
        {currentContext && !isChanging && (
          <div className="space-y-4">
            {/* Status Pill */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-semibold ts-text-muted">
                {t('contextSafety.currentSetting', 'Reported Environment')}:
              </span>
              {currentContext === 'outdoors' && (
                <Badge variant="high" size="sm" className="flex items-center space-x-1">
                  <Sun className="w-3.5 h-3.5" />
                  <span>{t('contextSafety.statusOutdoorsBadge', 'Currently Outdoors')}</span>
                </Badge>
              )}
              {currentContext === 'indoors' && (
                <Badge variant="brand" size="sm" className="flex items-center space-x-1">
                  <Home className="w-3.5 h-3.5" />
                  <span>{t('contextSafety.statusIndoorsBadge', 'Currently Indoors')}</span>
                </Badge>
              )}
              {currentContext === 'travelling' && (
                <Badge variant="low" size="sm" className="flex items-center space-x-1">
                  <Car className="w-3.5 h-3.5" />
                  <span>{t('contextSafety.statusTravellingBadge', 'Currently Travelling')}</span>
                </Badge>
              )}
              {currentContext === 'prefer_not_to_say' && (
                <Badge variant="neutral" size="sm" className="flex items-center space-x-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{t('contextSafety.statusGeneralBadge', 'General Heat Safety')}</span>
                </Badge>
              )}
            </div>

            {/* Context-Specific Action Cards Grid */}
            {currentContext === 'outdoors' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-orange-500/20 bg-orange-500/5 dark:bg-orange-500/10">
                  <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 mb-1 font-bold text-xs">
                    <Sun className="w-4 h-4" />
                    <span>{t('contextSafety.outdoorShadeTitle', 'Seek Continuous Shade')}</span>
                  </div>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {t(
                      'contextSafety.outdoorShadeDesc',
                      'Direct solar flux amplifies body heat load by up to 10-15°C. Remain under trees, canopies, or building shadows whenever stationary.'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10">
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 mb-1 font-bold text-xs">
                    <Clock className="w-4 h-4" />
                    <span>{t('contextSafety.outdoorRestTitle', 'Plan Work-Rest Cycles')}</span>
                  </div>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {t(
                      'contextSafety.outdoorRestDesc',
                      'Enforce 15-20 minutes of shaded rest for every 45 minutes of walking or physical tasks (aligned with ISO 7243 thermal standards).'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-500/10">
                  <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400 mb-1 font-bold text-xs">
                    <Droplets className="w-4 h-4" />
                    <span>{t('contextSafety.outdoorHydrationTitle', 'Active Fluid Sips')}</span>
                  </div>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {t(
                      'contextSafety.outdoorHydrationDesc',
                      'Drink 250ml water or ORS every 15-20 minutes before feeling thirsty. Do not substitute caffeinated drinks or soda.'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 dark:bg-red-500/10">
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 mb-1 font-bold text-xs">
                    <HeartPulse className="w-4 h-4" />
                    <span>{t('contextSafety.outdoorExhaustionTitle', 'Heat Strain Watch')}</span>
                  </div>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {t(
                      'contextSafety.outdoorExhaustionDesc',
                      'Watch for dizziness, clammy skin, or headache. Move immediately to cooled shade, loosen tight clothing, and hydrate.'
                    )}
                  </p>
                </div>
              </div>
            )}

            {currentContext === 'indoors' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10">
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-1 font-bold text-xs">
                    <Wind className="w-4 h-4" />
                    <span>{t('contextSafety.indoorCoolingTitle', 'Indoor Ventilation & Cooling')}</span>
                  </div>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {t(
                      'contextSafety.indoorCoolingDesc',
                      'Keep air circulating with fans. If room temp exceeds 35°C, fans alone cannot stop heat illness — take cool baths or damp sponge rubs.'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-500/10">
                  <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400 mb-1 font-bold text-xs">
                    <Droplets className="w-4 h-4" />
                    <span>{t('contextSafety.indoorHydrationTitle', 'Steady Hydration Pacing')}</span>
                  </div>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {t(
                      'contextSafety.indoorHydrationDesc',
                      'Even sedentary indoor activities induce insensible water loss. Maintain steady intake of water, buttermilk, or lemon water.'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1 font-bold text-xs">
                    <Home className="w-4 h-4" />
                    <span>{t('contextSafety.indoorUpperFloorTitle', 'Upper Floor Heat Traps')}</span>
                  </div>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {t(
                      'contextSafety.indoorUpperFloorDesc',
                      'Upper floors and tin-roofed rooms trap extreme heat. Move resting areas to ground floors or well-shaded north-facing rooms.'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10">
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 mb-1 font-bold text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>{t('contextSafety.indoorErrandPlanTitle', 'Plan Errands via Safer Window')}</span>
                  </div>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {t(
                      'contextSafety.indoorErrandPlanDesc',
                      'Stay indoors during the afternoon peak. Use the Safer Outdoor Window below to plan groceries or essential travel later.'
                    )}
                  </p>
                </div>
              </div>
            )}

            {currentContext === 'travelling' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 dark:bg-red-500/10">
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 mb-1 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{t('contextSafety.travelVehicleWarningTitle', 'Never Leave Children in Vehicles')}</span>
                  </div>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {t(
                      'contextSafety.travelVehicleWarningDesc',
                      'Parked vehicle temperatures spike by 20°C in under 10 minutes. Never leave children, elderly family, or pets inside, even with windows cracked.'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-500/10">
                  <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400 mb-1 font-bold text-xs">
                    <Droplets className="w-4 h-4" />
                    <span>{t('contextSafety.travelWaterFlaskTitle', 'Carry Travel Water Flask')}</span>
                  </div>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {t(
                      'contextSafety.travelWaterFlaskDesc',
                      'Always travel with insulated water bottles. Commuter delays during peak heat expose you to rapid dehydration.'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10">
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 mb-1 font-bold text-xs">
                    <Sun className="w-4 h-4" />
                    <span>{t('contextSafety.travelTransitShadeTitle', 'Shaded Transit Corridors')}</span>
                  </div>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {t(
                      'contextSafety.travelTransitShadeDesc',
                      'Wait in covered bus shelters or shaded railway platforms. Use umbrellas or damp cotton scarves while walking between transit hubs.'
                    )}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1 font-bold text-xs">
                    <Wind className="w-4 h-4" />
                    <span>{t('contextSafety.travelVentilationTitle', 'Cabin Air Management')}</span>
                  </div>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {t(
                      'contextSafety.travelVentilationDesc',
                      'Use recirculation AC or open opposite windows to flush trapped superheated air before driving.'
                    )}
                  </p>
                </div>
              </div>
            )}

            {currentContext === 'prefer_not_to_say' && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold ts-text-primary">
                      {t('contextSafety.generalPrecautionTitle', 'General Heatwave Precautionary Measures')}
                    </h4>
                    <p className="text-xs ts-text-muted mt-0.5">
                      {t(
                        'contextSafety.generalPrecautionDesc',
                        'Maintain constant hydration, avoid direct sunlight between 12:00 PM and 4:00 PM, and calibrate your individual vulnerability using our Personal Risk Calculator.'
                      )}
                    </p>
                  </div>
                </div>
                <Link
                  to="/personal-risk"
                  className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all flex items-center space-x-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('dashboard.openRiskCalc', 'Calibrate Risk')}</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Responsible Disclaimer Footer */}
        <div className="mt-4 pt-3 border-t ts-border flex items-center justify-between text-[11px] ts-text-subtle">
          <div className="flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {t(
                'contextSafety.disclaimer',
                'Voluntary situational context. ThermoShield provides preventative heat-health guidance, not emergency medical diagnosis. For heatstroke emergencies, call 108 / 112.'
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
