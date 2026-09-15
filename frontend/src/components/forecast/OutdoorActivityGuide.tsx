import React from 'react';
import { Briefcase, Car, Dumbbell, GraduationCap, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../ui';
import { useTranslation } from '../../context/LanguageContext';

interface OutdoorActivityGuideProps {
  className?: string;
}

const ACTIVITIES = [
  {
    icon: <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    title: 'Outdoor & Field Work',
    summary: 'Shift heavy manual labor to cooler morning hours before 10:30 AM. Enforce mandatory 15-minute shaded breaks every hour during peak heat.',
    actionLabel: 'Check Work-Rest Schedule',
    actionLink: '/personal-risk',
  },
  {
    icon: <Car className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
    title: 'Travel & Daily Commute',
    summary: 'Always carry a reusable water bottle. Avoid long standing waits at open roadside stops or unshaded train platforms under direct sun.',
  },
  {
    icon: <Dumbbell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    title: 'Exercise & Running',
    summary: 'Schedule jogging, brisk walking, and gym sessions before 8:00 AM or after sunset. High ambient heat combined with workout effort causes rapid dehydration.',
  },
  {
    icon: <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
    title: 'School & College',
    summary: 'Ensure students have full water bottles. Avoid open-ground sports or physical training sessions during afternoon peak heat hours.',
  },
  {
    icon: <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
    title: 'Family Outings & Errands',
    summary: 'Choose shaded parks, covered markets, or indoor air-cooled spaces. Keep children and elderly relatives well-hydrated throughout the trip.',
  },
];

export const OutdoorActivityGuide: React.FC<OutdoorActivityGuideProps> = ({ className = '' }) => {
  const { t } = useTranslation();

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
          Activity-Specific Advice
        </span>
        <h3 className="text-lg sm:text-xl font-black ts-text-primary font-sans mt-0.5">
          {t('forecast.planActivitiesTitle', 'Plan for Your Daily Outdoor Activities')}
        </h3>
        <p className="text-xs sm:text-sm ts-text-muted mt-0.5">
          Adjust your daily routine to stay safe, productive, and energized throughout the day.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {ACTIVITIES.map((item, idx) => (
          <Card
            key={idx}
            variant="default"
            className="p-4 border ts-border flex flex-col justify-between hover:border-indigo-500/30 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <h4 className="text-sm font-bold ts-text-primary">
                  {item.title}
                </h4>
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
