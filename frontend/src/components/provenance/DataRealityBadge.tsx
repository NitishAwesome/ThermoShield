import React, { useState } from 'react';
import { Radio, Calculator, Activity, Cpu, Sparkles, Clock, AlertTriangle, Info } from 'lucide-react';
import { DataRealityTier, getDataRealityMeta } from '../../types/provenance';

interface DataRealityBadgeProps {
  tier: DataRealityTier;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  interactive?: boolean;
  customLabel?: string;
  className?: string;
  onClick?: () => void;
}

export const DataRealityBadge: React.FC<DataRealityBadgeProps> = ({
  tier,
  size = 'sm',
  showIcon = true,
  interactive = true,
  customLabel,
  className = '',
  onClick,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const meta = getDataRealityMeta(tier);

  const getIcon = () => {
    const iconProps = {
      className: size === 'xs' ? 'w-2.5 h-2.5 mr-1 flex-shrink-0' : size === 'sm' ? 'w-3 h-3 mr-1.5 flex-shrink-0' : 'w-3.5 h-3.5 mr-1.5 flex-shrink-0'
    };

    switch (meta.iconName) {
      case 'radio':
        return <Radio {...iconProps} />;
      case 'calculator':
        return <Calculator {...iconProps} />;
      case 'activity':
        return <Activity {...iconProps} />;
      case 'sparkles':
        return <Sparkles {...iconProps} />;
      case 'clock':
        return <Clock {...iconProps} />;
      case 'alert-triangle':
        return <AlertTriangle {...iconProps} />;
      default:
        return <Cpu {...iconProps} />;
    }
  };

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] leading-tight font-medium',
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  const displayLabel = customLabel || meta.badgeLabel;

  return (
    <div className="relative inline-flex items-center">
      <span
        onClick={onClick}
        onMouseEnter={() => interactive && setShowTooltip(true)}
        onMouseLeave={() => interactive && setShowTooltip(false)}
        onFocus={() => interactive && setShowTooltip(true)}
        onBlur={() => interactive && setShowTooltip(false)}
        tabIndex={interactive ? 0 : undefined}
        role={onClick ? 'button' : undefined}
        className={`inline-flex items-center rounded-full border transition-colors ${meta.borderClass} ${meta.bgClass} ${sizeClasses[size]} ${
          interactive ? 'cursor-help' : ''
        } ${className}`}
        title={meta.shortDesc}
      >
        {showIcon && getIcon()}
        <span>{displayLabel}</span>
      </span>

      {/* Popover / Tooltip on hover/focus */}
      {showTooltip && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-64 p-2.5 rounded-lg bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur border border-slate-700/60 shadow-xl text-left pointer-events-none animate-in fade-in duration-150"
          role="tooltip"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-xs font-bold ${meta.textClass}`}>{meta.label}</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {meta.detailedDesc}
          </p>
          <div className="mt-1 pt-1 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
            <span>Data Provenance Tier</span>
            <span className="font-mono text-slate-300">{meta.tier}</span>
          </div>
        </div>
      )}
    </div>
  );
};
