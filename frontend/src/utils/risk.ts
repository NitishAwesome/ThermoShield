import { RiskLevel } from '../types';

export const getRiskColor = (level: RiskLevel | string | undefined): string => {
  switch (level?.toUpperCase()) {
    case 'LOW':
      return '#10B981'; // Emerald 500
    case 'MODERATE':
      return '#F59E0B'; // Amber 500
    case 'HIGH':
      return '#F97316'; // Orange 500
    case 'EXTREME':
    case 'CRITICAL':
      return '#EF4444'; // Red 500
    default:
      return '#6B7280'; // Gray 500
  }
};

export const getRiskBadgeStyles = (level: RiskLevel | string | undefined) => {
  switch (level?.toUpperCase()) {
    case 'LOW':
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        badge: 'bg-emerald-500 text-slate-950 font-bold',
        text: 'text-emerald-400',
        glow: 'shadow-emerald-500/20',
        border: 'border-emerald-500/40',
        dot: 'bg-emerald-400',
        label: 'Low Risk',
      };
    case 'MODERATE':
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        badge: 'bg-amber-500 text-slate-950 font-bold',
        text: 'text-amber-400',
        glow: 'shadow-amber-500/20',
        border: 'border-amber-500/40',
        dot: 'bg-amber-400',
        label: 'Moderate Risk',
      };
    case 'HIGH':
      return {
        bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
        badge: 'bg-orange-500 text-slate-950 font-bold',
        text: 'text-orange-400',
        glow: 'shadow-orange-500/20',
        border: 'border-orange-500/40',
        dot: 'bg-orange-400',
        label: 'High Risk',
      };
    case 'EXTREME':
    case 'CRITICAL':
      return {
        bg: 'bg-red-500/10 border-red-500/30 text-red-400',
        badge: 'bg-red-500 text-white font-bold animate-pulse',
        text: 'text-red-400',
        glow: 'shadow-red-500/30',
        border: 'border-red-500/50',
        dot: 'bg-red-500 animate-ping',
        label: 'Extreme Risk',
      };
    default:
      return {
        bg: 'bg-slate-800 border-slate-700 text-slate-400',
        badge: 'bg-slate-700 text-slate-300 font-medium',
        text: 'text-slate-400',
        glow: 'shadow-none',
        border: 'border-slate-700',
        dot: 'bg-slate-500',
        label: 'Unknown',
      };
  }
};

export const formatTemperature = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${val.toFixed(1)}°C`;
};

export const formatSpeed = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${val.toFixed(1)} m/s`;
};

export const formatPercent = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${Math.round(val)}%`;
};
