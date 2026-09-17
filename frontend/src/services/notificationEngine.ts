import {
  NotificationEventType,
  NotificationSeverity,
  EvaluatedNotificationEvent,
  SuppressedNotificationEvent,
  NotificationDecisionInput,
  NotificationHistoryState,
  NotificationEngineResult,
  RiskLevel,
  NotificationMode,
} from '../types';
import { getDefaultNotificationPreferences } from '../utils/notifications';
import { evaluateSaferOutdoorWindow } from './outdoorWindowEngine';

export const DEFAULT_COOLDOWNS_MS: Record<NotificationEventType, number> = {
  PERSONAL_RISK_ESCALATION: 120 * 60 * 1000, // 2 hours if same level; instant if level changes
  SUDDEN_CONDITION_WORSENING: 60 * 60 * 1000, // 60 minutes
  SMART_HYDRATION_REMINDER: 45 * 60 * 1000,   // 45 minutes
  REST_ACTIVITY_REMINDER: 60 * 60 * 1000,     // 60 minutes
  SAFER_OUTDOOR_WINDOW: 180 * 60 * 1000,      // 3 hours
  FAMILY_VULNERABLE_REMINDER: 180 * 60 * 1000,// 3 hours
  SEVERE_HEAT_CHECK_IN: 240 * 60 * 1000,      // 4 hours
};

interface CandidateEvent {
  event: EvaluatedNotificationEvent;
  isEmergencyAlert: boolean;
  requiresStateChangeOnly?: boolean;
}

/**
 * Pure evaluation function for the ThermoShield Notification Decision Engine.
 * Evaluates current thermal metrics, personal profile, preferences, and cooldown state
 * to surface only non-spammy, high-value heat-health safety events.
 */
export function evaluateNotificationDecisions(
  input: NotificationDecisionInput,
  history: NotificationHistoryState,
  currentTimeMs: number = Date.now()
): NotificationEngineResult {
  const profile = input.userProfile;
  const preferences =
    input.notificationPreferences ||
    profile?.notificationPreferences ||
    getDefaultNotificationPreferences('smart', profile?.role);

  const activeMode: NotificationMode = preferences.mode || 'smart';

  const eligibleEvents: EvaluatedNotificationEvent[] = [];
  const suppressedEvents: SuppressedNotificationEvent[] = [];

  // Generate candidate events from physical and profile data
  const candidates: CandidateEvent[] = [];

  // 1. Evaluate Personal Risk Escalation
  const riskCandidate = evaluateRiskEscalation(input, history, currentTimeMs);
  if (riskCandidate) {
    candidates.push(riskCandidate);
  }

  // 2. Evaluate Sudden Condition Worsening
  const worseningCandidate = evaluateConditionWorsening(input, history, currentTimeMs);
  if (worseningCandidate) {
    candidates.push(worseningCandidate);
  }

  // 3. Evaluate Smart Hydration Prompts
  const hydrationCandidate = evaluateSmartHydration(input, history, currentTimeMs);
  if (hydrationCandidate) {
    candidates.push(hydrationCandidate);
  }

  // 4. Evaluate Rest / Activity Guidance (ISO 7243)
  const restCandidate = evaluateRestActivity(input, history, currentTimeMs);
  if (restCandidate) {
    candidates.push(restCandidate);
  }

  // 5. Evaluate Safer Outdoor Window (framework / initial trigger)
  const saferCandidate = evaluateSaferWindow(input, history, currentTimeMs);
  if (saferCandidate) {
    candidates.push(saferCandidate);
  }

  // 6. Evaluate Vulnerable Family Protection Reminder
  const familyCandidate = evaluateFamilyVulnerable(input, history, currentTimeMs);
  if (familyCandidate) {
    candidates.push(familyCandidate);
  }

  // 7. Evaluate Severe Heat Safety Check-In
  const checkInCandidate = evaluateSevereCheckIn(input, history, currentTimeMs);
  if (checkInCandidate) {
    candidates.push(checkInCandidate);
  }

  // Filter candidates through:
  // A. Mode restrictions
  // B. User category toggles (if personalized)
  // C. Anti-spam / Cooldown rules
  // D. Dismissed / Acknowledged status
  for (const candidate of candidates) {
    const { event, isEmergencyAlert } = candidate;

    // Check if user already acknowledged this specific event instance
    if (history.acknowledgedIds.includes(event.id)) {
      continue;
    }

    // Step A: Mode Filtering
    if (activeMode === 'essential') {
      // In ESSENTIAL mode: only risk escalation and critical condition worsening are allowed
      if (
        event.type !== 'PERSONAL_RISK_ESCALATION' &&
        event.type !== 'SUDDEN_CONDITION_WORSENING'
      ) {
        suppressedEvents.push({
          id: `suppressed-${event.type}-${currentTimeMs}`,
          type: event.type,
          reason: 'MODE_ESSENTIAL_RESTRICTION',
          reasonExplanationKey: 'engine.suppressedReasonMode',
          reasonExplanationFallback: 'Suppressed: Non-emergency reminders silenced in Essential mode.',
          evaluatedAt: currentTimeMs,
        });
        continue;
      }
    } else if (activeMode === 'quiet') {
      // In QUIET mode: suppress routine reminders.
      // Preserves life-critical red alerts so user safety is never compromised!
      if (!isEmergencyAlert) {
        suppressedEvents.push({
          id: `suppressed-${event.type}-${currentTimeMs}`,
          type: event.type,
          reason: 'MODE_QUIET_RESTRICTION',
          reasonExplanationKey: 'engine.suppressedReasonMode',
          reasonExplanationFallback: 'Suppressed: Non-critical reminders silenced in Quiet mode.',
          evaluatedAt: currentTimeMs,
        });
        continue;
      }
    } else if (activeMode === 'personalized') {
      // In PERSONALIZED mode: check specific category booleans
      const isEnabled = checkCategoryToggle(event.type, preferences);
      if (!isEnabled) {
        suppressedEvents.push({
          id: `suppressed-${event.type}-${currentTimeMs}`,
          type: event.type,
          reason: 'CATEGORY_TOGGLE_DISABLED',
          reasonExplanationKey: 'engine.suppressedReasonPref',
          reasonExplanationFallback: 'Suppressed: Disabled in your custom notification settings.',
          evaluatedAt: currentTimeMs,
        });
        continue;
      }
    }

    // Step B: Anti-Spam / Cooldown Check
    const cooldownMs = DEFAULT_COOLDOWNS_MS[event.type] || 60 * 60 * 1000;
    const lastNotified = history.lastNotifiedAt[event.type] || 0;
    const elapsedMs = currentTimeMs - lastNotified;

    // Special rule for Risk Escalation: If risk level changed (e.g. moderate -> high), bypass cooldown!
    const isRiskLevelTransition =
      event.type === 'PERSONAL_RISK_ESCALATION' &&
      input.currentRiskLevel &&
      history.lastRiskLevel &&
      input.currentRiskLevel !== history.lastRiskLevel;

    if (elapsedMs < cooldownMs && !isRiskLevelTransition) {
      const remainingMins = Math.max(1, Math.ceil((cooldownMs - elapsedMs) / 60000));
      suppressedEvents.push({
        id: `suppressed-cooldown-${event.type}-${currentTimeMs}`,
        type: event.type,
        reason: 'COOLDOWN_ACTIVE',
        reasonExplanationKey: 'engine.suppressedReasonCooldown',
        reasonExplanationFallback: `Suppressed: Anti-spam cooldown active (${remainingMins}m remaining).`,
        cooldownRemainingMinutes: remainingMins,
        evaluatedAt: currentTimeMs,
      });
      continue;
    }

    // Candidate passed all filters!
    eligibleEvents.push(event);
  }

  return {
    eligibleEvents,
    suppressedEvents,
    activeMode,
    evaluatedAt: currentTimeMs,
  };
}

/**
 * 1. Personal Risk Escalation
 * Detects significant escalations in physiological heat strain.
 */
function evaluateRiskEscalation(
  input: NotificationDecisionInput,
  history: NotificationHistoryState,
  now: number
): CandidateEvent | null {
  if (!input.currentRiskLevel) {
    return null;
  }
  const currentLevel: RiskLevel = input.currentRiskLevel;
  const previousLevel = history.lastRiskLevel;
  const temp = Math.round(input.currentTemp || 35);
  const wbgt = Math.round(input.wbgt || 28);

  // Trigger when level is High or Extreme, OR has stepped up from previous level
  const isHighOrExtreme = currentLevel === 'HIGH' || currentLevel === 'EXTREME' || currentLevel === 'CRITICAL';
  const isEscalation =
    previousLevel &&
    getLevelSeverity(currentLevel) > getLevelSeverity(previousLevel);

  if (!isHighOrExtreme && !isEscalation) {
    return null;
  }

  const isEmergency = currentLevel === 'EXTREME' || currentLevel === 'CRITICAL' || (currentLevel === 'HIGH' && (input.apparentTemp || 0) > 42);

  const event: EvaluatedNotificationEvent = {
    id: `event-risk-escalation-${currentLevel}-${now}`,
    type: 'PERSONAL_RISK_ESCALATION',
    severity: currentLevel === 'EXTREME' || currentLevel === 'CRITICAL' ? 'critical' : 'warning',
    titleKey: 'engine.eventRiskEscalationTitle',
    titleFallback: 'Personal Heat Risk Escalation',
    messageKey: 'engine.eventRiskEscalationMsg',
    messageFallback: `Your personal thermal risk has increased to ${currentLevel.toUpperCase()} due to ambient heat (${temp}°C) and WBGT (${wbgt}°C).`,
    messageParams: {
      from: previousLevel ? previousLevel.toUpperCase() : 'MODERATE',
      to: currentLevel.toUpperCase(),
      temp,
      wbgt,
    },
    timestamp: now,
    iconName: 'Flame',
    category: 'heatSafety',
    metricHighlight: {
      label: 'Thermal Risk',
      value: currentLevel.toUpperCase(),
    },
    recommendedActionKey: 'alerts.advHighStress',
    recommendedActionFallback: 'Reduce prolonged strenuous outdoor activity during peak sun hours.',
    isEmergencyAlert: isEmergency,
  };

  return {
    event,
    isEmergencyAlert: isEmergency,
  };
}

/**
 * 2. Sudden Condition Worsening
 * Detects rapid temperature spike, severe WBGT elevation, or high solar radiant load.
 */
function evaluateConditionWorsening(
  input: NotificationDecisionInput,
  history: NotificationHistoryState,
  now: number
): CandidateEvent | null {
  const temp = input.currentTemp || 0;
  const apparentTemp = input.apparentTemp || temp;
  const wbgt = input.wbgt || 0;
  const heatIndex = input.heatIndex || apparentTemp;
  const prevTemp = history.lastEvaluatedConditions?.temp;

  // Criteria for sudden worsening:
  // - Significant spike: >= 2.5°C jump since last check
  // - High absolute apparent temperature: >= 41°C
  // - High WBGT: >= 30.5°C
  const hasSpiked = prevTemp !== undefined && temp - prevTemp >= 2.5;
  const isDangerouslyHot = apparentTemp >= 41 || wbgt >= 30.5;

  if (!hasSpiked && !isDangerouslyHot) {
    return null;
  }

  const isEmergency = apparentTemp >= 43 || wbgt >= 31.5 || temp >= 42;

  const event: EvaluatedNotificationEvent = {
    id: `event-condition-worsening-${now}`,
    type: 'SUDDEN_CONDITION_WORSENING',
    severity: isEmergency ? 'critical' : 'warning',
    titleKey: 'engine.eventWorseningTitle',
    titleFallback: 'Sudden Environmental Heat Spike',
    messageKey: 'engine.eventWorseningMsg',
    messageFallback: `Severe thermal conditions detected: Apparent temperature reached ${Math.round(apparentTemp)}°C with a heat index of ${Math.round(heatIndex)}°C.`,
    messageParams: {
      apparent: Math.round(apparentTemp),
      heatIndex: Math.round(heatIndex),
      temp: Math.round(temp),
    },
    timestamp: now,
    iconName: 'AlertTriangle',
    category: 'heatSafety',
    metricHighlight: {
      label: 'Apparent Temp',
      value: `${Math.round(apparentTemp)}°C`,
    },
    recommendedActionKey: 'alerts.advSolarLoad',
    recommendedActionFallback: 'High solar irradiance and radiant heat; seek shaded routes immediately.',
    isEmergencyAlert: isEmergency,
  };

  return {
    event,
    isEmergencyAlert: isEmergency,
  };
}

/**
 * 3. Smart Hydration Prompts
 * Context-aware hydration reminder: considers environmental heat and activity.
 */
function evaluateSmartHydration(
  input: NotificationDecisionInput,
  history: NotificationHistoryState,
  now: number
): CandidateEvent | null {
  const temp = input.currentTemp || 0;
  const humidity = input.humidity || 50;
  const apparentTemp = input.apparentTemp || temp;
  const profile = input.userProfile;

  // Conditions that trigger hydration prompts:
  // - Apparent temp >= 34°C OR actual temp >= 33°C
  // - Elevated if outdoor worker or heavy physical labor
  const isLaborer = profile?.exposure?.activityLevel === 'heavy' || profile?.health?.isOutdoorWorker;
  const isModerateOrHigher = apparentTemp >= 34 || temp >= 33 || (isLaborer && temp >= 30);

  if (!isModerateOrHigher) {
    return null;
  }

  const event: EvaluatedNotificationEvent = {
    id: `event-smart-hydration-${now}`,
    type: 'SMART_HYDRATION_REMINDER',
    severity: apparentTemp >= 40 ? 'warning' : 'advisory',
    titleKey: 'engine.eventHydrationTitle',
    titleFallback: 'Smart Hydration Advisory',
    messageKey: 'engine.eventHydrationMsg',
    messageFallback: `Elevated thermal stress (${Math.round(temp)}°C, ${Math.round(humidity)}% humidity) increases sweat rate. Drink regular small amounts with electrolytes before feeling thirsty.`,
    messageParams: {
      temp: Math.round(temp),
      humidity: Math.round(humidity),
    },
    timestamp: now,
    iconName: 'Droplets',
    category: 'personalReminders',
    metricHighlight: {
      label: 'Fluid Advice',
      value: 'Electrolytes + Water',
    },
    recommendedActionKey: 'alerts.advHydration',
    recommendedActionFallback: 'Maintain frequent hydration; avoid waiting until thirsty.',
    isEmergencyAlert: false,
  };

  return {
    event,
    isEmergencyAlert: false,
  };
}

/**
 * 4. Rest / Activity Guidance (ISO 7243)
 * Reminds users to take shaded breaks during peak thermal load.
 */
function evaluateRestActivity(
  input: NotificationDecisionInput,
  history: NotificationHistoryState,
  now: number
): CandidateEvent | null {
  const wbgt = input.wbgt || 0;
  const temp = input.currentTemp || 0;
  const apparentTemp = input.apparentTemp || temp;
  const profile = input.userProfile;

  const currentHour = new Date(now).getHours();
  const isPeakHeatHour = currentHour >= 11 && currentHour <= 16;
  const isOutdoorOrActive =
    profile?.exposure?.dailyOutdoorTime !== 'mostly_indoors' ||
    profile?.exposure?.activityLevel === 'moderate' ||
    profile?.exposure?.activityLevel === 'heavy';

  // Triggers when WBGT >= 28.5°C or (apparentTemp >= 38°C and peak hours)
  const requiresRestPacing = wbgt >= 28.5 || (apparentTemp >= 38 && isPeakHeatHour);

  if (!requiresRestPacing && !isOutdoorOrActive) {
    return null;
  }

  const event: EvaluatedNotificationEvent = {
    id: `event-rest-activity-${now}`,
    type: 'REST_ACTIVITY_REMINDER',
    severity: 'warning',
    titleKey: 'engine.eventRestTitle',
    titleFallback: 'Work-Rest Cycle Alert (ISO 7243)',
    messageKey: 'engine.eventRestMsg',
    messageFallback: 'Current heat strain requires shaded recovery breaks. Recommended pacing: 45 min active work followed by 15 min shaded rest.',
    timestamp: now,
    iconName: 'Clock',
    category: 'personalReminders',
    metricHighlight: {
      label: 'Recommended Cycle',
      value: '45m Work / 15m Shade',
    },
    recommendedActionKey: 'alerts.advRestShade',
    recommendedActionFallback: 'Utilize shaded or well-ventilated cooling areas during recovery breaks.',
    isEmergencyAlert: false,
  };

  return {
    event,
    isEmergencyAlert: false,
  };
}

/**
 * 5. Safer Conditions Beginning (Framework / Initial Event)
 * Detects when cooler morning or evening temperatures begin.
 */
function evaluateSaferWindow(
  input: NotificationDecisionInput,
  history: NotificationHistoryState,
  now: number
): CandidateEvent | null {
  const windowResult = evaluateSaferOutdoorWindow(
    input.forecast,
    {
      temperature: input.currentTemp || 32,
      humidity: input.humidity || 60,
      apparent_temperature: input.apparentTemp,
      uv_index: input.uvIndex,
      wind_speed: 1.5,
      solar_radiation: 0,
      time: new Date(now).toISOString(),
    },
    input.userProfile,
    input.currentRiskLevel
  );

  // Trigger when a safer window is active now or upcoming
  if (!windowResult.hasWindow) {
    return null;
  }

  const temp = Math.round(windowResult.windowAvgTempC);
  const relief = Math.round(windowResult.apparentTempReliefDeg * 10) / 10;
  const isNow = windowResult.status === 'ACTIVE_NOW';

  const event: EvaluatedNotificationEvent = {
    id: `event-safer-window-${now}`,
    type: 'SAFER_OUTDOOR_WINDOW',
    severity: 'info',
    titleKey: isNow ? 'engine.eventSaferWindowActiveTitle' : 'engine.eventSaferWindowTitle',
    titleFallback: isNow ? 'Safer Outdoor Window Active Now' : 'Safer Thermal Window Detected',
    messageKey: isNow ? 'engine.eventSaferWindowActiveMsg' : 'engine.eventSaferWindowMsg',
    messageFallback: isNow
      ? `Relatively safer outdoor conditions are active now (${windowResult.windowLabel}). Apparent heat is ~${relief}°C lower than the daytime peak.`
      : `Optimal upcoming outdoor window detected: ${windowResult.windowLabel}. Conditions are expected to ease with reduced solar burden.`,
    messageParams: {
      window: windowResult.windowLabel,
      temp,
      relief,
    },
    timestamp: now,
    iconName: 'ShieldCheck',
    category: 'preferredConditions',
    metricHighlight: {
      label: isNow ? 'Active Relief' : 'Best Window',
      value: windowResult.windowLabel,
    },
    recommendedActionKey: 'outdoorWindow.ctaForecast',
    recommendedActionFallback: 'View full 5-day hourly trajectory.',
    isEmergencyAlert: false,
  };

  return {
    event,
    isEmergencyAlert: false,
  };
}

function evaluateFamilyVulnerable(
  input: NotificationDecisionInput,
  history: NotificationHistoryState,
  currentTimeMs: number
): CandidateEvent | null {
  const isCitizen = !input.userProfile?.role || input.userProfile?.role === 'user';
  if (!isCitizen) return null;

  const isSevere =
    input.currentRiskLevel === 'MODERATE' ||
    input.currentRiskLevel === 'HIGH' ||
    input.currentRiskLevel === 'EXTREME' ||
    input.currentRiskLevel === 'CRITICAL' ||
    (input.wbgt !== undefined && input.wbgt >= 28.0) ||
    (input.currentTemp !== undefined && input.currentTemp >= 32.0);

  if (!isSevere) return null;

  return {
    event: {
      id: `family-vuln-${Math.floor(currentTimeMs / (180 * 60 * 1000))}`,
      type: 'FAMILY_VULNERABLE_REMINDER',
      severity: input.currentRiskLevel === 'EXTREME' || input.currentRiskLevel === 'CRITICAL' ? 'warning' : 'advisory',
      titleKey: 'engine.eventFamilyVulnerableTitle',
      titleFallback: 'Check on Vulnerable Family Members',
      messageKey: 'engine.eventFamilyVulnerableMsg',
      messageFallback:
        'Severe heat conditions are active. Consider checking on elderly relatives, children, or outdoor workers to ensure hydration and indoor cooling.',
      timestamp: currentTimeMs,
      iconName: 'Users',
      category: 'familyVulnerable',
      metricHighlight: {
        label: 'Active Heat Load',
        value: input.currentTemp ? `${input.currentTemp.toFixed(1)}°C` : 'Severe',
      },
      recommendedActionKey: 'engine.actionFamilyCheck',
      recommendedActionFallback:
        'Confirm access to drinking water, working fans or cooling, and shade for vulnerable household members.',
    },
    isEmergencyAlert: input.currentRiskLevel === 'EXTREME' || input.currentRiskLevel === 'CRITICAL',
  };
}

function evaluateSevereCheckIn(
  input: NotificationDecisionInput,
  history: NotificationHistoryState,
  currentTimeMs: number
): CandidateEvent | null {
  const isCitizen = !input.userProfile?.role || input.userProfile?.role === 'user';
  if (!isCitizen) return null;

  const isSevere =
    input.currentRiskLevel === 'MODERATE' ||
    input.currentRiskLevel === 'HIGH' ||
    input.currentRiskLevel === 'EXTREME' ||
    input.currentRiskLevel === 'CRITICAL' ||
    (input.wbgt !== undefined && input.wbgt >= 28.5) ||
    (input.currentTemp !== undefined && input.currentTemp >= 32.5);

  if (!isSevere) return null;

  return {
    event: {
      id: `severe-checkin-${Math.floor(currentTimeMs / (240 * 60 * 1000))}`,
      type: 'SEVERE_HEAT_CHECK_IN',
      severity: 'info',
      titleKey: 'engine.eventSevereCheckInTitle',
      titleFallback: 'Severe Heat Safety Check-In',
      messageKey: 'engine.eventSevereCheckInMsg',
      messageFallback:
        'High heat conditions are active. Check in whether you are indoors, outdoors, or travelling for tailored safety guidance.',
      timestamp: currentTimeMs,
      iconName: 'ShieldCheck',
      category: 'locationContext',
      metricHighlight: {
        label: 'Ambient Stress',
        value: input.currentTemp ? `${input.currentTemp.toFixed(1)}°C` : 'High',
      },
      recommendedActionKey: 'engine.actionCheckInNow',
      recommendedActionFallback:
        'Tap your current location context on the dashboard to adjust your shade and hydration advice.',
    },
    isEmergencyAlert: false,
  };
}

function checkCategoryToggle(
  type: NotificationEventType,
  preferences: any
): boolean {
  switch (type) {
    case 'PERSONAL_RISK_ESCALATION':
      return !!(
        preferences?.heatSafety?.personalRiskChanges ||
        preferences?.heatSafety?.criticalRiskChanges
      );
    case 'SUDDEN_CONDITION_WORSENING':
      return !!(
        preferences?.heatSafety?.suddenWorsening ||
        preferences?.heatSafety?.extremeWarnings
      );
    case 'SMART_HYDRATION_REMINDER':
      return !!preferences?.personalReminders?.smartHydration;
    case 'REST_ACTIVITY_REMINDER':
      return !!preferences?.personalReminders?.restBreaks;
    case 'SAFER_OUTDOOR_WINDOW':
      return !!(
        preferences?.preferredConditions?.saferConditionsWindow ||
        preferences?.preferredConditions?.saferWindow
      );
    case 'FAMILY_VULNERABLE_REMINDER':
      return !!(
        preferences?.familyProtection?.vulnerableFamilyReminders ||
        preferences?.familyProtection?.severeHeatFamilyCheck
      );
    case 'SEVERE_HEAT_CHECK_IN':
      return !!preferences?.locationContext?.severeHeatCheckIn;
    default:
      return true;
  }
}

function getLevelSeverity(level: RiskLevel): number {
  switch (level) {
    case 'CRITICAL':
    case 'EXTREME':
      return 4;
    case 'HIGH':
      return 3;
    case 'MODERATE':
      return 2;
    case 'LOW':
      return 1;
    default:
      return 0;
  }
}
