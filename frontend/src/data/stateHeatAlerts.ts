import {
  StateHeatAlertCollection,
  StateHeatAlertProperties,
  StateHeatAlertFeature,
} from '../types';
import indiaStatesData from './india_state_heat_alerts.json';

export const INDIA_STATE_HEAT_ALERTS_GEOJSON = indiaStatesData as unknown as StateHeatAlertCollection;

export const ALL_STATE_HEAT_ALERTS: StateHeatAlertProperties[] = INDIA_STATE_HEAT_ALERTS_GEOJSON.features.map(
  (f) => f.properties
);

// Map lookup by code
const STATE_BY_CODE_MAP = new Map<string, StateHeatAlertProperties>();
ALL_STATE_HEAT_ALERTS.forEach((s) => {
  STATE_BY_CODE_MAP.set(s.stateCode.toUpperCase(), s);
});

// Map lookup by normalized name
const STATE_BY_NAME_MAP = new Map<string, StateHeatAlertProperties>();
ALL_STATE_HEAT_ALERTS.forEach((s) => {
  STATE_BY_NAME_MAP.set(s.stateName.toLowerCase(), s);
});

export function getStateAlertByCode(code: string): StateHeatAlertProperties | undefined {
  if (!code) return undefined;
  return STATE_BY_CODE_MAP.get(code.toUpperCase());
}

export function getStateAlertByName(name: string): StateHeatAlertProperties | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase().trim();
  if (STATE_BY_NAME_MAP.has(n)) return STATE_BY_NAME_MAP.get(n);
  
  // Fuzzy substring match (e.g., 'Delhi' in 'New Delhi, India')
  return ALL_STATE_HEAT_ALERTS.find((s) => n.includes(s.stateName.toLowerCase()) || s.stateName.toLowerCase().includes(n));
}

export function getStateAlertsByCategory(category: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN'): StateHeatAlertProperties[] {
  return ALL_STATE_HEAT_ALERTS.filter((s) => s.alertCategory === category);
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
}

export function getNationalAlertStatistics(): NationalAlertStats {
  const redStates = ALL_STATE_HEAT_ALERTS.filter((s) => s.alertCategory === 'RED');
  const orangeStates = ALL_STATE_HEAT_ALERTS.filter((s) => s.alertCategory === 'ORANGE');
  const yellowStates = ALL_STATE_HEAT_ALERTS.filter((s) => s.alertCategory === 'YELLOW');
  const greenStates = ALL_STATE_HEAT_ALERTS.filter((s) => s.alertCategory === 'GREEN');

  let maxTemp = -Infinity;
  let maxTempState = '';
  let minTemp = Infinity;
  let minTempState = '';
  let sumTemp = 0;
  let popUnderAlert = 0;

  for (const s of ALL_STATE_HEAT_ALERTS) {
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
      popUnderAlert += s.affectedPopulationMillion;
    }
  }

  return {
    totalStates: ALL_STATE_HEAT_ALERTS.length,
    redCount: redStates.length,
    orangeCount: orangeStates.length,
    yellowCount: yellowStates.length,
    greenCount: greenStates.length,
    maxTemp: Math.round(maxTemp * 10) / 10,
    maxTempState,
    minTemp: Math.round(minTemp * 10) / 10,
    minTempState,
    avgTemp: Math.round((sumTemp / ALL_STATE_HEAT_ALERTS.length) * 10) / 10,
    totalPopulationUnderAlertMillion: Math.round(popUnderAlert),
    redStates,
    orangeStates,
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
