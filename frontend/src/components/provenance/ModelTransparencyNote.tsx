import React from 'react';
import { Activity, Info } from 'lucide-react';
import { DataRealityBadge } from './DataRealityBadge';

interface ModelTransparencyNoteProps {
  variant?: 'inline' | 'card' | 'compact';
  className?: string;
  showBadge?: boolean;
}

export const ModelTransparencyNote: React.FC<ModelTransparencyNoteProps> = ({
  variant = 'card',
  className = '',
  showBadge = true,
}) => {
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 ${className}`}>
        <Info className="w-3 h-3 text-amber-500 flex-shrink-0" />
        <span>Modelled planning proxy • Does not reflect live hospital admissions or EHR data.</span>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-500/20 text-xs text-amber-900/90 dark:text-amber-200/90 flex items-start gap-2 ${className}`}>
        <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <strong className="font-semibold text-amber-900 dark:text-amber-100">Planning Estimate: </strong>
          This is a planning indicator derived from heat conditions and vulnerability factors. It does not use live hospital admission records and does not predict exact patient counts.
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
          <Activity className="w-3.5 h-3.5 text-amber-500" />
          <span>Modelled Service Pressure Indicator</span>
        </div>
        {showBadge && <DataRealityBadge tier="MODELLED" size="xs" />}
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
        This is an operational planning indicator derived from biometeorological heat strain indices and demographic vulnerability factors. It does not ingest live hospital electronic health records (EHR) and does not predict exact patient counts.
      </p>
    </div>
  );
};
