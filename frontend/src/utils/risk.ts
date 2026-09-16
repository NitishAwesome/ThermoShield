import { RiskLevel } from '../types';

export interface RiskStyle {
  level: RiskLevel;
  fill: string;
  stroke: string;
  fillOpacity: number;
  selectedFillOpacity: number;
  strokeWidth: number;
  selectedStrokeWidth: number;
  badge: string;
  badgeBg: string;
  text: string;
  textLabel: string;
  emoji: string;
}

export const getRiskStyle = (level: RiskLevel | string | undefined): RiskStyle => {
  const norm = level?.toUpperCase() || 'LOW';
  switch (norm) {
    case 'LOW':
      return {
        level: 'LOW',
        fill: '#059669', // High-contrast Emerald/Teal
        stroke: '#047857',
        fillOpacity: 0.38,
        selectedFillOpacity: 0.70,
        strokeWidth: 1.8,
        selectedStrokeWidth: 3.2,
        badge: 'bg-emerald-600 text-white font-bold',
        badgeBg: 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400',
        text: 'text-emerald-700 dark:text-emerald-400',
        textLabel: 'LOW',
        emoji: '🟢',
      };
    case 'MODERATE':
      return {
        level: 'MODERATE',
        fill: '#D97706', // Rich Golden Amber / Warm Ochre (never washed-out pale yellow)
        stroke: '#78350F', // Dark contrast boundary for clear map legibility
        fillOpacity: 0.42,
        selectedFillOpacity: 0.72,
        strokeWidth: 2.0,
        selectedStrokeWidth: 3.5,
        badge: 'bg-amber-600 text-white font-bold',
        badgeBg: 'bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-400',
        text: 'text-amber-700 dark:text-amber-400',
        textLabel: 'MODERATE',
        emoji: '🟡',
      };
    case 'HIGH':
      return {
        level: 'HIGH',
        fill: '#EA580C', // Vibrant Deep Orange
        stroke: '#7C2D12',
        fillOpacity: 0.50,
        selectedFillOpacity: 0.78,
        strokeWidth: 2.2,
        selectedStrokeWidth: 3.8,
        badge: 'bg-orange-600 text-white font-bold',
        badgeBg: 'bg-orange-500/15 border border-orange-500/40 text-orange-700 dark:text-orange-400',
        text: 'text-orange-700 dark:text-orange-400',
        textLabel: 'HIGH',
        emoji: '🟠',
      };
    case 'EXTREME':
    case 'CRITICAL':
    default:
      return {
        level: 'EXTREME',
        fill: '#DC2626', // Crimson Red
        stroke: '#450A0A',
        fillOpacity: 0.58,
        selectedFillOpacity: 0.85,
        strokeWidth: 2.5,
        selectedStrokeWidth: 4.0,
        badge: 'bg-red-600 text-white font-bold animate-pulse',
        badgeBg: 'bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-400',
        text: 'text-red-700 dark:text-red-400',
        textLabel: 'EXTREME',
        emoji: '🔴',
      };
  }
};

export const getRiskColor = (level: RiskLevel | string | undefined): string => {
  return getRiskStyle(level).fill;
};

export const getRiskBgColor = (level: RiskLevel | string | undefined): string => {
  switch (level?.toUpperCase()) {
    case 'LOW':
      return 'rgba(16, 185, 129, 0.15)';
    case 'MODERATE':
      return 'rgba(245, 158, 11, 0.15)';
    case 'HIGH':
      return 'rgba(249, 115, 22, 0.15)';
    case 'EXTREME':
    case 'CRITICAL':
      return 'rgba(239, 68, 68, 0.15)';
    default:
      return 'rgba(107, 114, 128, 0.15)';
  }
};

export const getRiskBadgeStyles = (level: RiskLevel | string | undefined) => {
  switch (level?.toUpperCase()) {
    case 'LOW':
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400',
        badge: 'bg-emerald-500 text-white dark:text-slate-950 font-bold',
        text: 'text-emerald-700 dark:text-emerald-400',
        glow: 'shadow-emerald-500/20',
        border: 'border-emerald-500/40',
        dot: 'bg-emerald-500 dark:bg-emerald-400',
        label: 'Low Risk',
      };
    case 'MODERATE':
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-400',
        badge: 'bg-amber-500 text-white dark:text-slate-950 font-bold',
        text: 'text-amber-700 dark:text-amber-400',
        glow: 'shadow-amber-500/20',
        border: 'border-amber-500/40',
        dot: 'bg-amber-500 dark:bg-amber-400',
        label: 'Moderate Risk',
      };
    case 'HIGH':
      return {
        bg: 'bg-orange-500/10 border-orange-500/30 text-orange-800 dark:text-orange-400',
        badge: 'bg-orange-500 text-white dark:text-slate-950 font-bold',
        text: 'text-orange-700 dark:text-orange-400',
        glow: 'shadow-orange-500/20',
        border: 'border-orange-500/40',
        dot: 'bg-orange-500 dark:bg-orange-400',
        label: 'High Risk',
      };
    case 'EXTREME':
    case 'CRITICAL':
      return {
        bg: 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-400',
        badge: 'bg-red-500 text-white font-bold animate-pulse',
        text: 'text-red-700 dark:text-red-400',
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
