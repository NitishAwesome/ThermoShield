import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslation } from '../context/LanguageContext';
import { VulnerableCategory, FamilyVulnerableMember, RiskLevel } from '../types';
import {
  Users,
  CheckCircle2,
  PhoneCall,
  Heart,
  Baby,
  HardHat,
  HeartPulse,
  Shield,
  Plus,
  Trash2,
  Info,
  Clock,
} from 'lucide-react';
import { Button, Badge } from './ui';

interface VulnerableFamilyProtectionCardProps {
  currentRiskLevel?: RiskLevel;
  temperature?: number;
  wbgt?: number;
  className?: string;
}

const CATEGORY_ICONS: Record<VulnerableCategory, React.FC<{ className?: string }>> = {
  older_adult: Heart,
  child: Baby,
  outdoor_worker: HardHat,
  special_care: HeartPulse,
};

export const VulnerableFamilyProtectionCard: React.FC<VulnerableFamilyProtectionCardProps> = ({
  currentRiskLevel,
  temperature,
  wbgt,
  className = '',
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, addFamilyMember, removeFamilyMember } = useProfile();

  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('thermoshield_family_last_checked');
      if (saved) {
        const parsed = parseInt(saved, 10);
        // Only valid if from today
        const isToday = new Date(parsed).toDateString() === new Date().toDateString();
        if (isToday) return parsed;
      }
    } catch (e) {
      console.warn('Failed to read family checked timestamp', e);
    }
    return null;
  });

  const [selectedCats, setSelectedCats] = useState<VulnerableCategory[]>(() => {
    return (profile.familyProtectionMembers || []).map((m) => m.category);
  });
  const [nicknames, setNicknames] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (profile.familyProtectionMembers || []).forEach((m) => {
      if (m.nickname) map[m.category] = m.nickname;
    });
    return map;
  });
  const [isCheckedToday, setIsCheckedToday] = useState<boolean>(false);

  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [selectedCat, setSelectedCat] = useState<VulnerableCategory>('older_adult');
  const [nicknameInput, setNicknameInput] = useState<string>('');

  // Role check
  const activeRole = (user?.role || profile.role || 'citizen').toLowerCase();
  const isCitizen = activeRole === 'user' || activeRole === 'citizen';

  // Preference check
  const isFamilyPrefEnabled =
    profile.notificationPreferences?.familyProtection?.vulnerableFamilyReminders ?? true;

  // Severe/Elevated heat threshold: Configured members, Moderate/High/Extreme/Critical heat, or Temp >= 32°C
  const isSevereHeat =
    (profile.familyProtectionMembers && profile.familyProtectionMembers.length > 0) ||
    currentRiskLevel === 'MODERATE' ||
    currentRiskLevel === 'HIGH' ||
    currentRiskLevel === 'EXTREME' ||
    currentRiskLevel === 'CRITICAL' ||
    (temperature !== undefined && temperature >= 32) ||
    (wbgt !== undefined && wbgt >= 28.0);

  if (!isCitizen || !isFamilyPrefEnabled || !isSevereHeat) {
    return null;
  }

  const activeMembers = profile.familyProtectionMembers || [];

  const handleMarkChecked = () => {
    const now = Date.now();
    setLastCheckedAt(now);
    try {
      localStorage.setItem('thermoshield_family_last_checked', now.toString());
    } catch (e) {
      console.warn('Failed to save family checked timestamp', e);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await addFamilyMember(selectedCat, nicknameInput.trim() || undefined);
    setNicknameInput('');
    setIsAdding(false);
  };

  const getCategoryDetails = (cat: VulnerableCategory) => {
    switch (cat) {
      case 'older_adult':
        return {
          title: t('familyProtection.catElderTitle', 'Older Adult (60+)'),
          tag: t('familyProtection.catElderTag', 'Seniors & Grandparents'),
          advice: t(
            'familyProtection.catElderAdvice',
            'Diminished thirst sensation and impaired sweating. Ensure they drink water regularly, keep resting rooms below 32°C, and monitor blood pressure.'
          ),
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/30',
        };
      case 'child':
        return {
          title: t('familyProtection.catChildTitle', 'Child or Infant'),
          tag: t('familyProtection.catChildTag', 'Infants & Children'),
          advice: t(
            'familyProtection.catChildAdvice',
            'Higher metabolic heat generation and faster dehydration. Keep indoors during 11:00 AM – 4:00 PM, dress in loose cotton, and never leave in stationary vehicles.'
          ),
          color: 'text-sky-600 dark:text-sky-400',
          bg: 'bg-sky-500/10 border-sky-500/30',
        };
      case 'outdoor_worker':
        return {
          title: t('familyProtection.catWorkerTitle', 'Outdoor Worker Relative'),
          tag: t('familyProtection.catWorkerTag', 'Field & Daily Wage Labor'),
          advice: t(
            'familyProtection.catWorkerAdvice',
            'Exposed to sustained radiant solar flux. Remind them to carry electrolyte water (ORS), take 15m shaded breaks hourly, and wear head covers.'
          ),
          color: 'text-orange-600 dark:text-orange-400',
          bg: 'bg-orange-500/10 border-orange-500/30',
        };
      case 'special_care':
        return {
          title: t('familyProtection.catSpecialTitle', 'Person Needing Extra Protection'),
          tag: t('familyProtection.catSpecialTag', 'Health Conditions / Mobility'),
          advice: t(
            'familyProtection.catSpecialAdvice',
            'Cardiovascular, kidney, or respiratory sensitivities elevate heatstroke hazard. Keep in cool ventilated rooms and ensure phone contact is within arm reach.'
          ),
          color: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-500/10 border-purple-500/30',
        };
    }
  };

  return (
    <div
      className={`rounded-2xl border ts-card-elevated overflow-hidden shadow-xl border-indigo-500/30 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent ${className}`}
    >
      {/* Header */}
      <div className="p-4 sm:p-5 border-b ts-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Household Safety Profile
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                Family Vulnerability Checklist
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black ts-text-primary mt-0.5">
              Check on family members who may need extra heat protection
            </h2>
          </div>
        </div>

        {/* Check Action Button */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
          {lastCheckedAt ? (
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{t('familyProtection.checkedConfirmed', 'Checked Today')}</span>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkChecked}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              {t('familyProtection.markAsChecked', 'Mark Checked Today')}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            {t('familyProtection.addProfile', 'Add Category')}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-5 space-y-4">
        <p className="text-xs sm:text-sm ts-text-muted leading-relaxed">
          {t(
            'familyProtection.introText',
            'Severe heat conditions are active. Heat tolerance varies drastically by age and physiology. Take a moment to reach out to elderly family, children, and outdoor workers.'
          )}
        </p>

        {/* Add Category Form (Collapsible) */}
        {isAdding && (
          <form
            onSubmit={handleAddMember}
            className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 space-y-3 animate-fadeIn"
          >
            <div className="text-xs font-bold ts-text-primary">
              {t('familyProtection.formTitle', 'Select category to receive safety guidance for:')}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['older_adult', 'child', 'outdoor_worker', 'special_care'] as VulnerableCategory[]).map(
                (cat) => {
                  const Icon = CATEGORY_ICONS[cat];
                  const details = getCategoryDetails(cat);
                  const isSelected = selectedCat === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCat(cat)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1 ${details.color}`} />
                      <div className="text-xs font-bold ts-text-primary">{details.tag}</div>
                    </button>
                  );
                }
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder={t('familyProtection.nicknamePlaceholder', 'Optional label (e.g. Grandfather, Kids)')}
                className="px-3 py-2 rounded-xl text-xs ts-input border ts-border flex-1"
                maxLength={30}
              />
              <div className="flex items-center space-x-2">
                <Button type="submit" variant="primary" size="sm" className="text-xs flex-1 sm:flex-none">
                  {t('common.save', 'Save')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  className="text-xs"
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Monitored Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Default to 3 core categories if user hasn't added custom ones */}
          {(activeMembers.length > 0
            ? activeMembers
            : [
                { id: 'default-1', category: 'older_adult' as VulnerableCategory, nickname: undefined, addedAt: '' },
                { id: 'default-2', category: 'child' as VulnerableCategory, nickname: undefined, addedAt: '' },
              ]
          ).map((member) => {
            const Icon = CATEGORY_ICONS[member.category];
            const details = getCategoryDetails(member.category);
            const isCustom = !member.id.startsWith('default-');

            return (
              <div
                key={member.id}
                className="p-4 rounded-xl border ts-card-subtle flex flex-col justify-between space-y-2.5 transition-all hover:border-indigo-500/40"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${details.bg}`}>
                        <Icon className={`w-4 h-4 ${details.color}`} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold ts-text-primary">
                          {member.nickname ? `${member.nickname} (${details.tag})` : details.title}
                        </h4>
                        <span className="text-[10px] ts-text-muted">{details.tag}</span>
                      </div>
                    </div>

                    {isCustom && (
                      <button
                        onClick={() => removeFamilyMember(member.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title={t('common.remove', 'Remove')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs ts-text-muted mt-2 leading-relaxed">
                    {details.advice}
                  </p>
                </div>

                <div className="pt-2 border-t ts-border flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
                  <span className="flex items-center space-x-1">
                    <PhoneCall className="w-3 h-3" />
                    <span>{t('familyProtection.actionTip', 'Recommended: Quick phone check-in')}</span>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>{t('familyProtection.hydrationPriority', 'Verify water intake')}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy Note Footer */}
        <div className="mt-3 pt-3 border-t ts-border flex items-center justify-between text-[11px] ts-text-subtle">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>
              Manually maintained household checklist: ThermoShield uses the information you provide to personalize safety reminders. It does not remotely track family members, access GPS locations, or collect biometric data.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
