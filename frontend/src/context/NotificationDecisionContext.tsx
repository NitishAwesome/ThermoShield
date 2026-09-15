import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  EvaluatedNotificationEvent,
  SuppressedNotificationEvent,
  NotificationDecisionInput,
  NotificationHistoryState,
  NotificationMode,
  NotificationEventType,
  RiskLevel,
  DailyForecast,
} from '../types';
import { evaluateNotificationDecisions } from '../services/notificationEngine';
import { useLocation } from './LocationContext';
import { useProfile } from './ProfileContext';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { getCachedData } from '../services/cache';
import {
  getNotificationPermission,
  requestDeviceNotificationPermission,
  sendNativeDeviceNotification,
  sendTestDeviceNotification,
  DeviceNotificationPermission,
} from '../services/browserNotification';

export type SimulationScenario = 'spike' | 'moderate' | 'normal' | null;

interface NotificationDecisionContextType {
  eligibleEvents: EvaluatedNotificationEvent[];
  suppressedEvents: SuppressedNotificationEvent[];
  activeMode: NotificationMode;
  evaluatedAt: number;
  history: NotificationHistoryState;
  simulationScenario: SimulationScenario;
  devicePermission: DeviceNotificationPermission;
  requestDevicePermission: () => Promise<DeviceNotificationPermission>;
  sendTestNotification: () => boolean;
  setSimulationScenario: (scenario: SimulationScenario) => void;
  acknowledgeEvent: (id: string, type?: NotificationEventType) => void;
  clearHistory: () => void;
  refreshEvaluation: () => void;
}

const NotificationDecisionContext = createContext<NotificationDecisionContextType | undefined>(undefined);

const STORAGE_PREFIX = 'thermoshield_notif_history_';

export const NotificationDecisionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { coords, locationName } = useLocation();
  const { profile } = useProfile();
  const { user } = useAuth();

  const storageKey = `${STORAGE_PREFIX}${user?.id || 'guest'}`;

  // Notification history state persisted in localStorage
  const [history, setHistory] = useState<NotificationHistoryState>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return {
      lastRiskLevel: undefined,
      lastRiskScore: undefined,
      lastEvaluatedConditions: undefined,
      lastNotifiedAt: {},
      acknowledgedIds: [],
    };
  });

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save notification history:', e);
    }
  }, [history, storageKey]);

  // Live thermal metrics
  const [liveMetrics, setLiveMetrics] = useState<{
    temp?: number;
    apparentTemp?: number;
    humidity?: number;
    wbgt?: number;
    uvIndex?: number;
    heatIndex?: number;
    riskLevel?: RiskLevel;
    riskScore?: number;
    forecast?: DailyForecast;
  }>({});

  // Simulation scenario for SIH interactive demonstration
  const [simulationScenario, setSimulationScenario] = useState<SimulationScenario>(null);

  // Fetch or sync weather data on location change
  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      // 1. Check cache first
      const cached = getCachedData(coords.lat, coords.lon);
      if (cached?.thermal) {
        const t = cached.thermal;
        setLiveMetrics({
          temp: t.weather.temperature,
          apparentTemp: t.weather.apparent_temperature ?? t.thermal.indices.apparent_temperature_c,
          humidity: t.weather.humidity,
          wbgt: t.thermal.indices.wbgt_c,
          uvIndex: t.weather.uv_index,
          heatIndex: t.thermal.indices.heat_index_c ?? undefined,
          riskLevel: t.thermal.risk_assessment.level,
          riskScore: t.thermal.risk_assessment.score,
          forecast: t.forecast,
        });
      }

      try {
        const res = await api.getThermal(coords.lat, coords.lon);
        if (isMounted && res) {
          setLiveMetrics({
            temp: res.weather.temperature,
            apparentTemp: res.weather.apparent_temperature ?? res.thermal.indices.apparent_temperature_c,
            humidity: res.weather.humidity,
            wbgt: res.thermal.indices.wbgt_c,
            uvIndex: res.weather.uv_index,
            heatIndex: res.thermal.indices.heat_index_c ?? undefined,
            riskLevel: res.thermal.risk_assessment.level,
            riskScore: res.thermal.risk_assessment.score,
            forecast: res.forecast,
          });
        }
      } catch (err) {
        console.warn('Could not fetch thermal metrics for decision engine:', err);
      }
    };

    fetchMetrics();

    return () => {
      isMounted = false;
    };
  }, [coords.lat, coords.lon]);

  // Compute effective input combining live metrics or simulation
  const effectiveInput: NotificationDecisionInput = useMemo(() => {
    if (simulationScenario === 'spike') {
      return {
        currentTemp: 43.5,
        apparentTemp: 48.0,
        humidity: 62,
        wbgt: 33.2,
        uvIndex: 10,
        heatIndex: 51,
        currentRiskLevel: 'EXTREME',
        currentRiskScore: 92,
        userProfile: profile,
        notificationPreferences: profile.notificationPreferences,
        locationName: locationName || 'Mumbai',
      };
    }

    if (simulationScenario === 'moderate') {
      return {
        currentTemp: 35.0,
        apparentTemp: 38.5,
        humidity: 55,
        wbgt: 28.8,
        uvIndex: 7,
        heatIndex: 40,
        currentRiskLevel: 'MODERATE',
        currentRiskScore: 54,
        userProfile: profile,
        notificationPreferences: profile.notificationPreferences,
        locationName: locationName || 'Mumbai',
      };
    }

    if (simulationScenario === 'normal') {
      return {
        currentTemp: 28.5,
        apparentTemp: 29.0,
        humidity: 45,
        wbgt: 23.5,
        uvIndex: 2,
        heatIndex: 29,
        currentRiskLevel: 'LOW',
        currentRiskScore: 22,
        userProfile: profile,
        notificationPreferences: profile.notificationPreferences,
        locationName: locationName || 'Mumbai',
      };
    }

    // Default: use live metrics
    return {
      currentTemp: liveMetrics.temp ?? 34,
      apparentTemp: liveMetrics.apparentTemp ?? 37,
      humidity: liveMetrics.humidity ?? 52,
      wbgt: liveMetrics.wbgt ?? 28,
      uvIndex: liveMetrics.uvIndex ?? 6,
      heatIndex: liveMetrics.heatIndex ?? 38,
      currentRiskLevel: liveMetrics.riskLevel ?? 'MODERATE',
      currentRiskScore: liveMetrics.riskScore ?? 45,
      forecast: liveMetrics.forecast,
      userProfile: profile,
      notificationPreferences: profile.notificationPreferences,
      locationName: locationName || 'Mumbai',
    };
  }, [simulationScenario, liveMetrics, profile, locationName]);

  const [evaluationTick, setEvaluationTick] = useState<number>(Date.now());

  // Run decision evaluation
  const result = useMemo(() => {
    return evaluateNotificationDecisions(effectiveInput, history, evaluationTick);
  }, [effectiveInput, history, evaluationTick]);

  // Track risk level transitions safely without triggering re-render loops
  useEffect(() => {
    if (
      effectiveInput.currentRiskLevel &&
      history.lastRiskLevel !== effectiveInput.currentRiskLevel
    ) {
      setHistory((prev) => ({
        ...prev,
        lastRiskLevel: effectiveInput.currentRiskLevel,
        lastRiskScore: effectiveInput.currentRiskScore,
      }));
    }
  }, [effectiveInput.currentRiskLevel]);

  const acknowledgeEvent = useCallback((id: string, type?: NotificationEventType) => {
    setHistory((prev) => {
      const nextLastNotified = { ...prev.lastNotifiedAt };
      if (type) {
        nextLastNotified[type] = Date.now();
      }
      return {
        ...prev,
        lastNotifiedAt: nextLastNotified,
        acknowledgedIds: prev.acknowledgedIds.includes(id)
          ? prev.acknowledgedIds
          : [...prev.acknowledgedIds, id],
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    const fresh: NotificationHistoryState = {
      lastRiskLevel: undefined,
      lastRiskScore: undefined,
      lastEvaluatedConditions: undefined,
      lastNotifiedAt: {},
      acknowledgedIds: [],
    };
    setHistory(fresh);
    setEvaluationTick(Date.now());
  }, []);

  const refreshEvaluation = useCallback(() => {
    setEvaluationTick(Date.now());
  }, []);

  // Native device notification permission state
  const [devicePermission, setDevicePermission] = useState<DeviceNotificationPermission>(() =>
    getNotificationPermission()
  );

  // Delivered native notification tracking (ensures no duplicate popups per session)
  const deliveredNativeIdsRef = React.useRef<Set<string>>(new Set());

  // Automatically sync permission if user modifies browser settings
  useEffect(() => {
    const syncPerm = () => {
      setDevicePermission(getNotificationPermission());
    };
    window.addEventListener('focus', syncPerm);
    return () => window.removeEventListener('focus', syncPerm);
  }, []);

  // Deliver approved decision engine alerts to native browser notifications
  useEffect(() => {
    if (devicePermission !== 'granted') return;

    for (const event of result.eligibleEvents) {
      if (!deliveredNativeIdsRef.current.has(event.id)) {
        sendNativeDeviceNotification(event.titleFallback, {
          body: event.messageFallback,
          tag: event.id,
        });
        deliveredNativeIdsRef.current.add(event.id);
      }
    }
  }, [result.eligibleEvents, devicePermission]);

  const requestDevicePermission = useCallback(async () => {
    const perm = await requestDeviceNotificationPermission();
    setDevicePermission(perm);
    return perm;
  }, []);

  const sendTestNotification = useCallback(() => {
    return sendTestDeviceNotification();
  }, []);

  const value = useMemo(
    () => ({
      eligibleEvents: result.eligibleEvents,
      suppressedEvents: result.suppressedEvents,
      activeMode: result.activeMode,
      evaluatedAt: result.evaluatedAt,
      history,
      simulationScenario,
      devicePermission,
      requestDevicePermission,
      sendTestNotification,
      setSimulationScenario,
      acknowledgeEvent,
      clearHistory,
      refreshEvaluation,
    }),
    [
      result.eligibleEvents,
      result.suppressedEvents,
      result.activeMode,
      result.evaluatedAt,
      history,
      simulationScenario,
      devicePermission,
      requestDevicePermission,
      sendTestNotification,
      acknowledgeEvent,
      clearHistory,
      refreshEvaluation,
    ]
  );

  return (
    <NotificationDecisionContext.Provider value={value}>
      {children}
    </NotificationDecisionContext.Provider>
  );
};

export const useNotificationDecision = (): NotificationDecisionContextType => {
  const context = useContext(NotificationDecisionContext);
  if (!context) {
    throw new Error('useNotificationDecision must be used within a NotificationDecisionProvider');
  }
  return context;
};
