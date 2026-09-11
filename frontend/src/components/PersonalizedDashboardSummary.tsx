import React, { useMemo } from 'react';
import {
  HeartPulse,
  UserCheck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Info,
  Clock,
  MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { User, UserProfile } from '../types';
import { Badge, Button } from './ui';
import { getRiskColor } from '../utils/risk';
import { useTranslation } from '../context/LanguageContext';
import { translateRiskLevel } from '../utils/translationHelpers';

interface PersonalizedDashboardSummaryProps {
  user: User | null;
  profile: UserProfile;
  locationName: string;
  thermalData: any;
}

export const PersonalizedDashboardSummary: React.FC<PersonalizedDashboardSummaryProps> = ({
  user,
  profile,
  locationName,
  thermalData,
}) => {
  const { t } = useTranslation();
  const isCitizen = !profile.role || profile.role === 'user';
  const displayName = profile.fullName || user?.name || t('role.citizen', 'Citizen');
  const firstName = displayName.split(' ')[0];

  // Dynamic time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.goodMorning', 'Good morning');
    if (hour < 17) return t('dashboard.goodAfternoon', 'Good afternoon');
    return t('dashboard.goodEvening', 'Good evening');
  }, [t]);

  const generalRiskLevel = (thermalData?.thermal?.risk_assessment?.level || 'LOW').toUpperCase();
  const wbgt = thermalData?.thermal?.indices?.wbgt_c;
  const temp = thermalData?.weather?.temperature;

  // Evaluate personal risk adjustment
  const personalAssessment = useMemo(() => {
    const factors: string[] = [];
    let adjustmentPoints = 0;

    // Age factor
    if (profile.age !== null && profile.age > 0) {
      if (profile.age >= 65) {
        adjustmentPoints += 20;
        factors.push(t('dashboard.factorSeniorVuln', { age: profile.age }));
      } else if (profile.age <= 12) {
        adjustmentPoints += 15;
        factors.push(t('dashboard.factorChildSens', { age: profile.age }));
      } else if (profile.age >= 50) {
        adjustmentPoints += 10;
        factors.push(t('dashboard.factorAge', { age: profile.age }));
      }
    }

    // Health conditions
    if (profile.health?.conditions && profile.health.conditions.length > 0) {
      adjustmentPoints += profile.health.conditions.length * 15;
      factors.push(t('dashboard.factorHealthConditions', { count: profile.health.conditions.length }));
    }

    if (profile.health?.isPregnant) {
      adjustmentPoints += 20;
      factors.push(t('dashboard.factorPregnancy'));
    }

    if (profile.health?.isOutdoorWorker) {
      adjustmentPoints += 15;
      factors.push(t('dashboard.factorOutdoorWorker'));
    }

    if (profile.exposure?.dailyOutdoorTime === 'mostly_outdoors') {
      adjustmentPoints += 15;
      factors.push(t('dashboard.factorHighExposure'));
    }

    if (profile.exposure?.coolingAccess === 'none') {
      adjustmentPoints += 15;
      factors.push(t('dashboard.factorNoCooling'));
    }

    let personalRiskLevel = generalRiskLevel;
    if (adjustmentPoints >= 35) {
      if (generalRiskLevel === 'LOW') personalRiskLevel = 'MODERATE';
      else if (generalRiskLevel === 'MODERATE') personalRiskLevel = 'HIGH';
      else if (generalRiskLevel === 'HIGH') personalRiskLevel = 'EXTREME';
    } else if (adjustmentPoints >= 20) {
      if (generalRiskLevel === 'LOW') personalRiskLevel = 'MODERATE';
    }

    // Advisory statement
    let advisory = t('dashboard.advisoryComfort');
    if (personalRiskLevel === 'EXTREME' || personalRiskLevel === 'CRITICAL') {
      advisory = t('dashboard.advisoryExtreme');
    } else if (personalRiskLevel === 'HIGH') {
      advisory = t('dashboard.advisoryHigh');
    } else if (personalRiskLevel === 'MODERATE') {
      advisory = t('dashboard.advisoryModerate');
    }

    return {
      personalRiskLevel,
      factors,
      advisory,
      isHigherThanGeneral: personalRiskLevel !== generalRiskLevel,
    };
  }, [profile, generalRiskLevel, t]);

  // If user has not completed basic profile
  const hasBasicProfile = profile.fullName && profile.age !== null && profile.age > 0;

  return (
    <div className="rounded-2xl ts-card-elevated border border-orange-500/25 p-4 sm:p-5 shadow-md relative overflow-hidden transition-all">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Personalized Greeting & Health Situation */}
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="text-xs font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5" />
              {greeting}, {firstName}
            </span>
            <span className="text-slate-400 text-xs hidden sm:inline">•</span>
            <span className="text-xs ts-text-muted">{t('dashboard.personalizedSummaryTitle', 'Your Personal Heat Situation Today')}</span>
          </div>

          <div className="flex items-center space-x-3 flex-wrap gap-y-2 pt-0.5">
            <h2 className="text-xl sm:text-2xl font-black ts-text-primary">
              {t('dashboard.personalExposure')}:{' '}
              <span
                style={{ color: getRiskColor(personalAssessment.personalRiskLevel) }}
                className="tracking-tight"
              >
                {translateRiskLevel(personalAssessment.personalRiskLevel, t)} {t('common.risk', 'Risk')}
              </span>
            </h2>

            <Badge
              riskLevel={personalAssessment.personalRiskLevel}
              size="sm"
              showDot
            >
              {hasBasicProfile ? t('dashboard.profileTailored') : t('dashboard.generalBaseline')}
            </Badge>

            {personalAssessment.isHigherThanGeneral && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>{t('dashboard.elevatedVsCivic', 'Elevated vs. civic average')}</span>
              </span>
            )}
          </div>

          {/* Transparent Basis Notice */}
          <div className="text-[11px] ts-text-subtle flex items-center space-x-2 pt-0.5 flex-wrap gap-y-1">
            <span className="font-semibold text-orange-500/90">{t('dashboard.basedOn', 'Based on')}:</span>
            <span>{locationName.split(',')[0]}</span>
            <span>•</span>
            <span>{hasBasicProfile ? `${profile.age} ${t('common.years', 'yrs')} · ${profile.city}` : t('role.citizen', 'Citizen')}</span>
            <span>•</span>
            <span>{t('dashboard.currentWeather', 'Current weather')} ({temp ? `${temp.toFixed(1)}°C` : t('riskCard.liveTelemetry')}{wbgt ? `, WBGT ${wbgt.toFixed(1)}°C` : ''})</span>
            {personalAssessment.factors.length > 0 && (
              <>
                <span>•</span>
                <span className="text-orange-400 font-medium">
                  {personalAssessment.factors.slice(0, 2).join(', ')}
                </span>
              </>
            )}
          </div>

          {/* Understandable Single-Sentence Directive */}
          <p className="text-xs ts-text-primary leading-relaxed pt-1 font-medium">
            {personalAssessment.advisory}
          </p>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center space-x-2 w-full md:w-auto flex-shrink-0 flex-wrap gap-y-2 self-stretch md:self-auto justify-end">
          <Link
            to="/personal-risk"
            className="flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-all flex items-center justify-center space-x-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('nav.personalRisk', 'Personal Risk')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            to="/profile"
            className="px-3 py-2 rounded-xl text-xs font-semibold ts-card-subtle hover:bg-slate-200/60 dark:hover:bg-slate-800/60 border ts-border ts-text-muted hover:ts-text-primary transition-colors flex items-center justify-center space-x-1"
          >
            <span>{hasBasicProfile ? t('profile.title', 'Profile') : t('risk.completeProfileCTA', 'Setup Profile')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
