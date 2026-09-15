import React from 'react';
import { Flame, Clock, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { Card, Badge } from '../ui';
import { useTranslation } from '../../context/LanguageContext';

interface PeakHeatCardProps {
  peakHours?: string;
  maxTemp?: number;
  className?: string;
}

export const PeakHeatCard: React.FC<PeakHeatCardProps> = ({
  peakHours = '12:00 PM – 4:00 PM',
  maxTemp,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <Card
      variant="default"
      className={`p-5 sm:p-6 border border-orange-500/30 bg-gradient-to-br from-orange-50/40 via-transparent to-amber-50/20 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 shadow-xs ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b ts-border pb-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono block">
              Daily Heat Peak
            </span>
            <h3 className="text-base sm:text-lg font-black ts-text-primary font-sans leading-tight">
              {t('forecast.peakHeatTitle', 'Today’s Peak Heat Period')}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/25 text-xs font-bold font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>Expected: {peakHours}</span>
          </div>
          {maxTemp !== undefined && (
            <Badge variant="high" size="sm">
              Max ~{Math.round(maxTemp)}°C
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {/* What to Avoid */}
        <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-500/20 space-y-2">
          <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 uppercase font-mono text-[11px]">
            <XCircle className="w-3.5 h-3.5" />
            <span>What to Avoid During Peak Hours</span>
          </span>
          <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className="text-rose-500 font-bold">•</span>
              <span>Strenuous outdoor physical labor, jogging, or sports in direct sun.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-rose-500 font-bold">•</span>
              <span>Unshaded travel, waiting at open bus stands, or walking bareheaded.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-rose-500 font-bold">•</span>
              <span>Leaving children, elderly individuals, or pets in parked vehicles.</span>
            </li>
          </ul>
        </div>

        {/* What Is Safer */}
        <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-2">
          <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 uppercase font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>What Is Safer to Do Instead</span>
          </span>
          <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">•</span>
              <span>Reschedule outdoor errands to early morning (before 10:30 AM) or sunset.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">•</span>
              <span>Stay in cross-ventilated, fan-cooled, or air-conditioned indoor rooms.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-500 font-bold">•</span>
              <span>Drink clean water or electrolyte fluids steadily before feeling thirsty.</span>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default PeakHeatCard;
