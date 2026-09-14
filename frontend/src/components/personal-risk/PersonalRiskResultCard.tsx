import React from 'react';
import { HeartPulse, CheckCircle2, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { Card, Badge } from '../ui';
import { PersonalRiskResult } from '../../types';
import { getRiskColor } from '../../utils/risk';
import { useTranslation } from '../../context/LanguageContext';
import {
  translateHeatStrainLevel,
  translatePersonalAlert,
  translateRiskLevel,
} from '../../utils/translationHelpers';
import { DataRealityBadge, CalculationInfoTooltip } from '../provenance';

interface PersonalRiskResultProps {
  result: PersonalRiskResult;
  mode: 'saved_profile' | 'scenario';
  locationName: string;
  className?: string;
}

export const PersonalRiskResultCard: React.FC<PersonalRiskResultProps> = ({
  result,
  mode,
  locationName,
  className = '',
}) => {
  const { t } = useTranslation();
  const level = (result.risk_level || 'LOW').toUpperCase();
  const score = Math.min(100, Math.max(0, Math.round(result.risk_score)));

  const getPlainExplanation = (lvl: string) => {
    switch (lvl) {
      case 'EXTREME':
      case 'CRITICAL':
        return t(
          'risk.plainExtreme',
          'Extreme heat strain. The current environmental heat and humidity severely prevent your body from cooling down naturally. Extended outdoor activity carries severe heat illness danger.'
        );
      case 'HIGH':
        return t(
          'risk.plainHigh',
          'High heat strain. The combination of heat, humidity, and your personal exposure puts significant stress on your cardiovascular and thermoregulatory systems. Reduce outdoor exertion.'
        );
      case 'MODERATE':
        return t(
          'risk.plainModerate',
          'Moderate heat strain. You will feel noticeable discomfort outdoors. Stay hydrated and avoid strenuous physical labor during peak afternoon heat.'
        );
      case 'LOW':
      default:
        return t(
          'risk.plainLow',
          'Low heat strain. Your body should be able to maintain safe thermal balance under current conditions with normal hydration.'
        );
    }
  };

  return (
    <Card variant="elevated" className={`p-5 sm:p-6 shadow-md overflow-hidden relative ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b ts-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono">
              Personal Assessment Result
            </span>
            <DataRealityBadge tier="CALCULATED" size="xs" />
            <CalculationInfoTooltip type="personal_risk" size="xs" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black ts-text-primary font-sans mt-0.5">
            Personal Heat Stress Guidance
          </h2>
        </div>

        <Badge riskLevel={result.risk_level} size="lg" showDot showIcon>
          {translateRiskLevel(result.risk_level, t)}
        </Badge>
      </div>

      {/* Main Score & Interpretation */}
      <div className="my-5 flex flex-col sm:flex-row items-center gap-6">
        {/* Animated Circular Score Gauge */}
        <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="52"
              stroke="var(--border-app)"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="64"
              cy="64"
              r="52"
              stroke={getRiskColor(result.risk_level)}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray="327"
              strokeDashoffset={327 - (327 * score) / 100}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black ts-text-primary font-mono leading-none">
              {score}
            </span>
            <span className="text-[10px] ts-text-subtle font-semibold uppercase mt-0.5">
              / 100
            </span>
          </div>
        </div>

        {/* Textual Interpretation */}
        <div className="text-center sm:text-left space-y-2 flex-1">
          <div className="text-base sm:text-lg font-black ts-text-primary leading-tight">
            {translateHeatStrainLevel(result.heat_strain_level, t)}
          </div>
          <p className="text-xs sm:text-sm ts-text-muted leading-relaxed font-medium">
            {getPlainExplanation(level)}
          </p>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center sm:justify-start gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {mode === 'saved_profile'
                ? `Calculated using your saved profile for ${locationName}`
                : `Calculated for custom scenario in ${locationName}`}
            </span>
          </div>
        </div>
      </div>

      {/* Decision Support Disclaimer Notice */}
      <div className="mt-4 pt-3 border-t ts-border text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Decision Support Notice: </strong>
          This assessment provides heat-safety guidance based on your profile and environmental conditions. It is not a medical diagnosis.
        </span>
      </div>
    </Card>
  );
};

export default PersonalRiskResultCard;
