import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, Flame } from 'lucide-react';

export type RiskSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'CRITICAL';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'neutral' | 'brand' | 'low' | 'moderate' | 'high' | 'extreme';
  riskLevel?: RiskSeverity | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  riskLevel,
  size = 'md',
  showDot = false,
  showIcon = false,
  className = '',
}) => {
  // Normalize riskLevel if provided
  const normalizedLevel = (riskLevel || '').toUpperCase();

  let effectiveVariant = variant || 'default';
  if (normalizedLevel === 'LOW') effectiveVariant = 'low';
  else if (normalizedLevel === 'MODERATE') effectiveVariant = 'moderate';
  else if (normalizedLevel === 'HIGH') effectiveVariant = 'high';
  else if (normalizedLevel === 'EXTREME' || normalizedLevel === 'CRITICAL') effectiveVariant = 'extreme';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }[size];

  const variantStyles = {
    default: 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    neutral: 'bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600/60',
    brand: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
    low: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/40',
    moderate: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40',
    high: 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/40',
    extreme: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40',
  }[effectiveVariant];

  const dotColor = {
    default: 'bg-slate-400',
    neutral: 'bg-slate-400',
    brand: 'bg-sky-400',
    low: 'bg-emerald-400',
    moderate: 'bg-amber-400',
    high: 'bg-orange-400',
    extreme: 'bg-red-500 animate-pulse',
  }[effectiveVariant];

  const renderIcon = () => {
    if (!showIcon) return null;
    const iconClass = size === 'sm' ? 'w-3 h-3 mr-1' : 'w-3.5 h-3.5 mr-1.5';
    switch (effectiveVariant) {
      case 'low':
        return <ShieldCheck className={iconClass} aria-hidden="true" />;
      case 'moderate':
        return <AlertCircle className={iconClass} aria-hidden="true" />;
      case 'high':
        return <AlertTriangle className={iconClass} aria-hidden="true" />;
      case 'extreme':
        return <Flame className={iconClass} aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border transition-all ${sizeClasses} ${variantStyles} ${className}`}
      role="status"
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`} aria-hidden="true" />}
      {renderIcon()}
      {children}
    </span>
  );
};
