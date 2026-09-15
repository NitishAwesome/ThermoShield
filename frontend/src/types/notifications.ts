import { RiskLevel, UserProfile, NotificationMode, NotificationPreferences, DailyForecast } from './index';

export type NotificationEventType =
  | 'PERSONAL_RISK_ESCALATION'
  | 'SUDDEN_CONDITION_WORSENING'
  | 'SMART_HYDRATION_REMINDER'
  | 'REST_ACTIVITY_REMINDER'
  | 'SAFER_OUTDOOR_WINDOW'
  | 'FAMILY_VULNERABLE_REMINDER'
  | 'SEVERE_HEAT_CHECK_IN';

export type NotificationSeverity = 'info' | 'advisory' | 'warning' | 'critical';

export interface EvaluatedNotificationEvent {
  id: string;
  type: NotificationEventType;
  severity: NotificationSeverity;
  titleKey: string;
  titleFallback: string;
  messageKey: string;
  messageFallback: string;
  messageParams?: Record<string, string | number>;
  timestamp: number;
  iconName: 'Flame' | 'AlertTriangle' | 'Droplets' | 'Clock' | 'Sun' | 'ShieldCheck' | 'Users' | 'MapPin';
  category: 'heatSafety' | 'personalReminders' | 'preferredConditions' | 'locationContext' | 'familyVulnerable';
  metricHighlight?: {
    label: string;
    value: string;
  };
  recommendedActionKey?: string;
  recommendedActionFallback?: string;
  isEmergencyAlert?: boolean; // Critical life-safety: not suppressed in QUIET mode
}

export type SuppressionReason =
  | 'MODE_ESSENTIAL_RESTRICTION'
  | 'MODE_QUIET_RESTRICTION'
  | 'CATEGORY_TOGGLE_DISABLED'
  | 'COOLDOWN_ACTIVE'
  | 'UNCHANGED_RISK_STATE'
  | 'CONDITIONS_BELOW_THRESHOLD';

export interface SuppressedNotificationEvent {
  id: string;
  type: NotificationEventType;
  reason: SuppressionReason;
  reasonExplanationKey: string;
  reasonExplanationFallback: string;
  cooldownRemainingMinutes?: number;
  evaluatedAt: number;
}

export interface NotificationDecisionInput {
  currentTemp?: number;
  apparentTemp?: number;
  humidity?: number;
  wbgt?: number;
  uvIndex?: number;
  heatIndex?: number;
  currentRiskLevel?: RiskLevel;
  currentRiskScore?: number;
  forecastMaxTempTomorrow?: number;
  forecastApparentTempMaxTomorrow?: number;
  forecast?: DailyForecast;
  userProfile?: UserProfile;
  notificationPreferences?: NotificationPreferences;
  locationName?: string;
}

export interface NotificationHistoryState {
  lastRiskLevel?: RiskLevel;
  lastRiskScore?: number;
  lastEvaluatedConditions?: {
    temp?: number;
    humidity?: number;
    wbgt?: number;
    apparentTemp?: number;
  };
  lastNotifiedAt: Partial<Record<NotificationEventType, number>>; // timestamp in ms
  acknowledgedIds: string[];
}

export interface NotificationEngineResult {
  eligibleEvents: EvaluatedNotificationEvent[];
  suppressedEvents: SuppressedNotificationEvent[];
  activeMode: NotificationMode;
  evaluatedAt: number;
}
