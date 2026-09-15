import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sun,
  Moon,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ArrowRight,
  Thermometer,
  Wind,
  Bell,
  BellRing,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Flame,
  Check,
  Calendar,
} from 'lucide-react';
import { DailyForecast, WeatherCondition, RiskLevel } from '../types';
import { useProfile } from '../context/ProfileContext';
import { useTranslation } from '../context/LanguageContext';
import { evaluateSaferOutdoorWindow, SaferOutdoorWindowResult } from '../services/outdoorWindowEngine';
import { getDefaultNotificationPreferences } from '../utils/notifications';
import { Badge } from './ui';

interface SaferOutdoorWindowCardProps {
  forecast?: DailyForecast;
  weather?: WeatherCondition;
  currentRiskLevel?: RiskLevel;
  className?: string;
  variant?: 'dashboard' | 'compact' | 'forecast_banner';
}

export const SaferOutdoorWindowCard: React.FC<SaferOutdoorWindowCardProps> = ({
  forecast,
  weather,
  currentRiskLevel,
  className = '',
  variant = 'dashboard',
}) => {
  const { t } = useTranslation();
  const { profile, updateNotificationPreferences } = useProfile();
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [isUpdatingNotif, setIsUpdatingNotif] = useState<boolean>(false);

  // Evaluate the window with the pure engine
  const windowResult: SaferOutdoorWindowResult = useMemo(() => {
    return evaluateSaferOutdoorWindow(forecast, weather, profile, currentRiskLevel);
  }, [forecast, weather, profile, currentRiskLevel]);

  // Check if user has safer outdoor window notifications enabled
  const isNotificationEnabled =
    profile.notificationPreferences?.preferredConditions?.saferConditionsWindow ?? true;

  const handleToggleNotification = async () => {
    setIsUpdatingNotif(true);
    try {
      const currentPrefs = profile.notificationPreferences || getDefaultNotificationPreferences();

      await updateNotificationPreferences({
        ...currentPrefs,
        preferredConditions: {
          ...currentPrefs.preferredConditions,
          saferConditionsWindow: !isNotificationEnabled,
        },
      });
    } catch (err) {
      console.error('Failed to toggle safer window notification:', err);
    } finally {
      setIsUpdatingNotif(false);
    }
  };

  // Status-specific styling and icons
  const getStatusBadge = () => {
    switch (windowResult.status) {
      case 'ACTIVE_NOW':
        return {
          icon: ShieldCheck,
          text: t('outdoorWindow.activeNow', 'Active Right Now'),
          badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          dotClass: 'bg-emerald-500 animate-pulse',
          heroBg: 'from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30',
        };
      case 'UPCOMING_TODAY':
        return {
          icon: Clock,
          text: t('outdoorWindow.bestUpcoming', 'Best Upcoming Window'),
          badgeClass: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
          dotClass: 'bg-cyan-500',
          heroBg: 'from-cyan-500/10 via-blue-500/5 to-transparent border-cyan-500/30',
        };
      case 'UPCOMING_TOMORROW_MORNING':
        return {
          icon: Calendar,
          text: t('outdoorWindow.nextTomorrow', 'Next Window: Tomorrow'),
          badgeClass: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
          dotClass: 'bg-indigo-500',
          heroBg: 'from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/30',
        };
      case 'NO_SIGNIFICANT_RELIEF':
      default:
        return {
          icon: AlertTriangle,
          text: t('outdoorWindow.noWindow', 'No Significant Relief Expected'),
          badgeClass: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
          dotClass: 'bg-red-500',
          heroBg: 'from-red-500/10 via-orange-500/5 to-transparent border-red-500/30',
        };
    }
  };

  const statusInfo = getStatusBadge();
  const StatusIcon = statusInfo.icon;

  // Personalization vulnerability badge
  const getVulnerabilityBadge = () => {
    switch (windowResult.vulnerabilityTier) {
      case 'CRITICAL':
        return {
          label: t(windowResult.vulnerabilityReasonKey, 'High-Risk Profile'),
          badgeClass: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
        };
      case 'ELEVATED':
        return {
          label: t(windowResult.vulnerabilityReasonKey, 'Vulnerable Profile'),
          badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
        };
      case 'STANDARD':
      default:
        return {
          label: t(windowResult.vulnerabilityReasonKey, 'Standard Citizen'),
          badgeClass: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
        };
    }
  };

  const vulnInfo = getVulnerabilityBadge();

  return (
    <div
      className={`rounded-2xl ts-card-elevated border transition-all duration-300 overflow-hidden shadow-xl ${statusInfo.heroBg} ${className}`}
    >
      {/* Top Banner Header */}
      <div className="p-5 sm:p-6 border-b ts-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/30 flex-shrink-0">
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {t('outdoorWindow.title', 'Safer Outdoor Window')}
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {t('outdoorWindow.subtitle', 'Thermal Relief Window')}
                </span>
              </div>
              <h2 className="text-sm font-semibold ts-text-muted mt-0.5">
                {t('outdoorWindow.question', 'When is it safer to go outside?')}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {/* Vulnerability tier pill */}
            <span
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${vulnInfo.badgeClass}`}
            >
              {vulnInfo.label}
            </span>

            {/* Status pill */}
            <span
              className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-extrabold rounded-lg border ${statusInfo.badgeClass}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
              <span>{statusInfo.text}</span>
            </span>
          </div>
        </div>

        {/* Hero Window Section */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Main Time Range Callout */}
          <div className="md:col-span-7 space-y-2">
            <div className="flex items-baseline space-x-3">
              <span className="text-3xl sm:text-4xl font-extrabold ts-text-primary tracking-tight font-mono">
                {windowResult.windowLabel}
              </span>
            </div>

            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
              "{t(windowResult.recommendationKey, 'Conditions are expected to be less stressful than the afternoon peak.')}"
            </p>

            {/* Cautious Action Guidance */}
            <div className="flex items-start space-x-2 text-xs ts-text-muted pt-1">
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{t(windowResult.cautiousGuidanceKey, 'Keep outdoor tasks brief and maintain hydration.')}</span>
            </div>
          </div>

          {/* Peak Comparison Metrics */}
          <div className="md:col-span-5 grid grid-cols-2 gap-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-3.5 rounded-xl border ts-border">
            {/* Peak Heat Today */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider ts-text-muted flex items-center space-x-1">
                <Flame className="w-3 h-3 text-red-500" />
                <span>{t('outdoorWindow.peakHeat', 'Peak Daytime Heat')}</span>
              </span>
              <p className="text-lg font-extrabold text-red-600 dark:text-red-400 mt-0.5">
                {windowResult.peakApparentTempC.toFixed(1)}°C
              </p>
              <span className="text-[10px] ts-text-muted">
                {windowResult.peakHourDisplay}
              </span>
            </div>

            {/* Window Average / Relief */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>{t('outdoorWindow.apparentDrop', 'Lower Apparent Heat')}</span>
              </span>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                ~{windowResult.apparentTempReliefDeg.toFixed(1)}°C Relief
              </p>
              <span className="text-[10px] ts-text-muted">
                {t('outdoorWindow.reliefAvg', 'Window Avg')}: {windowResult.windowAvgApparentTempC.toFixed(1)}°C
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Thermal Trajectory Strip */}
      {variant !== 'compact' && windowResult.hourlyTimeline && windowResult.hourlyTimeline.length > 0 && (
        <div className="px-5 py-4 border-b ts-border bg-slate-500/5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider ts-text-muted flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('outdoorWindow.hourlyTimeline', '24-Hour Thermal Trajectory')}</span>
            </span>

            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{t('outdoorWindow.saferHours', 'Safer Hours')}</span>
              </span>
              <span className="flex items-center space-x-1 text-red-600 dark:text-red-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>{t('outdoorWindow.peakHours', 'Peak Heat')}</span>
              </span>
            </div>
          </div>

          {/* Horizontal scrollable timeline strip */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            {windowResult.hourlyTimeline.slice(0, 16).map((pt, idx) => {
              const isCurrentHour = idx === 0;

              return (
                <div
                  key={pt.timeIso || idx}
                  className={`flex-shrink-0 w-20 p-2 rounded-xl text-center transition-all border ${
                    pt.isSafer
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 shadow-sm shadow-emerald-500/10'
                      : pt.isPeakHeat
                      ? 'bg-red-500/15 border-red-500/40 text-red-900 dark:text-red-200'
                      : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  } ${isCurrentHour ? 'ring-2 ring-orange-500/50' : ''}`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                    {pt.displayHour.split(' ')[0]}
                    <span className="text-[8px] ml-0.5">{pt.displayHour.split(' ')[1]}</span>
                  </div>

                  <div className="my-1 flex items-center justify-center">
                    {pt.isSafer ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    ) : pt.isPeakHeat ? (
                      <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                        <Flame className="w-3 h-3" />
                      </div>
                    ) : pt.isDay ? (
                      <Sun className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>

                  <div className="text-xs font-black">
                    {Math.round(pt.apparentTemp)}°
                  </div>

                  <div className="text-[9px] opacity-75 mt-0.5">
                    {pt.uvIndex > 0 ? `${pt.uvIndex.toFixed(0)} UV` : 'Night'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expandable "Why This Window?" Factor Breakdown (Only in full forecast mode) */}
      {variant !== 'compact' && (
        <div className="px-5 py-3 border-b ts-border flex items-center justify-between bg-white/20 dark:bg-slate-900/20">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t('outdoorWindow.whyThisWindow', 'Why This Window?')}</span>
            <span className="text-[10px] ts-text-muted font-normal hidden sm:inline">
              — {t('outdoorWindow.whyThisWindowSubtitle', 'Relative improvement over peak afternoon conditions')}
            </span>
            {showExplanation ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            )}
          </button>

          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            {t(windowResult.suitableActivitiesKey, 'Permissible: Essential outdoor transit')}
          </span>
        </div>
      )}

      {variant !== 'compact' && showExplanation && (
        <div className="p-5 bg-white/30 dark:bg-slate-900/40 border-b ts-border space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {windowResult.reliefFactors.map((factor) => {
              const Icon =
                factor.iconType === 'sun'
                  ? Sun
                  : factor.iconType === 'wind'
                  ? Wind
                  : factor.iconType === 'shield'
                  ? ShieldCheck
                  : Thermometer;

              return (
                <div
                  key={factor.id}
                  className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border ts-border space-y-1.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold ts-text-primary flex items-center space-x-1.5">
                      <Icon className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t(factor.labelKey, factor.id)}</span>
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {factor.metric}
                    </span>
                  </div>
                  <p className="text-[11px] ts-text-muted leading-snug">
                    {t(factor.descriptionKey, factor.delta)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Scientific / Medical Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-500/10 border ts-border flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] ts-text-muted leading-relaxed">
              {t(
                'outdoorWindow.disclaimer',
                'ThermoShield evaluates relative thermal easing compared to surrounding hours. It does not guarantee zero health risk. Always listen to your body and avoid strenuous physical exertion.'
              )}
            </p>
          </div>
        </div>
      )}

      {/* Footer Controls & CTAs */}
      <div className="p-4 sm:px-6 bg-slate-500/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Quick Notification Toggle Button */}
        <button
          type="button"
          onClick={handleToggleNotification}
          disabled={isUpdatingNotif}
          className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 border ${
            isNotificationEnabled
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-400'
          }`}
        >
          {isNotificationEnabled ? (
            <>
              <BellRing className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t('outdoorWindow.notificationActive', 'Window Alert Scheduled')}</span>
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('outdoorWindow.notifyMe', 'Notify me when safer window begins')}</span>
            </>
          )}
        </button>

        {/* Link to 5-day Synoptic Forecast */}
        <Link
          to="/forecast"
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
        >
          <span>
            {variant === 'compact'
              ? t('outdoorWindow.ctaForecastPlanning', 'View Full Forecast & Planning')
              : t('outdoorWindow.ctaForecast', 'View 5-Day Synoptic Outlook')}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
