/**
 * ThermoShield Provenance & Reality Classification System
 * Standardized across Citizen & Government Portals for full audit transparency.
 */

export type DataRealityTier = 
  | 'LIVE'
  | 'CACHED'
  | 'STALE_CACHED'
  | 'CALCULATED'
  | 'MODELLED'
  | 'SIMULATED'
  | 'PLANNED'
  | 'CANDIDATE_CHANNEL'
  | 'OFFLINE_FALLBACK'
  | 'UNAVAILABLE'
  | 'LOADING';

export interface DataRealityMeta {
  tier: DataRealityTier;
  label: string;
  badgeLabel: string;
  shortDesc: string;
  detailedDesc: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  iconName: 'radio' | 'calculator' | 'activity' | 'cpu' | 'sparkles' | 'clock' | 'alert-triangle';
}

export const DATA_REALITY_METADATA: Record<DataRealityTier, DataRealityMeta> = {
  LIVE: {
    tier: 'LIVE',
    label: 'Live Data',
    badgeLabel: 'Live Data',
    shortDesc: 'Retrieved directly from live external telemetry or authoritative APIs.',
    detailedDesc: 'Directly ingested from external real-time meteorological services (Open-Meteo Global API) or browser-level geolocation with no synthetic interpolation.',
    colorClass: 'emerald',
    borderClass: 'border-emerald-500/30 dark:border-emerald-500/30',
    bgClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    iconName: 'radio',
  },
  CACHED: {
    tier: 'CACHED',
    label: 'Cached Observation',
    badgeLabel: 'Cached Data',
    shortDesc: 'Recently cached meteorological observation from authoritative API.',
    detailedDesc: 'Temporarily cached real-time telemetry preserved to ensure rapid performance and prevent upstream API rate-limiting.',
    colorClass: 'cyan',
    borderClass: 'border-cyan-500/30 dark:border-cyan-500/30',
    bgClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
    textClass: 'text-cyan-700 dark:text-cyan-400',
    iconName: 'clock',
  },
  STALE_CACHED: {
    tier: 'STALE_CACHED',
    label: 'Stale Cached Data',
    badgeLabel: 'Stale Cached Data',
    shortDesc: 'Preserved prior observation maintained during telemetry disruption.',
    detailedDesc: 'Retained earlier observation dataset to maintain situational continuity when upstream weather telemetry is transiently delayed.',
    colorClass: 'amber',
    borderClass: 'border-amber-500/40 dark:border-amber-500/40',
    bgClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
    textClass: 'text-amber-800 dark:text-amber-300',
    iconName: 'clock',
  },
  CALCULATED: {
    tier: 'CALCULATED',
    label: 'Scientifically Calculated',
    badgeLabel: 'Calculated',
    shortDesc: 'Derived using validated biometeorological & physiological formulas.',
    detailedDesc: 'Mathematically computed from live inputs using peer-reviewed formulations, including Stull wet-bulb estimation, Rothfusz heat index regression, and Estimated WBGT (Stull wet-bulb & radiative globe approximation).',
    colorClass: 'cyan',
    borderClass: 'border-cyan-500/30 dark:border-cyan-500/30',
    bgClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
    textClass: 'text-cyan-700 dark:text-cyan-400',
    iconName: 'calculator',
  },
  MODELLED: {
    tier: 'MODELLED',
    label: 'Modelled Planning Estimate',
    badgeLabel: 'Modelled',
    shortDesc: 'Analytical projection for municipal planning & operational prioritization.',
    detailedDesc: 'Produced by predictive machine learning models or demographic heuristics (e.g. ward vulnerability, historical health sensitivity) to aid operational readiness. Not a real-time clinical casualty feed.',
    colorClass: 'amber',
    borderClass: 'border-amber-500/30 dark:border-amber-500/30',
    bgClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    textClass: 'text-amber-700 dark:text-amber-400',
    iconName: 'activity',
  },
  SIMULATED: {
    tier: 'SIMULATED',
    label: 'Hypothetical Simulation',
    badgeLabel: 'Simulated',
    shortDesc: 'Exploratory sandbox scenario for counterfactual testing.',
    detailedDesc: 'Generated via parametric simulation sliders (cooling shelters, hydration points, work pauses) to evaluate hypothetical risk reduction before deploying civic interventions.',
    colorClass: 'indigo',
    borderClass: 'border-indigo-500/30 dark:border-indigo-500/30',
    bgClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    textClass: 'text-indigo-700 dark:text-indigo-400',
    iconName: 'sparkles',
  },
  PLANNED: {
    tier: 'PLANNED',
    label: 'Planned Integration',
    badgeLabel: 'Planned',
    shortDesc: 'Architectural roadmap capability scheduled for live integration.',
    detailedDesc: 'Specifies upcoming hardware or platform connectors (such as dense city sensor grids, WhatsApp Business API, and hospital EHR integration) currently in testing or pending vendor API credentials.',
    colorClass: 'purple',
    borderClass: 'border-purple-500/30 dark:border-purple-500/30',
    bgClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    textClass: 'text-purple-700 dark:text-purple-400',
    iconName: 'clock',
  },
  CANDIDATE_CHANNEL: {
    tier: 'CANDIDATE_CHANNEL',
    label: 'Candidate Channel',
    badgeLabel: 'Candidate Channel',
    shortDesc: 'Delivery channel wired in architecture; not yet connected to a live provider.',
    detailedDesc: 'This notification channel is fully implemented in the codebase but operates in simulation/demo mode. Live delivery requires connecting a real provider (e.g. Twilio for SMS, WhatsApp Business API). No real messages reach recipients.',
    colorClass: 'sky',
    borderClass: 'border-sky-500/30 dark:border-sky-500/30',
    bgClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    textClass: 'text-sky-700 dark:text-sky-400',
    iconName: 'clock',
  },
  OFFLINE_FALLBACK: {
    tier: 'OFFLINE_FALLBACK',
    label: 'Offline Demonstration Mode',
    badgeLabel: 'Offline Fallback',
    shortDesc: 'Live stream temporarily unavailable; using calibrated regional baseline.',
    detailedDesc: 'Live upstream weather telemetry is currently unreachable or rate-limited. ThermoShield has engaged a deterministic regional baseline dataset to maintain interface responsiveness and safety continuity.',
    colorClass: 'orange',
    borderClass: 'border-amber-500/40 dark:border-amber-500/40',
    bgClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
    textClass: 'text-amber-800 dark:text-amber-300',
    iconName: 'alert-triangle',
  },
  UNAVAILABLE: {
    tier: 'UNAVAILABLE',
    label: 'Telemetry Unavailable',
    badgeLabel: 'Unavailable',
    shortDesc: 'Weather telemetry is unavailable. Real-time calculations suspended.',
    detailedDesc: 'External meteorological telemetry is currently disconnected or unresponsive. Calculated thermal stress and ML risk scores are suspended to prevent false safety states.',
    colorClass: 'slate',
    borderClass: 'border-slate-400/40 dark:border-slate-600/40',
    bgClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
    textClass: 'text-slate-700 dark:text-slate-300',
    iconName: 'alert-triangle',
  },
  LOADING: {
    tier: 'LOADING',
    label: 'Loading Telemetry',
    badgeLabel: 'Connecting',
    shortDesc: 'Establishing connection to meteorological telemetry engine.',
    detailedDesc: 'Connecting to live weather services or cached telemetry. Data will display as soon as connection is verified.',
    colorClass: 'slate',
    borderClass: 'border-slate-400/40 dark:border-slate-600/40',
    bgClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
    textClass: 'text-slate-700 dark:text-slate-300',
    iconName: 'clock',
  },
};

export function getDataRealityMeta(tier: DataRealityTier): DataRealityMeta {
  return DATA_REALITY_METADATA[tier] || DATA_REALITY_METADATA.CALCULATED;
}
