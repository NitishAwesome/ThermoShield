import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, ShieldCheck } from 'lucide-react';

interface FallbackModeBannerProps {
  isFallback?: boolean;
  compact?: boolean;
  onRetry?: () => void;
  className?: string;
  sourceName?: string;
}

export const FallbackModeBanner: React.FC<FallbackModeBannerProps> = ({
  isFallback = true,
  compact = false,
  onRetry,
  className = '',
  sourceName = 'Regional Baseline Dataset',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isFallback) return null;

  if (compact) {
    return (
      <div 
        className={`w-full bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 py-1.5 px-3 sm:px-4 text-xs flex items-center justify-between gap-2 transition-colors ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="font-semibold truncate">
            Offline Demonstration Mode:
          </span>
          <span className="text-amber-700/90 dark:text-amber-300/90 hidden sm:inline truncate">
            Live telemetry temporarily unavailable; using {sourceName}.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] underline hover:text-amber-950 dark:hover:text-amber-100 font-medium cursor-pointer"
          >
            {isExpanded ? 'Hide info' : 'Why?'}
          </button>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 transition-colors"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Retry</span>
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="fixed inset-x-0 top-10 z-50 p-4 mx-auto max-w-xl bg-white dark:bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl text-slate-800 dark:text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Offline Demonstration Mode Active
              </h4>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">
              Live meteorological telemetry from the Open-Meteo API is currently unreachable, rate-limited, or responding with network latency.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
              To guarantee zero disruption during demonstrations and technical evaluations, ThermoShield seamlessly switches to calibrated regional baseline data. All calculations and risk guidance remain fully functional.
            </p>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <span>Active dataset: <strong className="text-slate-700 dark:text-slate-200">{sourceName}</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Continuity Guarded
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`rounded-xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 p-3.5 sm:p-4 text-amber-900 dark:text-amber-200 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Offline Demonstration Mode
            </h4>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
              {sourceName}
            </span>
          </div>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed mb-2">
            Live weather data is temporarily unavailable. ThermoShield is using a regional baseline or fallback dataset for demonstration and continuity.
          </p>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-500/20 text-[11px]">
            <span className="text-amber-700/80 dark:text-amber-400/80 text-[11px]">
              Scientific calculation engines continue operating on fallback inputs.
            </span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Live Stream</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
