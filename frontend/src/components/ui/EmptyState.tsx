import React from 'react';
import { AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border ts-border bg-slate-900/40 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border ts-border flex items-center justify-center mb-4 text-slate-400">
        {icon || <AlertCircle className="w-6 h-6 text-slate-400" />}
      </div>
      <h3 className="text-base sm:text-lg font-bold ts-text-primary tracking-tight font-sans mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm ts-text-muted max-w-md mx-auto mb-5 leading-relaxed">
        {description}
      </p>
      {action && <div className="flex items-center justify-center">{action}</div>}
    </div>
  );
};
