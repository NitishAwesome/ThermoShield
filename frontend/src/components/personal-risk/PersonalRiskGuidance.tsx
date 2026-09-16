import React, { useMemo } from 'react';
import {
  Droplets,
  Clock,
  ShieldCheck,
  HeartPulse,
  Sun,
  Thermometer,
  Wind,
  Home,
  PhoneCall,
  Shirt,
  Apple,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Coffee,
  Umbrella,
  Sunrise,
  MoonStar,
} from 'lucide-react';
import { Card, Badge } from '../ui';
import { PersonalRiskResult } from '../../types';
import { useTranslation } from '../../context/LanguageContext';
import {
  translateWorkRestCycle,
} from '../../utils/translationHelpers';

interface PersonalRiskGuidanceProps {
  result: PersonalRiskResult;
  isOutdoorWorker: boolean;
  hydrationStatus: string;
  hasHealthConditions: boolean;
  outdoorHours?: number;
  physicalActivity?: string;
  coolingAccess?: boolean;
  hasFamilyVulnerable?: boolean;
  className?: string;
}

// ─── Adaptive guidance item types ────────────────────────────────────────────
type GuidancePriority = 'critical' | 'high' | 'routine';

interface GuidanceItem {
  id: string;
  priority: GuidancePriority;
  Icon: React.FC<{ className?: string }>;
  title: string;
  detail: string;
}

// ─── Derive current hour bucket ──────────────────────────────────────────────
function getTimeBucket(): 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h < 6) return 'night';
  if (h < 9) return 'early_morning';
  if (h < 11) return 'morning';
  if (h < 15) return 'midday';
  if (h < 19) return 'afternoon';
  return 'evening';
}

// ─── Build adaptive guidance list ────────────────────────────────────────────
function buildGuidanceItems(
  riskLevel: string,
  timeBucket: ReturnType<typeof getTimeBucket>,
  isOutdoorWorker: boolean,
  hydrationStatus: string,
  hasHealthConditions: boolean,
  outdoorHours: number,
  physicalActivity: string,
  coolingAccess: boolean,
  hasFamilyVulnerable: boolean,
): GuidanceItem[] {
  const tier = riskLevel?.toLowerCase() ?? 'moderate';
  const isHighRisk = tier === 'high' || tier === 'extreme' || tier === 'critical';
  const isModerate = tier === 'moderate';
  const isLow = tier === 'low' || tier === 'minimal';
  const isPeakHeat = timeBucket === 'midday' || timeBucket === 'afternoon';
  const isEveningRecovery = timeBucket === 'evening';
  const isMorningWindow = timeBucket === 'early_morning' || timeBucket === 'morning';
  const isHeavyActivity = physicalActivity === 'heavy';
  const isDehydrated = hydrationStatus === 'dehydrated' || hydrationStatus === 'poor';
  const isModerateHydration = hydrationStatus === 'moderate';

  const items: GuidanceItem[] = [];

  // ── HYDRATION ─────────────────────────────────────────────────────────────
  if (isDehydrated && isHighRisk) {
    items.push({
      id: 'hydration_critical',
      priority: 'critical',
      Icon: Droplets,
      title: 'Drink water immediately',
      detail: 'You are dehydrated during high-risk heat. Start drinking 250 mL now and continue every 15–20 minutes. Do not wait until you feel thirsty.',
    });
  } else if (isDehydrated) {
    items.push({
      id: 'hydration_high',
      priority: 'high',
      Icon: Droplets,
      title: 'Increase fluid intake now',
      detail: 'Your hydration is low. Aim for at least one glass (250 mL) every 20 minutes while outdoors or active. Sports drinks are helpful if active > 1 hour.',
    });
  } else if (isModerateHydration && isPeakHeat) {
    items.push({
      id: 'hydration_moderate_peak',
      priority: 'high',
      Icon: Droplets,
      title: 'Drink proactively during peak heat',
      detail: 'Midday heat accelerates fluid loss. Aim for 300–500 mL per hour even if you do not feel thirsty. Cool water is best; avoid sugary drinks.',
    });
  } else {
    items.push({
      id: 'hydration_routine',
      priority: 'routine',
      Icon: Droplets,
      title: 'Keep up regular hydration',
      detail: 'Your hydration habit is good. Continue drinking small amounts regularly and increase intake during physical activity or after sun exposure.',
    });
  }

  // ── TIME OF DAY ───────────────────────────────────────────────────────────
  if (isPeakHeat && isHighRisk) {
    items.push({
      id: 'avoid_peak',
      priority: 'critical',
      Icon: Sun,
      title: 'Stay out of direct sun right now',
      detail: 'This is peak heat exposure time (11 AM–3 PM). If you must be outdoors, seek shade every 20–30 minutes and limit continuous exposure to under 30 minutes.',
    });
  } else if (isPeakHeat && isModerate) {
    items.push({
      id: 'limit_peak',
      priority: 'high',
      Icon: Sun,
      title: 'Limit outdoor time during peak hours',
      detail: 'The next few hours are the hottest of the day. If possible, move outdoor tasks to before 10 AM or after 5 PM to reduce heat strain.',
    });
  } else if (isMorningWindow) {
    items.push({
      id: 'morning_window',
      priority: 'routine',
      Icon: Sunrise,
      title: 'Good time for outdoor activity',
      detail: 'Morning hours are the coolest window of the day. Get outdoor tasks, exercise, or errands done now before temperatures peak around noon.',
    });
  } else if (isEveningRecovery) {
    items.push({
      id: 'evening_recovery',
      priority: 'routine',
      Icon: MoonStar,
      title: 'Allow your body to cool down tonight',
      detail: 'Ensure your sleeping environment is ventilated or cooled. A cool shower before sleep and keeping windows open (if safe) speeds overnight recovery.',
    });
  }

  // ── WORK / REST ───────────────────────────────────────────────────────────
  if (isOutdoorWorker && isHighRisk) {
    items.push({
      id: 'work_rest_critical',
      priority: 'critical',
      Icon: Clock,
      title: 'Mandatory rest breaks in shade or AC',
      detail: 'At high heat risk with outdoor work, take at least 30 minutes of rest in a cool space for every 30 minutes of activity. Never skip rest in direct sun.',
    });
  } else if (isOutdoorWorker) {
    items.push({
      id: 'work_rest_standard',
      priority: 'high',
      Icon: Clock,
      title: 'Pace yourself and rest in shade',
      detail: 'Use the NIOSH work-rest model: work 45 min, rest 15 min in shade. Keep rest areas stocked with cool water. Assign a buddy to watch for heat illness signs.',
    });
  } else if (isHeavyActivity && isPeakHeat) {
    items.push({
      id: 'heavy_activity_peak',
      priority: 'high',
      Icon: Clock,
      title: 'Reduce heavy activity during peak heat',
      detail: 'Heavy exertion during peak heat multiplies thermal strain rapidly. Reschedule intensive work or exercise to morning or evening windows if possible.',
    });
  }

  // ── COOLING ACCESS ────────────────────────────────────────────────────────
  if (!coolingAccess && isHighRisk) {
    items.push({
      id: 'cooling_critical',
      priority: 'critical',
      Icon: Home,
      title: 'Find a cooling centre or AC space',
      detail: 'Without AC or strong airflow, core temperature rises quickly in high-risk heat. Locate a nearby public cooling centre, mall, library, or government building.',
    });
  } else if (!coolingAccess) {
    items.push({
      id: 'cooling_fan',
      priority: 'high',
      Icon: Wind,
      title: 'Use fans and cross-ventilation',
      detail: 'If AC is unavailable, create cross-ventilation with fans drawing air through opposite windows. Wet a cloth and place it on your neck and wrists to help cool down.',
    });
  } else if (coolingAccess && isHighRisk) {
    items.push({
      id: 'cooling_use_ac',
      priority: 'high',
      Icon: Home,
      title: 'Use AC or fans for recovery',
      detail: 'You have cooling access — use it actively. Spend at least 30–60 minutes in air conditioning during the hottest part of the day to help lower core temperature.',
    });
  }

  // ── HEALTH CONDITIONS ─────────────────────────────────────────────────────
  if (hasHealthConditions && isHighRisk) {
    items.push({
      id: 'health_alert',
      priority: 'critical',
      Icon: HeartPulse,
      title: 'Monitor symptoms closely — seek help early',
      detail: 'Your health conditions increase heat sensitivity. Watch for dizziness, irregular pulse, confusion, or chest tightness. Call emergency services (112) if symptoms appear.',
    });
  } else if (hasHealthConditions) {
    items.push({
      id: 'health_monitor',
      priority: 'high',
      Icon: HeartPulse,
      title: 'Check in with yourself every hour',
      detail: 'Pre-existing conditions impair the body\'s ability to regulate temperature. Check your pulse, hydration, and mental clarity each hour. Inform someone near you of your condition.',
    });
  }

  // ── VULNERABLE FAMILY ─────────────────────────────────────────────────────
  if (hasFamilyVulnerable) {
    items.push({
      id: 'family_check',
      priority: isHighRisk ? 'critical' : 'high',
      Icon: PhoneCall,
      title: 'Check on elderly or young family members',
      detail: 'Children under 12 and adults over 65 are the most heat-vulnerable. Ensure they are hydrated, in a cool space, and not left alone during peak heat.',
    });
  }

  // ── CLOTHING ──────────────────────────────────────────────────────────────
  if (isHighRisk) {
    items.push({
      id: 'clothing',
      priority: 'routine',
      Icon: Shirt,
      title: 'Wear light, loose, breathable clothing',
      detail: 'Light-coloured, moisture-wicking fabrics allow sweat to evaporate efficiently. Avoid dark or synthetic materials that trap heat. A wide-brimmed hat reduces head temperature.',
    });
  }

  // ── EMERGENCY AWARENESS ───────────────────────────────────────────────────
  if (isHighRisk) {
    items.push({
      id: 'emergency_signs',
      priority: 'high',
      Icon: Eye,
      title: 'Know the signs of heat stroke',
      detail: 'Stop sweating suddenly, skin feels hot and dry, confusion, or loss of consciousness = heat stroke. Move to shade immediately, apply cool water, and call 108 or 112.',
    });
  }

  // ── LOW RISK ROUTINE ─────────────────────────────────────────────────────
  if (isLow && !isOutdoorWorker) {
    items.push({
      id: 'low_risk_routine',
      priority: 'routine',
      Icon: CheckCircle2,
      title: 'Heat risk is low — normal activity is fine',
      detail: 'Current conditions pose minimal heat danger for most people. Stay hydrated, avoid unnecessary sun exposure during midday, and check back if conditions change.',
    });
    items.push({
      id: 'low_risk_electrolytes',
      priority: 'routine',
      Icon: Apple,
      title: 'Maintain electrolytes with diet',
      detail: 'Even at low risk, heat causes slow mineral loss. Include bananas, citrus, coconut water, or a pinch of salt in your water if physically active.',
    });
  }

  // ── MODERATE RISK EXTRAS ─────────────────────────────────────────────────
  if (isModerate && outdoorHours >= 3) {
    items.push({
      id: 'moderate_pacing',
      priority: 'high',
      Icon: Zap,
      title: 'Pace physical effort carefully',
      detail: 'At moderate risk with extended outdoor time, reduce exercise intensity by ~30% compared to your baseline. Take unplanned breaks if you feel flushed or breathless.',
    });
  }

  // Sort: critical → high → routine
  const order: Record<GuidancePriority, number> = { critical: 0, high: 1, routine: 2 };
  items.sort((a, b) => order[a.priority] - order[b.priority]);

  // Cap at 8 items to avoid overwhelming the UI
  return items.slice(0, 8);
}

// ─── Priority badge styles ────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<GuidancePriority, { badge: string; border: string; bg: string; iconColor: string }> = {
  critical: {
    badge: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30',
    border: 'border-red-500/30',
    bg: 'bg-red-50/50 dark:bg-red-950/20',
    iconColor: 'text-red-500 dark:text-red-400',
  },
  high: {
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
    border: 'border-amber-500/30',
    bg: 'bg-amber-50/30 dark:bg-amber-950/10',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
  routine: {
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-50/30 dark:bg-emerald-950/10',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
  },
};

export const PersonalRiskGuidance: React.FC<PersonalRiskGuidanceProps> = ({
  result,
  isOutdoorWorker,
  hydrationStatus,
  hasHealthConditions,
  outdoorHours = 3,
  physicalActivity = 'moderate',
  coolingAccess = false,
  hasFamilyVulnerable = false,
  className = '',
}) => {
  const { t } = useTranslation();

  const hydrationMl = result.recommended_water_intake_ml_hr || 500;
  const workRest = result.work_rest_cycle || 'Standard hydration and shade breaks';
  const riskLevel = result.risk_level || 'moderate';

  const isHydrationPriority = hydrationStatus === 'poor' || hydrationStatus === 'dehydrated' || hydrationStatus === 'moderate';
  const isWorkRestPriority = isOutdoorWorker;
  const isHealthPriority = hasHealthConditions;

  const timeBucket = useMemo(() => getTimeBucket(), []);
  const adaptiveItems = useMemo(
    () =>
      buildGuidanceItems(
        riskLevel,
        timeBucket,
        isOutdoorWorker,
        hydrationStatus,
        hasHealthConditions,
        outdoorHours,
        physicalActivity,
        coolingAccess,
        hasFamilyVulnerable,
      ),
    [riskLevel, timeBucket, isOutdoorWorker, hydrationStatus, hasHealthConditions, outdoorHours, physicalActivity, coolingAccess, hasFamilyVulnerable],
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
            Actionable Advice
          </span>
          <h3 className="text-lg sm:text-xl font-black ts-text-primary font-sans mt-0.5">
            {t('risk.immediateGuidance', 'What You Should Do Now')}
          </h3>
        </div>
        <Badge variant="neutral" size="sm">
          {t('risk.personalizedToYou', 'Personalized to your situation')}
        </Badge>
      </div>

      {/* ── Fixed summary cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hydration Card */}
        <Card
          variant={isHydrationPriority ? 'elevated' : 'default'}
          className={`p-4 sm:p-5 flex flex-col justify-between border ${
            isHydrationPriority
              ? 'border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
              : 'ts-border'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Droplets className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
                  {t('risk.hydrationTarget', 'Hydration Target')}
                </span>
              </div>
              {isHydrationPriority && (
                <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">
                  Priority
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black ts-text-primary font-mono">
                  {hydrationMl}
                </span>
                <span className="text-xs sm:text-sm font-semibold ts-text-muted">
                  mL per hour
                </span>
              </div>
              <p className="text-xs ts-text-muted mt-2 leading-relaxed">
                {t(
                  'risk.hydrationAdvice',
                  'Drink in small regular sips while active outdoors. Do not wait until you feel thirsty.',
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t ts-border space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 font-semibold">
              <span>Standard measure:</span>
              <span className="font-mono">≈ {Math.max(1, Math.round(hydrationMl / 250))} glasses / hr</span>
            </div>
            <div className="flex items-center justify-between ts-text-muted">
              <span>If active 2 hours:</span>
              <span className="font-mono font-medium">≈ {((hydrationMl * 2) / 1000).toFixed(1)} L total</span>
            </div>
            <p className="text-[10px] ts-text-subtle pt-0.5 leading-tight">
              Tip: 1 glass ≈ 250 mL. Drink 1 small cup every 15–20 minutes instead of large amounts at once.
            </p>
          </div>
        </Card>

        {/* Work & Rest Schedule Card */}
        <Card
          variant={isWorkRestPriority ? 'elevated' : 'default'}
          className={`p-4 sm:p-5 flex flex-col justify-between border ${
            isWorkRestPriority
              ? 'border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm'
              : 'ts-border'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                  {t('risk.workRestSchedule', 'Work & Rest Schedule')}
                </span>
              </div>
              {isWorkRestPriority && (
                <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded">
                  Outdoor Worker
                </span>
              )}
            </div>

            <div>
              <div className="text-base sm:text-lg font-bold ts-text-primary font-sans leading-snug">
                {translateWorkRestCycle(workRest, t)}
              </div>
              <p className="text-xs ts-text-muted mt-2 leading-relaxed">
                {t(
                  'risk.workRestAdvice',
                  'Rest periods must be spent in deep shade, a breezeway, or an air-conditioned room to drop core body temperature.',
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t ts-border text-[11px] ts-text-subtle font-medium">
            Based on NIOSH/OSHA thermal workload standards
          </div>
        </Card>

        {/* Recovery & Health Card */}
        <Card
          variant={isHealthPriority ? 'elevated' : 'default'}
          className={`p-4 sm:p-5 flex flex-col justify-between border ${
            isHealthPriority
              ? 'border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm'
              : 'ts-border'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-400/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-mono">
                  {t('risk.recoveryProtection', 'Cooling & Recovery')}
                </span>
              </div>
              {isHealthPriority && (
                <span className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 font-bold px-1.5 py-0.5 rounded">
                  Health Alert
                </span>
              )}
            </div>

            <div>
              <div className="text-base sm:text-lg font-bold ts-text-primary font-sans leading-snug">
                {hasHealthConditions
                  ? t('risk.healthMonitor', 'Active Medical Precaution')
                  : t('risk.coolingAccess', 'Thermal Cool-Down')}
              </div>
              <p className="text-xs ts-text-muted mt-2 leading-relaxed">
                {hasHealthConditions
                  ? t(
                      'risk.healthPrecautionAdvice',
                      'Pre-existing conditions impair thermal regulation. Monitor closely for dizziness, rapid pulse, or extreme fatigue.',
                    )
                  : t(
                      'risk.generalCoolingAdvice',
                      'Spend your main recovery breaks in air conditioning or direct cross-ventilation with fans.',
                    )}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t ts-border text-[11px] ts-text-subtle font-medium">
            Emergency contact: 108 / 112 (Disaster Response)
          </div>
        </Card>
      </div>

      {/* ── Adaptive contextual guidance list ──────────────────────────────── */}
      {adaptiveItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
              Contextual Heat Actions
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
              Adaptive to your situation right now
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {adaptiveItems.map((item) => {
              const styles = PRIORITY_STYLES[item.priority];
              const { Icon } = item;
              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${styles.border} ${styles.bg}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${styles.bg} border ${styles.border}`}>
                    <Icon className={`w-4 h-4 ${styles.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-bold ts-text-primary">{item.title}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${styles.badge}`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-[11px] ts-text-muted leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Backend-provided safety recommendations ─────────────────────────── */}
      {result.safety_recommendations && result.safety_recommendations.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/30 rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider font-mono mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>{t('risk.keyDirectives', 'Key Safety Directives')}</span>
          </div>
          <ul className="space-y-1.5">
            {result.safety_recommendations.map((rec, idx) => (
              <li
                key={idx}
                className="text-xs sm:text-sm ts-text-primary flex items-start gap-2 font-medium"
              >
                <span className="text-amber-600 dark:text-amber-400 font-bold leading-none mt-1">
                  •
                </span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PersonalRiskGuidance;
