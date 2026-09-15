import React from 'react';
import {
  Droplets,
  Home,
  Shirt,
  HeartHandshake,
  Timer,
  Sparkles,
  Pill,
  PhoneCall,
  ShieldAlert,
  Wind,
  CheckCircle2,
} from 'lucide-react';
import { Card, Badge } from '../ui';
import { useTranslation } from '../../context/LanguageContext';

interface CitizenSafetyActionsProps {
  riskLevel: string;
  approximateWaterMl?: number;
  hydrationInterval?: string;
  orsRecommended?: boolean;
  className?: string;
}

interface ActionItem {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  footerNote: string;
  urgent?: boolean;
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
  const isModerate = level === 'MODERATE';

  // Calculate glass translation (250 mL = 1 standard glass)
  const targetMl = approximateWaterMl || (isExtreme || isHigh ? 650 : isModerate ? 450 : 250);
  const glassesPerHour = Math.max(1, Math.round(targetMl / 250));
  const twoHourLiters = ((targetMl * 2) / 1000).toFixed(1);

  // Build context-sensitive action list
  // Low: 4 actions | Moderate: 6 actions | High/Extreme: 8 actions
  const getActions = (): ActionItem[] => {
    if (isExtreme || isHigh) {
      return [
        {
          id: 'hydration',
          icon: Droplets,
          iconColor: 'text-blue-600 dark:text-blue-400',
          iconBg: 'bg-blue-500/10 dark:bg-blue-400/10',
          title: 'Intensive Hydration & Electrolytes',
          description: `${targetMl} mL per hour (≈ ${glassesPerHour} standard glasses/hr, or ${twoHourLiters} L over 2 hours). Sip every 15–20 min. Do not wait for thirst.`,
          footerNote: orsRecommended ? '✓ ORS / Electrolyte solutions strongly advised' : '✓ Water + natural salts (Nimbu Paani/Aam Panna)',
          urgent: true,
        },
        {
          id: 'shade',
          icon: ShieldAlert,
          iconColor: 'text-rose-600 dark:text-rose-400',
          iconBg: 'bg-rose-500/10 dark:bg-rose-400/10',
          title: 'Strict Midday Sun Avoidance',
          description: 'Stay off open roads and avoid unshaded outdoor areas between 11:30 AM and 4:30 PM. Reschedule non-essential travel to early morning or after sunset.',
          footerNote: 'Peak solar heat stress: 11:30 AM – 4:30 PM',
          urgent: true,
        },
        {
          id: 'work_rest',
          icon: Timer,
          iconColor: 'text-amber-600 dark:text-amber-400',
          iconBg: 'bg-amber-500/10 dark:bg-amber-400/10',
          title: 'Mandatory Work-Rest Cycles',
          description: 'For any necessary physical exertion or outdoor labor: take at least 15–20 minutes of shaded, ventilated rest for every 40–45 minutes of activity.',
          footerNote: 'Enforce ISO 7243 rest pacing to avoid heat crash',
        },
        {
          id: 'cooling',
          icon: Sparkles,
          iconColor: 'text-cyan-600 dark:text-cyan-400',
          iconBg: 'bg-cyan-500/10 dark:bg-cyan-400/10',
          title: 'Active Body Cooling',
          description: 'Drape damp towels across your neck and shoulders, splash cool water on your face and forearms, or take a cool foot bath if feeling warm.',
          footerNote: 'Evaporative cooling lowers skin temp by 2–3°C',
        },
        {
          id: 'vulnerable',
          icon: HeartHandshake,
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
          title: 'Vulnerable Family Check-Ins',
          description: 'Conduct morning and afternoon wellness checks on elderly relatives, infants, pregnant women, and pets. Never leave anyone in a parked vehicle.',
          footerNote: 'Elderly sweat response is 30–50% slower',
        },
        {
          id: 'medications',
          icon: Pill,
          iconColor: 'text-purple-600 dark:text-purple-400',
          iconBg: 'bg-purple-500/10 dark:bg-purple-400/10',
          title: 'Medication Sensitivity & Storage',
          description: 'Certain blood pressure, heart, and allergy medicines impair sweat regulation. Store all insulin and medications below 30°C in a cool spot.',
          footerNote: 'Consult doctor if experiencing lightheadedness',
        },
        {
          id: 'home_cooling',
          icon: Wind,
          iconColor: 'text-teal-600 dark:text-teal-400',
          iconBg: 'bg-teal-500/10 dark:bg-teal-400/10',
          title: 'Home Solar Shielding',
          description: 'Draw dark or reflective curtains on sun-facing windows. Hang damp sheets in front of open windows or fans to introduce evaporative cooling.',
          footerNote: 'Prevents indoor greenhouse heat buildup',
        },
        {
          id: 'emergency',
          icon: PhoneCall,
          iconColor: 'text-red-600 dark:text-red-400',
          iconBg: 'bg-red-500/10 dark:bg-red-400/10',
          title: 'Emergency Escalation (Call 108)',
          description: 'If anyone shows signs of Heat Stroke — confusion, fainting, stopped sweating, rapid breathing, or vomiting — move to shade and dial 108 immediately.',
          footerNote: '⚠️ Medical emergency: cool aggressively while waiting',
          urgent: true,
        },
      ];
    }

    if (isModerate) {
      return [
        {
          id: 'hydration',
          icon: Droplets,
          iconColor: 'text-blue-600 dark:text-blue-400',
          iconBg: 'bg-blue-500/10 dark:bg-blue-400/10',
          title: 'Steady Hourly Hydration',
          description: `Drink ~${targetMl} mL per hour (≈ ${glassesPerHour} standard glasses/hr, or ~${twoHourLiters} L every 2 hrs). Drink steadily even before feeling thirsty.`,
          footerNote: 'Keep a full water bottle with you when leaving home',
        },
        {
          id: 'shade',
          icon: Home,
          iconColor: 'text-orange-600 dark:text-orange-400',
          iconBg: 'bg-orange-500/10 dark:bg-orange-400/10',
          title: 'Limit Afternoon Peak Sun',
          description: 'Plan daily errands, shopping, and heavy chores before 12:00 PM or after 4:00 PM when solar radiation begins to ease.',
          footerNote: 'Solar peak window: 12:00 PM – 4:00 PM',
        },
        {
          id: 'clothing',
          icon: Shirt,
          iconColor: 'text-purple-600 dark:text-purple-400',
          iconBg: 'bg-purple-500/10 dark:bg-purple-400/10',
          title: 'Light & Breathable Clothing',
          description: 'Wear loose-fitting, light-colored cotton or linen fabrics. Carry an umbrella or wear a wide-brim hat to protect your scalp and neck.',
          footerNote: 'Allows natural airflow and sweat evaporation',
        },
        {
          id: 'rest_pacing',
          icon: Timer,
          iconColor: 'text-amber-600 dark:text-amber-400',
          iconBg: 'bg-amber-500/10 dark:bg-amber-400/10',
          title: '10-Minute Shade Breathers',
          description: 'Take regular 10-minute breaks in shade or fan-cooled spots if walking, commuting on foot, or doing outdoor gardening.',
          footerNote: 'Prevents body heat accumulation',
        },
        {
          id: 'vulnerable',
          icon: HeartHandshake,
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
          title: 'Check on Seniors & Children',
          description: 'Ensure elderly household members drink sufficient fluids and that school children have full water bottles throughout the afternoon.',
          footerNote: 'Support relatives with reduced thirst sensation',
        },
        {
          id: 'home_ventilation',
          icon: Wind,
          iconColor: 'text-teal-600 dark:text-teal-400',
          iconBg: 'bg-teal-500/10 dark:bg-teal-400/10',
          title: 'Indoor Airflow & Ventilation',
          description: 'Keep windows open on shaded sides of the home for cross-breeze. Close blinds on sun-exposed walls during peak afternoon hours.',
          footerNote: 'Maintains comfortable indoor ambient temps',
        },
      ];
    }

    // Default / Low Risk (4 practical actions)
    return [
      {
        id: 'hydration',
        icon: Droplets,
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-500/10 dark:bg-blue-400/10',
        title: 'Daily Hydration Baseline',
        description: 'Keep a water bottle nearby and drink at least 250–300 mL (≈ 1–2 standard glasses) every 1–2 hours through the day.',
        footerNote: '✓ Clean tap/filtered drinking water is sufficient',
      },
      {
        id: 'sun_protection',
        icon: Home,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
        title: 'Sun Protection & Eye Care',
        description: 'Wear UV-blocking sunglasses, a light cap, and sunscreen when outdoors for extended periods during midday hours.',
        footerNote: 'Standard seasonal outdoor precautions',
      },
      {
        id: 'activities',
        icon: Shirt,
        iconColor: 'text-purple-600 dark:text-purple-400',
        iconBg: 'bg-purple-500/10 dark:bg-purple-400/10',
        title: 'Comfortable Outdoor Schedules',
        description: 'Conditions are safe for standard school sports, outdoor walks, and field errands. Dress in comfortable, breathable clothing.',
        footerNote: 'No severe work-rest restrictions required',
      },
      {
        id: 'ventilation',
        icon: Wind,
        iconColor: 'text-teal-600 dark:text-teal-400',
        iconBg: 'bg-teal-500/10 dark:bg-teal-400/10',
        title: 'Fresh Air Ventilation',
        description: 'Take advantage of comfortable outdoor temperatures by keeping doors and windows open for natural living-space airflow.',
        footerNote: 'Promotes healthy indoor air exchange',
      },
    ];
  };

  const actions = getActions();

  return (
    <div className={`space-y-3.5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Practical Citizen Directives • {actions.length} Actionable Steps</span>
          </span>
          <h3 className="text-lg sm:text-xl font-black ts-text-primary font-sans mt-0.5">
            {t('alerts.whatYouShouldDo', 'What You Should Do Now')}
          </h3>
        </div>
        <Badge
          variant={isExtreme ? 'extreme' : isHigh ? 'high' : isModerate ? 'moderate' : 'low'}
          size="sm"
          className="self-start sm:self-auto font-bold"
        >
          {level} Risk Guidance ({actions.length} Directives)
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Card
              key={act.id}
              variant="default"
              className={`p-4 border flex flex-col justify-between transition-all ${
                act.urgent
                  ? 'border-rose-500/30 bg-gradient-to-b from-rose-500/5 to-transparent shadow-xs'
                  : 'ts-border hover:border-emerald-500/30'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-8 h-8 rounded-lg ${act.iconBg} flex items-center justify-center ${act.iconColor}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {act.urgent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 font-mono">
                      Priority
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold ts-text-primary">
                  {act.title}
                </h4>

                <p className="text-xs ts-text-muted leading-relaxed">
                  {act.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t ts-border text-[11px] font-semibold ts-text-subtle">
                {act.footerNote}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CitizenSafetyActions;
