import { NotificationPreferences, NotificationMode } from '../types';

export const ESSENTIAL_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  mode: 'essential',
  heatSafety: {
    criticalRiskChanges: true,
    extremeWarnings: true,
    suddenWorsening: true,
    personalRiskChanges: true,
  },
  personalReminders: {
    smartHydration: false,
    restBreaks: false,
    outdoorExposure: false,
    safetyActions: false,
  },
  preferredConditions: {
    saferConditionsWindow: false,
    sunlightDecrease: false,
    temperatureThreshold: false,
    rainConditions: false,
    shadeFriendlyHours: false,
  },
  locationContext: {
    autoLocationMonitoring: false,
    useCurrentLocationForAlerts: true,
    severeHeatCheckIn: false,
  },
  familyProtection: {
    vulnerableFamilyReminders: false,
    selectedProfilesAlerts: false,
    severeHeatFamilyCheck: true,
  },
};

export const SMART_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  mode: 'smart',
  heatSafety: {
    criticalRiskChanges: true,
    extremeWarnings: true,
    suddenWorsening: true,
    personalRiskChanges: true,
  },
  personalReminders: {
    smartHydration: true,
    restBreaks: true,
    outdoorExposure: true,
    safetyActions: true,
  },
  preferredConditions: {
    saferConditionsWindow: true,
    sunlightDecrease: true,
    temperatureThreshold: false,
    rainConditions: true,
    shadeFriendlyHours: false,
  },
  locationContext: {
    autoLocationMonitoring: true,
    useCurrentLocationForAlerts: true,
    severeHeatCheckIn: true,
  },
  familyProtection: {
    vulnerableFamilyReminders: true,
    selectedProfilesAlerts: true,
    severeHeatFamilyCheck: true,
  },
};

export const QUIET_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  mode: 'quiet',
  heatSafety: {
    // Critical life-safety warnings remain active and distinguishable even in Quiet mode
    criticalRiskChanges: true,
    extremeWarnings: true,
    suddenWorsening: false,
    personalRiskChanges: false,
  },
  personalReminders: {
    smartHydration: false,
    restBreaks: false,
    outdoorExposure: false,
    safetyActions: false,
  },
  preferredConditions: {
    saferConditionsWindow: false,
    sunlightDecrease: false,
    temperatureThreshold: false,
    rainConditions: false,
    shadeFriendlyHours: false,
  },
  locationContext: {
    autoLocationMonitoring: false,
    useCurrentLocationForAlerts: true,
    severeHeatCheckIn: false,
  },
  familyProtection: {
    vulnerableFamilyReminders: false,
    selectedProfilesAlerts: false,
    severeHeatFamilyCheck: false,
  },
};

export const PERSONALIZED_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  ...SMART_NOTIFICATION_PREFERENCES,
  mode: 'personalized',
};

/**
 * Returns default notification preferences adapted by role and mode
 */
export const getDefaultNotificationPreferences = (
  mode: NotificationMode = 'smart',
  role: string = 'user'
): NotificationPreferences => {
  const normalizedRole = (role || 'user').toLowerCase();

  let base: NotificationPreferences;
  switch (mode) {
    case 'essential':
      base = { ...ESSENTIAL_NOTIFICATION_PREFERENCES };
      break;
    case 'quiet':
      base = { ...QUIET_NOTIFICATION_PREFERENCES };
      break;
    case 'personalized':
      base = { ...PERSONALIZED_NOTIFICATION_PREFERENCES };
      break;
    case 'smart':
    default:
      base = { ...SMART_NOTIFICATION_PREFERENCES };
      break;
  }

  // Role adaptations
  if (normalizedRole === 'responder') {
    return {
      ...base,
      heatSafety: {
        ...base.heatSafety,
        criticalRiskChanges: true,
        extremeWarnings: true,
        suddenWorsening: true,
      },
      personalReminders: {
        ...base.personalReminders,
        smartHydration: true,
        restBreaks: true,
      },
      locationContext: {
        ...base.locationContext,
        autoLocationMonitoring: true,
        useCurrentLocationForAlerts: true,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  if (normalizedRole === 'official') {
    return {
      ...base,
      heatSafety: {
        ...base.heatSafety,
        criticalRiskChanges: true,
        extremeWarnings: true,
        suddenWorsening: true,
      },
      locationContext: {
        ...base.locationContext,
        useCurrentLocationForAlerts: true,
      },
      familyProtection: {
        ...base.familyProtection,
        severeHeatFamilyCheck: true,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...base,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Applies a mode change while preserving customized values when switching to 'personalized'
 */
export const applyModeToPreferences = (
  current: NotificationPreferences,
  newMode: NotificationMode,
  role: string = 'user'
): NotificationPreferences => {
  if (newMode === 'personalized') {
    return {
      ...current,
      mode: 'personalized',
      updatedAt: new Date().toISOString(),
    };
  }

  const preset = getDefaultNotificationPreferences(newMode, role);
  return {
    ...preset,
    mode: newMode,
    updatedAt: new Date().toISOString(),
  };
};
