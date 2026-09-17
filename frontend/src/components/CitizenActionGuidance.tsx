import React from 'react';
import { Link } from 'react-router-dom';
import {
  Droplets,
  Home,
  Shield,
  HeartHandshake,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Badge } from './ui';
import {
  RiskAssessment,
  HydrationGuidance,
  ActivityGuidance,
  VulnerablePopulationGuidance,
} from '../types';
import { useTranslation } from '../context/LanguageContext';

interface CitizenActionGuidanceProps {
  riskAssessment?: RiskAssessment;
  hydration?: HydrationGuidance;
  activity?: ActivityGuidance;
  vulnerable?: VulnerablePopulationGuidance;
  temperature?: number;
  className?: string;
}

export const CitizenActionGuidance: React.FC<CitizenActionGuidanceProps> = ({
  riskAssessment,
  hydration,
  activity,
  vulnerable,
  temperature,
  className = '',
}) => {
  const { t } = useTranslation();
  const hasRisk = Boolean(riskAssessment && riskAssessment.level);
  const level = hasRisk ? riskAssessment!.level.toUpperCase() : 'UNAVAILABLE';
  const isHighRisk = level === 'HIGH' || level === 'EXTREME' || level === 'CRITICAL';

  // Dynamic practical action list derived from real heat stress conditions
  const actions = [
    {
      icon: Droplets,
      iconColor: 'text-sky-500 dark:text-sky-400',
      bgColor: 'bg-sky-500/10 border-sky-500/25',
      title: t('citizenActions.drinkWater', 'Drink water regularly'),
      desc: hydration?.recommended_interval
        ? t('citizenActions.drinkInterval', { interval: hydration.recommended_interval }) ||
          `Drink a glass of water every ${hydration.recommended_interval}. Keep electrolytes or lemon water handy.`
        : 'Drink water frequently throughout the day, even before feeling thirsty.',
    },
    {
      icon: Home,
      iconColor: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/25',
      title: t('citizenActions.avoidPeakSun', 'Avoid direct sun during peak hours'),
      desc: activity?.peak_heat_hours
        ? `Stay indoors or in shaded areas between ${activity.peak_heat_hours} when solar radiation is strongest.`
        : 'Stay in the shade or indoors between 11:30 AM and 4:30 PM.',
    },
    {
      icon: Shield,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/25',
      title: t('citizenActions.wearLightClothes', 'Wear loose, light clothing'),
      desc: 'Use light-colored, breathable cotton clothing. Protect your head with a cap, scarf, or umbrella.',
    },
    {
      icon: HeartHandshake,
      iconColor: 'text-rose-500 dark:text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/25',
      title: t('citizenActions.checkFamily', 'Check on vulnerable family members'),
      desc: 'Keep in touch with elderly relatives, infants, and people with heart conditions. Ensure they stay cool.',
    },
  ];

  return (
    <Card variant="elevated" className={`border ts-border shadow-md overflow-hidden ${className}`}>
      <CardHeader
        title={t('citizenActions.title', 'What You Should Do Now')}
        subtitle={
          isHighRisk
            ? t('citizenActions.subtitleElevated', 'Essential heat defense steps recommended for current conditions')
            : t('citizenActions.subtitleNormal', 'Simple precautions to stay comfortable and prevent heat stress')
        }
        badge={
          <Badge variant={isHighRisk ? 'extreme' : 'brand'} size="sm">
            {isHighRisk ? t('citizenActions.priorityAction', 'Priority Actions') : t('citizenActions.recommended', 'Recommended')}
          </Badge>
        }
      />
      <CardContent className="space-y-4">
        {/* 4 Practical Action Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {actions.map((act, idx) => {
            const Icon = act.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl ts-card-subtle border ts-border flex items-start space-x-3 transition-all hover:border-slate-400/40"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${act.bgColor} ${act.iconColor}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold ts-text-primary leading-snug">
                    {act.title}
                  </h4>
                  <p className="text-[11.5px] ts-text-muted mt-1 leading-relaxed">
                    {act.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action CTA leading to complete Alerts & Directives Page */}
        <div className="pt-2 border-t ts-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs ts-text-muted text-center sm:text-left">
            Need first aid tips, emergency numbers, or regional advisories?
          </p>
          <Link
            to="/alerts"
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center space-x-1.5 flex-shrink-0"
          >
            <span>{t('citizenActions.viewFullGuidance', 'View Full Safety Guidance')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default CitizenActionGuidance;
