import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Cpu } from 'lucide-react';
import { RiskAssessment } from '../types';
import { getRiskBadgeStyles } from '../utils/risk';

interface RiskCardProps {
  riskAssessment?: RiskAssessment;
  mlRiskScore?: number;
  mlRiskLevel?: string;
  mlRiskError?: string | null;
  locationName?: string;
}

export const RiskCard: React.FC<RiskCardProps> = ({
  riskAssessment,
  mlRiskScore,
  mlRiskLevel,
  mlRiskError,
}) => {
  const level = riskAssessment?.level || 'LOW';
  const styles = getRiskBadgeStyles(level);
  const score = riskAssessment?.score !== undefined ? riskAssessment.score : 0;
  const scorePercent = Math.min(100, Math.max(0, Math.round(score * 100)));

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-800/90 border ${styles.border} p-6 shadow-xl backdrop-blur-md flex flex-col justify-between`}>
      {/* Background ambient glow */}
      <div className={`absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl opacity-20 ${styles.badge}`} />

      <div>
        {/* Header with Risk Level Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className={`w-5 h-5 ${styles.text}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Current Biometeorological Thermal Stress
            </span>
          </div>
          <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border ${styles.bg}`}>
            <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
            <span>{level} THERMAL STRAIN</span>
          </div>
        </div>

        {/* Big Score Gauge & Primary Index */}
        <div className="mt-5 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight font-sans ${styles.text}`}>
                {score.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 1.00</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Human Thermal Stress Score (Biometeorological Severity)
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">Primary Index</span>
            <span className="text-base font-bold text-slate-200 uppercase tracking-wide">
              {riskAssessment?.primary_index || 'WBGT'}
            </span>
          </div>
        </div>

        {/* Progress Bar Gauge */}
        <div className="mt-4">
          <div className="w-full h-2.5 bg-slate-700/60 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                level === 'EXTREME'
                  ? 'bg-red-500 shadow-lg shadow-red-500/50'
                  : level === 'HIGH'
                  ? 'bg-orange-500 shadow-lg shadow-orange-500/50'
                  : level === 'MODERATE'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>0.00 (Low)</span>
            <span>0.35 (Mod)</span>
            <span>0.65 (High)</span>
            <span>1.00 (Extreme)</span>
          </div>
        </div>

        {/* Diagnostic Reason */}
        <div className="mt-4 pt-3 border-t border-slate-700/60">
          <div className="flex items-start space-x-2">
            {level === 'HIGH' || level === 'EXTREME' ? (
              <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            )}
            <p className="text-xs text-slate-300 leading-relaxed">
              {riskAssessment?.reason || 'Calculated thermal strain and meteorological evaluation.'}
            </p>
          </div>
        </div>
      </div>

      {/* Distinct ML Health-Risk Prediction Section */}
      <div className="mt-4 pt-3 border-t border-slate-700/60">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>ML Health Impact Index:</span>
          </div>
          {mlRiskScore !== undefined ? (
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-purple-300 font-mono">{mlRiskScore.toFixed(1)} / 100</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                {mlRiskLevel || 'PREDICTION'}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              {mlRiskError || 'Health-risk prediction currently unavailable.'}
            </span>
          )}
        </div>

        {mlRiskScore !== undefined && mlRiskLevel && mlRiskLevel !== level && (
          <p className="mt-2 text-[10px] text-slate-400 leading-tight bg-purple-950/30 border border-purple-800/30 rounded-lg p-2">
            💡 <strong className="text-purple-300">Signal note:</strong> Thermal stress describes current environmental heat burden. ML health-risk prediction additionally considers demographic vulnerability and historical health signals.
          </p>
        )}
      </div>
    </div>
  );
};
