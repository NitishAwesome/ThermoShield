import React, { useState } from 'react';
import { CheckSquare, Square, ClipboardCheck } from 'lucide-react';
import { Card, Badge } from '../ui';
import { useTranslation } from '../../context/LanguageContext';

interface PersonalSafetyChecklistProps {
  isOutdoorWorker: boolean;
  age: number;
  hasHealthConditions: boolean;
  className?: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  category: string;
}

export const PersonalSafetyChecklist: React.FC<PersonalSafetyChecklistProps> = ({
  isOutdoorWorker,
  age,
  hasHealthConditions,
  className = '',
}) => {
  const { t } = useTranslation();

  // Generate personalized items based on context
  const getItems = (): ChecklistItem[] => {
    const items: ChecklistItem[] = [];

    if (isOutdoorWorker) {
      items.push(
        { id: 'w1', text: t('checklist.workerWater', 'Carry insulated bottle with at least 1.5L drinking water'), category: 'Worker' },
        { id: 'w2', text: t('checklist.workerShade', 'Verify designated shade/cool canopy area before shift start'), category: 'Worker' },
        { id: 'w3', text: t('checklist.workerPacing', 'Rotate strenuous tasks away from 12:00 PM – 4:00 PM peak sun'), category: 'Worker' },
        { id: 'w4', text: t('checklist.workerBuddy', 'Agree on buddy check with coworker for dizziness or slurred speech'), category: 'Worker' },
        { id: 'w5', text: t('checklist.workerHat', 'Wear wide-brim hat or UV neck flap with light cotton shirt'), category: 'Worker' }
      );
    } else if (age >= 60) {
      items.push(
        { id: 's1', text: t('checklist.seniorRoom', 'Stay in the coolest room with ceiling fan or cross-ventilation'), category: 'Senior' },
        { id: 's2', text: t('checklist.seniorSips', 'Drink water or electrolyte fluids every 30 minutes even if not thirsty'), category: 'Senior' },
        { id: 's3', text: t('checklist.seniorIndoors', 'Avoid stepping outdoors between 11:30 AM and 4:30 PM'), category: 'Senior' },
        { id: 's4', text: t('checklist.seniorPhone', 'Keep mobile phone and emergency contact list within arm’s reach'), category: 'Senior' },
        { id: 's5', text: t('checklist.seniorCheckIn', 'Ask a family member or neighbor for a twice-daily wellness check'), category: 'Senior' }
      );
    } else if (hasHealthConditions) {
      items.push(
        { id: 'h1', text: t('checklist.healthMeds', 'Review heat sensitivity of current medications (BP/diuretics)'), category: 'Health' },
        { id: 'h2', text: t('checklist.healthVitals', 'Track blood pressure and heart rate if feeling lightheaded'), category: 'Health' },
        { id: 'h3', text: t('checklist.healthFluids', 'Maintain steady fluid intake without excessive caffeine or sugar'), category: 'Health' },
        { id: 'h4', text: t('checklist.healthPacing', 'Cease all physical exertion immediately upon onset of headache'), category: 'Health' },
        { id: 'h5', text: t('checklist.healthCooling', 'Keep damp towels or ice packs accessible in the refrigerator'), category: 'Health' }
      );
    } else {
      items.push(
        { id: 'g1', text: t('checklist.genWater', 'Keep a filled reusable water bottle within sight all day'), category: 'General' },
        { id: 'g2', text: t('checklist.genDirectSun', 'Limit direct sunlight exposure during midday peak hours'), category: 'General' },
        { id: 'g3', text: t('checklist.genClothing', 'Wear light-colored, loose, breathable cotton or linen clothing'), category: 'General' },
        { id: 'g4', text: t('checklist.genShadeBreaks', 'Take 10-minute rest breaks in shade when walking outdoors'), category: 'General' },
        { id: 'g5', text: t('checklist.genFamily', 'Check in on elderly relatives or pets during afternoon heat peak'), category: 'General' }
      );
    }

    return items;
  };

  const checklistItems = getItems();
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const completedCount = checklistItems.filter((item) => checkedIds[item.id]).length;
  const totalCount = checklistItems.length;

  return (
    <Card variant="default" className={`p-4 sm:p-5 border ts-border ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-base font-bold ts-text-primary">
              {t('checklist.title', 'Personal Safety Checklist')}
            </h4>
            <span className="text-[11px] ts-text-subtle">
              {isOutdoorWorker
                ? t('checklist.forWorkers', 'Tailored for outdoor and manual workers')
                : age >= 60
                ? t('checklist.forSeniors', 'Tailored for seniors and vulnerable individuals')
                : hasHealthConditions
                ? t('checklist.forHealth', 'Tailored for chronic medical conditions')
                : t('checklist.forCitizens', 'Tailored daily heat precautions')}
            </span>
          </div>
        </div>

        <Badge variant={completedCount === totalCount ? 'low' : 'neutral'} size="sm">
          {completedCount} / {totalCount} {t('checklist.completed', 'completed')}
        </Badge>
      </div>

      <div className="space-y-2 mt-3">
        {checklistItems.map((item) => {
          const isDone = !!checkedIds[item.id];
          return (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all border ${
                isDone
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300/50 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-transparent text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 ts-text-subtle hover:text-slate-600 dark:hover:text-slate-300" />
                )}
              </div>
              <span
                className={`text-xs sm:text-sm font-medium leading-relaxed ${
                  isDone ? 'line-through opacity-75' : ''
                }`}
              >
                {item.text}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default PersonalSafetyChecklist;
