import React from 'react';
import { Droplets, Clock, ShieldCheck, HeartPulse, Sun, AlertTriangle } from 'lucide-react';
import { Card, Badge } from '../ui';
import { PersonalRiskResult } from '../../types';
import { useTranslation } from '../../context/LanguageContext';
import {
  translateWorkRestCycle,
  translateSafetyRecommendation,
} from '../../utils/translationHelpers';

interface PersonalRiskGuidanceProps {
  result: PersonalRiskResult;
  isOutdoorWorker: boolean;
  hydrationStatus: string;
  hasHealthConditions: boolean;
  className?: string;
}

export const PersonalRiskGuidance: React.FC<PersonalRiskGuidanceProps> = ({
  result,
  isOutdoorWorker,
  hydrationStatus,
  hasHealthConditions,
  className = '',
}) => {
  const { t } = useTranslation();

  const hydrationMl = result.recommended_water_intake_ml_hr || 500;
  const workRest = result.work_rest_cycle || 'Standard hydration and shade breaks';

  // Determine guidance card priority based on user situation
  const isHydrationPriority = hydrationStatus === 'poor' || hydrationStatus === 'moderate';
  const isWorkRestPriority = isOutdoorWorker;
  const isHealthPriority = hasHealthConditions;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
            Actionable Advice
          </span>
          <h3 className="text-lg sm:text-xl font-black ts-text-primary font-sans mt-0.5">
            {t('risk.immediateGuidance', 'What You Should Do Now')}
          </h3>
        </div>
        <Badge variant="neutral" size="sm">
          {t('risk.personalizedToYou', 'Personalized to your situation')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hydration Card */}
        <Card
          variant={isHydrationPriority ? 'elevated' : 'default'}
          className={`p-4 sm:p-5 flex flex-col justify-between border ${
            isHydrationPriority
              ? 'border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
              : 'ts-border'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Droplets className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
                  {t('risk.hydrationTarget', 'Hydration Target')}
                </span>
              </div>
              {isHydrationPriority && (
                <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">
                  Priority
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black ts-text-primary font-mono">
                  {hydrationMl}
                </span>
                <span className="text-xs sm:text-sm font-semibold ts-text-muted">
                  mL / hour
                </span>
              </div>
              <p className="text-xs ts-text-muted mt-2 leading-relaxed">
                {t(
                  'risk.hydrationAdvice',
                  'Drink in small regular sips while active outdoors. Do not wait until you feel thirsty.'
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t ts-border text-[11px] ts-text-subtle font-medium">
            ≈ {Math.round(hydrationMl / 250)} standard glasses per hour
          </div>
        </Card>

        {/* Work & Rest Schedule Card */}
        <Card
          variant={isWorkRestPriority ? 'elevated' : 'default'}
          className={`p-4 sm:p-5 flex flex-col justify-between border ${
            isWorkRestPriority
              ? 'border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm'
              : 'ts-border'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                  {t('risk.workRestSchedule', 'Work & Rest Schedule')}
                </span>
              </div>
              {isWorkRestPriority && (
                <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded">
                  Outdoor Worker
                </span>
              )}
            </div>

            <div>
              <div className="text-base sm:text-lg font-bold ts-text-primary font-sans leading-snug">
                {translateWorkRestCycle(workRest, t)}
              </div>
              <p className="text-xs ts-text-muted mt-2 leading-relaxed">
                {t(
                  'risk.workRestAdvice',
                  'Rest periods must be spent in deep shade, a breezeway, or an air-conditioned room to drop core body temperature.'
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t ts-border text-[11px] ts-text-subtle font-medium">
            Based on NIOSH/OSHA thermal workload standards
          </div>
        </Card>

        {/* Recovery & Health Card */}
        <Card
          variant={isHealthPriority ? 'elevated' : 'default'}
          className={`p-4 sm:p-5 flex flex-col justify-between border ${
            isHealthPriority
              ? 'border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm'
              : 'ts-border'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-400/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-mono">
                  {t('risk.recoveryProtection', 'Cooling & Recovery')}
                </span>
              </div>
              {isHealthPriority && (
                <span className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 font-bold px-1.5 py-0.5 rounded">
                  Health Alert
                </span>
              )}
            </div>

            <div>
              <div className="text-base sm:text-lg font-bold ts-text-primary font-sans leading-snug">
                {hasHealthConditions
                  ? t('risk.healthMonitor', 'Active Medical Precaution')
                  : t('risk.coolingAccess', 'Thermal Cool-Down')}
              </div>
              <p className="text-xs ts-text-muted mt-2 leading-relaxed">
                {hasHealthConditions
                  ? t(
                      'risk.healthPrecautionAdvice',
                      'Pre-existing conditions impair thermal regulation. Monitor closely for dizziness, rapid pulse, or extreme fatigue.'
                    )
                  : t(
                      'risk.generalCoolingAdvice',
                      'Spend your main recovery breaks in air conditioning or direct cross-ventilation with fans.'
                    )}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t ts-border text-[11px] ts-text-subtle font-medium">
            Emergency contact: 108 / 112 (Disaster Response)
          </div>
        </Card>
      </div>

      {/* Specific Safety Recommendations if provided by backend */}
      {result.safety_recommendations && result.safety_recommendations.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider font-mono mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>{t('risk.keyDirectives', 'Key Safety Directives')}</span>
          </div>
          <ul className="space-y-1.5">
            {result.safety_recommendations.map((rec, idx) => (
              <li
                key={idx}
                className="text-xs sm:text-sm ts-text-primary flex items-start gap-2 font-medium"
              >
                <span className="text-amber-600 dark:text-amber-400 font-bold leading-none mt-1">
                  •
                </span>
                <span>{translateSafetyRecommendation(rec, t)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PersonalRiskGuidance;
