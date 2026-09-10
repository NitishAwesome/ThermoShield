import React from 'react';
import {
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Activity,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Badge } from './ui';

import { RiskFactorItem } from '../types';

interface RiskDriversProps {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  solarRadiation?: number;
  apparentTemperature?: number;
  uvIndex?: number;
  thermalScore?: number;
  riskLevel?: string;
  civicScore?: number;
  reason?: string;
  riskFactors?: RiskFactorItem[];
  className?: string;
}

export const RiskDrivers: React.FC<RiskDriversProps> = ({
  temperature,
  humidity,
  windSpeed,
  solarRadiation,
  apparentTemperature,
  uvIndex,
  thermalScore,
  riskLevel = 'MODERATE',
  civicScore,
  reason,
  riskFactors,
  className = '',
}) => {
  // Qualitative classification of environmental drivers
  const getTempSeverity = (t?: number) => {
    if (t === undefined) return { label: 'Normal', color: 'text-slate-600 dark:text-slate-300', level: 'normal' };
    if (t >= 42) return { label: 'Extreme Heat', color: 'text-red-500 dark:text-red-400', level: 'extreme' };
    if (t >= 38) return { label: 'Severe Heat', color: 'text-orange-500 dark:text-orange-400', level: 'high' };
    if (t >= 33) return { label: 'Moderate Heat', color: 'text-amber-500 dark:text-amber-400', level: 'moderate' };
    return { label: 'Mild / Normal', color: 'text-emerald-600 dark:text-emerald-400', level: 'low' };
  };

  const getHumiditySeverity = (h?: number) => {
    if (h === undefined) return { label: 'Normal', color: 'text-slate-600 dark:text-slate-300', desc: 'Typical humidity' };
    if (h >= 75) return { label: 'High Suppression', color: 'text-orange-500 dark:text-orange-400', desc: 'Sweat evaporation severely impaired' };
    if (h >= 55) return { label: 'Elevated', color: 'text-amber-500 dark:text-amber-400', desc: 'Restricted evaporative cooling' };
    if (h <= 20) return { label: 'Very Dry', color: 'text-sky-600 dark:text-sky-400', desc: 'Rapid dehydration risk' };
    return { label: 'Optimal', color: 'text-emerald-600 dark:text-emerald-400', desc: 'Normal evaporative regulation' };
  };

  const getSolarSeverity = (s?: number) => {
    if (s === undefined || s === 0) return { label: 'No Solar Load', color: 'text-slate-500 dark:text-slate-400', desc: 'Night / Full Shade' };
    if (s >= 700) return { label: 'Intense Radiant', color: 'text-red-500 dark:text-red-400', desc: 'Direct peak sunlight' };
    if (s >= 400) return { label: 'Moderate Radiant', color: 'text-amber-500 dark:text-amber-400', desc: 'Significant radiant load' };
    return { label: 'Low Radiant', color: 'text-emerald-600 dark:text-emerald-400', desc: 'Overcast or low angle' };
  };

  const getWindSeverity = (w?: number, t?: number) => {
    if (w === undefined) return { label: 'Calm', color: 'text-slate-600 dark:text-slate-300', desc: 'Stagnant airflow' };
    if (w < 1.0) return { label: 'Stagnant Air', color: 'text-amber-500 dark:text-amber-400', desc: 'Traps convective boundary layer' };
    if (t !== undefined && t > 37 && w > 4) {
      return { label: 'Hot Convective', color: 'text-orange-500 dark:text-orange-400', desc: 'Hot breeze increases heat gain' };
    }
    return { label: 'Active Ventilation', color: 'text-emerald-600 dark:text-emerald-400', desc: 'Facilitates convective dissipation' };
  };

  const tempInfo = getTempSeverity(temperature);
  const humInfo = getHumiditySeverity(humidity);
  const solarInfo = getSolarSeverity(solarRadiation);
  const windInfo = getWindSeverity(windSpeed, temperature);

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader
        title="Why This Rating? — Environmental Risk Drivers"
        subtitle="Deconstruction of meteorological factors contributing to human thermal strain and civic risk."
        badge={
          <Badge variant="brand" size="sm">
            Decision-Support Model
          </Badge>
        }
      />
      <CardContent className="space-y-5">
        {/* Core reason banner */}
        {reason && (
          <div className="p-3.5 rounded-xl ts-card-subtle border ts-border flex items-start space-x-3">
            <Info className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs ts-text-muted leading-relaxed">
              <span className="font-bold ts-text-primary">Primary Assessment Driver: </span>
              {reason}
            </div>
          </div>
        )}

        {/* 5 Environmental Drivers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Temperature */}
          <div className="p-3 rounded-xl ts-card-subtle border ts-border flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs ts-text-muted">
              <span className="font-semibold flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                Air Temp
              </span>
              <span className={`text-[10px] font-bold ${tempInfo.color}`}>{tempInfo.label}</span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black font-mono ts-text-primary">
                  {temperature !== undefined ? `${temperature.toFixed(1)}°C` : '—'}
                </span>
                {apparentTemperature !== undefined && (
                  <span className="text-[11px] font-semibold text-orange-400">
                    Feels {apparentTemperature.toFixed(1)}°C
                  </span>
                )}
              </div>
              <p className="text-[10.5px] ts-text-subtle mt-0.5 leading-tight">
                Ambient thermodynamic baseline
              </p>
            </div>
          </div>

          {/* 2. Humidity */}
          <div className="p-3 rounded-xl ts-card-subtle border ts-border flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs ts-text-muted">
              <span className="font-semibold flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-sky-400" />
                Humidity
              </span>
              <span className={`text-[10px] font-bold ${humInfo.color}`}>{humInfo.label}</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black font-mono ts-text-primary">
                {humidity !== undefined ? `${Math.round(humidity)}%` : '—'}
              </div>
              <p className="text-[10.5px] ts-text-subtle mt-0.5 leading-tight">
                {humInfo.desc}
              </p>
            </div>
          </div>

          {/* 3. Solar Radiation */}
          <div className="p-3 rounded-xl ts-card-subtle border ts-border flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs ts-text-muted">
              <span className="font-semibold flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Solar Flux
              </span>
              <span className={`text-[10px] font-bold ${solarInfo.color}`}>{solarInfo.label}</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black font-mono ts-text-primary">
                {solarRadiation !== undefined ? `${Math.round(solarRadiation)}` : '0'}
                <span className="text-xs font-normal ts-text-muted ml-1">W/m²</span>
              </div>
              <p className="text-[10.5px] ts-text-subtle mt-0.5 leading-tight">
                {uvIndex !== undefined ? `UV ${uvIndex.toFixed(1)} • ${solarInfo.desc}` : solarInfo.desc}
              </p>
            </div>
          </div>

          {/* 4. Wind Speed */}
          <div className="p-3 rounded-xl ts-card-subtle border ts-border flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs ts-text-muted">
              <span className="font-semibold flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-teal-400" />
                Wind Speed
              </span>
              <span className={`text-[10px] font-bold ${windInfo.color}`}>{windInfo.label}</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black font-mono ts-text-primary">
                {windSpeed !== undefined ? `${windSpeed.toFixed(1)}` : '—'}
                <span className="text-xs font-normal ts-text-muted ml-1">m/s</span>
              </div>
              <p className="text-[10.5px] ts-text-subtle mt-0.5 leading-tight">
                {windInfo.desc}
              </p>
            </div>
          </div>

          {/* 5. Human Thermal Strain */}
          <div className="p-3 rounded-xl ts-card-subtle border border-orange-500/30 flex flex-col justify-between bg-orange-500/5">
            <div className="flex items-center justify-between text-xs ts-text-muted">
              <span className="font-semibold flex items-center gap-1.5 text-orange-400">
                <Activity className="w-3.5 h-3.5" />
                Thermal Strain
              </span>
              <Badge riskLevel={riskLevel} size="sm">
                {riskLevel}
              </Badge>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black font-mono text-orange-400">
                {thermalScore !== undefined ? Math.round(thermalScore) : '—'}
                <span className="text-xs font-semibold ts-text-muted ml-1">/ 100</span>
              </div>
              <p className="text-[10.5px] ts-text-subtle mt-0.5 leading-tight">
                Physiological heat stress load
              </p>
            </div>
          </div>
        </div>

        {/* Calibrated Risk Factors Breakdown */}
        {riskFactors && riskFactors.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold ts-text-muted">
              <span className="flex items-center space-x-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Calibrated Risk Factor Weightings:</span>
              </span>
              <span className="text-[10.5px] ts-text-subtle font-normal">
                Biometeorological Contribution Scale
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {riskFactors.map((rf, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl ts-card-subtle border ts-border flex flex-col justify-between space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold ts-text-primary truncate">{rf.factor}</span>
                    <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                      +{rf.contribution} pts
                    </span>
                  </div>
                  <p className="text-[11px] ts-text-subtle leading-tight">{rf.description}</p>
                  {rf.observed_value && (
                    <div className="text-[10.5px] ts-text-muted font-mono pt-0.5">
                      Observed: <strong className="ts-text-primary">{rf.observed_value}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model Transparency & Decision-Support Disclosure */}
        <div className="p-3 rounded-xl ts-card-subtle border ts-border text-[11px] ts-text-muted leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold ts-text-primary">Civic Health Readiness:</span>
            <span>
              The Civic Health Risk Score{' '}
              {civicScore !== undefined ? (
                <strong className="text-purple-600 dark:text-purple-400 font-mono">({civicScore.toFixed(1)}/100)</strong>
              ) : (
                ''
              )}{' '}
              is a machine-learning decision-support index modeling municipal healthcare readiness.
            </span>
          </div>
          <div className="flex-shrink-0 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ts-border ts-text-subtle">
            Planning Estimate
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
