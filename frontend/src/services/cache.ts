import { ThermalResponse, RiskResponse, ForecastResponse, MapLocationRisk } from '../types';

export interface CachedLocationData {
  timestamp: number;
  thermal?: ThermalResponse | null;
  risk?: RiskResponse | null;
  forecast?: ForecastResponse | null;
  mapLocations?: MapLocationRisk[];
}

const memoryCache = new Map<string, CachedLocationData>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache validity

export const getCacheKey = (lat: number, lon: number): string => {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
};

export const getCachedData = (lat: number, lon: number): CachedLocationData | null => {
  const key = getCacheKey(lat, lon);
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return entry;
};

export const setCachedData = (
  lat: number,
  lon: number,
  data: Partial<Omit<CachedLocationData, 'timestamp'>>
): void => {
  const key = getCacheKey(lat, lon);
  const existing = memoryCache.get(key) || { timestamp: Date.now() };
  memoryCache.set(key, {
    ...existing,
    ...data,
    timestamp: Date.now(),
  });
};

export const clearCache = (): void => {
  memoryCache.clear();
};
