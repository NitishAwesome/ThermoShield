import React from 'react';
import {
  Briefcase,
  Car,
  Dumbbell,
  GraduationCap,
  Users,
  ArrowRight,
  Clock,
  Sun,
  Sunset,
  Moon,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Badge } from '../ui';
import { useTranslation } from '../../context/LanguageContext';

interface OutdoorActivityGuideProps {
  className?: string;
  todayMaxTemp?: number;
  apparentTemp?: number;
  currentHour?: number;
}

export const OutdoorActivityGuide: React.FC<OutdoorActivityGuideProps> = ({
  className = '',
  todayMaxTemp = 34,
  apparentTemp,
  currentHour: propHour,
}) => {
  const { t } = useTranslation();

  // Determine current hour (0-23)
  const hour = propHour !== undefined ? propHour : new Date().getHours();

  // Determine time-of-day phase
  // Morning: 5am - 10:59am
  // Midday Peak: 11am - 4:30pm (hour 11 to 16)
  // Evening Relief: 4:31pm - 8:59pm (hour 17 to 20)
  // Night: 9pm - 4:59am (hour 21 to 4)
  const isMorning = hour >= 5 && hour < 11;
  const isMiddayPeak = hour >= 11 && hour < 17;
  const isEvening = hour >= 17 && hour < 21;
  const isNight = hour >= 21 || hour < 5;

  // Determine condition severity
  const effectiveTemp = apparentTemp !== undefined ? Math.max(todayMaxTemp, apparentTemp) : todayMaxTemp;
  const isSevereHeat = effectiveTemp >= 38;
  const isModerateHeat = effectiveTemp >= 33 && effectiveTemp < 38;
  const isLowRisk = effectiveTemp < 33;

  // Phase metadata
  const phaseInfo = isMorning
    ? {
        label: 'Cool Morning Window Active',
        icon: Sun,
        iconColor: 'text-amber-500',
        badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
        headline: 'Best time for strenuous physical tasks, errands, and workouts before midday solar spike.',
      }
    : isMiddayPeak
    ? {
        label: 'Midday Peak Heat Active',
        icon: ShieldAlert,
        iconColor: 'text-rose-500',
        badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
        headline: isSevereHeat
          ? 'Critical solar apex active. Restrict direct sun exposure and take mandatory shaded rest cycles.'
          : 'Peak afternoon warmth. Pacing and hydration are recommended for all outdoor activities.',
      }
    : isEvening
    ? {
        label: 'Afternoon Heat Easing Down',
        icon: Sunset,
        iconColor: 'text-orange-500',
        badgeBg: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
        headline: 'Solar radiation has subsided. Favorable conditions to complete evening errands, walks, or sports.',
      }
    : {
        label: 'Nighttime Thermal Recovery',
        icon: Moon,
        iconColor: 'text-indigo-400',
        badgeBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        headline: 'Coolest diurnal phase. Open windows for cross-ventilation and allow body thermal recovery.',
      };

  const PhaseIcon = phaseInfo.icon;

  // Generate dynamic, condition- & time-aware activity cards
  const getActivities = () => {
    return [
      {
        icon: <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        title: 'Outdoor & Field Work',
        tag: isMiddayPeak && isSevereHeat ? 'Mandatory Rest Pacing' : isMorning ? 'Optimal Labor Window' : 'Active Guidance',
        tagVariant: isMiddayPeak && isSevereHeat ? ('danger' as const) : isMorning ? ('low' as const) : ('neutral' as const),
        summary: isMorning
          ? 'Prime working hours right now. Execute heavy manual or construction tasks before 10:30 AM. Pre-set shaded hydration zones.'
          : isMiddayPeak
          ? isSevereHeat
            ? 'Extreme heat stress active. Enforce mandatory 15–20 min shaded rest for every 40 min labor. Distribute ORS solutions continuously.'
            : 'Afternoon heat elevated. Enforce 10–15 minute shaded breaks each hour and ensure workers drink fluids every 20 minutes.'
          : isEvening
          ? 'Ambient temperatures are cooling down. Safe to resume moderate tasks with ongoing fluid intake before darkness.'
          : 'Night shifts enjoy lower thermal stress. Ensure adequate lighting and drink water hourly despite lower perceived thirst.',
        actionLabel: 'Check Work-Rest Schedule',
        actionLink: '/personal-risk',
      },
      {
        icon: <Car className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
        title: 'Travel & Daily Commute',
        tag: isMiddayPeak ? 'Carry Water Bottle' : 'Normal Transit',
        tagVariant: isMiddayPeak ? ('warning' as const) : ('neutral' as const),
        summary: isMorning
          ? 'Smooth travel conditions. Carry a filled water bottle if commuting will extend past 10:30 AM.'
          : isMiddayPeak
          ? isSevereHeat
            ? 'Avoid long waits at unshaded roadside bus stands or open platforms. Carry cold water, use umbrellas, or choose air-conditioned transit.'
            : 'Sunny conditions. Avoid direct sun while waiting for public transport. Sip water before and after transit.'
          : isEvening
          ? 'Commute heat is easing down. Stay hydrated during rush hour transit, particularly in packed vehicles.'
          : 'Pleasant evening and night travel conditions. No thermal travel restrictions active.',
      },
      {
        icon: <Dumbbell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        title: 'Exercise & Sports',
        tag: isMiddayPeak ? 'Avoid Heavy Exertion' : isMorning || isEvening ? 'Favorable Window' : 'Safe',
        tagVariant: isMiddayPeak ? ('danger' as const) : ('low' as const),
        summary: isMorning
          ? 'Optimal running and sports window. Complete high-intensity workouts before 8:30 AM to prevent rapid dehydration.'
          : isMiddayPeak
          ? isSevereHeat
            ? 'Avoid outdoor running, sports, or gym sessions in uncooled sheds right now. Thermal accumulation causes rapid heat exhaustion.'
            : 'Shift intense cardio indoors. If exercising outdoors, reduce intensity by 30% and double fluid intake.'
          : isEvening
          ? 'Good workout window. The sun has set or lowered significantly. Safe for evening jogs, cycling, and turf sports.'
          : 'Comfortable temperatures for light walks or late-night workouts. Drink 250 mL water before sleeping.',
      },
      {
        icon: <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
        title: 'School & College',
        tag: isMiddayPeak ? 'Keep Indoors' : 'Standard Routine',
        tagVariant: isMiddayPeak ? ('warning' as const) : ('neutral' as const),
        summary: isMorning
          ? 'Morning classes and assembly grounds are safe. Remind students to fill water bottles before classes begin.'
          : isMiddayPeak
          ? isSevereHeat
            ? 'Mandatory indoor recess. Suspend all open-ground sports drills and ensure classroom fans and cross-ventilation are operating.'
            : 'Keep students shaded during recess. Encourage periodic sips from water bottles between classes.'
          : isEvening
          ? 'Safe conditions for after-school outdoor recreation, coaching, and campus walks.'
          : 'Restorative evening. Ensure students drink a glass of water and rest well in well-ventilated bedrooms.',
      },
      {
        icon: <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
        title: 'Family Errands & Shopping',
        tag: isEvening || isMorning ? 'Recommended Window' : 'Postpone if Possible',
        tagVariant: isEvening || isMorning ? ('low' as const) : ('warning' as const),
        summary: isMorning
          ? 'Great time for vegetable markets, street errands, and supermarket runs before midday crowds and temperatures surge.'
          : isMiddayPeak
          ? isSevereHeat
            ? 'Postpone non-essential outdoor errands until after 4:30 PM. Keep elderly family members and infants inside.'
            : 'Prefer air-cooled stores or covered shopping complexes if running errands during afternoon hours.'
          : isEvening
          ? 'Ideal window for local bazaar visits, grocery pickups, and park walks with family and children.'
          : 'Comfortable nighttime ambient weather for errands or family outings.',
      },
    ];
  };

  const activities = getActivities();

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Header & Dynamic Time-Aware Context Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Time-Aware Daily Guidance</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${phaseInfo.badgeBg}`}
            >
              <PhaseIcon className={`w-3 h-3 ${phaseInfo.iconColor}`} />
              <span>{phaseInfo.label}</span>
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black ts-text-primary font-sans mt-0.5">
            {t('forecast.planActivitiesTitle', 'Plan for Your Daily Outdoor Activities')}
          </h3>
        </div>

        <div className="text-xs ts-text-subtle font-medium self-start sm:self-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {isSevereHeat ? 'High Heat Precautions Active' : isModerateHeat ? 'Moderate Heat Precautions' : 'Standard Routine Safe'}
          </span>
        </div>
      </div>

      {/* Dynamic Time-of-Day Advisory Banner */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-slate-800/40 border border-indigo-200/50 dark:border-indigo-900/30 flex items-start gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
        <PhaseIcon className={`w-4 h-4 shrink-0 mt-0.5 ${phaseInfo.iconColor}`} />
        <div className="space-y-0.5">
          <strong className="font-bold">{phaseInfo.label}:</strong>{' '}
          <span className="ts-text-muted">{phaseInfo.headline}</span>
        </div>
      </div>

      {/* Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {activities.map((item, idx) => (
          <Card
            key={idx}
            variant="default"
            className="p-4 border ts-border flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-xs"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <h4 className="text-sm font-bold ts-text-primary">
                    {item.title}
                  </h4>
                </div>
                <Badge
                  variant={
                    item.tagVariant === 'danger'
                      ? 'extreme'
                      : item.tagVariant === 'warning'
                      ? 'high'
                      : item.tagVariant === 'low'
                      ? 'low'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {item.tag}
                </Badge>
              </div>

              <p className="text-xs ts-text-muted leading-relaxed">
                {item.summary}
              </p>
            </div>

            {item.actionLink && (
              <div className="mt-3 pt-2.5 border-t ts-border">
                <Link
                  to={item.actionLink}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OutdoorActivityGuide;
