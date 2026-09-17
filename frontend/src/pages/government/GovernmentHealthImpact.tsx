import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent, Badge, Button } from '../../components/ui';
import { DataRealityBadge, ModelTransparencyNote } from '../../components/provenance';
import { useLocation } from '../../context/LocationContext';
import { useTranslation } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { translateRiskLevel } from '../../utils/translationHelpers';
import { AreaRiskItem, RiskLevel, HealthImpactForecastResponse } from '../../types';
import {
  Activity,
  HeartPulse,
  Users,
  AlertTriangle,
  Building2,
  Stethoscope,
  ShieldCheck,
  TrendingUp,
  Info,
  Compass,
  Radio,
  Sliders,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Baby,
  Heart,
  Wind,
  Home,
  Shield,
  Calendar,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react';

export const GovernmentHealthImpact: React.FC = () => {
  const { coords, locationName } = useLocation();
  const { t } = useTranslation();

  const [riskData, setRiskData] = useState<any>(null);
  const [priorityAreas, setPriorityAreas] = useState<AreaRiskItem[]>([]);
  const [forecastData, setForecastData] = useState<HealthImpactForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Recently');

  useEffect(() => {
    let isMounted = true;
    const fetchHealthImpactData = async () => {
      try {
        setLoading(true);
        const [riskRes, areasRes, forecastRes] = await Promise.allSettled([
          api.getRisk(coords.lat, coords.lon),
          api.getAreasRiskOverview(),
          api.getHealthImpactForecast({ lat: coords.lat, lon: coords.lon, area_name: locationName }),
        ]);

        if (!isMounted) return;

        if (riskRes.status === 'fulfilled') setRiskData(riskRes.value);
        if (areasRes.status === 'fulfilled') setPriorityAreas(areasRes.value.areas || []);
        if (forecastRes.status === 'fulfilled') setForecastData(forecastRes.value);

        setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      } catch (err) {
        console.error('Failed to fetch risk data for health impact view:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHealthImpactData();
    return () => {
      isMounted = false;
    };
  }, [coords.lat, coords.lon]);

  const riskScore = riskData?.risk?.risk_score ?? 48;
  const healthProxyValue = riskData?.risk?.predicted_health_impact_proxy ?? (riskScore * 0.18 + 2.5);
  const rawLevel = (riskData?.risk?.risk_level || 'HIGH').toString();
  const currentRiskLevel: RiskLevel = (rawLevel.toUpperCase() as RiskLevel) || 'HIGH';

  // Service pressure category
  const getServicePressureTier = () => {
    if (riskScore >= 75) return { tier: 'HIGH', class: 'text-red-500 bg-red-500/10 border-red-500/30' };
    if (riskScore >= 45) return { tier: 'ELEVATED', class: 'text-orange-500 bg-orange-500/10 border-orange-500/30' };
    return { tier: 'NORMAL', class: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' };
  };

  const pressureInfo = getServicePressureTier();

  // Top areas to review
  const topAreasToReview = [...priorityAreas]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 3);

  return (
    <div className="space-y-8 pb-16">
      {/* SECTION 1 — PAGE HEADER */}
      <div className="rounded-3xl ts-card p-6 sm:p-7 border ts-border shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center space-x-1">
                <HeartPulse className="w-4 h-4" />
                <span>Health Monitoring & Vulnerability</span>
              </span>
              <DataRealityBadge tier="MODELLED" size="xs" customLabel="Modelled Planning Estimate" />
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                Decision Support
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                Updated {lastUpdatedTime}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black ts-text-primary tracking-tight font-sans mt-1">
              Health Impact & Vulnerability
            </h1>
            <p className="text-xs sm:text-sm ts-text-muted mt-1 leading-relaxed">
              Understand which communities may need additional attention during heat events.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs ts-text-muted">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>
              <strong className="ts-text-primary font-bold">Region:</strong> {locationName}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2 — OVERALL HEALTH CONCERN */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="flex items-center space-x-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <h2 className="text-xs font-black uppercase tracking-wider text-rose-500">
            Current Health Concern
          </h2>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Community Vulnerability Level
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1 font-sans">
              {translateRiskLevel(currentRiskLevel, t)} CONCERN
            </div>
            <p className="text-xs sm:text-sm ts-text-primary mt-1.5 leading-relaxed max-w-2xl">
              Current heat conditions may increase stress on vulnerable populations during peak afternoon hours. Additional hydration, shaded shelter, and proactive monitoring are advised.
            </p>
          </div>

          <div className="flex-shrink-0">
            <Badge riskLevel={currentRiskLevel} size="lg" showDot showIcon>
              {translateRiskLevel(currentRiskLevel, t)}
            </Badge>
          </div>
        </div>
      </div>

      {/* SECTION 2.5 — 5-DAY HUMAN HEALTH IMPACT OUTLOOK & PREDICTIVE EARLY WARNING (PROMPT 22) */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-orange-500">
                Predictive Early Warning Pipeline
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 uppercase">
                3–5 Day Trajectory
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black ts-text-primary mt-1 font-sans">
              5-Day Human Health Impact Outlook
            </h3>
            <p className="text-xs sm:text-sm ts-text-muted mt-1 leading-relaxed max-w-3xl">
              Scientifically grounded projection combining weather forecast, biometeorological wet-bulb globe temperature (WBGT), heat index, and local socio-demographic vulnerability.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/gov/action-plan"
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Review Action Plan Triggers</span>
            </Link>
          </div>
        </div>

        {/* Lead Time Intelligence Directive Banner */}
        {forecastData?.lead_time_intelligence && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border border-orange-500/30 space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                Early Warning Lead Time Intelligence:
              </span>
            </div>
            <p className="text-sm font-bold ts-text-primary leading-relaxed">
              {forecastData.lead_time_intelligence.summary_directive}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2 rounded-xl ts-card-subtle border ts-border">
                <span className="text-[10px] ts-text-muted block">First High Risk Day</span>
                <span className="font-bold text-amber-500">
                  {forecastData.lead_time_intelligence.first_high_risk_day || 'None Projected'}
                </span>
              </div>
              <div className="p-2 rounded-xl ts-card-subtle border ts-border">
                <span className="text-[10px] ts-text-muted block">First Extreme Day</span>
                <span className="font-bold text-red-500">
                  {forecastData.lead_time_intelligence.first_extreme_risk_day || 'None Projected'}
                </span>
              </div>
              <div className="p-2 rounded-xl ts-card-subtle border ts-border">
                <span className="text-[10px] ts-text-muted block">Peak Concern Day</span>
                <span className="font-bold text-orange-500">
                  {forecastData.lead_time_intelligence.peak_concern_day} ({forecastData.lead_time_intelligence.peak_concern_score}/100)
                </span>
              </div>
              <div className="p-2 rounded-xl ts-card-subtle border ts-border">
                <span className="text-[10px] ts-text-muted block">Expected Relief Day</span>
                <span className="font-bold text-emerald-500">
                  {forecastData.lead_time_intelligence.relief_day}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 5-Day Sequence Cards */}
        {forecastData?.forecast_days && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {forecastData.forecast_days.map((day) => {
              const isToday = day.day_index === 0;
              const isSevere = day.civic_health_concern === 'CRITICAL' || day.civic_health_concern === 'SEVERE';

              return (
                <div
                  key={day.day_index}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    isToday
                      ? 'border-orange-500/50 bg-orange-500/5 shadow-md'
                      : isSevere
                      ? 'border-red-500/30 ts-card-subtle'
                      : 'ts-card-subtle ts-border'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black ts-text-primary flex items-center gap-1">
                        {day.day_label}
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-500 text-white uppercase">
                            Now
                          </span>
                        )}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
                        style={{
                          backgroundColor: `${day.civic_health_color}25`,
                          color: day.civic_health_color,
                          border: `1px solid ${day.civic_health_color}40`,
                        }}
                      >
                        {day.civic_health_concern}
                      </span>
                    </div>
                    <span className="text-[10px] ts-text-muted block font-mono">
                      {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>

                    {/* Biometeorological Telemetry */}
                    <div className="pt-2 border-t ts-border space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="ts-text-muted text-[11px]">Max Temp:</span>
                        <span className="font-bold ts-text-primary font-mono">{day.temp_max_c}°C</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="ts-text-muted text-[11px]">Est. WBGT:</span>
                        <span className="font-bold text-red-500 font-mono">{day.estimated_wbgt_c}°C</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="ts-text-muted text-[11px]">Heat Index:</span>
                        <span className="font-bold text-amber-500 font-mono">{day.heat_index_c}°C</span>
                      </div>
                    </div>
                  </div>

                  {/* Projected Health Impact Proxy Box */}
                  <div className="pt-2 border-t ts-border space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="ts-text-muted">Health Impact Proxy:</span>
                      <span className="font-extrabold font-mono ts-text-primary">
                        {day.projected_health_impact_proxy}/100
                      </span>
                    </div>

                    <div className="w-full bg-slate-500/20 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${day.projected_health_impact_proxy}%`,
                          backgroundColor: day.civic_health_color,
                        }}
                      />
                    </div>

                    <p className="text-[10.5px] ts-text-muted leading-tight pt-1">
                      {day.civic_health_description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Scientific Honesty & ML Disclaimer Box */}
        <div className="p-4 rounded-2xl bg-slate-500/10 border ts-border text-xs ts-text-muted space-y-2">
          <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 font-bold">
            <Info className="w-4 h-4 shrink-0" />
            <span className="uppercase tracking-wider text-[11px]">Scientific Honesty & ML Model Transparency:</span>
          </div>
          <p className="leading-relaxed">
            {forecastData?.ml_transparency_disclaimer ||
              "Forecast health concern uses ThermoShield's prototype ML health-impact proxy trained on synthetic epidemiological data. It is intended for comparative planning and early-warning research, not clinical prediction."}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-400 border-t ts-border pt-2">
            <strong>Architecture Notice:</strong> The engine is architected to accept future empirical datasets (IDSP syndromic heat illness, 108 emergency ambulance dispatches, HMIS admissions) once municipal health sharing agreements are established. ThermoShield never outputs fabricated casualty or mortality counts.
          </p>
        </div>
      </div>

      {/* SECTION 3 — GROUPS NEEDING EXTRA ATTENTION */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="pb-4 border-b ts-border">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-rose-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-rose-500">
              Vulnerable Demographics
            </h2>
          </div>
          <h3 className="text-xl font-black ts-text-primary mt-0.5">
            Groups Needing Extra Attention
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl ts-card-subtle border ts-border space-y-1.5">
            <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
              <Users className="w-4 h-4" />
              <span>Older Adults</span>
            </div>
            <p className="text-xs ts-text-muted leading-relaxed">
              May have greater difficulty adapting to extreme heat due to reduced thermoregulation. Consider earlier warnings and welfare checks.
            </p>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border space-y-1.5">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <Users className="w-4 h-4" />
              <span>Outdoor Workers</span>
            </div>
            <p className="text-xs ts-text-muted leading-relaxed">
              Long exposure during peak heat hours may increase thermal strain. Consider mandatory shade, hydration, and work-rest pacing.
            </p>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border space-y-1.5">
            <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400 font-bold text-xs">
              <Baby className="w-4 h-4" />
              <span>Young Children</span>
            </div>
            <p className="text-xs ts-text-muted leading-relaxed">
              Core body temperature rises faster in young children; require additional hydration and attentive adult supervision.
            </p>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border space-y-1.5">
            <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
              <Heart className="w-4 h-4" />
              <span>People with Heart Conditions</span>
            </div>
            <p className="text-xs ts-text-muted leading-relaxed">
              Elevated cardiovascular workload during thermal stress requires cool indoor shelter and avoidance of midday outdoor activity.
            </p>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <Wind className="w-4 h-4" />
              <span>People with Respiratory Conditions</span>
            </div>
            <p className="text-xs ts-text-muted leading-relaxed">
              Stagnant high thermal environments can exacerbate breathing difficulties. Ensure access to ventilated or air-cooled facilities.
            </p>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border space-y-1.5">
            <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 font-bold text-xs">
              <Home className="w-4 h-4" />
              <span>Limited Cooling Access</span>
            </div>
            <p className="text-xs ts-text-muted leading-relaxed">
              Informal settlements and poorly insulated structures experience high heat retention. Public cooling shelters offer essential relief.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 4 — AREA-LEVEL CONCERN */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b ts-border">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-rose-500">
              Sector Vulnerability
            </div>
            <h2 className="text-xl font-black ts-text-primary mt-0.5">
              Areas to Review
            </h2>
          </div>
          <Link
            to="/gov/matrix"
            className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>View Full Municipal Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {topAreasToReview.length === 0 ? (
          <div className="py-6 text-center text-xs ts-text-muted">
            Loading sector vulnerability levels...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
            {topAreasToReview.map((area, idx) => {
              const getConcernNote = (level: string) => {
                const norm = (level || '').toUpperCase();
                if (norm === 'EXTREME' || norm === 'CRITICAL' || norm === 'HIGH') return 'High concern';
                if (norm === 'MODERATE') return 'Elevated concern';
                return 'Continue monitoring';
              };

              return (
                <div
                  key={area.name}
                  className="p-4 rounded-2xl ts-card-subtle border ts-border flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-400 font-mono">
                        Sector #{idx + 1}
                      </span>
                      <Badge riskLevel={area.risk_level} size="sm">
                        {translateRiskLevel(area.risk_level, t)}
                      </Badge>
                    </div>
                    <h3 className="text-base font-black ts-text-primary mt-2">
                      {area.name}
                    </h3>
                    <p className="text-[11px] ts-text-muted mt-0.5">
                      {area.state} • {area.zone}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t ts-border flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {getConcernNote(area.risk_level)}
                    </span>
                    <span className="font-mono text-[11px] ts-text-subtle">
                      WBGT {area.wbgt_c.toFixed(1)}°C
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 5 — POTENTIAL SERVICE PRESSURE */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider text-purple-500">
                Heat-Related Service Pressure Planning Estimate
              </span>
              <DataRealityBadge tier="MODELLED" size="xs" customLabel="Modelled Planning Proxy" />
            </div>
            <h2 className="text-xl font-black ts-text-primary mt-0.5">
              Modelled Service Pressure Indicator
            </h2>
          </div>
        </div>

        <div className="mt-5 p-5 rounded-2xl ts-card-subtle border ts-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold ts-text-subtle uppercase tracking-wider">
              Planning Pressure Indicator
            </div>
            <div className={`text-2xl font-black font-mono mt-1 ${pressureInfo.tier === 'HIGH' ? 'text-red-500' : pressureInfo.tier === 'ELEVATED' ? 'text-orange-500' : 'text-emerald-500'}`}>
              {pressureInfo.tier} PRESSURE
            </div>
            <p className="text-xs ts-text-muted mt-1 leading-relaxed max-w-xl">
              Heat conditions suggest an elevated potential for heat-related outpatient visits and hydration demands during peak solar hours.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-center flex-shrink-0">
            <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Health Impact Proxy Index
            </div>
            <div className="text-2xl font-black font-mono text-purple-700 dark:text-purple-300 mt-1">
              ~{healthProxyValue.toFixed(1)}
            </div>
            <div className="text-[10.5px] ts-text-subtle mt-0.5">
              Relative planning benchmark
            </div>
          </div>
        </div>

        {/* Required Transparency Note Component */}
        <ModelTransparencyNote className="mt-4" />
      </div>

      {/* SECTION 6 — RECOMMENDED PREPAREDNESS */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl bg-rose-500/5">
        <div className="flex items-center space-x-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-rose-500" />
          <h2 className="text-xs font-black uppercase tracking-wider text-rose-500">
            Recommended Preparedness
          </h2>
        </div>
        <h3 className="text-base font-extrabold ts-text-primary">
          Actionable Public Health Guidance
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="p-3.5 rounded-2xl ts-card border ts-border flex items-start space-x-3">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
            <p className="text-xs ts-text-primary leading-relaxed">
              <strong>Review cooling center readiness</strong> and public shade availability across high-density sectors.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl ts-card border ts-border flex items-start space-x-3">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
            <p className="text-xs ts-text-primary leading-relaxed">
              <strong>Increase heat warnings</strong> and hydration outreach for vulnerable communities and outdoor workers.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl ts-card border ts-border flex items-start space-x-3">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
            <p className="text-xs ts-text-primary leading-relaxed">
              <strong>Prepare drinking water and shaded rest points</strong> along heavy labor corridors and transit hubs.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl ts-card border ts-border flex items-start space-x-3">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
            <p className="text-xs ts-text-primary leading-relaxed">
              <strong>Coordinate local health dispensaries</strong> and emergency response preparedness for afternoon peak hours.
            </p>
          </div>
        </div>

        {/* Explore Response Options CTA */}
        <div className="mt-5 pt-4 border-t ts-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold ts-text-primary">
              Simulate Public Health Interventions
            </h4>
            <p className="text-[11px] ts-text-muted mt-0.5 max-w-xl leading-relaxed">
              Evaluate how opening designated cooling centers, implementing outdoor labor restrictions, and expanding emergency hydration reduce projected health casualties.
            </p>
          </div>
          <Link
            to="/gov/interventions"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap flex-shrink-0"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Explore Response Options →</span>
          </Link>
        </div>
      </div>

      {/* SECTION 7 — CONNECTED GOVERNMENT ACTIONS */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-4 h-4 text-rose-500" />
          <h2 className="text-xs font-black uppercase tracking-wider ts-text-subtle">
            Connected Government Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/gov/map"
            className="p-4 rounded-2xl ts-card-elevated border ts-border hover:border-cyan-500/50 transition-all group block"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-500 flex items-center justify-center mb-2">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold ts-text-primary flex items-center justify-between">
              <span>View Heat Risk Map</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500" />
            </h3>
            <p className="text-[11px] ts-text-muted mt-1">
              Geospatial regional mapping of heat stress & vulnerability across reference locations.
            </p>
          </Link>

          <Link
            to="/gov/dispatch"
            className="p-4 rounded-2xl ts-card-elevated border ts-border hover:border-purple-500/50 transition-all group block"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-500 flex items-center justify-center mb-2">
              <Radio className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold ts-text-primary flex items-center justify-between">
              <span>Manage Alerts & Dispatch</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500" />
            </h3>
            <p className="text-[11px] ts-text-muted mt-1">
              Trigger advisories, manage alert broadcasts & daemon cycles.
            </p>
          </Link>

          <Link
            to="/gov/interventions"
            className="p-4 rounded-2xl ts-card-elevated border ts-border hover:border-orange-500/50 transition-all group block"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-500 flex items-center justify-center mb-2">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold ts-text-primary flex items-center justify-between">
              <span>Run Intervention Simulator</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500" />
            </h3>
            <p className="text-[11px] ts-text-muted mt-1">
              Model cooling center impact & outdoor work shift restrictions.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GovernmentHealthImpact;
