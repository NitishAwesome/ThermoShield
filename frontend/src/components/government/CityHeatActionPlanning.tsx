import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Building2,
  Users,
  Zap,
  Droplets,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Info,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button } from '../ui';
import { RiskLevel } from '../../types';

export interface CityHeatActionPlanningProps {
  locationName: string;
  temperature: number;
  wbgt?: number;
  heatIndex?: number;
  humidity?: number;
  riskLevel: RiskLevel;
  vulnerabilityIndex?: number;
  isPrototypeZone?: boolean;
  zoneName?: string;
  className?: string;
  isReadOnly?: boolean;
  assignedJurisdiction?: string;
}

interface ActionRecommendation {
  category: 'Cooling' | 'Labor' | 'Hydration' | 'Health' | 'Infrastructure';
  categoryLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  actionTitle: string;
  statusLabel: 'Operational Decision Required' | 'Authority Action Suggested' | 'Recommended for Review' | 'Routine Baseline Watch';
  urgency: 'high' | 'moderate' | 'routine';
  rationale: string;
  suggestedSteps: string[];
}

export const CityHeatActionPlanning: React.FC<CityHeatActionPlanningProps> = ({
  locationName,
  temperature,
  wbgt = 29.0,
  heatIndex = 36.0,
  humidity = 60,
  riskLevel,
  vulnerabilityIndex = 0.6,
  isPrototypeZone = false,
  zoneName,
  className = '',
  isReadOnly = false,
  assignedJurisdiction,
}) => {
  const isExtreme = riskLevel === 'EXTREME' || riskLevel === 'CRITICAL' || wbgt >= 31.0 || temperature >= 40.0;
  const isHigh = riskLevel === 'HIGH' || wbgt >= 29.0 || temperature >= 36.0;
  const isModerate = riskLevel === 'MODERATE' || wbgt >= 27.0 || temperature >= 32.0;

  // Derive transparent, trigger-based operational recommendations
  const recommendations: ActionRecommendation[] = [
    {
      category: 'Cooling',
      categoryLabel: 'Cooling Measures',
      icon: Building2,
      actionTitle: 'Review Municipal Cooling Center Readiness',
      statusLabel: isExtreme
        ? 'Operational Decision Required'
        : isHigh
        ? 'Authority Action Suggested'
        : isModerate
        ? 'Recommended for Review'
        : 'Routine Baseline Watch',
      urgency: isExtreme ? 'high' : isHigh ? 'high' : isModerate ? 'moderate' : 'routine',
      rationale: isExtreme
        ? `WBGT (${wbgt.toFixed(1)}°C) exceeds safety thresholds. Air-conditioned libraries, community centers, and shaded transit hubs should be reviewed for immediate public access.`
        : isHigh
        ? `Elevated daytime heat (${temperature.toFixed(1)}°C) creates heat exhaustion risk for pedestrian and transit commuters.`
        : `Conditions warrant maintaining cooling center standby status during afternoon hours.`,
      suggestedSteps: [
        'Inspect operational readiness of designated ward cooling refuges',
        'Verify backup generator and air filtration availability',
        'Stage water dispensers at entry points',
      ],
    },
    {
      category: 'Labor',
      categoryLabel: 'Outdoor Work Safety',
      icon: Clock,
      actionTitle: 'Review Peak Heat Work Pacing & Scheduling',
      statusLabel: isExtreme
        ? 'Operational Decision Required'
        : isHigh
        ? 'Authority Action Suggested'
        : isModerate
        ? 'Recommended for Review'
        : 'Routine Baseline Watch',
      urgency: isExtreme ? 'high' : isHigh ? 'high' : isModerate ? 'moderate' : 'routine',
      rationale: isExtreme
        ? `Acute physiological strain danger (WBGT ${wbgt.toFixed(1)}°C). Authorities should review formal advisories for construction, sanitation, and delivery shifts between 12 PM – 4 PM.`
        : isHigh
        ? `Moderate-to-heavy physical labor during afternoon peak hours increases heat illness rates. Rest pauses under shade are recommended.`
        : `Encourage standard 15-minute rest breaks per working hour in shaded areas.`,
      suggestedSteps: [
        'Issue contractor safety advisory for 12:00 PM – 4:00 PM shift adjustments',
        'Mandate accessible shade and electrolyte availability at worksites',
        'Encourage staggered early morning or evening concrete/roofing work',
      ],
    },
    {
      category: 'Hydration',
      categoryLabel: 'Public Hydration Support',
      icon: Droplets,
      actionTitle: 'Review Emergency Water Distribution & Tanker Staging',
      statusLabel: isExtreme || isHigh ? 'Authority Action Suggested' : 'Recommended for Review',
      urgency: isExtreme || isHigh ? 'high' : 'moderate',
      rationale: `High vapor pressure and ambient temperature (${temperature.toFixed(1)}°C) accelerate fluid loss. Public transit nodes and market centers require continuous hydration access.`,
      suggestedSteps: [
        'Deploy mobile water kiosks at major bus terminals and railway stations',
        'Coordinate with commercial vendor associations for free drinking water pots',
        'Verify stock of Oral Rehydration Solution (ORS) sachets at municipal booths',
      ],
    },
    {
      category: 'Health',
      categoryLabel: 'Health Preparedness & Outreach',
      icon: Users,
      actionTitle: 'Review Vulnerable Population Support & Primary Clinic Readiness',
      statusLabel: (vulnerabilityIndex >= 0.75 || isExtreme)
        ? 'Operational Decision Required'
        : isHigh
        ? 'Authority Action Suggested'
        : 'Recommended for Review',
      urgency: (vulnerabilityIndex >= 0.75 || isExtreme) ? 'high' : 'moderate',
      rationale: vulnerabilityIndex >= 0.75
        ? `High vulnerability demographic envelope (${(vulnerabilityIndex * 100).toFixed(0)}% index). Slum settlements and senior residences require dedicated ASHA worker surveillance.`
        : `Review hospital emergency ward readiness for heat cramps, exhaustion, and stroke cases.`,
      suggestedSteps: [
        'Confirm dedicated heatstroke stabilization beds at nearest Urban Health Center',
        'Alert ASHA / Anganwadi community health workers for elder phone checks',
        'Stock IV fluids, cold packs, and core temperature monitoring thermometers',
      ],
    },
    {
      category: 'Infrastructure',
      categoryLabel: 'Infrastructure & Power Grid',
      icon: Zap,
      actionTitle: 'Review Peak Electricity Demand & Transformer Load Preparedness',
      statusLabel: isExtreme ? 'Operational Decision Required' : isHigh ? 'Authority Action Suggested' : 'Routine Baseline Watch',
      urgency: isExtreme ? 'high' : isHigh ? 'moderate' : 'routine',
      rationale: `Afternoon air-conditioning cooling surge coincides with peak ambient temperature. Distribution transformers in dense residential pockets require load monitoring.`,
      suggestedSteps: [
        'Alert discom transmission engineers for potential transformer overheating watch',
        'Confirm priority power supply continuity to municipal hospitals and pumping stations',
        'Defer non-critical scheduled grid maintenance during peak diurnal window',
      ],
    },
  ];

  const getStatusBadgeVariant = (status: ActionRecommendation['statusLabel']) => {
    switch (status) {
      case 'Operational Decision Required':
        return 'bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/35';
      case 'Authority Action Suggested':
        return 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-500/35';
      case 'Recommended for Review':
        return 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/35';
      default:
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Banner */}
      <div className="rounded-3xl ts-card p-6 sm:p-7 border ts-border shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>City Heat Action Planning (HAP)</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Operational Decision Support
              </span>
              {isPrototypeZone && (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  Prototype Urban Thermal Zone
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black ts-text-primary tracking-tight mt-1.5">
              Heat Action Operational Recommendations
            </h2>
            <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-3xl leading-relaxed">
              Transparent, automated trigger recommendations generated from evaluated thermal indicators for{' '}
              <strong className="ts-text-primary">{zoneName || locationName.split(',')[0]}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              to="/gov/interventions"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Simulate Interventions →</span>
            </Link>
          </div>
        </div>

        {/* Advisory Transparency Disclaimer */}
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs ts-text-muted flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="leading-relaxed">
            <strong className="ts-text-primary font-bold">Decision-Support Governance Rule: </strong>
            ThermoShield provides intelligent, evidence-grounded recommendation triggers to assist municipal authorities and disaster management officials. ThermoShield does not autonomously execute civic operations, deploy municipal hardware, or actuate power grid changes.
          </div>
        </div>

        {/* Read-Only Context Warning */}
        {isReadOnly && (
          <div className="mt-3 p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-start space-x-2.5 animate-fadeIn">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="leading-relaxed">
              <strong className="text-blue-200 font-bold">Read-Only Situational Context: </strong>
              Viewing outside your authorized operational jurisdiction ({assignedJurisdiction || 'Assigned Scope'}). Directives can be inspected for situational awareness, but formal action activation and decision logging are restricted to authorized jurisdiction officials.
            </div>
          </div>
        )}

        {/* 5 Recommendation Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {recommendations.map((rec) => {
            const Icon = rec.icon;
            return (
              <div
                key={rec.category}
                className="p-5 rounded-2xl ts-card-subtle border ts-border flex flex-col justify-between hover:border-orange-500/40 transition-colors shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="flex items-center space-x-1.5 text-xs font-bold text-orange-600 dark:text-orange-400">
                      <Icon className="w-4 h-4" />
                      <span>{rec.categoryLabel}</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border uppercase tracking-wider ${getStatusBadgeVariant(
                        rec.statusLabel
                      )}`}
                    >
                      {rec.statusLabel}
                    </span>
                  </div>

                  <h3 className="text-sm font-black ts-text-primary leading-snug mb-2">
                    {rec.actionTitle}
                  </h3>

                  <p className="text-xs ts-text-muted leading-relaxed mb-3">
                    {rec.rationale}
                  </p>
                </div>

                <div className="pt-3 border-t ts-border">
                  <span className="text-[10.5px] uppercase font-bold text-slate-400 block mb-1.5">
                    Suggested Review Steps:
                  </span>
                  <ul className="space-y-1 text-xs ts-text-subtle">
                    {rec.suggestedSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CityHeatActionPlanning;
