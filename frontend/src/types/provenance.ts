/**
 * ThermoShield Provenance & Reality Classification System
 * Standardized across Citizen & Government Portals for full audit transparency.
 */

export type DataRealityTier = 
  | 'LIVE'
  | 'CALCULATED'
  | 'MODELLED'
  | 'SIMULATED'
  | 'PLANNED'
  | 'CANDIDATE_CHANNEL'
  | 'OFFLINE_FALLBACK';

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
    badgeLabel: 'Fallback Data',
    shortDesc: 'Live stream temporarily unavailable; using calibrated regional baseline.',
    detailedDesc: 'Live upstream weather telemetry is currently unreachable or rate-limited. ThermoShield has engaged a deterministic regional baseline dataset to maintain interface responsiveness and safety continuity.',
    colorClass: 'orange',
    borderClass: 'border-amber-500/40 dark:border-amber-500/40',
    bgClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
    textClass: 'text-amber-800 dark:text-amber-300',
    iconName: 'alert-triangle',
  },
};

export function getDataRealityMeta(tier: DataRealityTier): DataRealityMeta {
  return DATA_REALITY_METADATA[tier] || DATA_REALITY_METADATA.CALCULATED;
}
