import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Cpu,
  MapPin,
  Clock,
  Thermometer,
  Droplets,
  Wind,
  Flame,
  Activity,
} from 'lucide-react';
import { RiskAssessment } from '../types';
import { Card, Badge } from './ui';
import { useTranslation } from '../context/LanguageContext';
import { translateRiskLevel, translateAlertReason } from '../utils/translationHelpers';
import { MetricExplainer } from './MetricExplainer';
import { DataRealityBadge, CalculationInfoTooltip } from './provenance';
import { TelemetryState } from '../utils/telemetryState';

interface RiskCardProps {
  riskAssessment?: RiskAssessment;
  mlRiskScore?: number;
  mlRiskLevel?: string;
  mlRiskError?: string | null;
  locationName?: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  wbgt?: number;
  timestamp?: string;
  className?: string;
  variant?: 'citizen' | 'full';
  telemetryState?: TelemetryState;
  isFallback?: boolean;
  weatherSourceName?: string;
}

export const RiskCard: React.FC<RiskCardProps> = ({
  riskAssessment,
  mlRiskScore,
  mlRiskLevel,
  mlRiskError,
  locationName,
  temperature,
  humidity,
  windSpeed,
  wbgt,
  timestamp,
  className = '',
  variant = 'citizen',
  telemetryState,
  isFallback = false,
  weatherSourceName,
}) => {
  const { t } = useTranslation();

  // Safety Truthfulness: Risk calculation is valid ONLY when riskAssessment contains real calculated values
  const hasCalculation = Boolean(
    riskAssessment &&
    riskAssessment.level !== undefined &&
    riskAssessment.level !== null &&
    riskAssessment.score !== undefined &&
    riskAssessment.score !== null &&
    !isNaN(riskAssessment.score)
  );

  const level = hasCalculation ? riskAssessment!.level.toUpperCase() : 'UNAVAILABLE';
  // Preserve valid zero scores: 0 is a valid calculated score of zero
  const score = hasCalculation ? riskAssessment!.score : null;
  const scorePercent = score !== null ? Math.min(100, Math.max(0, Math.round(score * 100))) : null;

  // Freshness & provenance label
  const formattedTime = (() => {
    if (!hasCalculation || telemetryState === 'UNAVAILABLE') {
      return 'Unavailable';
    }
    if (timestamp) {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (telemetryState === 'OFFLINE_FALLBACK' || isFallback) {
      return 'Offline Fallback';
    }
    if (telemetryState === 'STALE_CACHED') {
      return 'Stale Cached';
    }
    if (telemetryState === 'CACHED') {
      return 'Cached Data';
    }
    return 'Live Data';
  })();

  const getBorderHighlight = () => {
    if (!hasCalculation) return undefined;
    switch (level) {
      case 'EXTREME':
      case 'CRITICAL':
        return 'extreme' as const;
      case 'HIGH':
        return 'high' as const;
      case 'MODERATE':
        return 'moderate' as const;
      case 'LOW':
        return 'low' as const;
      default:
        return undefined;
    }
  };

  return (
    <Card
      variant="elevated"
      highlightBorder={getBorderHighlight()}
      className={`relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 shadow-md ${className}`}
    >
      {/* Background ambient gradient glow (Never green when unavailable) */}
      {hasCalculation && (
        <div
          className={`absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-15 ${
            level === 'EXTREME' || level === 'CRITICAL'
              ? 'bg-red-500'
              : level === 'HIGH'
              ? 'bg-orange-500'
              : level === 'MODERATE'
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
        />
      )}

      <div className="space-y-4 sm:space-y-5">
        {/* Top bar: Location & Freshness */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b ts-border pb-3">
          <div className="flex items-center space-x-2 min-w-0">
            <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span className="text-sm font-bold ts-text-primary truncate max-w-[160px] sm:max-w-[240px]">
              {locationName || t('riskCard.currentLocation', 'Current Location')}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs ts-text-muted">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">{formattedTime}</span>
          </div>
        </div>

        {/* Primary Heat Risk Level Badge & Title */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider ts-text-subtle">
              {t('riskCard.title', "Today's Heat Risk")}
            </span>
            <h2 className="text-xl sm:text-2xl font-black ts-text-primary font-sans mt-0.5">
              {!hasCalculation
                ? 'Unavailable'
                : level === 'EXTREME' || level === 'CRITICAL'
                ? t('riskCard.extremeHazard', 'Extreme Heat Stress')
                : level === 'HIGH'
                ? t('riskCard.highStrain', 'High Heat Stress')
                : level === 'MODERATE'
                ? t('riskCard.moderateBurden', 'Moderate Heat Discomfort')
                : t('riskCard.lowRisk', 'Low Heat Risk')}
            </h2>
          </div>

          {hasCalculation ? (
            <Badge riskLevel={level} size="lg" showDot showIcon>
              {translateRiskLevel(level, t)}
            </Badge>
          ) : (
            <Badge variant="neutral" size="lg" showDot>
              Unavailable
            </Badge>
          )}
        </div>

        {/* Citizen Variant: Plain language explanation & clear thermal gauge */}
        {variant === 'citizen' ? (
          <div className="p-4 sm:p-5 rounded-2xl ts-card-subtle border ts-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider ts-text-muted flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-orange-400" />
                <span>{t('riskCard.todayRiskScore', "Today's Heat Risk")}</span>
                <CalculationInfoTooltip type="composite_index" size="xs" />
              </span>
              <div className="flex items-center gap-1.5">
                <DataRealityBadge
                  tier={hasCalculation ? (isFallback ? 'OFFLINE_FALLBACK' : 'CALCULATED') : 'UNAVAILABLE'}
                  size="xs"
                  customLabel={hasCalculation ? undefined : 'Unavailable'}
                />
                <span className="text-xs font-bold font-mono ts-text-primary">
                  {scorePercent !== null ? `${scorePercent} / 100` : 'Not calculated'}
                </span>
              </div>
            </div>

            {/* Visual Gauge Bar */}
            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              {scorePercent !== null ? (
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    level === 'EXTREME' || level === 'CRITICAL'
                      ? 'bg-red-500'
                      : level === 'HIGH'
                      ? 'bg-orange-500'
                      : level === 'MODERATE'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${scorePercent}%` }}
                />
              ) : (
                <div className="h-full bg-slate-300 dark:bg-slate-700 w-0" />
              )}
            </div>

            {/* Plain English explanation */}
            <p className="text-xs sm:text-sm ts-text-primary font-medium leading-relaxed">
              {!hasCalculation
                ? 'Weather telemetry is unavailable. Heat risk will be calculated when meteorological data becomes available.'
                : level === 'EXTREME' || level === 'CRITICAL'
                ? t(
                    'riskCard.plainExtreme',
                    'The extreme heat may prevent your body from cooling down naturally. Stay indoors in shaded or cooled rooms.'
                  )
                : level === 'HIGH'
                ? t(
                    'riskCard.plainHigh',
                    'The current heat and humidity may make it harder for your body to cool down naturally.'
                  )
                : level === 'MODERATE'
                ? t(
                    'riskCard.plainModerate',
                    'Noticeable heat discomfort. Take precautions and avoid strenuous tasks in the direct afternoon sun.'
                  )
                : t(
                    'riskCard.plainLow',
                    'Low heat risk. Outdoor conditions are generally safe and comfortable.'
                  )}
            </p>
          </div>
        ) : (
          /* Dual Primary Metrics for Full / Technical / Authority Views */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* 1. Environmental Heat Strain */}
            <div className="p-4 rounded-xl ts-card-subtle border ts-border flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider ts-text-muted flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-orange-400" />
                  <span>ThermoShield Thermal Strain</span>
                  <CalculationInfoTooltip type="composite_index" size="xs" />
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded border ts-border ts-text-subtle font-mono flex items-center gap-1"
                  title="Estimated WBGT (Analytical Calculation)"
                >
                  <span>Est. WBGT</span>{wbgt !== undefined && wbgt !== null ? ` · ${wbgt.toFixed(1)}°C` : ' · —'}
                  <CalculationInfoTooltip type="wbgt" size="xs" />
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                <span
                  className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                    !hasCalculation
                      ? 'text-slate-400'
                      : level === 'EXTREME' || level === 'CRITICAL'
                      ? 'text-red-600 dark:text-red-400'
                      : level === 'HIGH'
                      ? 'text-orange-600 dark:text-orange-400'
                      : level === 'MODERATE'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {scorePercent !== null ? scorePercent : '—'}
                </span>
                {scorePercent !== null && <span className="text-sm font-semibold ts-text-muted">/ 100</span>}
              </div>

              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700/40 rounded-full overflow-hidden mt-3">
                {scorePercent !== null && (
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      level === 'EXTREME' || level === 'CRITICAL'
                        ? 'bg-red-500'
                        : level === 'HIGH'
                        ? 'bg-orange-500'
                        : level === 'MODERATE'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${scorePercent}%` }}
                  />
                )}
              </div>
              <p className="text-[11px] ts-text-subtle mt-1.5 leading-tight">
                {t('riskCard.physiologicalStrain', 'Physiological thermal strain')}
              </p>
              <MetricExplainer metricType="wbgt" className="mt-2.5" />
            </div>

            {/* 2. Civic Health Risk Score (ML Model Output) */}
            <div className="p-4 rounded-xl ts-card-subtle border border-purple-500/30 flex flex-col justify-between bg-purple-500/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  <span>Modelled Service Pressure</span>
                  <CalculationInfoTooltip type="service_pressure" size="xs" />
                </span>
                <DataRealityBadge tier="MODELLED" size="xs" />
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                {mlRiskScore !== undefined && mlRiskScore !== null ? (
                  <>
                    <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-purple-700 dark:text-purple-300">
                      {mlRiskScore.toFixed(1)}
                    </span>
                    <span className="text-sm font-semibold ts-text-muted">/ 100</span>
                  </>
                ) : (
                  <span className="text-sm font-medium ts-text-subtle italic py-3">
                    {mlRiskError || (hasCalculation ? 'Model score calculating...' : 'Unavailable')}
                  </span>
                )}
              </div>

              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700/40 rounded-full overflow-hidden mt-3">
                {mlRiskScore !== undefined && mlRiskScore !== null && (
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(0, mlRiskScore))}%` }}
                  />
                )}
              </div>
              <p className="text-[11px] ts-text-subtle mt-1.5 leading-tight">
                {t('riskCard.healthcareDemand', 'Healthcare demand proxy')}
              </p>
              <MetricExplainer metricType="riskScore" className="mt-2.5" />
            </div>
          </div>
        )}

        {/* Rapid Ambient Weather Telemetry Row (Everyday metrics) */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl ts-card-subtle border ts-border text-center">
            <div className="flex items-center justify-center space-x-1 text-xs ts-text-muted mb-0.5">
              <Thermometer className="w-3.5 h-3.5 text-orange-400" />
              <span>{t('weather.temperature', 'Temperature')}</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono ts-text-primary">
              {temperature !== undefined && temperature !== null && !isNaN(temperature) ? `${temperature.toFixed(1)}°C` : '—'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl ts-card-subtle border ts-border text-center">
            <div className="flex items-center justify-center space-x-1 text-xs ts-text-muted mb-0.5">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('weather.humidity', 'Humidity')}</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono ts-text-primary">
              {humidity !== undefined && humidity !== null && !isNaN(humidity) ? `${Math.round(humidity)}%` : '—'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl ts-card-subtle border ts-border text-center">
            <div className="flex items-center justify-center space-x-1 text-xs ts-text-muted mb-0.5">
              <Wind className="w-3.5 h-3.5 text-teal-400" />
              <span>{t('weather.windSpeed', 'Wind')}</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono ts-text-primary">
              {windSpeed !== undefined && windSpeed !== null && !isNaN(windSpeed) ? `${windSpeed.toFixed(1)} m/s` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Reason for Today's Risk */}
      <div className="mt-4 pt-3 border-t ts-border flex items-start space-x-2 text-xs ts-text-muted">
        {!hasCalculation ? (
          <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        ) : level === 'HIGH' || level === 'EXTREME' || level === 'CRITICAL' ? (
          <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
        )}
        <p className="leading-relaxed">
          <strong className="ts-text-primary">
            {!hasCalculation ? 'Status: ' : t('riskCard.mainReason', "Main reason for today's risk: ")}
          </strong>
          {!hasCalculation
            ? 'Weather telemetry is unavailable. Heat risk will be calculated when meteorological data becomes available.'
            : translateAlertReason(riskAssessment?.reason, t) ||
              t('riskDetails.conditionsComfortable', 'Moderate environmental temperatures and humidity.')}
        </p>
      </div>
    </Card>
  );
};

export default RiskCard;
