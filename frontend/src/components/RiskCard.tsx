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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Environmental Heat Strain
            </span>
          </div>
          <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border ${styles.bg}`}>
            <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
            <span>{level} STRAIN</span>
          </div>
        </div>

        {/* Big Score Gauge & Primary Index */}
        <div className="mt-5 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight font-sans ${styles.text}`}>
                {scorePercent}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              How stressful the current weather is for the body.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-semibold">Primary Index</span>
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
            <span>0 (Low)</span>
            <span>35 (Moderate)</span>
            <span>65 (High)</span>
            <span>100 (Extreme)</span>
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
              <strong className="text-slate-200">Why this matters: </strong>
              {riskAssessment?.reason || 'Calculated thermal strain and meteorological evaluation.'}
            </p>
          </div>
        </div>
      </div>

      {/* Distinct Score 2: Civic Health Risk Score */}
      <div className="mt-5 pt-3.5 border-t border-slate-700/80 bg-slate-900/60 -mx-6 -mb-6 p-4 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs text-purple-300 font-bold">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Civic Health Risk Score:</span>
          </div>
          {mlRiskScore !== undefined ? (
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-purple-200 font-mono text-sm">{mlRiskScore.toFixed(1)} / 100</span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-extrabold border border-purple-500/30">
                {mlRiskLevel || 'CIVIC RISK'}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              {mlRiskError || 'Health-risk prediction currently unavailable.'}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-300 mt-1 font-medium">
          Model-based estimate of potential pressure on local health services.
        </p>

        <p className="mt-2 text-[10.5px] text-slate-400 leading-snug bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
          <strong className="text-slate-300">Important: </strong>
          These are different scores and should not be compared as if they use the same scale or measure the same thing. <em>Environmental Heat Strain</em> measures physical weather stress on the body; <em>Civic Health Risk</em> estimates potential hospital and clinic surge.
        </p>
      </div>
    </div>
  );
};
