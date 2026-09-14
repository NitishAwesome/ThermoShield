import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, ThermometerSun, Shirt, Activity } from 'lucide-react';
import { Card } from '../ui';
import { MetricExplainer } from '../MetricExplainer';
import { useTranslation } from '../../context/LanguageContext';

interface PersonalRiskScienceProps {
  wbgt?: number;
  cloValue?: number;
  activityLevel?: string;
  className?: string;
}

export const PersonalRiskScience: React.FC<PersonalRiskScienceProps> = ({
  wbgt,
  cloValue = 0.5,
  activityLevel = 'moderate',
  className = '',
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card variant="default" className={`border ts-border overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold ts-text-primary">
              {t('risk.scienceTitle', 'Learn How This Assessment Works')}
            </h4>
            <p className="text-[11px] sm:text-xs ts-text-subtle">
              {t(
                'risk.scienceSubtitle',
                'Physiological thermal balance, Wet-Bulb Globe Temperature, clothing insulation, and metabolic heat'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ts-text-subtle text-xs font-semibold">
          <span>{isOpen ? t('common.hide', 'Hide Details') : t('common.show', 'Show Details')}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 sm:p-6 border-t ts-border space-y-6 bg-slate-50/50 dark:bg-slate-900/30">
          {/* Section A: Heat Stress & WBGT */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono">
              <ThermometerSun className="w-4 h-4" />
              <span>A. Environmental Heat Stress & WBGT</span>
            </div>
            <p className="text-xs sm:text-sm ts-text-muted leading-relaxed">
              Heat stress describes how difficult it is for the human body to dissipate internal heat and maintain a safe core temperature (~37°C). Standard thermometers measure dry air temperature, but humans cool down primarily by <strong>sweat evaporation</strong>.
            </p>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border ts-border text-xs space-y-1.5">
              <div className="font-bold ts-text-primary flex items-center justify-between">
                <span>Wet-Bulb Globe Temperature (WBGT)</span>
                {wbgt !== undefined && (
                  <span className="font-mono text-orange-600 dark:text-orange-400">
                    Est. {wbgt.toFixed(1)}°C
                  </span>
                )}
              </div>
              <p className="ts-text-subtle leading-relaxed">
                WBGT is the gold standard used by OSHA, IMD, military, and sports leagues. It combines ambient dry-bulb temperature, natural wet-bulb temperature (accounting for humidity & wind), and globe temperature (radiant solar heat load) into a single composite stress index.
              </p>
            </div>
          </div>

          {/* Section B: Clothing Insulation */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
              <Shirt className="w-4 h-4" />
              <span>B. Clothing Insulation (clo Rating)</span>
            </div>
            <p className="text-xs sm:text-sm ts-text-muted leading-relaxed">
              Clothing acts as a thermal barrier between your skin and the atmosphere. While clothes protect against solar radiation, heavy or synthetic fabrics trap boundary layer moisture and severely impede sweat evaporation.
            </p>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border ts-border text-xs space-y-1.5">
              <div className="font-bold ts-text-primary flex items-center justify-between">
                <span>Clothing Thermal Resistance</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  Current: {cloValue.toFixed(2)} clo
                </span>
              </div>
              <p className="ts-text-subtle leading-relaxed">
                1 clo represents the insulation required to keep a resting person warm at 21°C. Light shorts and t-shirt is ≈ 0.3–0.4 clo, standard work clothing is ≈ 0.6–0.8 clo, and coveralls or heavy PPE exceed 1.2+ clo.
              </p>
            </div>
          </div>

          {/* Section C: Metabolic Work Rate */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
              <Activity className="w-4 h-4" />
              <span>C. Physical Activity & Metabolic Heat</span>
            </div>
            <p className="text-xs sm:text-sm ts-text-muted leading-relaxed">
              Your muscles generate heat during physical movement. At rest, the human body produces approximately 100 Watts of thermal energy. Heavy physical labor or strenuous exercise can increase metabolic heat generation to 400–600+ Watts.
            </p>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border ts-border text-xs space-y-1.5">
              <div className="font-bold ts-text-primary flex items-center justify-between">
                <span>Metabolic Workload Category</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 uppercase">
                  {activityLevel}
                </span>
              </div>
              <p className="ts-text-subtle leading-relaxed">
                When environmental temperature exceeds skin temperature (35°C), the body cannot lose heat by radiation or convection. Sweating becomes the only cooling mechanism. High metabolic activity combined with high humidity causes heat storage in body tissues, leading to heat exhaustion if unpaused.
              </p>
            </div>
          </div>

          {/* Interactive Metric Explainer chips */}
          <div className="pt-2 border-t ts-border">
            <span className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle font-mono block mb-2">
              Interactive Reference Cards
            </span>
            <div className="flex flex-wrap gap-2">
              <MetricExplainer metricType="wbgt" customLabel="What is WBGT?" />
              <MetricExplainer metricType="clo" customLabel="What is clo (clothing rating)?" />
              <MetricExplainer metricType="metabolic" customLabel="What is Metabolic Work Rate?" />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PersonalRiskScience;
