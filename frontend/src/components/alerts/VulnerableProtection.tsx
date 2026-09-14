import React from 'react';
import { HeartHandshake, ShieldAlert, Users, HeartPulse, Sparkles } from 'lucide-react';
import { Card } from '../ui';
import { useTranslation } from '../../context/LanguageContext';

interface VulnerableProtectionProps {
  groups?: string[];
  guidance?: string;
  className?: string;
}

const VULNERABLE_GROUPS = [
  {
    icon: '👴',
    title: 'Elderly Relatives (60+)',
    desc: 'Sweat glands become less efficient and thirst sensation is naturally blunted. Ensure ceiling fans or cool rooms are operating.',
  },
  {
    icon: '👶',
    title: 'Infants & Young Children',
    desc: 'Produce more metabolic heat per kg and dehydrate quickly. Never leave children in parked vehicles or unventilated rooms.',
  },
  {
    icon: '🤰',
    title: 'Pregnant Individuals',
    desc: 'Basal metabolic heat is elevated. Extended heat exposure increases dehydration and pregnancy stress.',
  },
  {
    icon: '❤️',
    title: 'Heart & Respiratory Patients',
    desc: 'Heat forces the heart to beat faster to pump blood to the skin. Stay in temperature-controlled spaces.',
  },
  {
    icon: '💊',
    title: 'Medication Users (Diuretics / BP)',
    desc: 'Blood pressure and psychiatric medications can impair internal heat dissipation and fluid retention.',
  },
  {
    icon: '🦺',
    title: 'Outdoor & Manual Laborers',
    desc: 'High metabolic work rates trap internal heat. Need mandatory shaded pauses and continuous electrolyte replenishment.',
  },
];

export const VulnerableProtection: React.FC<VulnerableProtectionProps> = ({
  groups,
  guidance,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 font-mono">
          Community Care
        </span>
        <h3 className="text-lg sm:text-xl font-black ts-text-primary font-sans mt-0.5">
          {t('alerts.vulnerableProtection', 'People Who Need Extra Care')}
        </h3>
        <p className="text-xs sm:text-sm ts-text-muted mt-0.5">
          Certain groups cannot cool down as fast as healthy adults. Ensure they have access to cool water and shade.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {VULNERABLE_GROUPS.map((grp, idx) => (
          <Card
            key={idx}
            variant="default"
            className="p-3.5 sm:p-4 border ts-border flex items-start gap-3 hover:border-purple-500/30 transition-colors"
          >
            <span className="text-2xl select-none flex-shrink-0 mt-0.5">{grp.icon}</span>
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-bold ts-text-primary">
                {grp.title}
              </h4>
              <p className="text-xs ts-text-muted leading-relaxed">
                {grp.desc}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {guidance && (
        <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2">
          <HeartHandshake className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <span>{guidance}</span>
        </div>
      )}
    </div>
  );
};

export default VulnerableProtection;
