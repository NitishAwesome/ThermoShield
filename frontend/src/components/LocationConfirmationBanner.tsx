import React from 'react';
import { useLocation } from '../context/LocationContext';
import { useTranslation } from '../context/LanguageContext';
import { Check, X, Shield, Compass } from 'lucide-react';
import { Button } from './ui';

interface LocationConfirmationBannerProps {
  className?: string;
}

export const LocationConfirmationBanner: React.FC<LocationConfirmationBannerProps> = ({
  className = '',
}) => {
  const { t } = useTranslation();
  const {
    hasLocationChangedPrompt,
    pendingDetectedLocation,
    locationName,
    confirmLocationUpdate,
    dismissLocationPrompt,
  } = useLocation();

  if (!hasLocationChangedPrompt || !pendingDetectedLocation) {
    return null;
  }

  const currentCity = locationName.split(',')[0];
  const detectedCity = pendingDetectedLocation.name.split(',')[0];

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 border bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-amber-500/10 border-sky-500/30 dark:border-sky-400/30 shadow-lg backdrop-blur-md animate-fadeIn transition-all ${className}`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Column: Icon & Context Text */}
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                {t('contextSafety.locationUpdateBadge', 'Location Update Notice')}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                {t('contextSafety.privacyGuaranteed', 'Privacy Protected')}
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-bold ts-text-primary mt-0.5">
              {t('contextSafety.locationPromptTitle', { current: currentCity }, `We are monitoring ${currentCity} for you. Has your location changed?`)}
            </h3>

            <p className="text-xs ts-text-muted mt-1 leading-relaxed max-w-2xl">
              {t(
                'contextSafety.locationPromptDesc',
                { detected: detectedCity },
                `Your device reported a new location (${detectedCity}). Updating ensures your heat stress indices, alerts, and safer windows reflect real-time local conditions.`
              )}
            </p>

            <div className="flex items-center space-x-1.5 text-[11px] text-sky-700 dark:text-sky-400/80 mt-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>
                {t(
                  'contextSafety.locationPrivacyStatement',
                  'ThermoShield evaluates coordinates locally. Continuous background tracking is never enabled.'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="flex items-center space-x-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
          <Button
            variant="primary"
            size="sm"
            onClick={confirmLocationUpdate}
            leftIcon={<Check className="w-3.5 h-3.5" />}
            className="text-xs flex-1 md:flex-none justify-center"
          >
            {t('contextSafety.confirmUpdate', 'Update Location')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => dismissLocationPrompt(24)}
            className="text-xs flex-1 md:flex-none justify-center"
          >
            {t('contextSafety.keepCurrent', { current: currentCity }, `Keep ${currentCity}`)}
          </Button>

          <button
            onClick={() => dismissLocationPrompt(24)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
            title={t('common.dismiss', 'Dismiss for 24h')}
            aria-label="Dismiss location prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
