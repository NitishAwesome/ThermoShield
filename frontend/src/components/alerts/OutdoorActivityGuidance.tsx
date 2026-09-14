import React from 'react';
import { HardHat, Clock, ArrowRight, Sun, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../ui';
import { useTranslation } from '../../context/LanguageContext';

interface OutdoorActivityGuidanceProps {
  restGuidance?: string;
  heavyWorkGuidance?: string;
  peakHours?: string;
  className?: string;
}

export const OutdoorActivityGuidance: React.FC<OutdoorActivityGuidanceProps> = ({
  restGuidance,
  heavyWorkGuidance,
  peakHours = '12:00 PM – 4:00 PM',
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <Card variant="default" className={`p-5 sm:p-6 border ts-border overflow-hidden ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <HardHat className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
              Work & Activity Advisory
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold ts-text-primary">
            {t('alerts.outdoorWorkTitle', 'Planning to Be Outdoors?')}
          </h3>

          <p className="text-xs sm:text-sm ts-text-muted leading-relaxed">
            The hottest part of the day severely elevates cardiovascular and thermal strain during physical labor, sports, or walking.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border ts-border">
              <span className="font-semibold ts-text-primary block mb-0.5">
                • Heavy Physical Work:
              </span>
              <span className="ts-text-muted">
                {heavyWorkGuidance || 'Shift high-exertion tasks to before 10:30 AM or after 5:00 PM.'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border ts-border">
              <span className="font-semibold ts-text-primary block mb-0.5">
                • Rest Schedule:
              </span>
              <span className="ts-text-muted">
                {restGuidance || 'Mandatory 15-minute shaded rest breaks every 45–60 minutes of labor.'}
              </span>
            </div>
          </div>
        </div>

        {/* Forecast Safe Window CTA Box */}
        <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 lg:w-72 flex-shrink-0 flex flex-col justify-between">
          <div className="space-y-1.5 mb-3">
            <div className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5 uppercase font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>Safe Hours Planner</span>
            </div>
            <p className="text-xs ts-text-muted leading-relaxed">
              Find the safest hourly windows today with lower wet-bulb and UV radiation.
            </p>
          </div>

          <Link
            to="/forecast"
            className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <span>View Safe Outdoor Hours</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default OutdoorActivityGuidance;
