import React from 'react';
import { AlertOctagon, AlertTriangle, ShieldCheck, Droplet, UserX, Clock } from 'lucide-react';
import { RiskAssessment, HydrationGuidance, ActivityGuidance, VulnerablePopulationGuidance } from '../types';
import { getRiskBadgeStyles } from '../utils/risk';
import { useTranslation } from '../context/LanguageContext';
import { translateReason, translateRiskLevel, translateVulnerableGroup } from '../utils/translationHelpers';

interface AlertBannerProps {
  riskAssessment?: RiskAssessment;
  hydration?: HydrationGuidance;
  activity?: ActivityGuidance;
  vulnerable?: VulnerablePopulationGuidance;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  riskAssessment,
  hydration,
  activity,
  vulnerable,
}) => {
  const { t } = useTranslation();
  if (!riskAssessment) return null;

  const level = riskAssessment.level;
  const styles = getRiskBadgeStyles(level);
  const isElevated = level === 'HIGH' || level === 'EXTREME';

  return (
    <div
      className={`rounded-2xl border ${styles.border} ${styles.bg} p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Main Alert Message */}
        <div className="flex items-start space-x-3.5 min-w-0">
          <div className="p-2 rounded-xl ts-card-elevated border ts-border mt-0.5 flex-shrink-0">
            {isElevated ? (
              <AlertOctagon className={`w-6 h-6 ${styles.text}`} />
            ) : level === 'MODERATE' ? (
              <AlertTriangle className={`w-6 h-6 ${styles.text}`} />
            ) : (
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className={`px-2.5 py-0.5 rounded text-xs font-extrabold uppercase tracking-wider ${styles.badge}`}>
                {t('alertBanner.riskAlert', { level: translateRiskLevel(level, t) })}
              </span>
              <span className="text-xs ts-text-subtle font-mono">
                {t('alertBanner.severity', { score: Math.round(riskAssessment.score * 100) })}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold ts-text-primary">
              <span className="ts-text-muted font-normal">{t('alertBanner.whyItMatters')} </span>
              {translateReason(riskAssessment.reason, t)}
            </p>
          </div>
        </div>

        {/* Action summary badge pills */}
        {hydration && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ts-card-subtle border ts-border text-sky-600 dark:text-sky-300 font-semibold">
              <Droplet className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span>
                {hydration.approximate_amount_ml
                  ? t('alertBanner.drinkAmountInterval', {
                      amount: hydration.approximate_amount_ml,
                      interval: hydration.recommended_interval || '15-20 min'
                    })
                  : hydration.recommended_interval}
              </span>
            </div>

            {activity?.peak_heat_hours && (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ts-card-subtle border ts-border text-amber-700 dark:text-amber-300 font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>{t('alertBanner.peakSunWindow', { hours: activity.peak_heat_hours })}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vulnerability Alert if Active */}
      {vulnerable && vulnerable.priority && (
        <div className="mt-3 pt-3 border-t ts-border flex items-start space-x-2 text-xs text-orange-700 dark:text-orange-300">
          <UserX className="w-4 h-4 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{t('alertBanner.vulnerableNotice')} </span>
            <span>
              {t('alertBanner.stayVentilated', {
                groups: vulnerable.groups?.map((g: string) => translateVulnerableGroup(g, t)).join(', ') || ''
              })}{' '}
            </span>
            <span className="ts-text-muted">{vulnerable.guidance}</span>
          </div>
        </div>
      )}
    </div>
  );
};
