import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, UserHealthProfile, UserExposureProfile, UserEmergencyPreparedness, UserPreferences } from '../types';
import { useAuth } from './AuthContext';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';

export interface PersonalizationSummary {
  status: 'full' | 'partial' | 'general_estimate';
  activeFactors: string[];
  explanation: string;
  isCitizen: boolean;
}

export interface ProfileContextType {
  profile: UserProfile;
  isLoading: boolean;
  isSaving: boolean;
  completionPercentage: number;
  isProfileComplete: boolean;
  completedSections: string[];
  missingSections: string[];
  personalizationSummary: PersonalizationSummary;
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  updateHealthProfile: (health: Partial<UserHealthProfile>) => Promise<void>;
  updateExposureProfile: (exposure: Partial<UserExposureProfile>) => Promise<void>;
  updatePreparedness: (prep: Partial<UserEmergencyPreparedness>) => Promise<void>;
  resetToDefaultProfile: () => void;
}

const DEFAULT_HEALTH: UserHealthProfile = {
  conditions: [],
  isPregnant: false,
  isOlderAdult: false,
  isChild: false,
  isOutdoorWorker: false,
  hasHeatIllnessHistory: false,
  takesMedication: false,
  smoking: false,
  notes: '',
};

const DEFAULT_EXPOSURE: UserExposureProfile = {
  dailyOutdoorTime: 'mixed',
  activityLevel: 'moderate',
  typicalPeakExposure: 'afternoon',
  coolingAccess: 'limited',
  clothingType: 'standard',
  isAcclimatized: true,
  hydrationHabit: 'moderate',
};

const DEFAULT_PREPAREDNESS: UserEmergencyPreparedness = {
  hasDrinkingWaterAccess: true,
  hasCoolingAccess: false,
  hasShadeAccess: true,
  knowsCoolingCenter: false,
};

const DEFAULT_PREFERENCES: UserPreferences = {
  preferredLanguage: 'English',
  autoSyncLocation: true,
  emailAlerts: true,
};

// Generates role-specific contextual profiles for demo personas and default citizens
const getInitialProfile = (user: any): UserProfile => {
  const role = (user?.role || 'user').toLowerCase();
  const email = user?.email || 'guest@thermoshield.org';
  const name = user?.name || 'ThermoShield Resident';

  if (role === 'official') {
    return {
      email,
      fullName: name,
      phoneNumber: user?.phone_number || '+91 98112 23344',
      age: 48,
      gender: 'Male',
      role: 'official',
      city: 'Jaipur',
      state: 'Rajasthan',
      district: 'Jaipur Urban',
      organization: 'Ministry of Health & Family Welfare',
      jurisdiction: 'Jaipur Metropolitan Division',
      department: 'Public Health Emergency & Heatwave Response Wing',
      health: { ...DEFAULT_HEALTH, conditions: ['hypertension'] },
      exposure: { ...DEFAULT_EXPOSURE, dailyOutdoorTime: 'mostly_indoors', coolingAccess: 'reliable' },
      preparedness: { ...DEFAULT_PREPAREDNESS, hasCoolingAccess: true, knowsCoolingCenter: true },
      preferences: { ...DEFAULT_PREFERENCES, preferredLanguage: 'English' },
    };
  }

  if (role === 'responder') {
    return {
      email,
      fullName: name,
      phoneNumber: user?.phone_number || '+91 98223 34455',
      age: 38,
      gender: 'Male',
      role: 'responder',
      city: 'Jaipur',
      state: 'Rajasthan',
      district: 'Zone 4 Emergency Corridor',
      organization: 'National Disaster Response Force (NDRF)',
      jurisdiction: 'North-Western Command',
      department: 'Rapid Heat Respite & Mobile Cooling Shelter Unit',
      health: { ...DEFAULT_HEALTH, isOutdoorWorker: true },
      exposure: { ...DEFAULT_EXPOSURE, dailyOutdoorTime: 'mostly_outdoors', activityLevel: 'heavy', clothingType: 'heavy_protective' },
      preparedness: { ...DEFAULT_PREPAREDNESS, knowsCoolingCenter: true },
      preferences: { ...DEFAULT_PREFERENCES, preferredLanguage: 'Hindi / English' },
    };
  }

  if (role === 'analyst') {
    return {
      email,
      fullName: name,
      phoneNumber: user?.phone_number || '+91 98334 45566',
      age: 34,
      gender: 'Female',
      role: 'analyst',
      city: 'Delhi',
      state: 'Delhi',
      district: 'National Synoptic Node',
      organization: 'India Meteorological Department (IMD)',
      jurisdiction: 'Northern India Meteorological Grid',
      department: 'Urban Heat Island & Biometeorological Modeling Unit',
      health: { ...DEFAULT_HEALTH },
      exposure: { ...DEFAULT_EXPOSURE, dailyOutdoorTime: 'mostly_indoors', coolingAccess: 'reliable' },
      preparedness: { ...DEFAULT_PREPAREDNESS, hasCoolingAccess: true },
      preferences: { ...DEFAULT_PREFERENCES, preferredLanguage: 'English' },
    };
  }

  // Citizen default (e.g. Siddharth Patel or newly registered citizen)
  const isDemoCitizen = email.includes('siddharth') || email.includes('citizen') || user?.id === 104;
  return {
    email,
    fullName: name,
    phoneNumber: user?.phone_number || '',
    age: isDemoCitizen ? 42 : null,
    gender: isDemoCitizen ? 'Male' : '',
    role: 'user',
    city: 'Jaipur',
    state: 'Rajasthan',
    district: 'Civil Lines',
    organization: '',
    jurisdiction: '',
    department: '',
    health: isDemoCitizen
      ? {
          ...DEFAULT_HEALTH,
          conditions: ['hypertension'],
          isOutdoorWorker: true,
          hasHeatIllnessHistory: false,
        }
      : { ...DEFAULT_HEALTH },
    exposure: isDemoCitizen
      ? {
          ...DEFAULT_EXPOSURE,
          dailyOutdoorTime: 'mixed',
          activityLevel: 'moderate',
          typicalPeakExposure: 'afternoon',
          coolingAccess: 'limited',
          clothingType: 'standard',
        }
      : { ...DEFAULT_EXPOSURE },
    preparedness: { ...DEFAULT_PREPAREDNESS },
    preferences: { ...DEFAULT_PREFERENCES },
  };
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Storage key is scoped per user/email/role to avoid cross-pollution between demo and real users
  const storageKey = useMemo(() => {
    if (!user) return 'thermoshield_profile_guest';
    const identifier = user.email || user.id || user.role || 'guest';
    return `thermoshield_profile_${identifier}`;
  }, [user]);

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved profile from localStorage', e);
    }
    return getInitialProfile(user);
  });

  // Reload/switch profile when active user/session changes
  useEffect(() => {
    setIsLoading(true);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setProfile(JSON.parse(saved));
      } else {
        const initial = getInitialProfile(user);
        setProfile(initial);
        localStorage.setItem(storageKey, JSON.stringify(initial));
      }
    } catch (e) {
      console.warn('Failed to load profile for user:', e);
      setProfile(getInitialProfile(user));
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, user]);

  // Save profile helper
  const persistProfile = useCallback(
    async (updatedProfile: UserProfile) => {
      setIsSaving(true);
      setProfile(updatedProfile);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedProfile));
      } catch (e) {
        console.warn('Failed to persist profile to localStorage', e);
      }

      // Non-blocking sync to Firebase Firestore if connected
      if (user?.email && db) {
        try {
          const userDocRef = doc(db, 'user_profiles', user.email);
          await setDoc(userDocRef, {
            ...updatedProfile,
            syncedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (fbErr) {
          // Silent catch for demo/offline modes
          console.debug('Firebase Firestore profile sync skipped or offline:', fbErr);
        }
      }
      setIsSaving(false);
    },
    [storageKey, user?.email]
  );

  const updateProfile = useCallback(
    async (changes: Partial<UserProfile>) => {
      const updated: UserProfile = {
        ...profile,
        ...changes,
        updatedAt: new Date().toISOString(),
      };
      await persistProfile(updated);
    },
    [profile, persistProfile]
  );

  const updateHealthProfile = useCallback(
    async (healthChanges: Partial<UserHealthProfile>) => {
      const updated: UserProfile = {
        ...profile,
        health: {
          ...profile.health,
          ...healthChanges,
        },
        updatedAt: new Date().toISOString(),
      };
      await persistProfile(updated);
    },
    [profile, persistProfile]
  );

  const updateExposureProfile = useCallback(
    async (exposureChanges: Partial<UserExposureProfile>) => {
      const updated: UserProfile = {
        ...profile,
        exposure: {
          ...profile.exposure,
          ...exposureChanges,
        },
        updatedAt: new Date().toISOString(),
      };
      await persistProfile(updated);
    },
    [profile, persistProfile]
  );

  const updatePreparedness = useCallback(
    async (prepChanges: Partial<UserEmergencyPreparedness>) => {
      const updated: UserProfile = {
        ...profile,
        preparedness: {
          ...profile.preparedness,
          ...prepChanges,
        },
        updatedAt: new Date().toISOString(),
      };
      await persistProfile(updated);
    },
    [profile, persistProfile]
  );

  const resetToDefaultProfile = useCallback(() => {
    const initial = getInitialProfile(user);
    persistProfile(initial);
  }, [user, persistProfile]);

  // Compute profile completeness percentage and missing items
  const { completionPercentage, isProfileComplete, completedSections, missingSections } = useMemo(() => {
    const completed: string[] = [];
    const missing: string[] = [];
    let score = 0;

    // 1. Basic Information (Name & Age) - 30%
    if (profile.fullName && profile.fullName.trim() && profile.age !== null && profile.age > 0) {
      score += 30;
      completed.push('Basic Information (Name & Age)');
    } else {
      missing.push('Age and basic details');
    }

    // 2. Primary Location (City & State) - 25%
    if (profile.city && profile.city.trim() && profile.state && profile.state.trim()) {
      score += 25;
      completed.push('Primary Location');
    } else {
      missing.push('Primary City & State');
    }

    // For professional roles, organization / jurisdiction counts for remaining 45%
    const isProfessional = profile.role && profile.role !== 'user';
    if (isProfessional) {
      if (profile.organization && profile.organization.trim()) {
        score += 25;
        completed.push('Professional Organization');
      } else {
        missing.push('Organization context');
      }
      if (profile.jurisdiction && profile.jurisdiction.trim()) {
        score += 20;
        completed.push('Assigned Jurisdiction');
      } else {
        missing.push('Assigned jurisdiction');
      }
    } else {
      // 3. Health & Sensitivity Profile - 25%
      // Acknowledging health conditions (even "none") or flags
      const hasHealthDefined = profile.health && (
        profile.health.conditions.length > 0 ||
        profile.health.isOlderAdult ||
        profile.health.isChild ||
        profile.health.isOutdoorWorker ||
        profile.health.notes !== undefined
      );
      if (hasHealthDefined) {
        score += 25;
        completed.push('Health & Heat Sensitivity');
      } else {
        missing.push('Health considerations');
      }

      // 4. Daily Exposure Profile - 20%
      if (profile.exposure && profile.exposure.dailyOutdoorTime && profile.exposure.coolingAccess) {
        score += 20;
        completed.push('Daily Heat Exposure & Cooling Access');
      } else {
        missing.push('Typical outdoor exposure and cooling');
      }
    }

    return {
      completionPercentage: Math.min(100, score),
      isProfileComplete: score >= 75,
      completedSections: completed,
      missingSections: missing,
    };
  }, [profile]);

  // Compute personalization transparency summary
  const personalizationSummary = useMemo<PersonalizationSummary>(() => {
    const isCitizen = !profile.role || profile.role === 'user';
    const activeFactors: string[] = [];

    if (profile.age !== null && profile.age > 0) {
      activeFactors.push(`Age: ${profile.age} years`);
    }

    if (profile.city) {
      activeFactors.push(`Location: ${profile.city}, ${profile.state}`);
    }

    if (isCitizen) {
      if (profile.health.conditions.length > 0) {
        const condLabels: Record<string, string> = {
          heart_disease: 'Heart condition',
          asthma: 'Breathing / respiratory',
          diabetes: 'Diabetes',
          kidney_disease: 'Kidney vulnerability',
          hypertension: 'High blood pressure',
          mobility: 'Mobility limitation',
        };
        const named = profile.health.conditions.map((c) => condLabels[c] || c).join(', ');
        activeFactors.push(`Health: ${named}`);
      }

      if (profile.health.isPregnant) activeFactors.push('Pregnancy consideration');
      if (profile.health.isOutdoorWorker) activeFactors.push('Outdoor worker vulnerability');
      if (profile.health.smoking) activeFactors.push('Tobacco / smoking');
      if (!profile.exposure.isAcclimatized) activeFactors.push('Unacclimatized to heat');

      if (profile.exposure.activityLevel) {
        activeFactors.push(`Daily activity: ${profile.exposure.activityLevel}`);
      }
      if (profile.exposure.coolingAccess) {
        activeFactors.push(`Cooling access: ${profile.exposure.coolingAccess.replace('_', ' ')}`);
      }
    } else {
      if (profile.organization) activeFactors.push(`Agency: ${profile.organization}`);
      if (profile.jurisdiction) activeFactors.push(`Jurisdiction: ${profile.jurisdiction}`);
    }

    let status: 'full' | 'partial' | 'general_estimate' = 'general_estimate';
    let explanation = 'Using a general estimate because your personal profile is not yet completed.';

    if (completionPercentage >= 75) {
      status = 'full';
      explanation = isCitizen
        ? 'Your personalized heat risk is customized using your age, health factors, daily outdoor routine, and live weather conditions.'
        : 'Your dashboard is configured for your designated civic department and monitoring jurisdiction.';
    } else if (completionPercentage >= 40) {
      status = 'partial';
      explanation = 'Personalized using your basic details and location. Complete your health profile for maximum precision.';
    }

    return {
      status,
      activeFactors,
      explanation,
      isCitizen,
    };
  }, [profile, completionPercentage]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoading,
        isSaving,
        completionPercentage,
        isProfileComplete,
        completedSections,
        missingSections,
        personalizationSummary,
        updateProfile,
        updateHealthProfile,
        updateExposureProfile,
        updatePreparedness,
        resetToDefaultProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
