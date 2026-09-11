import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message }) => {
  const { t } = useTranslation();
  const displayMessage = message || t('common.loading');

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
        <Loader2 className="w-6 h-6 text-cyan-400 absolute animate-pulse" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-400 animate-pulse">
        {displayMessage}
      </p>
    </div>
  );
};

export default LoadingState;
