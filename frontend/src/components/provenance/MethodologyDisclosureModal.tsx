import React, { useState } from 'react';
import { X, Radio, Calculator, Activity, Sparkles, Clock, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';
import { DATA_REALITY_METADATA, DataRealityTier } from '../../types/provenance';

interface MethodologyDisclosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTier?: DataRealityTier;
}

export const MethodologyDisclosureModal: React.FC<MethodologyDisclosureModalProps> = ({
  isOpen,
  onClose,
  defaultTier = 'LIVE',
}) => {
  const [selectedTier, setSelectedTier] = useState<DataRealityTier>(defaultTier);

  if (!isOpen) return null;

  const tiers: DataRealityTier[] = [
    'LIVE',
    'CALCULATED',
    'MODELLED',
    'SIMULATED',
    'PLANNED',
    'OFFLINE_FALLBACK',
  ];

  const currentMeta = DATA_REALITY_METADATA[selectedTier];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-labelledby="methodology-modal-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 id="methodology-modal-title" className="text-base font-bold text-slate-900 dark:text-white leading-none">
                Data Reality & Provenance Architecture
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ThermoShield Scientific Methodology & Transparency Standards
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body with Side-by-side or Tabbed view */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Executive Overview */}
          <div className="p-3.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <p className="font-semibold text-cyan-900 dark:text-cyan-300 mb-1">
              "Is this data real, calculated, simulated, or planned?"
            </p>
            ThermoShield enforces complete reality transparency. Every metric, map layer, and recommendation displays an unambiguous provenance classification so technical evaluators, civic authorities, and citizens can verify where data originates.
          </div>

          {/* Tier Pills Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Select Reality Tier to Inspect
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tiers.map((tier) => {
                const meta = DATA_REALITY_METADATA[tier];
                const isSelected = selectedTier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setSelectedTier(tier)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left border text-xs transition-all ${
                      isSelected
                        ? `${meta.borderClass} ${meta.bgClass} shadow-sm font-semibold ring-1 ring-cyan-500/30`
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0 bg-current" />
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Tier Card */}
          <div className={`p-4 rounded-xl border ${currentMeta.borderClass} ${currentMeta.bgClass} transition-all`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                  {currentMeta.tier}
                </span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {currentMeta.label}
                </span>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mb-2">
              {currentMeta.shortDesc}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              {currentMeta.detailedDesc}
            </p>

            {/* Implementation Specifics per tier */}
            <div className="pt-2.5 border-t border-black/10 dark:border-white/10 text-xs space-y-1.5">
              <span className="font-semibold text-slate-900 dark:text-white block mb-1">
                ThermoShield Implementations:
              </span>
              {selectedTier === 'LIVE' && (
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  <li><strong>Open-Meteo Global API:</strong> Real-time temperature, humidity, wind, and solar irradiance.</li>
                  <li><strong>HTML5 Geolocation API:</strong> Actual user coordinates with accuracy telemetry.</li>
                  <li><strong>Firebase Realtime Sync:</strong> Authenticated live sync for user profiles and alerts.</li>
                </ul>
              )}
              {selectedTier === 'CALCULATED' && (
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  <li><strong>Estimated WBGT:</strong> Analytical biometeorological model combining Stull wet-bulb, solar irradiance, and wind. (Not a physical black-globe instrument).</li>
                  <li><strong>Rothfusz Heat Index:</strong> Multi-regression perceived temperature algorithm.</li>
                  <li><strong>Personal Risk Score:</strong> Algorithmic synthesis of user vulnerabilities and real-time environmental thermal strain (Not a clinical diagnosis).</li>
                </ul>
              )}
              {selectedTier === 'MODELLED' && (
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  <li><strong>Composite Thermal Strain Index:</strong> Blended 0–100 operational strain score.</li>
                  <li><strong>Modelled Service Pressure Indicator:</strong> Planning proxy based on heat indices and demographic vulnerability. (Does not use live hospital admission records).</li>
                  <li><strong>Area Vulnerability Baseline:</strong> Demographic weighting (elderly density, slum ratio, tree cover).</li>
                </ul>
              )}
              {selectedTier === 'SIMULATED' && (
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  <li><strong>Intervention Simulator:</strong> Counterfactual sandbox exploring hypothetical impact of cooling shelters, hydration stations, and work restrictions.</li>
                  <li><strong>Response Scenarios:</strong> Simulated reductions to support proactive municipal response planning.</li>
                </ul>
              )}
              {selectedTier === 'PLANNED' && (
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  <li><strong>Dense Ward Sensor Networks:</strong> Hardware LoRaWAN integration planned for future civic pilots.</li>
                  <li><strong>WhatsApp Business Gateway:</strong> Scheduled pending production BSP credentials.</li>
                  <li><strong>Hospital EHR Telemetry:</strong> Planned future phase for clinical admission ingestion.</li>
                </ul>
              )}
              {selectedTier === 'OFFLINE_FALLBACK' && (
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  <li><strong>Regional Baseline Cache:</strong> Dynamic, diurnal meteorological baseline engaged when upstream weather API is unreachable or rate-limited.</li>
                  <li><strong>Zero Interruption:</strong> Preserves evaluation flow without falsely claiming live status.</li>
                </ul>
              )}
            </div>
          </div>

          {/* Key SIH Rule */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>
              ThermoShield strictly separates genuine telemetry, scientific derivations, planning models, and exploratory sandboxes.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            ThermoShield v2.5 Architecture Audit
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
