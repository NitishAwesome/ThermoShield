import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  AlertTriangle,
  Flame,
  Sun,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { DailyForecast, WeatherCondition, RiskLevel } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { Badge, Card } from './ui';
import { translateRiskLevel } from '../utils/translationHelpers';

export type TrendDirection = 'WORSENING' | 'STABLE' | 'IMPROVING';

export interface TimelineStep {
  timeLabel: string;
  hourIso: string;
  apparentTemp: number;
  temp: number;
  riskLevel: RiskLevel;
  isPeak: boolean;
}

export interface RiskEvolutionData {
  direction: TrendDirection;
  currentLevel: RiskLevel;
  peakLevel: RiskLevel;
  transitionSummary: string;
  proactiveInsight: string;
  peakHourDisplay: string;
  reliefHourDisplay?: string;
  steps: TimelineStep[];
}

interface RiskEvolutionTimelineProps {
  forecast?: DailyForecast;
  weather?: WeatherCondition;
  currentRiskLevel?: RiskLevel;
  className?: string;
  variant?: 'compact' | 'detailed';
}

/**
 * Maps apparent temperature to an estimated RiskLevel following IMD & biometeorological thresholds.
 */
function estimateRiskLevelFromApparent(at: number): RiskLevel {
  if (at >= 42.0) return 'EXTREME';
  if (at >= 38.0) return 'HIGH';
  if (at >= 32.0) return 'MODERATE';
  return 'LOW';
}

/**
 * Reusable biometeorological risk evolution evaluator.
 * Evaluates whether conditions are WORSENING, STABLE, or IMPROVING over the diurnal cycle.
 */
export function evaluateRiskEvolution(
  forecast?: DailyForecast,
  weather?: WeatherCondition,
  currentRiskLevel?: RiskLevel
): RiskEvolutionData {
  const currentTemp = weather?.temperature || 33.0;
  const currentApparent = weather?.apparent_temperature || weather?.temperature || 35.0;
  const currentLevel: RiskLevel = currentRiskLevel || estimateRiskLevelFromApparent(currentApparent);

  const hourly = forecast?.hourly;
  const now = new Date();
  const currentHour = now.getHours();

  // Build 4 representative timeline points: NOW, +2h, +4h, +6h
  const offsets = [0, 2, 4, 6];
  const steps: TimelineStep[] = [];

  let peakApparent = currentApparent;
  let peakHourStr = '2:00 PM';
  let maxStepRisk: RiskLevel = currentLevel;

  offsets.forEach((hOffset, idx) => {
    const targetDt = new Date(now.getTime() + hOffset * 3600 * 1000);
    const targetHour = targetDt.getHours();
    const timeLabel =
      idx === 0
        ? 'Now'
        : targetDt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    let at = currentApparent;
    let t = currentTemp;

    if (hourly && hourly.time && hourly.time.length > 0) {
      // Find matching hour in hourly forecast if available
      const isoPrefix = targetDt.toISOString().slice(0, 13);
      const matchIdx = hourly.time.findIndex((iso) => iso.startsWith(isoPrefix));
      if (matchIdx >= 0) {
        t = hourly.temperature[matchIdx] ?? t;
        at = hourly.apparent_temperature[matchIdx] ?? (t + 2.0);
      } else {
        // Diurnal curve relative to 2:30 PM peak
        const diurnalFactor = Math.cos(((targetHour - 14.5) * Math.PI) / 12.0);
        at = Math.round((currentApparent + diurnalFactor * 3.5) * 10) / 10;
        t = Math.round((currentTemp + diurnalFactor * 2.8) * 10) / 10;
      }
    } else {
      const diurnalFactor = Math.cos(((targetHour - 14.5) * Math.PI) / 12.0);
      at = Math.round((currentApparent + diurnalFactor * 3.5) * 10) / 10;
      t = Math.round((currentTemp + diurnalFactor * 2.8) * 10) / 10;
    }

    if (at > peakApparent) {
      peakApparent = at;
      peakHourStr = targetDt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    const stepRisk = estimateRiskLevelFromApparent(at);
    if (getSeverityRank(stepRisk) > getSeverityRank(maxStepRisk)) {
      maxStepRisk = stepRisk;
    }

    steps.push({
      timeLabel,
      hourIso: targetDt.toISOString(),
      apparentTemp: at,
      temp: t,
      riskLevel: stepRisk,
      isPeak: false,
    });
  });

  // Mark the peak step
  let highestIdx = 0;
  let highestAt = -999;
  steps.forEach((s, i) => {
    if (s.apparentTemp > highestAt) {
      highestAt = s.apparentTemp;
      highestIdx = i;
    }
  });
  steps[highestIdx].isPeak = true;

  // Determine trend direction
  const nowRank = getSeverityRank(currentLevel);
  const peakRank = getSeverityRank(maxStepRisk);
  const laterRank = getSeverityRank(steps[steps.length - 1].riskLevel);

  let direction: TrendDirection = 'STABLE';
  let transitionSummary = 'High heat conditions continuing at stable intensity.';
  let proactiveInsight = 'Maintain consistent hydration and avoid unshaded midday exertion.';

  // If in early morning/midday before peak, and peak is higher than now: WORSENING
  if (currentHour < 15 && peakRank > nowRank) {
    direction = 'WORSENING';
    transitionSummary = `Risk escalating from ${currentLevel} → ${maxStepRisk}.`;
    proactiveInsight = `Heat stress is expected to intensify over the next 2 hours. Peak conditions near ${peakHourStr}.`;
  } else if (laterRank < nowRank || (currentHour >= 16 && steps[steps.length - 1].apparentTemp < currentApparent - 1.5)) {
    direction = 'IMPROVING';
    const endLevel = steps[steps.length - 1].riskLevel;
    transitionSummary = `Conditions beginning to ease from ${currentLevel} → ${endLevel}.`;
    proactiveInsight = `Thermal stress begins declining as solar radiation wanes. Evening outdoor conditions will be comparatively safer.`;
  } else {
    direction = 'STABLE';
    transitionSummary = `Heat stress remains steady around ${currentLevel} levels.`;
    proactiveInsight = `Prolonged thermal load remains elevated. Follow ISO 7243 work-rest pacing until late evening.`;
  }

  return {
    direction,
    currentLevel,
    peakLevel: maxStepRisk,
    transitionSummary,
    proactiveInsight,
    peakHourDisplay: peakHourStr,
    steps,
  };
}

function getSeverityRank(level: RiskLevel): number {
  switch ((level || '').toUpperCase()) {
    case 'CRITICAL':
      return 5;
    case 'EXTREME':
      return 4;
    case 'HIGH':
      return 3;
    case 'MODERATE':
      return 2;
    default:
      return 1;
  }
}

export const RiskEvolutionTimeline: React.FC<RiskEvolutionTimelineProps> = ({
  forecast,
  weather,
  currentRiskLevel,
  className = '',
  variant = 'compact',
}) => {
  const { t } = useTranslation();

  const evolution = useMemo(() => {
    return evaluateRiskEvolution(forecast, weather, currentRiskLevel);
  }, [forecast, weather, currentRiskLevel]);

  const getDirectionBadge = () => {
    switch (evolution.direction) {
      case 'WORSENING':
        return {
          icon: TrendingUp,
          text: t('evolution.worsening', '↑ Worsening'),
          classes: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500 animate-pulse',
        };
      case 'IMPROVING':
        return {
          icon: TrendingDown,
          text: t('evolution.improving', '↓ Improving'),
          classes: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
        };
      default:
        return {
          icon: Minus,
          text: t('evolution.stable', '→ Stable'),
          classes: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
        };
    }
  };

  const dirBadge = getDirectionBadge();
  const DirIcon = dirBadge.icon;

  return (
    <div
      className={`rounded-2xl p-4 ts-card border ts-border transition-all ${className}`}
    >
      {/* Header Row: Trend Status & Meaningful Transition */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b ts-border pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider ts-text-subtle block">
              {t('evolution.title', 'Heat Risk Evolution')}
            </span>
            <h4 className="text-xs sm:text-sm font-extrabold ts-text-primary">
              {evolution.transitionSummary}
            </h4>
          </div>
        </div>

        <div className={`px-2.5 py-1 rounded-full border text-xs font-bold flex items-center space-x-1.5 ${dirBadge.classes}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dirBadge.dot}`} />
          <DirIcon className="w-3.5 h-3.5" />
          <span>{dirBadge.text}</span>
        </div>
      </div>

      {/* Proactive Contextual Insight */}
      <div className="my-3 text-xs leading-relaxed ts-text-muted flex items-start space-x-2 bg-slate-500/5 p-2.5 rounded-xl border ts-border">
        <Info className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
        <p className="text-[11.5px] leading-relaxed">
          <strong className="ts-text-primary font-semibold">
            {t('evolution.forecastInsight', 'Proactive Outlook')}:{' '}
          </strong>
          {evolution.proactiveInsight}
        </p>
      </div>

      {/* 4-Step Visual Timeline */}
      <div className="pt-2">
        <div className="text-[10px] font-bold uppercase tracking-wider ts-text-subtle mb-2">
          {t('evolution.trajectoryLabel', 'Diurnal Risk Timeline (Next 6 Hours)')}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {evolution.steps.map((step, idx) => {
            const isLast = idx === evolution.steps.length - 1;
            const rank = getSeverityRank(step.riskLevel);
            const isPeak = step.isPeak;

            return (
              <div
                key={step.hourIso + idx}
                className={`p-2.5 rounded-xl border text-center transition-all relative ${
                  isPeak
                    ? 'bg-red-500/10 border-red-500/40 ring-1 ring-red-500/30'
                    : 'ts-card-subtle border ts-border'
                }`}
              >
                {isPeak && (
                  <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase bg-red-500 text-white shadow-xs">
                    {t('evolution.peakBadge', 'Peak')}
                  </span>
                )}

                <div className="text-[10.5px] font-bold ts-text-muted">
                  {step.timeLabel}
                </div>

                <div className="text-sm font-black font-mono ts-text-primary mt-1">
                  {step.apparentTemp.toFixed(1)}°
                </div>

                <div className="mt-1.5 flex justify-center">
                  <Badge riskLevel={step.riskLevel} size="sm">
                    {translateRiskLevel(step.riskLevel, t)}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
