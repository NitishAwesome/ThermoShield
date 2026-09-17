import { RiskLevel } from '../types';

export interface RiskStyle {
  level: RiskLevel | 'UNAVAILABLE';
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

export const getRiskStyle = (level: RiskLevel | string | undefined | null): RiskStyle => {
  if (!level) {
    return {
      level: 'UNAVAILABLE',
      fill: '#64748b', // Neutral slate gray
      stroke: '#475569',
      fillOpacity: 0.20,
      selectedFillOpacity: 0.50,
      strokeWidth: 1.5,
      selectedStrokeWidth: 3.0,
      badge: 'bg-slate-600 text-white font-bold',
      badgeBg: 'bg-slate-500/15 border border-slate-500/40 text-slate-700 dark:text-slate-300',
      text: 'text-slate-600 dark:text-slate-400',
      textLabel: 'UNAVAILABLE',
      emoji: '⚪',
    };
  }

  const norm = level.toUpperCase().trim();
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
        fill: '#D97706', // Rich Golden Amber / Warm Ochre
        stroke: '#78350F',
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
    case 'UNAVAILABLE':
    default:
      return {
        level: 'UNAVAILABLE',
        fill: '#64748b', // Neutral slate gray
        stroke: '#475569',
        fillOpacity: 0.20,
        selectedFillOpacity: 0.50,
        strokeWidth: 1.5,
        selectedStrokeWidth: 3.0,
        badge: 'bg-slate-600 text-white font-bold',
        badgeBg: 'bg-slate-500/15 border border-slate-500/40 text-slate-700 dark:text-slate-300',
        text: 'text-slate-600 dark:text-slate-400',
        textLabel: 'UNAVAILABLE',
        emoji: '⚪',
      };
  }
};

export const getRiskColor = (level: RiskLevel | string | undefined | null): string => {
  return getRiskStyle(level).fill;
};

export const getRiskBgColor = (level: RiskLevel | string | undefined | null): string => {
  if (!level) return 'rgba(100, 116, 139, 0.15)';
  switch (level.toUpperCase().trim()) {
    case 'LOW':
      return 'rgba(16, 185, 129, 0.15)';
    case 'MODERATE':
      return 'rgba(245, 158, 11, 0.15)';
    case 'HIGH':
      return 'rgba(249, 115, 22, 0.15)';
    case 'EXTREME':
    case 'CRITICAL':
      return 'rgba(239, 68, 68, 0.15)';
    case 'UNAVAILABLE':
    default:
      return 'rgba(100, 116, 139, 0.15)';
  }
};

export const getRiskBadgeStyles = (level: RiskLevel | string | undefined | null) => {
  if (!level) {
    return {
      bg: 'bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-300',
      badge: 'bg-slate-600 text-white dark:text-slate-100 font-medium',
      text: 'text-slate-600 dark:text-slate-400',
      glow: 'shadow-none',
      border: 'border-slate-500/30',
      dot: 'bg-slate-400 dark:bg-slate-500',
      label: 'Unavailable',
    };
  }

  switch (level.toUpperCase().trim()) {
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
    case 'UNAVAILABLE':
    default:
      return {
        bg: 'bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-300',
        badge: 'bg-slate-600 text-white dark:text-slate-100 font-medium',
        text: 'text-slate-600 dark:text-slate-400',
        glow: 'shadow-none',
        border: 'border-slate-500/30',
        dot: 'bg-slate-400 dark:bg-slate-500',
        label: 'Unavailable',
      };
  }
};

export const formatTemperature = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${val.toFixed(1)}°C`;
};

export const formatSpeed = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${val.toFixed(1)} m/s`;
};

export const formatPercent = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${Math.round(val)}%`;
};
