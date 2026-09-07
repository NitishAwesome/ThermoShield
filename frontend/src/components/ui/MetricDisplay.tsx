import React from 'react';

interface MetricDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
  secondaryValue?: string;
  status?: 'normal' | 'low' | 'moderate' | 'high' | 'extreme';
  description?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

export const MetricDisplay: React.FC<MetricDisplayProps> = ({
  label,
  value,
  unit,
  secondaryValue,
  status = 'normal',
  description,
  icon,
  size = 'md',
  className = '',
}) => {
  const statusColor = {
    normal: 'text-slate-100',
    low: 'text-emerald-400',
    moderate: 'text-amber-400',
    high: 'text-orange-400',
    extreme: 'text-red-400',
  }[status];

  const valueSize = {
    sm: 'text-xl font-bold',
    md: 'text-2xl sm:text-3xl font-bold',
    lg: 'text-3xl sm:text-4xl font-extrabold',
    hero: 'text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight',
  }[size];

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-semibold ts-text-muted uppercase tracking-wider truncate">
          {label}
        </span>
        {icon && <div className="text-slate-400 flex-shrink-0">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className={`${valueSize} ${statusColor} font-mono tracking-tight`}>
          {value}
        </span>
        {unit && (
          <span className="text-sm sm:text-base font-medium ts-text-muted">
            {unit}
          </span>
        )}
        {secondaryValue && (
          <span className="text-xs font-normal ts-text-subtle ml-1">
            ({secondaryValue})
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs ts-text-subtle mt-1 leading-snug line-clamp-2">
          {description}
        </p>
      )}
    </div>
  );
};
