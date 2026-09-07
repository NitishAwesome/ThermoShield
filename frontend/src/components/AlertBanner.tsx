import React from 'react';
import { AlertOctagon, AlertTriangle, ShieldCheck, Droplet, UserX, Clock } from 'lucide-react';
import { RiskAssessment, HydrationGuidance, ActivityGuidance, VulnerablePopulationGuidance } from '../types';
import { getRiskBadgeStyles } from '../utils/risk';

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
  if (!riskAssessment) return null;

  const level = riskAssessment.level;
  const styles = getRiskBadgeStyles(level);
  const isElevated = level === 'HIGH' || level === 'EXTREME';

  return (
    <div
      className={`rounded-2xl border ${styles.border} ${styles.bg} p-5 shadow-lg backdrop-blur-md transition-all`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Main Alert Message */}
        <div className="flex items-start space-x-3.5">
          <div className="p-2 rounded-xl ts-card-elevated border ts-border mt-0.5 flex-shrink-0">
            {isElevated ? (
              <AlertOctagon className={`w-6 h-6 ${styles.text}`} />
            ) : level === 'MODERATE' ? (
              <AlertTriangle className={`w-6 h-6 ${styles.text}`} />
            ) : (
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded text-xs font-extrabold uppercase tracking-wider ${styles.badge}`}>
                {level} RISK ALERT
              </span>
              <span className="text-xs ts-text-subtle font-mono">
                Severity: {Math.round(riskAssessment.score * 100)}/100
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold ts-text-primary">
              <span className="ts-text-muted font-normal">Why it matters: </span>
              {riskAssessment.reason}
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
                  ? `Drink ~${hydration.approximate_amount_ml}mL (${hydration.recommended_interval})`
                  : hydration.recommended_interval}
              </span>
            </div>

            {activity?.peak_heat_hours && (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ts-card-subtle border ts-border text-amber-700 dark:text-amber-300 font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Daily Peak Sun Window: {activity.peak_heat_hours}</span>
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
            <span className="font-bold">What to do for Vulnerable Groups: </span>
            <span>{vulnerable.groups?.join(', ')} should stay in ventilated indoor spaces. </span>
            <span className="ts-text-muted">{vulnerable.guidance}</span>
          </div>
        </div>
      )}
    </div>
  );
};
