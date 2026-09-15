import React from 'react';
import { Bell, MapPin, Clock, AlertTriangle, CheckCircle2, Flame, SunMedium } from 'lucide-react';
import { Card, Badge } from '../ui';
import { useTranslation } from '../../context/LanguageContext';
import { translateRiskLevel, translateAlertReason } from '../../utils/translationHelpers';
import { CalculationInfoTooltip } from '../provenance';

interface CurrentAlertStatusProps {
  riskLevel: string;
  locationName: string;
  temperature?: number;
  apparentTemp?: number;
  wbgt?: number;
  humidity?: number;
  reason?: string;
  peakHours?: string;
  lastUpdated?: string;
  className?: string;
}

export const CurrentAlertStatus: React.FC<CurrentAlertStatusProps> = ({
  riskLevel,
  locationName,
  temperature,
  apparentTemp,
  wbgt,
  humidity,
  reason,
  peakHours = '12:00 PM – 4:00 PM',
  lastUpdated,
  className = '',
}) => {
  const { t } = useTranslation();
  const level = (riskLevel || 'LOW').toUpperCase();
  const isExtreme = level === 'EXTREME' || level === 'CRITICAL';
  const isHigh = level === 'HIGH';
  const isModerate = level === 'MODERATE';
  const isActive = isHigh || isExtreme;

  const getAlertHeadline = () => {
    if (isExtreme) return t('alerts.headlineExtreme', 'Extreme Heat Emergency');
    if (isHigh) return t('alerts.headlineHigh', 'High Heat Alert');
    if (isModerate) return t('alerts.headlineModerate', 'Moderate Heat Advisory');
    return t('alerts.headlineLow', 'No Active Heat Warning');
  };

  const getAlertSummary = () => {
    if (isExtreme) {
      return t(
        'alerts.summaryExtreme',
        'Dangerous and life-threatening heat conditions exist in your area. Core body temperature can rise rapidly during outdoor exposure.'
      );
    }
    if (isHigh) {
      return t(
        'alerts.summaryHigh',
        'Severe heat and humidity are causing high physiological thermal strain. Extended outdoor activity carries high risk of heat exhaustion.'
      );
    }
    if (isModerate) {
      return t(
        'alerts.summaryModerate',
        'Elevated temperatures will cause noticeable physical discomfort outdoors. Take regular shade breaks and stay hydrated.'
      );
    }
    return t(
      'alerts.summaryLow',
      'Normal thermal conditions. Standard weather precautions apply with regular daily hydration.'
    );
  };

  const borderColorClass = isExtreme
    ? 'border-l-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
    : isHigh
    ? 'border-l-orange-500 bg-orange-50/40 dark:bg-orange-950/20'
    : isModerate
    ? 'border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
    : 'border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20';

  return (
    <Card
      variant="elevated"
      className={`p-5 sm:p-6 border-l-4 ${borderColorClass} shadow-sm overflow-hidden relative ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ts-border pb-3">
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isActive
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : isModerate
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isActive ? (
              <Flame className="w-5 h-5 animate-pulse" />
            ) : isModerate ? (
              <SunMedium className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono block">
              Official Heat Threat Status
            </span>
            <h2 className="text-xl sm:text-2xl font-black ts-text-primary font-sans leading-tight">
              {getAlertHeadline()}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isActive
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                : isModerate
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
            }`}
          >
            {isActive ? t('status.active', 'ACTIVE DANGER') : isModerate ? 'ADVISORY' : 'ROUTINE'}
          </span>
          <Badge riskLevel={level} size="md">
            {translateRiskLevel(level, t)}
          </Badge>
        </div>
      </div>

      {/* Main Alert Body */}
      <div className="mt-4 space-y-3">
        <p className="text-sm sm:text-base ts-text-primary font-medium leading-relaxed">
          {getAlertSummary()}
        </p>

        {/* Reason for Alert */}
        {reason && (
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border ts-border text-xs">
            <span className="font-bold ts-text-primary block mb-0.5">
              Why this alert is active:
            </span>
            <span className="ts-text-muted leading-relaxed">
              {translateAlertReason(reason, t)}
            </span>
          </div>
        )}

        {/* Snapshot Telemetry Details */}
        <div className="flex flex-wrap items-center gap-4 text-xs ts-text-muted pt-2 border-t ts-border">
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <span>
              Area: <strong className="ts-text-primary font-semibold">{locationName}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>
              Peak Risk Hours: <strong className="text-orange-600 dark:text-orange-400 font-semibold">{peakHours}</strong>
            </span>
          </div>

          {temperature !== undefined && (
            <div className="flex items-center space-x-1 font-mono text-xs ts-text-subtle">
              <span>Temp: <strong>{temperature.toFixed(1)}°C</strong></span>
              {apparentTemp !== undefined && <span>(Feels {apparentTemp.toFixed(1)}°C)</span>}
              {wbgt !== undefined && (
                <span className="flex items-center gap-1">
                  <span>• Est. WBGT: <strong>{wbgt.toFixed(1)}°C</strong></span>
                  <CalculationInfoTooltip type="wbgt" size="xs" />
                </span>
              )}
              {humidity !== undefined && <span>• {Math.round(humidity)}% RH</span>}
            </div>
          )}

          {lastUpdated && (
            <div className="text-[11px] ts-text-subtle ml-auto">
              Updated: {lastUpdated}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CurrentAlertStatus;
