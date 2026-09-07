import React, { useState } from 'react';
import { Flame, Shield, Info, ChevronDown, ChevronUp, BookOpen, Sun, Wind, Droplets } from 'lucide-react';
import { ThermalIndices, RiskAssessment } from '../types';
import { formatTemperature } from '../utils/risk';
import { Card, CardHeader, CardContent, Badge } from './ui';

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
    if (w >= 32.2) return { label: 'Extreme Strain', color: 'text-red-500 dark:text-red-400' };
    if (w >= 30.1) return { label: 'High Strain', color: 'text-orange-500 dark:text-orange-400' };
    if (w >= 27.8) return { label: 'Moderate Strain', color: 'text-amber-500 dark:text-amber-400' };
    return { label: 'Low Strain', color: 'text-emerald-600 dark:text-emerald-400' };
  };

  const wbgtSev = getWbgtSeverity(indices.wbgt_c);

  return (
    <Card className={className}>
      <CardHeader
        title="Thermal Conditions & Biometeorological Indices"
        subtitle="Multi-parameter thermal stress breakdown calibrated for human physiological strain."
        badge={
          <Badge variant="brand" size="sm">
            Biometeorological Engine
          </Badge>
        }
        action={
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary text-xs font-semibold transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-orange-400" />
            <span>{showTechnicalDetails ? 'Simple View' : 'Scientific References'}</span>
            {showTechnicalDetails ? (
              <ChevronUp className="w-3 h-3 ml-0.5" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-0.5" />
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
                PRIMARY
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
                Outdoor heat stress including direct sun exposure and wind airflow.
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
                Shaded Perceived Heat
              </div>
              <p className="text-[10.5px] ts-text-subtle mt-1 leading-snug">
                What the temperature feels like in the shade combining air heat and moisture.
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
                Convective Feel
              </div>
              <p className="text-[10.5px] ts-text-subtle mt-1 leading-snug">
                Comprehensive body comfort factoring vapor pressure and skin cooling.
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
                Evaporative Boundary
              </div>
              <p className="text-[10.5px] ts-text-subtle mt-1 leading-snug">
                The lowest temperature reachable through natural evaporative sweat cooling.
              </p>
            </div>
          </div>
        </div>

        {/* Expandable Scientific Details */}
        {showTechnicalDetails && (
          <div className="p-4 rounded-xl ts-card-subtle border ts-border text-xs ts-text-muted space-y-3">
            <div className="flex items-center space-x-2 font-bold ts-text-primary border-b ts-border pb-2">
              <BookOpen className="w-4 h-4 text-orange-400" />
              <span>Scientific Biometeorological Formulations & ISO Standards</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 rounded-lg ts-card border ts-border">
                <strong className="ts-text-primary block mb-0.5">ISO 7243 / ACGIH WBGT:</strong>
                <span>
                  Estimates outdoor occupational thermal burden by weighting natural wet-bulb temperature, solar radiation, and air temperature.
                </span>
              </div>
              <div className="p-3 rounded-lg ts-card border ts-border">
                <strong className="ts-text-primary block mb-0.5">NOAA Rothfusz (1990) Heat Index:</strong>
                <span>
                  9-parameter polynomial regression measuring apparent human discomfort under shaded humidity conditions.
                </span>
              </div>
              <div className="p-3 rounded-lg ts-card border ts-border">
                <strong className="ts-text-primary block mb-0.5">Steadman (1984) Apparent Temperature:</strong>
                <span>
                  Convective physiological model incorporating dry air temperature, ambient water vapor pressure, and wind cooling.
                </span>
              </div>
              <div className="p-3 rounded-lg ts-card border ts-border">
                <strong className="ts-text-primary block mb-0.5">Stull (2011) Wet-Bulb (Tw):</strong>
                <span>
                  Empirical thermodynamic equation computing the physical lower bound for human evaporative sweat dissipation.
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
                <span>Direct Risk Basis (Threshold Triggers):</span>
              </div>
              <ul className="space-y-1.5">
                {riskAssessment.risk_basis?.map((rb, idx) => (
                  <li key={idx} className="text-xs ts-text-muted flex items-start space-x-2">
                    <span className="text-orange-400 mt-0.5">•</span>
                    <span>{rb}</span>
                  </li>
                ))}
                {(!riskAssessment.risk_basis || riskAssessment.risk_basis.length === 0) && (
                  <li className="text-xs ts-text-subtle">Standard baseline conditions.</li>
                )}
              </ul>
            </div>

            <div className="ts-card-subtle p-4 rounded-xl border ts-border">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-sky-400 mb-2">
                <Info className="w-4 h-4" />
                <span>Environmental Observations:</span>
              </div>
              <ul className="space-y-1.5">
                {riskAssessment.environmental_factors?.map((ef, idx) => (
                  <li key={idx} className="text-xs ts-text-muted flex items-start space-x-2">
                    <span className="text-sky-400 mt-0.5">•</span>
                    <span>{ef}</span>
                  </li>
                ))}
                {(!riskAssessment.environmental_factors || riskAssessment.environmental_factors.length === 0) && (
                  <li className="text-xs ts-text-subtle">Normal meteorological parameters.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
