import React from 'react';
import {
  Home,
  Map,
  HeartPulse,
  Bell,
  Calendar,
  Sliders,
  Layers,
  Building2,
  ShieldAlert,
  Send,
  FileText,
} from 'lucide-react';

export type ResponsiveTier = 'COMPACT' | 'STANDARD' | 'WIDE';

export interface NavItemConfig {
  id: string;
  to: string;
  label: string;
  compactLabel: string;
  icon: React.ElementType;
  description?: string;
  priority: 1 | 2 | 3; // 1 = core/primary, 2 = secondary/high-value, 3 = tertiary/utilities
  isIndex?: boolean;
}

export interface NavPartition {
  directItems: NavItemConfig[];
  moreItems: NavItemConfig[];
}

/**
 * Returns canonical Citizen navigation items with localized labels.
 */
export function getCitizenNavConfig(t: (key: string, fallback: string) => string): NavItemConfig[] {
  return [
    {
      id: 'home',
      to: '/',
      label: t('nav.home', 'Home'),
      compactLabel: t('nav.home', 'Home'),
      icon: Home,
      priority: 1,
      isIndex: true,
    },
    {
      id: 'heat-map',
      to: '/heat-map',
      label: 'Local Heat Map',
      compactLabel: 'Heat Map',
      icon: Map,
      priority: 1,
    },
    {
      id: 'personal-risk',
      to: '/personal-risk',
      label: t('nav.myHeatRisk', 'My Heat Risk'),
      compactLabel: t('nav.myRisk', 'My Risk'),
      icon: HeartPulse,
      priority: 1,
    },
    {
      id: 'alerts',
      to: '/alerts',
      label: t('nav.alertsAndSafety', 'Alerts & Safety'),
      compactLabel: t('nav.alerts', 'Alerts'),
      icon: Bell,
      description: 'Active heat advisories, safety thresholds & warnings',
      priority: 2,
    },
    {
      id: 'forecast',
      to: '/forecast',
      label: t('nav.forecastAndPlanning', 'Forecast & Planning'),
      compactLabel: t('nav.forecast', 'Forecast'),
      icon: Calendar,
      description: '5-day localized thermal stress outlook',
      priority: 2,
    },
    {
      id: 'interventions',
      to: '/interventions',
      label: t('nav.trySafetyActions', 'Safety Actions'),
      compactLabel: 'Actions',
      icon: Sliders,
      description: 'Model personal protective actions & risk reduction',
      priority: 3,
    },
    {
      id: 'risk-details',
      to: '/risk-details',
      label: 'Detailed Metrics',
      compactLabel: 'Metrics',
      icon: Layers,
      description: 'How weather affects your body & thermal breakdown',
      priority: 3,
    },
  ];
}

/**
 * Returns canonical Authority navigation items.
 */
export function getAuthorityNavConfig(): NavItemConfig[] {
  return [
    {
      id: 'gov-dashboard',
      to: '/gov/dashboard',
      label: 'Command Dashboard',
      compactLabel: 'Dashboard',
      icon: Building2,
      priority: 1,
    },
    {
      id: 'gov-map',
      to: '/gov/map',
      label: 'Heat Risk Map',
      compactLabel: 'Risk Map',
      icon: Map,
      priority: 1,
    },
    {
      id: 'gov-health',
      to: '/gov/health-impact',
      label: 'Health Impact',
      compactLabel: 'Health',
      icon: HeartPulse,
      priority: 1,
    },
    {
      id: 'gov-action-plan',
      to: '/gov/action-plan',
      label: 'Heat Action Plan',
      compactLabel: 'Action Plan',
      icon: ShieldAlert,
      priority: 1,
    },
    {
      id: 'gov-dispatch',
      to: '/gov/dispatch',
      label: 'Alerts & Dispatch',
      compactLabel: 'Dispatch',
      icon: Send,
      description: 'Emergency municipal alerts, worker advisories & public broadcast',
      priority: 2,
    },
    {
      id: 'gov-interventions',
      to: '/gov/interventions',
      label: 'Intervention Simulator',
      compactLabel: 'Simulator',
      icon: Sliders,
      description: 'Civic cooling centers, hydration points & roof coatings model',
      priority: 3,
    },
    {
      id: 'gov-matrix',
      to: '/gov/matrix',
      label: 'Municipal Matrix',
      compactLabel: 'Matrix',
      icon: Building2,
      description: 'Multi-area comparison across monitored urban zones',
      priority: 3,
    },
    {
      id: 'gov-reports',
      to: '/gov/reports',
      label: 'Reports & Data',
      compactLabel: 'Reports',
      icon: FileText,
      description: 'HAP Situation Report & Incident Dossier',
      priority: 3,
    },
  ];
}

/**
 * Strict navigation partition function.
 *
 * Guaranteed Invariant:
 * 1. directItems UNION moreItems === items
 * 2. directItems INTERSECTION moreItems === EMPTY
 * 3. Every route is in EXACTLY one place (never both, never neither)
 * 4. More trigger rendered if and only if moreItems.length > 0
 */
export function partitionNavItems(
  items: NavItemConfig[],
  tier: ResponsiveTier,
  isGov: boolean
): NavPartition {
  let isDirect: (item: NavItemConfig) => boolean;

  if (isGov) {
    if (tier === 'WIDE') {
      // Direct: Priority 1 & 2 (Dashboard, Risk Map, Health, Action Plan, Dispatch)
      // More: Priority 3 (Simulator, Matrix, Reports)
      isDirect = (item) => item.priority <= 2;
    } else {
      // STANDARD / COMPACT:
      // Direct: Priority 1 (Dashboard, Risk Map, Health, Action Plan)
      // More: Priority 2 & 3 (Dispatch, Simulator, Matrix, Reports)
      isDirect = (item) => item.priority === 1;
    }
  } else {
    if (tier === 'COMPACT') {
      // Direct: Priority 1 (Home, Local Heat Map, My Heat Risk)
      // More: Priority 2 & 3 (Alerts & Safety, Forecast & Planning, Safety Actions, Detailed Metrics)
      isDirect = (item) => item.priority === 1;
    } else {
      // STANDARD and WIDE:
      // Direct: Priority 1 & 2 (Home, Heat Map, My Risk, Alerts, Forecast)
      // More: Priority 3 (Safety Actions, Detailed Metrics)
      isDirect = (item) => item.priority <= 2;
    }
  }

  const directItems = items.filter(isDirect);
  const moreItems = items.filter((item) => !isDirect(item));

  return { directItems, moreItems };
}

/**
 * Returns the active label for an item given the responsive tier.
 * WIDE tier renders the full descriptive label.
 * STANDARD and COMPACT tiers render the concise, compact label.
 */
export function getNavLabel(item: NavItemConfig, tier: ResponsiveTier): string {
  if (tier === 'WIDE') {
    return item.label;
  }
  return item.compactLabel;
}
