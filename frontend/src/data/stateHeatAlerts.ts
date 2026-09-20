import {
  StateHeatAlertCollection,
  StateHeatAlertProperties,
  StateHeatAlertFeature,
  NationalStateAlertsResponse,
} from '../types';
import indiaStatesData from './india_state_heat_alerts.json';
import { api } from '../services/api';

const RAW_GEOJSON = indiaStatesData as unknown as StateHeatAlertCollection;

// ─────────────────────────────────────────────────────────────
// DIURNAL INDIAN STANDARD TIME (IST) ASTRONOMICAL CALCULATOR
// ─────────────────────────────────────────────────────────────

export function getIndianStandardTime(now: Date = new Date()): { istHour: number; isDay: boolean } {
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const istMs = utcMs + (5.5 * 60 * 60 * 1000);
  const istDate = new Date(istMs);
  const hourFloat = istDate.getHours() + (istDate.getMinutes() / 60);
  const isDay = hourFloat >= 6.0 && hourFloat <= 18.5;
  return { istHour: hourFloat, isDay };
}

const HILL_STATE_CODES = new Set(['HP', 'UK', 'SK', 'AR', 'MN', 'ML', 'MZ', 'NL', 'LA', 'JK']);
const COASTAL_STATE_CODES = new Set(['MH', 'GA', 'KA', 'KL', 'TN', 'AP', 'OD', 'WB', 'AN', 'LD', 'DD', 'DN']);

export function classifyStateAlertIMD(
  stateCode: string,
  tempC: number,
  rhPercent: number,
  apparentTempC: number,
  isDay: boolean
): { alertCategory: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN'; riskLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW'; imdClassification: string } {
  const code = stateCode.toUpperCase();
  const isHill = HILL_STATE_CODES.has(code);
  const isCoastal = COASTAL_STATE_CODES.has(code);

  if (!isDay) {
    // Night Operational Protocol:
    // Heat wave warnings are daytime phenomena. At night, IMD only issues 'Warm Night' (YELLOW)
    // if night temperature remains >= 29°C with high humidity.
    if (tempC >= 29.0 && apparentTempC >= 38.0) {
      return { alertCategory: 'YELLOW', riskLevel: 'MODERATE', imdClassification: 'Warm Night Advisory' };
    } else if (tempC >= 27.5 && rhPercent >= 75.0) {
      return { alertCategory: 'YELLOW', riskLevel: 'MODERATE', imdClassification: 'Humid Night Advisory' };
    }
    return { alertCategory: 'GREEN', riskLevel: 'LOW', imdClassification: 'Normal Night Conditions' };
  }

  // Daytime Criteria (Official IMD Guidelines)
  if (isHill) {
    if (tempC >= 38.0 || (tempC >= 35.0 && apparentTempC >= 44.0)) {
      return { alertCategory: 'RED', riskLevel: 'EXTREME', imdClassification: 'Severe Heatwave in Hilly Region' };
    } else if (tempC >= 35.0 || (tempC >= 33.0 && apparentTempC >= 42.0)) {
      return { alertCategory: 'ORANGE', riskLevel: 'HIGH', imdClassification: 'Heatwave Condition in Hills' };
    } else if (tempC >= 30.0 || apparentTempC >= 38.0) {
      return { alertCategory: 'YELLOW', riskLevel: 'MODERATE', imdClassification: 'Warm Day Advisory in Hills' };
    }
    return { alertCategory: 'GREEN', riskLevel: 'LOW', imdClassification: 'Normal Mountain Conditions' };
  }

  if (isCoastal) {
    if (tempC >= 39.0 || apparentTempC >= 48.0) {
      return { alertCategory: 'RED', riskLevel: 'EXTREME', imdClassification: 'Severe Coastal Heat Stress' };
    } else if (tempC >= 37.0 || apparentTempC >= 43.0) {
      return { alertCategory: 'ORANGE', riskLevel: 'HIGH', imdClassification: 'Coastal Heatwave Condition' };
    } else if (tempC >= 34.0 || apparentTempC >= 39.0) {
      return { alertCategory: 'YELLOW', riskLevel: 'MODERATE', imdClassification: 'Humid Heat Advisory' };
    }
    return { alertCategory: 'GREEN', riskLevel: 'LOW', imdClassification: 'Normal Coastal Conditions' };
  }

  // Plains & Interior Plateau
  if (tempC >= 44.0 || (tempC >= 42.0 && apparentTempC >= 48.0)) {
    return { alertCategory: 'RED', riskLevel: 'EXTREME', imdClassification: 'Severe Heat Wave Condition' };
  } else if (tempC >= 40.0 || (tempC >= 38.0 && apparentTempC >= 44.0)) {
    return { alertCategory: 'ORANGE', riskLevel: 'HIGH', imdClassification: 'Heat Wave Condition' };
  } else if (tempC >= 35.0 || apparentTempC >= 40.0) {
    return { alertCategory: 'YELLOW', riskLevel: 'MODERATE', imdClassification: 'Hot Day Advisory' };
  }
  return { alertCategory: 'GREEN', riskLevel: 'LOW', imdClassification: 'Normal Meteorological Conditions' };
}

export function getDiurnallyAdjustedStateAlerts(now: Date = new Date()): StateHeatAlertProperties[] {
  const { istHour, isDay } = getIndianStandardTime(now);

  return RAW_GEOJSON.features.map((f) => {
    const p = { ...f.properties };
    const peakTemp = p.temperatureC || 36.0;
    const minTemp = Math.max(18.0, peakTemp - 12.0);

    let curTemp: number;
    if (istHour >= 5.0 && istHour <= 15.0) {
      const factor = Math.sin(((istHour - 5.0) / 10.0) * (Math.PI / 2.0));
      curTemp = minTemp + (peakTemp - minTemp) * factor;
    } else if (istHour > 15.0 && istHour <= 24.0) {
      const factor = Math.cos(((istHour - 15.0) / 9.0) * (Math.PI / 2.0));
      curTemp = minTemp + (peakTemp - minTemp) * factor * 0.82;
    } else {
      const factor = Math.cos(((istHour + 9.0) / 14.0) * (Math.PI / 2.0));
      curTemp = minTemp + (peakTemp - minTemp) * factor * 0.25;
    }
    curTemp = Math.round(curTemp * 10) / 10;

    const baseRh = p.humidityPercent || 60.0;
    const curRh = Math.min(95, Math.max(25, Math.round(baseRh + (peakTemp - curTemp) * 1.5)));
    const curApparent = Math.round((curTemp + (curRh / 100) * 4.2) * 10) / 10;

    const { alertCategory, riskLevel, imdClassification } = classifyStateAlertIMD(
      p.stateCode,
      curTemp,
      curRh,
      curApparent,
      isDay
    );

    let riskScore: number;
    if (alertCategory === 'RED') {
      riskScore = Math.min(99, Math.max(82, Math.round(curTemp * 1.8 + curApparent * 0.4)));
    } else if (alertCategory === 'ORANGE') {
      riskScore = Math.min(81, Math.max(65, Math.round(curTemp * 1.6 + curApparent * 0.3)));
    } else if (alertCategory === 'YELLOW') {
      riskScore = Math.min(64, Math.max(42, Math.round(curTemp * 1.3 + curApparent * 0.2)));
    } else {
      riskScore = Math.min(41, Math.max(12, Math.round(curTemp * 0.9 + (isDay ? 5 : 1))));
    }

    return {
      ...p,
      temperatureC: curTemp,
      humidityPercent: curRh,
      apparentTemperatureC: curApparent,
      alertCategory,
      riskLevel: riskLevel as any,
      imdClassification,
      riskScore,
      alertTitle: `${alertCategory} ALERT: ${imdClassification.toUpperCase()} in ${p.stateName}`,
      alertHeadline: `${isDay ? 'Current' : 'Night'} Temp reaches ${curTemp}°C with Feels-Like of ${curApparent}°C.`,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// STATE STORAGE & SUBSCRIPTION SYSTEM
// ─────────────────────────────────────────────────────────────

let currentLiveStateAlerts: StateHeatAlertProperties[] = getDiurnallyAdjustedStateAlerts();
let currentLiveGeoJson: StateHeatAlertCollection = {
  ...RAW_GEOJSON,
  features: RAW_GEOJSON.features.map((f, i) => ({
    ...f,
    properties: currentLiveStateAlerts[i] || f.properties,
  })),
};

export let ALL_STATE_HEAT_ALERTS: StateHeatAlertProperties[] = currentLiveStateAlerts;
export let INDIA_STATE_HEAT_ALERTS_GEOJSON: StateHeatAlertCollection = currentLiveGeoJson;

type StateAlertsListener = (alerts: StateHeatAlertProperties[], stats: NationalAlertStats) => void;
const listeners = new Set<StateAlertsListener>();

export function subscribeStateAlerts(listener: StateAlertsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  const stats = getNationalAlertStatistics(currentLiveStateAlerts);
  listeners.forEach((l) => {
    try {
      l(currentLiveStateAlerts, stats);
    } catch (e) {
      console.warn('State alert listener error:', e);
    }
  });
}

export function getLiveAllStateHeatAlerts(): StateHeatAlertProperties[] {
  return currentLiveStateAlerts;
}

export function getLiveStateGeoJSON(): StateHeatAlertCollection {
  return currentLiveGeoJson;
}

// ─────────────────────────────────────────────────────────────
// ASYNC LIVE TELEMETRY FETCHER
// ─────────────────────────────────────────────────────────────

let isFetchingAlerts = false;
let lastFetchTime = 0;
const FETCH_COOLDOWN_MS = 60 * 1000; // 1 minute client cooldown

export async function fetchLiveNationalStateAlerts(force = false): Promise<NationalAlertStats> {
  const now = Date.now();
  if (!force && (now - lastFetchTime < FETCH_COOLDOWN_MS || isFetchingAlerts)) {
    return getNationalAlertStatistics(currentLiveStateAlerts);
  }

  isFetchingAlerts = true;
  try {
    const res: NationalStateAlertsResponse = await api.getNationalStateAlerts();
    if (res && res.states && res.states.length === RAW_GEOJSON.features.length) {
      currentLiveStateAlerts = res.states;
      ALL_STATE_HEAT_ALERTS = currentLiveStateAlerts;

      currentLiveGeoJson = {
        type: 'FeatureCollection',
        crs: res.crs,
        features: RAW_GEOJSON.features.map((f, i) => ({
          ...f,
          properties: res.states[i] || f.properties,
        })),
      };
      INDIA_STATE_HEAT_ALERTS_GEOJSON = currentLiveGeoJson;
      lastFetchTime = now;
      notifyListeners();
    }
  } catch (err) {
    console.warn('Backend /areas/national-state-alerts fetch failed, using diurnal solar model:', err);
    currentLiveStateAlerts = getDiurnallyAdjustedStateAlerts();
    ALL_STATE_HEAT_ALERTS = currentLiveStateAlerts;
    currentLiveGeoJson = {
      ...RAW_GEOJSON,
      features: RAW_GEOJSON.features.map((f, i) => ({
        ...f,
        properties: currentLiveStateAlerts[i] || f.properties,
      })),
    };
    INDIA_STATE_HEAT_ALERTS_GEOJSON = currentLiveGeoJson;
    notifyListeners();
  } finally {
    isFetchingAlerts = false;
  }

  return getNationalAlertStatistics(currentLiveStateAlerts);
}

// ─────────────────────────────────────────────────────────────
// LOOKUP UTILITIES & STATISTICS
// ─────────────────────────────────────────────────────────────

export function getStateAlertByCode(code: string): StateHeatAlertProperties | undefined {
  if (!code) return undefined;
  return currentLiveStateAlerts.find((s) => s.stateCode.toUpperCase() === code.toUpperCase());
}

export function getStateAlertByName(name: string): StateHeatAlertProperties | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase().trim();
  const direct = currentLiveStateAlerts.find((s) => s.stateName.toLowerCase() === n);
  if (direct) return direct;
  return currentLiveStateAlerts.find((s) => n.includes(s.stateName.toLowerCase()) || s.stateName.toLowerCase().includes(n));
}

export function getStateAlertsByCategory(category: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN'): StateHeatAlertProperties[] {
  return currentLiveStateAlerts.filter((s) => s.alertCategory === category);
}

export interface NationalAlertStats {
  totalStates: number;
  redCount: number;
  orangeCount: number;
  yellowCount: number;
  greenCount: number;
  maxTemp: number;
  maxTempState: string;
  minTemp: number;
  minTempState: string;
  avgTemp: number;
  totalPopulationUnderAlertMillion: number;
  redStates: StateHeatAlertProperties[];
  orangeStates: StateHeatAlertProperties[];
  isNight?: boolean;
}

export function getNationalAlertStatistics(statesList: StateHeatAlertProperties[] = currentLiveStateAlerts): NationalAlertStats {
  const redStates = statesList.filter((s) => s.alertCategory === 'RED');
  const orangeStates = statesList.filter((s) => s.alertCategory === 'ORANGE');
  const yellowStates = statesList.filter((s) => s.alertCategory === 'YELLOW');
  const greenStates = statesList.filter((s) => s.alertCategory === 'GREEN');

  let maxTemp = -Infinity;
  let maxTempState = '';
  let minTemp = Infinity;
  let minTempState = '';
  let sumTemp = 0;
  let popUnderAlert = 0;

  for (const s of statesList) {
    sumTemp += s.temperatureC;
    if (s.temperatureC > maxTemp) {
      maxTemp = s.temperatureC;
      maxTempState = s.stateName;
    }
    if (s.temperatureC < minTemp) {
      minTemp = s.temperatureC;
      minTempState = s.stateName;
    }
    if (s.alertCategory === 'RED' || s.alertCategory === 'ORANGE') {
      popUnderAlert += (s.affectedPopulationMillion || 0);
    }
  }

  const { isDay } = getIndianStandardTime();

  return {
    totalStates: statesList.length,
    redCount: redStates.length,
    orangeCount: orangeStates.length,
    yellowCount: yellowStates.length,
    greenCount: greenStates.length,
    maxTemp: maxTemp === -Infinity ? 32.0 : Math.round(maxTemp * 10) / 10,
    maxTempState,
    minTemp: minTemp === Infinity ? 20.0 : Math.round(minTemp * 10) / 10,
    minTempState,
    avgTemp: statesList.length > 0 ? Math.round((sumTemp / statesList.length) * 10) / 10 : 28.0,
    totalPopulationUnderAlertMillion: Math.round(popUnderAlert),
    redStates,
    orangeStates,
    isNight: !isDay,
  };
}

export function getStateCategoryStyle(category: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN', isSelected = false) {
  switch (category) {
    case 'RED':
      return {
        fillColor: '#ef4444',
        strokeColor: isSelected ? '#ffffff' : '#b91c1c',
        weight: isSelected ? 3.5 : 1.8,
        fillOpacity: isSelected ? 0.65 : 0.42,
        badgeBg: 'bg-red-600 text-white',
        borderClass: 'border-red-500',
        textClass: 'text-red-600 dark:text-red-400',
        label: 'RED ALERT',
        severityDesc: 'Severe Heat Wave Condition',
        glowShadow: '0 0 16px rgba(239, 68, 68, 0.6)',
      };
    case 'ORANGE':
      return {
        fillColor: '#f97316',
        strokeColor: isSelected ? '#ffffff' : '#c2410c',
        weight: isSelected ? 3.5 : 1.6,
        fillOpacity: isSelected ? 0.60 : 0.38,
        badgeBg: 'bg-orange-600 text-white',
        borderClass: 'border-orange-500',
        textClass: 'text-orange-600 dark:text-orange-400',
        label: 'ORANGE ALERT',
        severityDesc: 'Heat Wave Condition',
        glowShadow: '0 0 14px rgba(249, 115, 22, 0.5)',
      };
    case 'YELLOW':
      return {
        fillColor: '#eab308',
        strokeColor: isSelected ? '#ffffff' : '#a16207',
        weight: isSelected ? 3.5 : 1.4,
        fillOpacity: isSelected ? 0.55 : 0.32,
        badgeBg: 'bg-yellow-500 text-slate-900',
        borderClass: 'border-yellow-500',
        textClass: 'text-yellow-600 dark:text-yellow-400',
        label: 'YELLOW WATCH',
        severityDesc: 'Hot Day / Warm Night Advisory',
        glowShadow: '0 0 10px rgba(234, 179, 8, 0.4)',
      };
    case 'GREEN':
    default:
      return {
        fillColor: '#10b981',
        strokeColor: isSelected ? '#ffffff' : '#047857',
        weight: isSelected ? 3.5 : 1.2,
        fillOpacity: isSelected ? 0.50 : 0.25,
        badgeBg: 'bg-emerald-600 text-white',
        borderClass: 'border-emerald-500',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        label: 'NORMAL',
        severityDesc: 'Normal Meteorological Conditions',
        glowShadow: 'none',
      };
  }
}
