import React, { useState } from 'react';
import { Info, HelpCircle, X, ExternalLink } from 'lucide-react';

export type CalculationMetricType = 
  | 'wbgt'
  | 'heat_index'
  | 'composite_index'
  | 'personal_risk'
  | 'service_pressure';

interface CalculationInfoTooltipProps {
  type?: CalculationMetricType;
  title?: string;
  explanation?: string;
  formula?: string;
  caveat?: string;
  variant?: 'icon' | 'link' | 'pill';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const METRIC_DEFAULTS: Record<CalculationMetricType, {
  title: string;
  explanation: string;
  formula?: string;
  caveat?: string;
}> = {
  wbgt: {
    title: 'Estimated WBGT (Wet Bulb Globe Temperature)',
    explanation: 'Estimated from meteorological ambient temperature, relative humidity, solar radiation, and wind conditions using ThermoShield’s biometeorological calculation pipeline. This is an analytical WBGT estimate derived from meteorological modeling, and not a physical in-situ black-globe sensor measurement.',
    formula: 'WBGT ≈ 0.7·Twb + 0.2·Tg(est) + 0.1·Ta (Stull wet-bulb & radiative globe approximation)',
    caveat: 'Provides regional environmental thermal strain approximation for active populations.'
  },
  heat_index: {
    title: 'Rothfusz Heat Index',
    explanation: 'Computed using the National Weather Service (NWS) Rothfusz multi-regression polynomial, assessing perceived temperature when relative humidity impairs evaporative cooling via perspiration.',
    formula: 'HI = -42.379 + 2.049·T + 10.143·RH - 0.224·T·RH - ...',
    caveat: 'Valid for ambient temperatures above 26.7°C (80°F) and relative humidities above 40%.'
  },
  composite_index: {
    title: 'ThermoShield Composite Thermal Strain Index',
    explanation: 'Combines environmental heat conditions, biometeorological calculations, vulnerability factors, and model-based risk estimation into a 0–100 operational strain scale. It is a decision-support metric and not an officially codified IMD or NDMA index.',
    formula: 'Index = f(Estimated WBGT, Heat Index, Local Vulnerability, Diurnal Exposure)',
    caveat: 'Tailored for early warning response and community triage.'
  },
  personal_risk: {
    title: 'Personal Heat Risk Assessment',
    explanation: 'This assessment provides personalized heat-safety guidance based on your profile (age, health history, activity level, clothing, acclimatization) and real-time environmental conditions. It is an algorithmic decision-support tool, not a medical diagnosis.',
    formula: 'Personal Risk = Baseline Environmental Strain × Metabolic Load × Vulnerability Multiplier',
    caveat: 'Always consult healthcare professionals for clinical symptoms or personal medical advice.'
  },
  service_pressure: {
    title: 'Modelled Service Pressure Planning Estimate',
    explanation: 'A municipal planning indicator derived from acute heat strain indices and demographic vulnerability factors to anticipate surge demand for emergency cooling and outpatient triage. It does not use live hospital admission records or electronic health records (EHR) and does not predict exact patient counts.',
    formula: 'Surge Proxy = f(Area Thermal Strain, Elderly Population Density, Outdoor Labor Concentration)',
    caveat: 'Designed exclusively for resource pre-positioning and emergency staffing.'
  }
};

export const CalculationInfoTooltip: React.FC<CalculationInfoTooltipProps> = ({
  type,
  title,
  explanation,
  formula,
  caveat,
  variant = 'icon',
  size = 'sm',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const defaults = type ? METRIC_DEFAULTS[type] : null;
  const displayTitle = title || defaults?.title || 'Calculation Methodology';
  const displayExplanation = explanation || defaults?.explanation || '';
  const displayFormula = formula !== undefined ? formula : defaults?.formula;
  const displayCaveat = caveat || defaults?.caveat;

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {variant === 'icon' && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Methodology for ${displayTitle}`}
          aria-expanded={isOpen}
          className="text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded p-0.5 transition-colors"
        >
          <Info className={iconSizes[size]} />
        </button>
      )}

      {variant === 'link' && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
        >
          <HelpCircle className="w-3 h-3" />
          <span>How is this calculated?</span>
        </button>
      )}

      {variant === 'pill' && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <Info className="w-2.5 h-2.5" />
          <span>Methodology</span>
        </button>
      )}

      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 sm:hidden" 
            onClick={() => setIsOpen(false)}
          />
          
          <div 
            className="absolute z-50 left-0 sm:left-auto sm:right-0 mt-2 top-full w-72 sm:w-84 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-label={displayTitle}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {displayTitle}
              </h4>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
              {displayExplanation}
            </p>

            {displayFormula && (
              <div className="mb-2 p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                  Analytical Formula
                </span>
                <code className="block text-[11px] font-mono text-cyan-700 dark:text-cyan-300 break-words">
                  {displayFormula}
                </code>
              </div>
            )}

            {displayCaveat && (
              <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 p-2 rounded">
                <span className="font-semibold">Context: </span>
                {displayCaveat}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
