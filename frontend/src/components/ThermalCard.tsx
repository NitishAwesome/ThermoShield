import React, { useState } from 'react';
import { Flame, Shield, Info, ChevronDown, ChevronUp, BookOpen, Sun, Wind, Droplets } from 'lucide-react';
import { ThermalIndices, RiskAssessment } from '../types';
import { formatTemperature } from '../utils/risk';
import { Card, CardHeader, CardContent, Badge } from './ui';
import { useTranslation } from '../context/LanguageContext';
import { translateExplainabilityFactor } from '../utils/translationHelpers';

interface ThermalCardProps {
  indices?: ThermalIndices;
  riskAssessment?: RiskAssessment;
  className?: string;
}

export const ThermalCard: React.FC<ThermalCardProps> = ({
  indices,
  riskAssessment,
  className = '',
}) => {
  const { t } = useTranslation();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  if (!indices) return null;

  const getHeatIndexDisplay = () => {
    if (indices.heat_index_c !== null && indices.heat_index_c !== undefined) {
      return `${indices.heat_index_c.toFixed(1)}°C`;
    }
    if (indices.heat_index_status === 'NOT_APPLICABLE_COOL') {
      return 'N/A (<20°C Cool)';
    }
    return 'N/A (Outside Range)';
  };

  const isHIOutOfRange = indices.heat_index_status === 'OUTSIDE_VALIDATED_RANGE';

  // Qualitative severity for WBGT
  const getWbgtSeverity = (w?: number) => {
    if (w === undefined) return { label: 'Normal', color: 'text-slate-600 dark:text-slate-300' };
    if (w >= 32.2) return { label: t('riskCard.extremeHazard'), color: 'text-red-500 dark:text-red-400' };
    if (w >= 30.1) return { label: t('riskCard.highStrain'), color: 'text-orange-500 dark:text-orange-400' };
    if (w >= 27.8) return { label: t('riskCard.moderateBurden'), color: 'text-amber-500 dark:text-amber-400' };
    return { label: t('riskCard.lowRisk'), color: 'text-emerald-600 dark:text-emerald-400' };
  };

  const wbgtSev = getWbgtSeverity(indices.wbgt_c);

  return (
    <Card className={className}>
      <CardHeader
        title={t('thermalCard.title')}
        subtitle={t('thermalCard.subtitle')}
        badge={
          <Badge variant="brand" size="sm">
            {t('thermalCard.engineBadge')}
          </Badge>
        }
        action={
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary text-xs font-semibold transition-colors flex-shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            <span>
              {showTechnicalDetails ? (
                t('thermalCard.simpleView')
              ) : (
                t('thermalCard.scientificReferences')
              )}
            </span>
            {showTechnicalDetails ? (
              <ChevronUp className="w-3 h-3 ml-0.5 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-0.5 flex-shrink-0" />
            )}
          </button>
        }
      />
      <CardContent className="space-y-5">
        {/* 4 Core Thermal Indices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Wet-Bulb Globe Temperature (WBGT) */}
          <div className="p-4 rounded-xl ts-card-subtle border border-orange-500/30 flex flex-col justify-between bg-orange-500/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-orange-400 flex items-center gap-1">
                <Sun className="w-3.5 h-3.5" />
                WBGT
              </span>
              <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-700 dark:text-orange-300 text-[10px] rounded font-mono font-bold">
                {t('thermalCard.wbgtPrimary')}
              </span>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black font-mono text-orange-400">
                {formatTemperature(indices.wbgt_c)}
              </div>
              <div className={`text-[11px] font-bold ${wbgtSev.color} mt-0.5`}>
                {wbgtSev.label}
              </div>
              <p className="text-[10.5px] ts-text-subtle mt-1 leading-snug">
                {t('thermalCard.wbgtDesc')}
              </p>
            </div>
          </div>

          {/* 2. NOAA Heat Index */}
          <div className="p-4 rounded-xl ts-card-subtle border ts-border flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold ts-text-primary flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Heat Index
              </span>
              {isHIOutOfRange && (
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] rounded font-mono font-semibold">
                  Polynomial Bound
                </span>
              )}
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black font-mono ts-text-primary">
                {getHeatIndexDisplay()}
              </div>
              <div className="text-[11px] font-bold text-amber-400 mt-0.5">
                {t('thermalCard.heatIndexShaded')}
              </div>
              <p className="text-[10.5px] ts-text-subtle mt-1 leading-snug">
                {t('thermalCard.heatIndexDesc')}
              </p>
            </div>
          </div>

          {/* 3. Apparent Temperature (AT) */}
          <div className="p-4 rounded-xl ts-card-subtle border ts-border flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold ts-text-primary flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-teal-400" />
                Apparent Temp
              </span>
              <span className="text-[10px] font-bold ts-text-subtle uppercase">Steadman</span>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black font-mono ts-text-primary">
                {formatTemperature(indices.apparent_temperature_c)}
              </div>
              <div className="text-[11px] font-bold text-teal-400 mt-0.5">
                {t('thermalCard.apparentConvective')}
              </div>
              <p className="text-[10.5px] ts-text-subtle mt-1 leading-snug">
                {t('thermalCard.apparentDesc')}
              </p>
            </div>
          </div>

          {/* 4. Natural Wet-Bulb ($T_w$) */}
          <div className="p-4 rounded-xl ts-card-subtle border ts-border flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold ts-text-primary flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-sky-400" />
                Natural Wet-Bulb
              </span>
              <span className="text-[10px] font-bold ts-text-subtle uppercase">Tw Limit</span>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black font-mono ts-text-primary">
                {formatTemperature(indices.wet_bulb_temp_c)}
              </div>
              <div className="text-[11px] font-bold text-sky-400 mt-0.5">
                {t('thermalCard.wetBulbEvaporative')}
              </div>
              <p className="text-[10.5px] ts-text-subtle mt-1 leading-snug">
                {t('thermalCard.wetBulbDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Expandable Scientific Details */}
        {showTechnicalDetails && (
          <div className="p-4 rounded-xl ts-card-subtle border ts-border text-xs ts-text-muted space-y-3">
            <div className="flex items-center space-x-2 font-bold ts-text-primary border-b ts-border pb-2">
              <BookOpen className="w-4 h-4 text-orange-400" />
              <span>{t('thermalCard.scientificStandardsTitle')}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 rounded-lg ts-card border ts-border">
                <strong className="ts-text-primary block mb-0.5">ISO 7243 / ACGIH WBGT:</strong>
                <span>
                  {t('thermalCard.isoDesc')}
                </span>
              </div>
              <div className="p-3 rounded-lg ts-card border ts-border">
                <strong className="ts-text-primary block mb-0.5">NOAA Rothfusz (1990) Heat Index:</strong>
                <span>
                  {t('thermalCard.noaaDesc')}
                </span>
              </div>
              <div className="p-3 rounded-lg ts-card border ts-border">
                <strong className="ts-text-primary block mb-0.5">Steadman (1984) Apparent Temperature:</strong>
                <span>
                  {t('thermalCard.steadmanDesc')}
                </span>
              </div>
              <div className="p-3 rounded-lg ts-card border ts-border">
                <strong className="ts-text-primary block mb-0.5">Stull (2011) Wet-Bulb (Tw):</strong>
                <span>
                  {t('thermalCard.stullDesc')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Threshold Triggers & Environmental Observations */}
        {riskAssessment && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="ts-card-subtle p-4 rounded-xl border ts-border">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-orange-400 mb-2">
                <Shield className="w-4 h-4" />
                <span>{t('thermalCard.riskBasisTitle')}</span>
              </div>
              <ul className="space-y-1.5">
                {riskAssessment.risk_basis?.map((rb, idx) => (
                  <li key={idx} className="text-xs ts-text-muted flex items-start space-x-2">
                    <span className="text-orange-400 mt-0.5">•</span>
                    <span>{translateExplainabilityFactor(rb, t)}</span>
                  </li>
                ))}
                {(!riskAssessment.risk_basis || riskAssessment.risk_basis.length === 0) && (
                  <li className="text-xs ts-text-subtle">{t('thermalCard.baselineStandard')}</li>
                )}
              </ul>
            </div>

            <div className="ts-card-subtle p-4 rounded-xl border ts-border">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-sky-400 mb-2">
                <Info className="w-4 h-4" />
                <span>{t('thermalCard.envObsTitle')}</span>
              </div>
              <ul className="space-y-1.5">
                {riskAssessment.environmental_factors?.map((ef, idx) => (
                  <li key={idx} className="text-xs ts-text-muted flex items-start space-x-2">
                    <span className="text-sky-400 mt-0.5">•</span>
                    <span>{translateExplainabilityFactor(ef, t)}</span>
                  </li>
                ))}
                {(!riskAssessment.environmental_factors || riskAssessment.environmental_factors.length === 0) && (
                  <li className="text-xs ts-text-subtle">{t('thermalCard.baselineNormal')}</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
