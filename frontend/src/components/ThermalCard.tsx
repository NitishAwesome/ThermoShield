import React from 'react';
import { Flame, Shield, Info, Wind, Sun, Droplets, AlertCircle } from 'lucide-react';
import { ThermalIndices, RiskAssessment } from '../types';
import { formatTemperature, getRiskBadgeStyles } from '../utils/risk';

interface ThermalCardProps {
  indices?: ThermalIndices;
  riskAssessment?: RiskAssessment;
}

export const ThermalCard: React.FC<ThermalCardProps> = ({ indices, riskAssessment }) => {
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

  return (
    <div className="rounded-2xl bg-slate-800/90 border border-slate-700/80 p-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center space-x-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <h3 className="text-base font-bold text-slate-100">
            Biometeorological Thermal Stress Engine
          </h3>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          Standardized Screening
        </span>
      </div>

      {/* 4 Core Indices Grid */}
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Estimated WBGT */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-800 border border-cyan-500/30 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-cyan-300">Estimated WBGT</span>
            <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 text-[10px] rounded font-mono font-bold">
              PRIMARY
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400 mt-1 font-sans">
            {formatTemperature(indices.wbgt_c)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Wet-Bulb Globe Temp (ACGIH/ACSM)</p>
        </div>

        {/* NOAA Heat Index */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/70">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-orange-300">NOAA Heat Index</span>
            {isHIOutOfRange && (
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] rounded font-mono font-semibold" title="Extreme co-occurrence exceeds polynomial limits">
                Polynomial Limit
              </span>
            )}
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-orange-400 mt-1 font-sans">
            {getHeatIndexDisplay()}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Apparent Temperature in Shade</p>
        </div>

        {/* Apparent Temp */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/70">
          <div className="text-xs font-bold text-slate-300">Apparent Temp (AT)</div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-200 mt-1 font-sans">
            {formatTemperature(indices.apparent_temperature_c)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Steadman Wind/Vapor Model</p>
        </div>

        {/* Natural Wet-Bulb */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/70">
          <div className="text-xs font-bold text-slate-300">Natural Wet-Bulb (Tw)</div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-200 mt-1 font-sans">
            {formatTemperature(indices.wet_bulb_temp_c)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Stull Empirical Thermodynamic Formula</p>
        </div>
      </div>

      {/* Explainability Section: Risk Basis & Environmental Observations */}
      {riskAssessment && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700/60">
          {/* Direct Risk Basis */}
          <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-orange-400 mb-2">
              <Shield className="w-4 h-4" />
              <span>Direct Risk Basis (Threshold Triggers):</span>
            </div>
            <ul className="space-y-1.5">
              {riskAssessment.risk_basis?.map((rb, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start space-x-2">
                  <span className="text-orange-400 mt-0.5">•</span>
                  <span>{rb}</span>
                </li>
              ))}
              {(!riskAssessment.risk_basis || riskAssessment.risk_basis.length === 0) && (
                <li className="text-xs text-slate-400">Standard baseline conditions.</li>
              )}
            </ul>
          </div>

          {/* Contextual Environmental Observations */}
          <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-cyan-400 mb-2">
              <Info className="w-4 h-4" />
              <span>Environmental Observations:</span>
            </div>
            <ul className="space-y-1.5">
              {riskAssessment.environmental_factors?.map((ef, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start space-x-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>{ef}</span>
                </li>
              ))}
              {(!riskAssessment.environmental_factors || riskAssessment.environmental_factors.length === 0) && (
                <li className="text-xs text-slate-400">Normal meteorological parameters.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
