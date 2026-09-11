import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
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
import { Card, Badge, MetricDisplay } from './ui';
import { formatTemperature } from '../utils/risk';
import { useTranslation } from '../context/LanguageContext';
import { translateRiskLevel, translateAlertReason } from '../utils/translationHelpers';

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
}) => {
  const { t } = useTranslation();
  const level = (riskAssessment?.level || 'LOW').toUpperCase();
  const score = riskAssessment?.score !== undefined ? riskAssessment.score : 0;
  const scorePercent = Math.min(100, Math.max(0, Math.round(score * 100)));

  // Freshness timestamp formatting
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : t('riskCard.liveTelemetry');

  const getBorderHighlight = () => {
    switch (level) {
      case 'EXTREME':
        return 'extreme' as const;
      case 'HIGH':
        return 'high' as const;
      case 'MODERATE':
        return 'moderate' as const;
      default:
        return 'low' as const;
    }
  };

  return (
    <Card
      variant="elevated"
      highlightBorder={getBorderHighlight()}
      className={`relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 ${className}`}
    >
      {/* Background ambient gradient glow */}
      <div
        className={`absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-15 ${
          level === 'EXTREME'
            ? 'bg-red-500'
            : level === 'HIGH'
            ? 'bg-orange-500'
            : level === 'MODERATE'
            ? 'bg-amber-500'
            : 'bg-emerald-500'
        }`}
      />

      <div className="space-y-4 sm:space-y-5">
        {/* Top bar: Location & Freshness */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b ts-border pb-3">
          <div className="flex items-center space-x-2 min-w-0">
            <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span className="text-sm font-bold ts-text-primary truncate max-w-[160px] sm:max-w-[240px]">
              {locationName || t('riskCard.currentLocation')}
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
              {t('riskCard.title')}
            </span>
            <h2 className="text-xl sm:text-2xl font-black ts-text-primary font-sans mt-0.5">
              {level === 'EXTREME'
                ? t('riskCard.extremeHazard')
                : level === 'HIGH'
                ? t('riskCard.highStrain')
                : level === 'MODERATE'
                ? t('riskCard.moderateBurden')
                : t('riskCard.lowRisk')}
            </h2>
          </div>

          <Badge riskLevel={level} size="lg" showDot showIcon>
            {translateRiskLevel(level, t)}
          </Badge>
        </div>

        {/* Dual Primary Metrics: Environmental Heat Strain vs Civic Health Risk */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* 1. Environmental Heat Strain */}
          <div className="p-4 rounded-xl ts-card-subtle border ts-border flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider ts-text-muted flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-orange-400" />
                {t('riskCard.heatStrainIndex')}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border ts-border ts-text-subtle font-mono">
                {riskAssessment?.primary_index || 'WBGT'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span
                className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                  level === 'EXTREME'
                    ? 'text-red-600 dark:text-red-400'
                    : level === 'HIGH'
                    ? 'text-orange-600 dark:text-orange-400'
                    : level === 'MODERATE'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {scorePercent}
              </span>
              <span className="text-sm font-semibold ts-text-muted">/ 100</span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  level === 'EXTREME'
                    ? 'bg-red-500'
                    : level === 'HIGH'
                    ? 'bg-orange-500'
                    : level === 'MODERATE'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <p className="text-[11px] ts-text-subtle mt-1.5 leading-tight">
              {t('riskCard.physiologicalStrain')}
            </p>
          </div>

          {/* 2. Civic Health Risk Score (ML Model Output) */}
          <div className="p-4 rounded-xl ts-card-subtle border border-purple-500/30 flex flex-col justify-between bg-purple-500/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                {t('riskCard.civicHealthRisk')}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-500/40 text-purple-700 dark:text-purple-300 font-mono">
                {t('riskCard.planningEstimate')}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              {mlRiskScore !== undefined ? (
                <>
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-purple-700 dark:text-purple-300">
                    {mlRiskScore.toFixed(1)}
                  </span>
                  <span className="text-sm font-semibold ts-text-muted">/ 100</span>
                </>
              ) : (
                <span className="text-sm font-medium ts-text-subtle italic py-3">
                  {mlRiskError || 'Model score calculating...'}
                </span>
              )}
            </div>

            {/* Visual Bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700/40 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, mlRiskScore || 0))}%` }}
              />
            </div>
            <p className="text-[11px] ts-text-subtle mt-1.5 leading-tight">
              {t('riskCard.healthcareDemand')}
            </p>
          </div>
        </div>

        {/* Rapid Ambient Weather Telemetry Row */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl ts-card-subtle border ts-border text-center">
            <div className="flex items-center justify-center space-x-1 text-xs ts-text-muted mb-0.5">
              <Thermometer className="w-3.5 h-3.5 text-orange-400" />
              <span>{t('weather.temperature')}</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono ts-text-primary">
              {temperature !== undefined ? `${temperature.toFixed(1)}°C` : '—'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl ts-card-subtle border ts-border text-center">
            <div className="flex items-center justify-center space-x-1 text-xs ts-text-muted mb-0.5">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('weather.humidity')}</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono ts-text-primary">
              {humidity !== undefined ? `${Math.round(humidity)}%` : '—'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl ts-card-subtle border ts-border text-center">
            <div className="flex items-center justify-center space-x-1 text-xs ts-text-muted mb-0.5">
              <Wind className="w-3.5 h-3.5 text-teal-400" />
              <span>{t('weather.windSpeed')}</span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono ts-text-primary">
              {windSpeed !== undefined ? `${windSpeed.toFixed(1)} m/s` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Bottom Footer / Guidance Reason */}
      <div className="mt-5 pt-3 border-t ts-border flex items-start space-x-2 text-xs ts-text-muted">
        {level === 'HIGH' || level === 'EXTREME' ? (
          <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
        )}
        <p className="leading-relaxed">
          <strong className="ts-text-primary">{t('riskCard.assessmentReason')} </strong>
          {translateAlertReason(riskAssessment?.reason, t) || t('riskDetails.conditionsComfortable')}
        </p>
      </div>
    </Card>
  );
};
