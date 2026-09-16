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

  // Generate personalized items based on context (7-8 items per category)
  const getItems = (): ChecklistItem[] => {
    const items: ChecklistItem[] = [];

    if (isOutdoorWorker) {
      items.push(
        { id: 'w1', text: t('checklist.workerWater', 'Carry insulated bottle with at least 2L drinking water mixed with ORS or electrolytes'), category: 'Worker' },
        { id: 'w2', text: t('checklist.workerShade', 'Verify designated shade canopy or cool rest area before starting work shift'), category: 'Worker' },
        { id: 'w3', text: t('checklist.workerPacing', 'Reschedule heaviest manual tasks away from 11:30 AM – 4:30 PM peak sun'), category: 'Worker' },
        { id: 'w4', text: t('checklist.workerRestCycles', 'Enforce 15-minute shaded rest break for every 45 minutes of heavy physical labor'), category: 'Worker' },
        { id: 'w5', text: t('checklist.workerHat', 'Wear wide-brim hat or UV neck flap with loose, light-colored cotton shirt'), category: 'Worker' },
        { id: 'w6', text: t('checklist.workerBuddy', 'Agree on buddy check with a coworker to spot dizziness, confusion, or speech slurring'), category: 'Worker' },
        { id: 'w7', text: t('checklist.workerNeckCloth', 'Keep a damp bandana or wet towel on your neck for evaporative skin cooling'), category: 'Worker' },
        { id: 'w8', text: t('checklist.workerFirstAid', 'Know the location of the nearest ORS first-aid station and emergency medical contact'), category: 'Worker' }
      );
    } else if (age >= 60) {
      items.push(
        { id: 's1', text: t('checklist.seniorRoom', 'Stay in the coolest room with a ceiling fan, cooler, or good cross-ventilation'), category: 'Senior' },
        { id: 's2', text: t('checklist.seniorSips', 'Drink water or electrolyte fluids every 30–45 minutes even without feeling thirsty'), category: 'Senior' },
        { id: 's3', text: t('checklist.seniorIndoors', 'Avoid stepping outdoors between 11:30 AM and 4:30 PM unless strictly necessary'), category: 'Senior' },
        { id: 's4', text: t('checklist.seniorPhone', 'Keep mobile phone, emergency contact list, and medications within arm’s reach'), category: 'Senior' },
        { id: 's5', text: t('checklist.seniorCheckIn', 'Arrange a twice-daily wellness check-in with a family member or neighbor'), category: 'Senior' },
        { id: 's6', text: t('checklist.seniorSponge', 'Use a damp sponge or lukewarm foot bath if feeling warm or flushed'), category: 'Senior' },
        { id: 's7', text: t('checklist.seniorMedsReview', 'Check with your doctor or pharmacist about how heat affects your blood pressure pills'), category: 'Senior' },
        { id: 's8', text: t('checklist.seniorWarningSigns', 'Watch for warning signs: sudden confusion, dry mouth, dizziness, or nausea'), category: 'Senior' }
      );
    } else if (hasHealthConditions) {
      items.push(
        { id: 'h1', text: t('checklist.healthMeds', 'Review heat sensitivity of current medications (diuretics, BP, or heart medications)'), category: 'Health' },
        { id: 'h2', text: t('checklist.healthStorage', 'Store all insulin, inhalers, and essential medicines in a cool area below 30°C'), category: 'Health' },
        { id: 'h3', text: t('checklist.healthVitals', 'Track blood pressure and heart rate if feeling unusually fatigued or lightheaded'), category: 'Health' },
        { id: 'h4', text: t('checklist.healthFluids', 'Maintain steady fluid intake (water, coconut water, buttermilk); limit heavy caffeine'), category: 'Health' },
        { id: 'h5', text: t('checklist.healthPacing', 'Stop physical activities immediately upon noticing headache, nausea, or rapid pulse'), category: 'Health' },
        { id: 'h6', text: t('checklist.healthCooling', 'Keep damp towels or cold compresses accessible in the refrigerator for active relief'), category: 'Health' },
        { id: 'h7', text: t('checklist.healthThermalShock', 'Avoid sudden transitions between freezing air-conditioned rooms and scorching outdoor heat'), category: 'Health' },
        { id: 'h8', text: t('checklist.healthEmergency', 'Have emergency ambulance contact (108) ready if chest tightness or fainting occurs'), category: 'Health' }
      );
    } else {
      items.push(
        { id: 'g1', text: t('checklist.genWater', 'Keep a filled reusable water bottle within sight all day and sip ~250 mL every hour'), category: 'General' },
        { id: 'g2', text: t('checklist.genDirectSun', 'Avoid unshaded outdoor areas and direct solar radiation between 12:00 PM and 4:00 PM'), category: 'General' },
        { id: 'g3', text: t('checklist.genClothing', 'Wear light-colored, loose, breathable cotton or linen clothing that allows sweat evaporation'), category: 'General' },
        { id: 'g4', text: t('checklist.genUmbrella', 'Carry an umbrella, wide-brim hat, and sunglasses whenever walking outdoors'), category: 'General' },
        { id: 'g5', text: t('checklist.genShadeBreaks', 'Take 5–10 minute rest breaks in shaded spots or bus shelters when commuting on foot'), category: 'General' },
        { id: 'g6', text: t('checklist.genFamily', 'Check in on elderly relatives, infants, and pets during the peak afternoon heat hours'), category: 'General' },
        { id: 'g7', text: t('checklist.genHomeCooling', 'Draw curtains on sun-facing windows to block radiant heat and maintain indoor coolness'), category: 'General' },
        { id: 'g8', text: t('checklist.genStrokeSigns', 'Recognize heat stroke signs (confusion, stopped sweating, vomiting) and call 108 immediately'), category: 'General' }
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
