import React from 'react';
import { CloudSun, UserCheck, ShieldCheck, AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../ui';
import { PersonalRiskResult } from '../../types';
import { useTranslation } from '../../context/LanguageContext';
import {
  translateRiskFactor,
  translateFactorDescription,
} from '../../utils/translationHelpers';

interface PersonalRiskExplanationProps {
  result: PersonalRiskResult;
  temperature?: number;
  humidity?: number;
  age?: number;
  isPregnant?: boolean;
  isSmoker?: boolean;
  outdoorHours?: number;
  selectedConditions?: string[];
  hydrationStatus?: string;
  coolingAccess?: string;
  isAcclimatized?: boolean;
  clothingLevel?: string;
  className?: string;
}

export const PersonalRiskExplanation: React.FC<PersonalRiskExplanationProps> = ({
  result,
  temperature = 34,
  humidity = 65,
  age = 35,
  isPregnant = false,
  isSmoker = false,
  outdoorHours = 3,
  selectedConditions = [],
  hydrationStatus = 'adequate',
  coolingAccess = 'limited',
  isAcclimatized = true,
  clothingLevel = 'light',
  className = '',
}) => {
  const { t } = useTranslation();

  // 1. Weather contributors
  const isHighTemp = temperature >= 35;
  const isHighHumid = humidity >= 60;
  const weatherPoints: string[] = [];
  if (isHighTemp && isHighHumid) {
    weatherPoints.push(
      t('risk.weatherHighBoth', 'High ambient temperature combined with heavy humidity severely reduces sweat evaporation.')
    );
  } else if (isHighTemp) {
    weatherPoints.push(
      t('risk.weatherHighTemp', 'Elevated ambient temperature continuously transfers thermal energy into the body.')
    );
  } else if (isHighHumid) {
    weatherPoints.push(
      t('risk.weatherHighHumid', 'Elevated moisture in the air slows evaporative cooling from your skin.')
    );
  } else {
    weatherPoints.push(
      t('risk.weatherModerate', 'Current weather conditions impose standard thermal strain during prolonged sun exposure.')
    );
  }
  weatherPoints.push(
    t('risk.weatherStressSummary', 'Environmental thermal stress makes active physical exertion significantly harder on the body.')
  );

  // 2. Personal vulnerability factors (only relevant ones)
  const personalRiskPoints: string[] = [];
  if (age >= 60) {
    personalRiskPoints.push(t('risk.factorAgeSenior', `Senior age (${age} yrs) naturally reduces sweating efficiency and thirst sensation.`));
  } else if (age <= 12) {
    personalRiskPoints.push(t('risk.factorAgeChild', `Younger age (${age} yrs) warms up faster due to higher surface-area-to-body-mass ratio.`));
  }

  if (selectedConditions.length > 0) {
    personalRiskPoints.push(
      t('risk.factorConditions', `Pre-existing health conditions (${selectedConditions.join(', ')}) increase physiological strain.`)
    );
  }

  if (outdoorHours >= 4) {
    personalRiskPoints.push(
      t('risk.factorExposure', `Extended direct outdoor exposure (${outdoorHours} hours) leads to cumulative heat buildup.`)
    );
  }

  if (isPregnant) {
    personalRiskPoints.push(t('risk.factorPregnancy', 'Pregnancy raises baseline metabolic heat production and cardiac workload.'));
  }

  if (isSmoker) {
    personalRiskPoints.push(t('risk.factorSmoking', 'Smoking impairs peripheral vascular vasodilation and heat dissipation.'));
  }

  // 3. Protective factors (helping vs needing improvement)
  const positiveProtective: string[] = [];
  const negativeProtective: string[] = [];

  if (hydrationStatus === 'adequate' || hydrationStatus === 'good') {
    positiveProtective.push(t('risk.protGoodHydration', 'Good hydration status supports steady sweat production'));
  } else {
    negativeProtective.push(t('risk.protLowHydration', 'Low hydration leaves less fluid for sweat and body temperature control'));
  }

  if (coolingAccess === 'full' || coolingAccess === 'air_conditioned') {
    positiveProtective.push(t('risk.protAcAccess', 'Full access to air conditioning and fans allows rapid body cooling'));
  } else {
    negativeProtective.push(t('risk.protLimitedCooling', 'Limited access to cooling or shade slows thermal recovery'));
  }

  if (isAcclimatized) {
    positiveProtective.push(t('risk.protAcclimatized', 'Acclimatized to local climate over 1-2 weeks'));
  } else {
    negativeProtective.push(t('risk.protUnacclimatized', 'Not yet acclimatized to sudden intense heatwaves'));
  }

  if (clothingLevel === 'light' || clothingLevel === 'breathable') {
    positiveProtective.push(t('risk.protLightClothing', 'Light, loose, breathable clothing'));
  } else if (clothingLevel === 'heavy' || clothingLevel === 'protective') {
    negativeProtective.push(t('risk.protHeavyClothing', 'Heavy or restrictive work clothing traps body heat'));
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
          Transparent Assessment
        </span>
        <h3 className="text-lg sm:text-xl font-black ts-text-primary font-sans mt-0.5">
          {t('risk.whySectionTitle', 'Why Is Your Risk At This Level?')}
        </h3>
        <p className="text-xs sm:text-sm ts-text-muted mt-0.5">
          {t(
            'risk.whySectionSubtitle',
            'Your risk is the combination of atmospheric weather, your physical body, and your protective habits.'
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tier 1: Weather Conditions */}
        <Card variant="default" className="p-4 sm:p-5 border ts-border flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 dark:bg-orange-400/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <CloudSun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono">
                  1. Weather
                </span>
                <div className="text-sm font-bold ts-text-primary">
                  {temperature}°C / {humidity}% Humidity
                </div>
              </div>
            </div>

            <ul className="space-y-2 text-xs ts-text-muted">
              {weatherPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold mt-0.5">•</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t ts-border text-[11px] ts-text-subtle font-medium">
            Environmental Heat Stress
          </div>
        </Card>

        {/* Tier 2: Personal Physical Factors */}
        <Card variant="default" className="p-4 sm:p-5 border ts-border flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 dark:bg-purple-400/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 font-mono">
                  2. Personal Factors
                </span>
                <div className="text-sm font-bold ts-text-primary">
                  {personalRiskPoints.length > 0 ? `${personalRiskPoints.length} contributing factors` : 'Standard baseline profile'}
                </div>
              </div>
            </div>

            {personalRiskPoints.length > 0 ? (
              <ul className="space-y-2 text-xs ts-text-muted">
                {personalRiskPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-purple-500 font-bold mt-0.5">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs ts-text-muted leading-relaxed">
                {t(
                  'risk.noSpecificVulnerabilities',
                  'No elevated clinical vulnerabilities reported in your profile. Your body handles heat at normal physiological baseline.'
                )}
              </p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t ts-border text-[11px] ts-text-subtle font-medium">
            Personal Physiological Reserve
          </div>
        </Card>

        {/* Tier 3: Protective Factors */}
        <Card variant="default" className="p-4 sm:p-5 border ts-border flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
                  3. Protection
                </span>
                <div className="text-sm font-bold ts-text-primary">
                  Shielding & Recovery
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {positiveProtective.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 mb-1">
                    <TrendingDown className="w-3 h-3 text-emerald-500" />
                    Helping reduce risk:
                  </span>
                  <ul className="space-y-1 ts-text-muted">
                    {positiveProtective.map((pt, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {negativeProtective.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-mono flex items-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3 text-rose-500" />
                    Increasing risk / needs attention:
                  </span>
                  <ul className="space-y-1 ts-text-muted">
                    {negativeProtective.map((pt, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t ts-border text-[11px] ts-text-subtle font-medium">
            Behavioral & Environmental Shields
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PersonalRiskExplanation;
