import React from 'react';
import { Droplets, Home, Shirt, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { Card, Badge } from '../ui';
import { useTranslation } from '../../context/LanguageContext';

interface CitizenSafetyActionsProps {
  riskLevel: string;
  approximateWaterMl?: number;
  hydrationInterval?: string;
  orsRecommended?: boolean;
  className?: string;
}

export const CitizenSafetyActions: React.FC<CitizenSafetyActionsProps> = ({
  riskLevel,
  approximateWaterMl,
  hydrationInterval,
  orsRecommended = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const level = (riskLevel || 'LOW').toUpperCase();
  const isExtreme = level === 'EXTREME' || level === 'CRITICAL';
  const isHigh = level === 'HIGH';

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
            Practical Daily Directives
          </span>
          <h3 className="text-lg sm:text-xl font-black ts-text-primary font-sans mt-0.5">
            {t('alerts.whatYouShouldDo', 'What You Should Do Now')}
          </h3>
        </div>
        <Badge variant={isExtreme ? 'extreme' : isHigh ? 'high' : 'neutral'} size="sm">
          {level} Risk Guidance
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Action 1: Drink Water */}
        <Card variant="default" className="p-4 border ts-border flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Droplets className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold ts-text-primary">
              Drink Water Regularly
            </h4>
            <p className="text-xs ts-text-muted leading-relaxed">
              {approximateWaterMl
                ? `Drink ~${approximateWaterMl} mL ${hydrationInterval || 'every 20–30 minutes'}.`
                : isHigh || isExtreme
                ? 'Drink 500–750 mL fluid per hour. Do not wait until thirsty.'
                : 'Keep a water bottle nearby and drink fluids steadily through the day.'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t ts-border text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            {orsRecommended ? '✓ ORS / Electrolytes Recommended' : '✓ Clean drinking water sufficient'}
          </div>
        </Card>

        {/* Action 2: Stay Indoors During Peak Heat */}
        <Card variant="default" className="p-4 border ts-border flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 dark:bg-orange-400/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Home className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold ts-text-primary">
              Avoid Midday Sun
            </h4>
            <p className="text-xs ts-text-muted leading-relaxed">
              {isExtreme || isHigh
                ? 'Avoid all non-essential outdoor travel between 12:00 PM and 4:00 PM.'
                : 'Limit strenuous outdoor activities during afternoon peak sun.'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t ts-border text-[11px] font-semibold text-orange-600 dark:text-orange-400">
            Peak Danger: 12 PM – 4 PM
          </div>
        </Card>

        {/* Action 3: Wear Light Clothing */}
        <Card variant="default" className="p-4 border ts-border flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 dark:bg-purple-400/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Shirt className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold ts-text-primary">
              Light & Loose Clothing
            </h4>
            <p className="text-xs ts-text-muted leading-relaxed">
              Wear light-colored, loose, breathable cotton or linen. Use wide-brim hats or umbrellas when stepping outside.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t ts-border text-[11px] font-semibold text-purple-600 dark:text-purple-400">
            Facilitates sweat evaporation
          </div>
        </Card>

        {/* Action 4: Check on Others */}
        <Card variant="default" className="p-4 border ts-border flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold ts-text-primary">
              Check on Loved Ones
            </h4>
            <p className="text-xs ts-text-muted leading-relaxed">
              Check twice daily on elderly family members, young children, and outdoor workers in your household or neighborhood.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t ts-border text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            Community heat solidarity
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CitizenSafetyActions;
