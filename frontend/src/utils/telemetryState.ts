/**
 * ThermoShield Telemetry State & Provenance Derivation Engine
 * Canonical single source of truth for weather data availability and risk truthfulness.
 * Prevents missing or failed telemetry from collapsing into false "LOW RISK / Live Telemetry".
 */

import { WeatherCondition, ThermalResponse } from '../types';
import { DataRealityTier } from '../types/provenance';

export type TelemetryState =
  | 'LOADING'
  | 'LIVE'
  | 'CACHED'
  | 'STALE_CACHED'
  | 'OFFLINE_FALLBACK'
  | 'UNAVAILABLE';

export interface TelemetryStateInfo {
  state: TelemetryState;
  tier: DataRealityTier;
  label: string;
  badgeLabel: string;
  isAvailable: boolean;
  isLive: boolean;
  isCached: boolean;
  isFallback: boolean;
  isStale: boolean;
  sourceName: string;
  cacheAgeSeconds?: number;
  timestamp?: string;
  statusMessage: string;
}

export interface DeriveTelemetryStateInput {
  isLoading?: boolean;
  error?: string | null;
  weather?: WeatherCondition | null;
  thermalData?: ThermalResponse | null;
}

/**
 * Derives canonical telemetry availability status from incoming state and payload metadata.
 */
export function deriveTelemetryState(input: DeriveTelemetryStateInput): TelemetryStateInfo {
  const { isLoading, error, weather, thermalData } = input;
  const effectiveWeather = thermalData?.weather || weather;

  // 1. Loading State (when no prior data is available)
  if (isLoading && !effectiveWeather) {
    return {
      state: 'LOADING',
      tier: 'LIVE',
      label: 'Loading Telemetry...',
      badgeLabel: 'Loading...',
      isAvailable: false,
      isLive: false,
      isCached: false,
      isFallback: false,
      isStale: false,
      sourceName: 'Telemetry Engine',
      statusMessage: 'Connecting to meteorological sensors and telemetry feeds.',
    };
  }

  // 2. Explicit Error or Missing Meteorological Data
  const hasValidTemperature =
    effectiveWeather?.temperature !== undefined &&
    effectiveWeather?.temperature !== null &&
    !isNaN(effectiveWeather.temperature);

  if (!effectiveWeather || !hasValidTemperature || (error && !thermalData)) {
    return {
      state: 'UNAVAILABLE',
      tier: 'UNAVAILABLE',
      label: 'Unavailable',
      badgeLabel: 'Unavailable',
      isAvailable: false,
      isLive: false,
      isCached: false,
      isFallback: false,
      isStale: false,
      sourceName: 'Unavailable',
      statusMessage:
        'Current weather data is unavailable, so ThermoShield cannot calculate your current heat risk right now.',
    };
  }

  // 3. Inspect Provenance from Backend
  const rawStatus = (effectiveWeather.source_status || '').toUpperCase();
  const rawSourceName = effectiveWeather.source_name || thermalData?.weather?.source_name || '';
  const isFallbackFlag = Boolean(
    effectiveWeather.is_fallback ||
    (thermalData as any)?.is_fallback ||
    rawStatus === 'OFFLINE_FALLBACK' ||
    rawSourceName.toLowerCase().includes('fallback') ||
    rawSourceName.toLowerCase().includes('regional baseline')
  );

  // A. Stale Cached Data
  if (rawStatus === 'STALE_CACHED' || rawSourceName.toLowerCase().includes('stale')) {
    const age = effectiveWeather.cache_age_seconds;
    return {
      state: 'STALE_CACHED',
      tier: 'STALE_CACHED',
      label: 'Stale Cached Data',
      badgeLabel: age ? `Stale Cached (${Math.round(age)}s)` : 'Stale Cached Data',
      isAvailable: true,
      isLive: false,
      isCached: true,
      isFallback: true,
      isStale: true,
      sourceName: rawSourceName || 'Cached Observation',
      cacheAgeSeconds: age,
      timestamp: effectiveWeather.time,
      statusMessage: 'Preserved recent observation displayed during live telemetry delay.',
    };
  }

  // B. Fresh Cached Data
  if (rawStatus === 'CACHED' || rawSourceName.toLowerCase().includes('cached')) {
    const age = effectiveWeather.cache_age_seconds;
    return {
      state: 'CACHED',
      tier: 'CACHED',
      label: 'Cached Data',
      badgeLabel: age ? `Cached Data (${Math.round(age)}s)` : 'Cached Data',
      isAvailable: true,
      isLive: false,
      isCached: true,
      isFallback: false,
      isStale: false,
      sourceName: rawSourceName || 'Cached Observation',
      cacheAgeSeconds: age,
      timestamp: effectiveWeather.time,
      statusMessage: 'Recent validated observation retrieved from local telemetry cache.',
    };
  }

  // C. Offline Fallback
  if (isFallbackFlag) {
    return {
      state: 'OFFLINE_FALLBACK',
      tier: 'OFFLINE_FALLBACK',
      label: 'Offline Fallback',
      badgeLabel: 'Offline Fallback',
      isAvailable: true,
      isLive: false,
      isCached: false,
      isFallback: true,
      isStale: false,
      sourceName: rawSourceName || 'Regional Baseline Dataset',
      timestamp: effectiveWeather.time,
      statusMessage: 'Estimated from offline regional baseline dataset (live telemetry unreachable).',
    };
  }

  // D. Explicit Unavailable Status from API
  if (rawStatus === 'UNAVAILABLE') {
    return {
      state: 'UNAVAILABLE',
      tier: 'UNAVAILABLE',
      label: 'Unavailable',
      badgeLabel: 'Unavailable',
      isAvailable: false,
      isLive: false,
      isCached: false,
      isFallback: false,
      isStale: false,
      sourceName: 'Unavailable',
      statusMessage:
        'Current weather data is unavailable, so ThermoShield cannot calculate your current heat risk right now.',
    };
  }

  // E. Live Data
  return {
    state: 'LIVE',
    tier: 'LIVE',
    label: 'Live Data',
    badgeLabel: 'Live Data',
    isAvailable: true,
    isLive: true,
    isCached: false,
    isFallback: false,
    isStale: false,
    sourceName: rawSourceName || 'Open-Meteo Global API',
    timestamp: effectiveWeather.time,
    statusMessage: 'Real-time observation ingested from live meteorological telemetry.',
  };
}
