import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle' | 'gradient';
  highlightBorder?: 'none' | 'low' | 'moderate' | 'high' | 'extreme' | 'brand';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  highlightBorder = 'none',
  onClick,
}) => {
  const variantClass = {
    default: 'ts-card',
    elevated: 'ts-card-elevated shadow-lg',
    subtle: 'ts-card-subtle',
    gradient: 'ts-card bg-gradient-to-br from-slate-900/90 to-slate-950/90',
  }[variant];

  const borderHighlight = {
    none: '',
    low: 'border-emerald-500/50 hover:border-emerald-500',
    moderate: 'border-amber-500/50 hover:border-amber-500',
    high: 'border-orange-500/50 hover:border-orange-500',
    extreme: 'border-red-500/60 hover:border-red-500 shadow-red-500/10',
    brand: 'border-sky-500/50 hover:border-sky-500',
  }[highlightBorder];

  return (
    <div
      onClick={onClick}
      className={`${variantClass} ${borderHighlight} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, badge, action, className = '' }) => (
  <div className={`p-4 sm:p-5 pb-3.5 sm:pb-4 border-b ts-border flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 ${className}`}>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm sm:text-base md:text-lg font-bold ts-text-primary tracking-tight font-sans break-words">{title}</h3>
        {badge}
      </div>
      {subtitle && <p className="text-xs ts-text-muted mt-1 leading-relaxed">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0 self-start sm:self-auto max-w-full">{action}</div>}
  </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-4 sm:p-5 ${className}`}>{children}</div>;
