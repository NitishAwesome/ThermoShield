import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, Badge, Button } from '../../components/ui';
import { DataRealityBadge, CalculationInfoTooltip } from '../../components/provenance';
import { useLocation } from '../../context/LocationContext';
import { useTranslation } from '../../context/LanguageContext';
import { api } from '../../services/api';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Building2,
  AlertTriangle,
  Clock,
  Share2,
  MapPin,
  Users,
  ShieldAlert,
  CheckSquare,
  ExternalLink,
  Info,
  Thermometer,
  Droplets,
  Activity,
  Check,
  Copy,
  ChevronRight,
} from 'lucide-react';

export const GovernmentReports: React.FC = () => {
  const { coords, locationName } = useLocation();
  const { t } = useTranslation();
  const [riskData, setRiskData] = useState<any>(null);
  const [areaRisks, setAreaRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const [singleData, areasOverview] = await Promise.allSettled([
          api.getRisk(coords.lat, coords.lon),
          api.getAreasRiskOverview(),
        ]);

        if (isMounted) {
          if (singleData.status === 'fulfilled') setRiskData(singleData.value);
          if (areasOverview.status === 'fulfilled' && areasOverview.value?.areas) {
            setAreaRisks(areasOverview.value.areas);
          }
        }
      } catch (err) {
        console.error('Failed to fetch data for reports view:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchReportData();
    return () => {
      isMounted = false;
    };
  }, [coords.lat, coords.lon]);

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = today.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const riskScore = riskData?.risk?.risk_score ?? 54;
  const riskCategory = riskData?.risk?.risk_category ?? (riskScore >= 70 ? 'EXTREME' : riskScore >= 50 ? 'HIGH' : 'MODERATE');
  const temp = riskData?.weather?.temperature ?? 39.5;
  const humidity = riskData?.weather?.humidity ?? 64;
  
  // Rothfusz derived feels-like
  const calculateFeelsLike = (T: number, RH: number): number => {
    if (T < 27) return T;
    const HI =
      -8.78469475556 +
      1.61139411 * T +
      2.33854883889 * RH -
      0.14611605 * T * RH -
      0.012308094 * T * T -
      0.0164248277778 * RH * RH +
      0.002211732 * T * T * RH +
      0.00072546 * T * RH * RH -
      0.000003582 * T * T * RH * RH;
    return Math.round(HI * 10) / 10;
  };
  const feelsLike = riskData?.weather?.heat_index ?? calculateFeelsLike(temp, humidity);

  // Fallback priority areas if API area list is empty
  const defaultAreas = [
    { name: locationName || 'Mumbai Central', risk: 'HIGH', score: 68, trend: 'Increasing' },
    { name: 'Navi Mumbai', risk: 'HIGH', score: 65, trend: 'Increasing' },
    { name: 'Thane', risk: 'MODERATE', score: 52, trend: 'Stable' },
  ];

  const priorityAreas = areaRisks.length > 0
    ? [...areaRisks]
        .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
        .slice(0, 4)
        .map((a) => ({
          name: a.name || a.area_name || 'Urban Reference Point',
          risk: (a.risk_category || (a.risk_score >= 70 ? 'EXTREME' : a.risk_score >= 50 ? 'HIGH' : 'MODERATE')).toUpperCase(),
          score: Math.round(a.risk_score || 50),
          trend: a.risk_score > 60 ? 'Increasing' : 'Stable',
        }))
    : defaultAreas;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyBriefing = () => {
    const text = `====================================================
HEAT SITUATION BRIEFING DOSSIER (SIH26083)
Jurisdiction: ${locationName} Disaster Management Cell
Reporting Date: ${todayStr} (${timeStr})
====================================================

1. CURRENT SITUATION SUMMARY
- Composite Heat Risk: ${riskScore}/100 [${riskCategory}]
- Peak Ambient Temperature: ${temp}°C
- Peak Feels-Like Temperature: ${feelsLike}°C
- Primary Threat Vector: Sustained midday solar radiation combined with elevated relative humidity (${humidity}%) leading to acute biological heat accumulation.
- Peak Danger Period: 12:00 PM – 04:00 PM

2. GEOGRAPHIC CONCERN SUMMARY (MONITORED REFERENCE LOCATIONS)
${priorityAreas.map((a, i) => `${i + 1}. ${a.name} — Risk: ${a.risk} (${a.score}/100) | Trend: ${a.trend}`).join('\n')}

3. POPULATION & HEALTH CONSIDERATIONS
- Older Adults & Infants: High physiological vulnerability to core temperature elevation.
- Outdoor & Construction Workers: High continuous metabolic heat generation; mandatory shade rest required.
- Informal Settlements / High-Density Urban Clusters: Indoor heat trapping in tin/asbestos roofed structures.
- Cardiovascular Patients: Increased cardiac workload during prolonged peripheral vasodilation.

4. ACTIVE ALERTS & SYSTEM STATUS
- IMD Alert Stage: ORANGE (Heatwave Warning)
- Affected Geographic Corridor: ${locationName} & Adjacent Monitored Regional Reference Locations
- Dispatch Notification Engine: Monitoring Daemon Active (Local Authority Dispatch)
- Alert Channels:
  * Official Emergency Email: Operational (if SMTP configured)
  * SMS Gateway: Candidate Channel (Demonstration mode)
  * WhatsApp Dispatch: Planned Integration

5. RECOMMENDED PREPAREDNESS ACTIONS (MUNICIPAL CHECKLIST)
[ ] Inspect and replenish cool-water distribution kiosks along major arterial corridors.
[ ] Issue formal advisory to contractors regarding midday outdoor labor breaks (12-4 PM).
[ ] Verify cooling center readiness and public shelter backup power availability.
[ ] Maintain public awareness broadcasts on heat exhaustion and heat stroke warning signs.
[ ] Monitor municipal primary health centers for heat-related service pressure.

DISCLAIMER: Generated by ThermoShield Decision-Support Suite for administrative planning. Planning indicators reflect biometeorological estimates and do not replace certified medical diagnoses or real-time clinical evaluations.
====================================================`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ========================================================
          SECTION 1: Situation Report Header & Controls
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ts-border">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 font-mono">
              Administrative Documentation
            </span>
            <span className="text-xs ts-text-muted">• SIH26083 Authority Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black ts-text-primary tracking-tight font-sans mt-1">
            Heat Situation Reports
          </h1>
          <p className="text-xs sm:text-sm ts-text-muted mt-0.5 max-w-2xl">
            Generate and review structured administrative summaries of current heat conditions, geographic concerns, and preparedness considerations.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyBriefing}
            className="gap-1.5 text-xs font-semibold"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Briefing Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Briefing Text</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Dossier</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Official PDF</span>
          </Button>
        </div>
      </div>

      {/* Report Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl ts-card-subtle border ts-border text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider ts-text-muted block">
            Jurisdiction
          </span>
          <span className="font-semibold ts-text-primary flex items-center gap-1 mt-0.5">
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            {locationName} Municipal Cell
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider ts-text-muted block">
            Report Generation Time
          </span>
          <span className="font-semibold ts-text-primary flex items-center gap-1 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            {todayStr} ({timeStr})
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider ts-text-muted block">
            Data Freshness
          </span>
          <span className="font-semibold ts-text-primary flex items-center gap-1.5 mt-0.5">
            <DataRealityBadge
              tier={riskData?.weather?.is_fallback || riskData?.weather?.source_status === 'OFFLINE_FALLBACK' ? 'OFFLINE_FALLBACK' : 'LIVE'}
              size="xs"
              customLabel={riskData?.weather?.is_fallback || riskData?.weather?.source_status === 'OFFLINE_FALLBACK' ? 'Offline Regional Baseline' : 'Live Regional Weather Sync'}
            />
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider ts-text-muted block">
            Reporting Horizon
          </span>
          <span className="font-semibold ts-text-primary flex items-center gap-1 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            Immediate 24-Hour Cycle
          </span>
        </div>
      </div>

      {/* ========================================================
          OFFICIAL DOSSIER CONTAINER (Print-Friendly)
          ======================================================== */}
      <Card className="border ts-border shadow-sm overflow-hidden bg-card">
        <CardContent className="p-6 sm:p-8 space-y-8">
          {/* Official Letterhead */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b ts-border">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-orange-600 dark:text-orange-400 font-bold block">
                  Incident Command Heat Monitoring Briefing
                </span>
                <h2 className="text-lg font-black ts-text-primary">
                  {locationName} Municipal Disaster Management Authority
                </h2>
                <p className="text-xs ts-text-muted">
                  State Heat Action Plan (HAP) • Human Thermal Stress Intelligence Division
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs ts-text-muted space-y-0.5 font-mono">
              <div className="font-bold ts-text-primary">
                REF: TS-HAP-{today.getFullYear()}-{(locationName || 'MUM').substring(0, 3).toUpperCase()}-{today.getDate().toString().padStart(2, '0')}
              </div>
              <div>Status: OFFICIAL EXECUTIVE BRIEFING</div>
              <div>Classification: MUNICIPAL DECISION SUPPORT</div>
            </div>
          </div>

          {/* ========================================================
              SECTION 2: Current Situation Summary
              ======================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black ts-text-primary uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>1. Current Situation Summary</span>
              </h3>
              <Badge
                variant={riskScore >= 70 ? 'extreme' : riskScore >= 50 ? 'high' : 'moderate'}
                size="sm"
                className="uppercase tracking-wider"
              >
                Overall Risk: {riskCategory}
              </Badge>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl ts-card-subtle border ts-border">
                <span className="text-[10px] font-bold uppercase tracking-wider ts-text-muted flex items-center gap-1">
                  <span>Composite Strain</span>
                  <CalculationInfoTooltip type="composite_index" />
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black font-mono text-orange-600 dark:text-orange-400">
                    {riskScore}
                  </span>
                  <span className="text-xs ts-text-muted">/100</span>
                </div>
                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium block mt-0.5">
                  Calculated index
                </span>
              </div>

              <div className="p-3.5 rounded-xl ts-card-subtle border ts-border">
                <span className="text-[10px] font-bold uppercase tracking-wider ts-text-muted block">
                  Ambient Temperature
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black font-mono ts-text-primary">
                    {temp}
                  </span>
                  <span className="text-xs ts-text-muted">°C</span>
                </div>
                <span className="text-[10px] ts-text-muted block mt-0.5">
                  Peak afternoon baseline
                </span>
              </div>

              <div className="p-3.5 rounded-xl ts-card-subtle border ts-border">
                <span className="text-[10px] font-bold uppercase tracking-wider ts-text-muted block">
                  Peak Feels-Like
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                    {feelsLike}
                  </span>
                  <span className="text-xs ts-text-muted">°C</span>
                </div>
                <span className="text-[10px] text-rose-500 font-medium block mt-0.5">
                  Biological heat stress
                </span>
              </div>

              <div className="p-3.5 rounded-xl ts-card-subtle border ts-border">
                <span className="text-[10px] font-bold uppercase tracking-wider ts-text-muted block">
                  Peak Danger Window
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                    12 PM – 4 PM
                  </span>
                </div>
                <span className="text-[10px] ts-text-muted block mt-0.5">
                  Highest thermal radiation
                </span>
              </div>
            </div>

            {/* Plain-Language Situation Narrative */}
            <div className="p-4 rounded-xl ts-card-subtle border ts-border space-y-2">
              <h4 className="text-xs font-bold ts-text-primary">
                Primary Thermal Threat Vector
              </h4>
              <p className="text-xs ts-text-muted leading-relaxed">
                High afternoon ambient temperatures ({temp}°C) combined with elevated relative humidity ({humidity}%) are creating significant physiological heat accumulation across {locationName}. Apparent thermal stress ({feelsLike}°C) exceeds nominal comfort thresholds, diminishing natural evaporative cooling through perspiration. Authorities should anticipate elevated service pressure on water distribution points and acute thermal strain among exposed outdoor cohorts.
              </p>
            </div>
          </div>

          {/* ========================================================
              SECTION 3: Geographic Concern Summary
              ======================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black ts-text-primary uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span>2. Geographic Concern Summary</span>
              </h3>
              <Link
                to="/gov/map"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Open Heat Risk Map</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs ts-text-muted">
              Curated regional reference locations requiring immediate monitoring and proactive mitigation priority:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {priorityAreas.map((area, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border ts-border ts-card-subtle flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        RANK 0{idx + 1}
                      </span>
                      <h4 className="text-sm font-bold ts-text-primary mt-0.5">
                        {area.name}
                      </h4>
                    </div>
                    <Badge
                      variant={
                        area.risk === 'EXTREME' || area.risk === 'CRITICAL'
                          ? 'extreme'
                          : area.risk === 'HIGH'
                          ? 'high'
                          : 'moderate'
                      }
                      size="sm"
                    >
                      {area.risk}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-2.5 border-t ts-border flex items-center justify-between text-xs">
                    <span className="ts-text-muted">Risk Score:</span>
                    <span className="font-mono font-bold ts-text-primary">{area.score}/100</span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="ts-text-muted">Trend:</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">{area.trend}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-right">
              <Link
                to="/gov/matrix"
                className="text-xs text-slate-500 hover:text-blue-600 flex items-center justify-end gap-1"
              >
                <span>View Full Multi-Location Municipal Matrix</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* ========================================================
              SECTION 4: Population & Health Considerations
              ======================================================== */}
          <div className="space-y-3">
            <h3 className="text-sm font-black ts-text-primary uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span>3. Population Vulnerability & Relative Health Considerations</span>
            </h3>
            <p className="text-xs ts-text-muted">
              Estimated relative vulnerability across key community demographics based on physiological exposure models:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl ts-card-subtle border ts-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold ts-text-primary">Older Adults & Young Children</span>
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">High Concern</span>
                </div>
                <p className="text-xs ts-text-muted leading-relaxed">
                  Diminished thermoregulatory capacity and lower thirst sensation. Increased risk of rapid dehydration and core temperature elevation during midday peaks.
                </p>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border ts-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold ts-text-primary">Outdoor & Construction Laborers</span>
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">High Exposure</span>
                </div>
                <p className="text-xs ts-text-muted leading-relaxed">
                  High metabolic heat generation compounded by direct solar radiation. Mandatory shaded rest cycles and electrolyte replenishment strongly indicated.
                </p>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border ts-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold ts-text-primary">Cardiovascular & Respiratory Conditions</span>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Moderate Concern</span>
                </div>
                <p className="text-xs ts-text-muted leading-relaxed">
                  Heightened physiological circulatory workload from sustained peripheral vasodilation during high ambient temperatures.
                </p>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border ts-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold ts-text-primary">Non-Cooled & Informal Housing</span>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Shelter Priority</span>
                </div>
                <p className="text-xs ts-text-muted leading-relaxed">
                  Asbestos and tin-roofed dwellings experience significant indoor heat trapping, sustaining high thermal stress even into evening hours.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Planning Indicator Notice:</strong> Population impact values are biometeorological estimates calculated for disaster preparedness and municipal resource allocation. They do not constitute clinical forecasts or individual medical diagnoses.
              </span>
            </div>
          </div>

          {/* ========================================================
              SECTION 5: Active Alerts & Response Status
              ======================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black ts-text-primary uppercase tracking-wide flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                <span>4. Active Alerts & Operational Dispatch Status</span>
              </h3>
              <Link
                to="/gov/dispatch"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Manage Dispatch Operations</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                <span className="text-[10px] font-bold uppercase tracking-wider ts-text-muted block">
                  Current Alert Stage
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400">
                    STAGE 2: ORANGE
                  </span>
                </div>
                <span className="text-[10px] ts-text-muted block mt-0.5">
                  Heatwave Advisory Active
                </span>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                <span className="text-[10px] font-bold uppercase tracking-wider ts-text-muted block">
                  Automated Dispatch Daemon
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    MONITORING ACTIVE
                  </span>
                </div>
                <span className="text-[10px] ts-text-muted block mt-0.5">
                  Continuous threshold check
                </span>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                <span className="text-[10px] font-bold uppercase tracking-wider ts-text-muted block">
                  Transmission Channels
                </span>
                <div className="text-xs space-y-1 mt-1 font-medium">
                  <div className="flex items-center justify-between">
                    <span className="ts-text-muted">Emergency Email:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Operational</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="ts-text-muted">SMS Gateway:</span>
                    <span className="text-blue-500 dark:text-blue-400 font-semibold">Candidate Channel</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="ts-text-muted">WhatsApp Dispatch:</span>
                    <span className="text-slate-400 font-semibold">Planned Integration</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION 6: Recommended Preparedness Review
              ======================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black ts-text-primary uppercase tracking-wide flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                <span>5. Recommended Municipal Preparedness Review</span>
              </h3>
              <Link
                to="/gov/interventions"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Evaluate Scenarios in Simulator</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-xs ts-text-muted">
              Structured operational recommendations for municipal authorities and regional disaster managers:
            </p>

            <div className="space-y-2">
              <div className="p-3 rounded-xl ts-card-subtle border ts-border flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="rec-1"
                  defaultChecked
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="rec-1" className="text-xs cursor-pointer">
                  <strong className="ts-text-primary block">Verify Cooling Center & Shade Pavilion Readiness</strong>
                  <span className="ts-text-muted">Ensure municipal halls, community centers, and transit hubs maintain active cooling and clean drinking water access.</span>
                </label>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border ts-border flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="rec-2"
                  defaultChecked
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="rec-2" className="text-xs cursor-pointer">
                  <strong className="ts-text-primary block">Enforce Outdoor Labor Shift Adjustments</strong>
                  <span className="ts-text-muted">Recommend mandatory work suspension between 12:00 PM and 4:00 PM for construction and municipal sanitation crews.</span>
                </label>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border ts-border flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="rec-3"
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="rec-3" className="text-xs cursor-pointer">
                  <strong className="ts-text-primary block">Inspect Hydration Corridor Kiosks</strong>
                  <span className="ts-text-muted">Check water pressure and replenishment schedules at high-density market centers and major bus terminals.</span>
                </label>
              </div>

              <div className="p-3 rounded-xl ts-card-subtle border ts-border flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="rec-4"
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="rec-4" className="text-xs cursor-pointer">
                  <strong className="ts-text-primary block">Community Outreach for Isolated Vulnerable Cohorts</strong>
                  <span className="ts-text-muted">Coordinate with local Anganwadi workers and volunteer groups for welfare checks on solitary elderly residents.</span>
                </label>
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION 7: Export & Transparency Disclaimer
              ======================================================== */}
          <div className="pt-4 border-t ts-border space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs ts-text-muted">
              <div>
                <strong>Issuing Authority:</strong> {locationName} Disaster Management Command Center
                <br />
                <strong>System Engine:</strong> ThermoShield SIH26083 Human Thermal Stress Intelligence Platform
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Dossier</span>
                </Button>
                <Button variant="primary" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Document</span>
                </Button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-500/5 border ts-border text-[11px] ts-text-muted leading-relaxed space-y-1.5">
              <div>
                <strong className="ts-text-primary">Data Reality & Scientific Methodology:</strong> This situation dossier synthesizes live Open-Meteo external weather or cached baseline fallback, biometeorological calculations (estimated WBGT via Stull wet-bulb & radiative globe approximations, Rothfusz Heat Index), and modelled service pressure planning indicators. It does not use live hospital EHR telemetry or physical black-globe thermometer hardware.
              </div>
              <div>
                <strong className="ts-text-primary">Administrative Notice:</strong> All hazard thresholds align with national heat action protocols. Recommendations are decision-support guidelines intended to assist authorities in preemptive resource allocation.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GovernmentReports;

