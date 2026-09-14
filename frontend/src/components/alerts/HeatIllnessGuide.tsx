import React from 'react';
import { AlertOctagon, PhoneCall, Thermometer, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Card, Badge } from '../ui';
import { useTranslation } from '../../context/LanguageContext';

interface HeatIllnessGuideProps {
  className?: string;
}

export const HeatIllnessGuide: React.FC<HeatIllnessGuideProps> = ({ className = '' }) => {
  const { t } = useTranslation();

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-mono">
          First Aid & Symptom Triage
        </span>
        <h3 className="text-lg sm:text-xl font-black ts-text-primary font-sans mt-0.5">
          {t('alerts.heatIllnessTitle', 'Recognize Heat Illness Early')}
        </h3>
        <p className="text-xs sm:text-sm ts-text-muted mt-0.5">
          Know the critical difference between Heat Exhaustion (requires cooling & rest) and Heat Stroke (life-threatening emergency).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Heat Exhaustion Card */}
        <Card
          variant="default"
          className="p-5 border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10 border ts-border flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Heat Exhaustion</span>
              </h4>
              <Badge variant="moderate" size="sm">
                Act Promptly
              </Badge>
            </div>

            {/* Warning Signs */}
            <div className="space-y-1">
              <span className="text-xs font-bold ts-text-primary block">
                Warning Signs:
              </span>
              <ul className="text-xs ts-text-muted space-y-1 list-disc list-inside">
                <li>Heavy sweating & cold, clammy skin</li>
                <li>Dizziness, lightheadedness, or feeling faint</li>
                <li>Throbbing headache & muscle cramps</li>
                <li>Nausea, vomiting, or loss of appetite</li>
                <li>Weak or rapid pulse</li>
              </ul>
            </div>

            {/* What to do */}
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border ts-border space-y-1">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
                What You Must Do:
              </span>
              <p className="text-xs ts-text-muted leading-relaxed">
                Move to a shaded or air-conditioned room immediately. Drink cool water or ORS in slow sips. Loosen tight clothing and apply damp cloths to neck and forehead.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t ts-border text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
            If vomiting persists or symptoms worsen after 30 mins, seek medical care.
          </div>
        </Card>

        {/* Heat Stroke Card (Urgent Emergency) */}
        <Card
          variant="default"
          className="p-5 border-l-4 border-l-rose-600 bg-rose-50/40 dark:bg-rose-950/20 border ts-border flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" />
                <span>Heat Stroke</span>
              </h4>
              <Badge variant="extreme" size="sm">
                Medical Emergency
              </Badge>
            </div>

            {/* Emergency Signs */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block">
                Emergency Warning Signs:
              </span>
              <ul className="text-xs text-rose-900 dark:text-rose-200 space-y-1 list-disc list-inside font-medium">
                <li>High body temperature (&gt;39.5°C / 103°F)</li>
                <li>Confusion, slurred speech, or altered mental state</li>
                <li>Hot, red, dry skin (or profuse sweat with collapse)</li>
                <li>Seizures or loss of consciousness</li>
                <li>Rapid, shallow breathing</li>
              </ul>
            </div>

            {/* What to do */}
            <div className="p-3 rounded-lg bg-rose-100/70 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700 space-y-1">
              <span className="text-xs font-black text-rose-700 dark:text-rose-300 block uppercase">
                Call For Emergency Help Immediately:
              </span>
              <p className="text-xs text-rose-950 dark:text-rose-100 leading-relaxed font-semibold">
                Dial 108 / 112 right away. Move person to shade. Cool rapidly using cold water sponge, ice packs at armpits/groin, or fan continuously. Do not give fluids if unconscious.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-rose-300 dark:border-rose-800 flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
            <span>Ambulance: 108</span>
            <span>National Emergency: 112</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HeatIllnessGuide;
