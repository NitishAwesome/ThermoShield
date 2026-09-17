import React, { useState, useEffect } from 'react';
import { RegionalAlertsPanel } from '../../components/RegionalAlertsPanel';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import {
  Radio,
  Zap,
  RefreshCw,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  MapPin,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
  Compass,
  HeartPulse,
  Sliders,
  ArrowRight,
  Terminal,
  Settings,
  Info,
  Smartphone,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button } from '../../components/ui';
import { DataRealityBadge } from '../../components/provenance';
import { NotificationDecisionFeed } from '../../components/NotificationDecisionFeed';
import { translateRiskLevel } from '../../utils/translationHelpers';
import { AlertDeliveryStatusResponse } from '../../types';

export const GovernmentDispatch: React.FC = () => {
  const { coords, locationName } = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [engineTelemetry, setEngineTelemetry] = useState<any>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<AlertDeliveryStatusResponse | null>(null);
  const [isTriggeringCycle, setIsTriggeringCycle] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = useState<string>(user?.email || '');
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState<boolean>(false);

  // SMS Test Dispatch State
  const [isSendingSMS, setIsSendingSMS] = useState<boolean>(false);
  const [recipientPhone, setRecipientPhone] = useState<string>(user?.phone_number || '+91 9811223344');
  const [smsSuccessMsg, setSmsSuccessMsg] = useState<string | null>(null);
  const [smsErrorMsg, setSmsErrorMsg] = useState<string | null>(null);
  const [showSmsPreview, setShowSmsPreview] = useState<boolean>(false);

  // Progressive Disclosure Toggles
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);
  const [showTestingTools, setShowTestingTools] = useState<boolean>(false);

  const fetchTelemetry = async () => {
    try {
      const [data, delivery] = await Promise.all([
        api.getAlertEngineStatus(),
        api.getAlertDeliveryStatus().catch(() => null),
      ]);
      setEngineTelemetry(data);
      if (delivery) {
        setDeliveryStatus(delivery);
      }
    } catch (e) {
      console.debug('Failed to fetch engine telemetry:', e);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const handleTriggerCycle = async () => {
    setIsTriggeringCycle(true);
    setEmailErrorMsg(null);
    try {
      const res = await api.triggerAlertEngineCycle();
      setEngineTelemetry(res.telemetry || res);
      setEmailSuccessMsg(`⚡ Manual evaluation completed across monitored regional clusters.`);
    } catch (e: any) {
      setEmailErrorMsg(e?.response?.data?.detail || e?.message || 'Failed to trigger background evaluation cycle.');
    } finally {
      setIsTriggeringCycle(false);
    }
  };

  const handleSendTestAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setEmailErrorMsg('Please provide a valid recipient email address.');
      return;
    }
    setIsSendingEmail(true);
    setEmailErrorMsg(null);
    setEmailSuccessMsg(null);

    try {
      const res = await api.sendAlertEmail({
        email: recipientEmail.trim(),
        location_name: locationName,
        lat: coords.lat,
        lon: coords.lon,
        risk_level: 'HIGH',
        risk_score: 82.0,
        temperature_c: 37.8,
        wbgt_c: 31.4,
        heat_index_c: 42.0,
        interventions: [
          'Municipal directive: Halt unshaded outdoor labor between 12:00 PM and 3:00 PM.',
          'Deploy emergency mobile drinking water tankers to transit hubs and market areas.',
          'Activate designated air-cooled municipal shelters and primary healthcare centers.',
          'Issue community alert bulletins across regional media.',
        ],
      });
      if (res?.status === 'skipped') {
        setEmailErrorMsg('SMTP credentials are not configured. No email was sent.');
      } else {
        setEmailSuccessMsg(`Test email dispatched successfully to ${res.recipient}!`);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || '';
      if (detail.includes('SMTP mail credentials not configured') || detail.includes('not configured')) {
        setEmailErrorMsg('SMTP credentials are not configured. No email was sent.');
      } else {
        setEmailErrorMsg(detail || 'Failed to dispatch alert email.');
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendTestSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = recipientPhone.trim();
    if (!phone || phone.length < 7) {
      setSmsErrorMsg('Please provide a valid phone number (at least 7 digits).');
      return;
    }
    setIsSendingSMS(true);
    setSmsErrorMsg(null);
    setSmsSuccessMsg(null);

    try {
      const res = await api.sendTestSMS({
        phone_number: phone,
        location_name: locationName,
        message: `[ThermoShield TEST ALERT] Heatwave early warning test for ${locationName}. Stage 2 HAP protocol active. Seek shade and hydrate.`,
      });

      if (res.status === 'ACCEPTED') {
        setSmsSuccessMsg(`Live SMS queued via Twilio to ${res.recipient}! (Message SID: ${res.message_id})`);
      } else if (res.status === 'SIMULATED') {
        setSmsSuccessMsg(`Simulated SMS dispatched (Demo Mode) to ${res.recipient}. Provider: ${res.provider} • ID: ${res.message_id}. Logged to server stdout.`);
      } else {
        setSmsErrorMsg(res.error || 'Failed to dispatch SMS alert.');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to dispatch test SMS.';
      setSmsErrorMsg(detail);
    } finally {
      setIsSendingSMS(false);
    }
  };

  const lastCycleResults = engineTelemetry?.last_cycle_results || [];

  return (
    <div className="space-y-8 pb-16">
      {/* HEADER */}
      <div className="rounded-3xl ts-card p-6 sm:p-7 border ts-border shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ts-border">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-purple-500 flex items-center space-x-1">
                <Radio className="w-4 h-4" />
                <span>Response Operations Center</span>
              </span>
              <DataRealityBadge tier="LIVE" size="xs" customLabel="Operational Dispatch" />
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                Alerts & Dispatch
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black ts-text-primary tracking-tight font-sans mt-1">
              Alerts & Response Operations
            </h1>
            <p className="text-xs sm:text-sm ts-text-muted mt-1 leading-relaxed">
              What alerts are active, which areas are affected, is monitoring working, and what dispatch action is currently taking place?
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs ts-text-muted">
            <MapPin className="w-3.5 h-3.5 text-purple-500" />
            <span>
              <strong className="ts-text-primary font-bold">Region:</strong> {locationName}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1 — CURRENT ALERT SITUATION */}
      <RegionalAlertsPanel authority />
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b ts-border">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-wider text-purple-500">
              Current Alert Situation
            </h2>
          </div>
          <Badge riskLevel="HIGH" size="md" showDot showIcon>
            {lastCycleResults.some((r: any) => ['HIGH', 'EXTREME'].includes(r.risk_level)) ? 'Severe conditions detected' : 'Monitoring status'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Active Advisory
            </div>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">
              {lastCycleResults.some((r: any) => ['HIGH', 'EXTREME'].includes(r.risk_level)) ? 'Severe heat detected' : engineTelemetry?.last_cycle_timestamp ? 'No severe heat detected' : 'Awaiting evaluation'}
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              Delivery confirmation is shown in ward dispatch history
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Affected Sectors
            </div>
            <div className="text-2xl font-black ts-text-primary mt-1 font-mono">
              {engineTelemetry?.monitored_areas_count ?? '—'} Reference Sectors
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              Priority regional clusters
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Operational Status
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{engineTelemetry?.daemon_running ? 'Running' : engineTelemetry ? 'Stopped' : 'Unavailable'}</span>
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              Background monitoring status
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Peak Danger Window
            </div>
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1 font-mono">
              12 PM – 4 PM
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              Afternoon peak radiation
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 — BACKGROUND MONITORING STATUS */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b ts-border">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-emerald-500">
              Monitoring & Alert Engine
            </div>
            <h2 className="text-xl font-black ts-text-primary mt-0.5">
              Background Heat Monitoring
            </h2>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{engineTelemetry?.daemon_running ? 'Monitoring running' : 'Monitoring stopped'}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Evaluation Interval
            </div>
            <div className="text-2xl font-black ts-text-primary mt-1 font-mono">
              15 Minutes
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              Automated continuous cycle
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Last Evaluation Status
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {engineTelemetry?.last_cycle_timestamp ? 'Completed' : 'Not evaluated yet'}
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              Cycle #{engineTelemetry?.total_cycles_completed ?? 0}
            </div>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="text-[11px] font-bold uppercase tracking-wider ts-text-subtle">
              Monitored Jurisdictions
            </div>
            <div className="text-2xl font-black ts-text-primary mt-1 font-mono">
              {engineTelemetry?.monitored_areas_count ?? '—'} Sectors
            </div>
            <div className="text-[11px] ts-text-muted mt-0.5">
              Live telemetry tracking
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3 — AFFECTED AREAS */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b ts-border">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-purple-500">
              Sector Monitoring
            </div>
            <h2 className="text-xl font-black ts-text-primary mt-0.5">
              Areas Under Review
            </h2>
          </div>
          <Link
            to="/gov/matrix"
            className="text-xs font-extrabold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>View Full Municipal Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          {lastCycleResults.length > 0 ? (
            lastCycleResults.slice(0, 3).map((res: any, idx: number) => {
              const isSevere = res.risk_level === 'HIGH' || res.risk_level === 'EXTREME' || res.risk_level === 'CRITICAL';
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    isSevere ? 'bg-red-500/10 border-red-500/30' : 'ts-card-subtle border ts-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-400 font-mono">
                        Sector #{idx + 1}
                      </span>
                      {res.risk_level ? <Badge riskLevel={res.risk_level} size="sm">
                        {translateRiskLevel(res.risk_level, t)}
                      </Badge> : <span className="text-xs ts-text-muted">Unavailable</span>}
                    </div>
                    <h3 className="text-base font-black ts-text-primary mt-2">
                      {res.location}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t ts-border flex items-center justify-between text-xs font-mono ts-text-muted">
                    <span>Temp: {res.temperature?.toFixed(1) || '--'}°C</span>
                    <span>WBGT: {res.wbgt?.toFixed(1) || '--'}°C</span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm ts-text-muted sm:col-span-3">No monitoring results yet. Refresh telemetry to evaluate current conditions.</p>
          )}
        </div>
      </div>

      {/* SECTION 4 — DISPATCH ACTIVITY */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl">
        <div className="pb-4 border-b ts-border">
          <div className="text-xs font-black uppercase tracking-wider text-purple-500">
            Response Channels
          </div>
          <h2 className="text-xl font-black ts-text-primary mt-0.5">
            Dispatch Activity & Broadcast Channels
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold ts-text-primary">Email Dispatch</span>
              <DataRealityBadge tier={deliveryStatus?.email?.status === 'OPERATIONAL' ? 'LIVE' : 'SIMULATED'} size="xs" customLabel={deliveryStatus?.email?.display_status || 'Email status unavailable'} />
            </div>
            <p className="text-xs ts-text-muted mt-2 leading-relaxed">
              {deliveryStatus?.email?.status === 'OPERATIONAL'
                ? 'SMTP is configured for live email. A configured gateway does not confirm delivery.'
                : 'Live email delivery is not active. Test and development modes simulate delivery.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold ts-text-primary">SMS Broadcast Gateway</span>
              {deliveryStatus?.sms?.mode === 'LIVE' ? (
                <DataRealityBadge tier="LIVE" size="xs" customLabel="Operational (Twilio Live)" />
              ) : (
                <DataRealityBadge tier="SIMULATED" size="xs" customLabel="Demo Simulation Mode" />
              )}
            </div>
            <p className="text-xs ts-text-muted mt-2 leading-relaxed">
              {deliveryStatus?.sms?.mode === 'LIVE'
                ? `Active Twilio cellular gateway. Dispatches real regional SMS alerts to phone recipients (From: ${deliveryStatus?.sms?.from_number}).`
                : 'State disaster management SMS gateway integration candidate. Operates in console demonstration simulation mode with honest IDs.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl ts-card-subtle border ts-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold ts-text-primary">WhatsApp Alert Bot</span>
              <DataRealityBadge tier={deliveryStatus?.whatsapp?.can_deliver ? 'LIVE' : 'SIMULATED'} size="xs" customLabel={deliveryStatus?.whatsapp?.display_status || 'Status unavailable'} />
            </div>
            <p className="text-xs ts-text-muted mt-2 leading-relaxed">
              Ward subscriptions use an approved WhatsApp template. Provider receipts confirm delivery; demo mode sends no messages.
            </p>
          </div>
        </div>

        {/* Planning Tool Distinction */}
        <div className="mt-5 pt-4 border-t ts-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono">
                Intervention Planning vs. Active Dispatch
              </span>
            </div>
            <p className="text-xs ts-text-muted mt-0.5 max-w-2xl leading-relaxed">
              Dispatch executes real-time emergency broadcasts and operational responses. To model hypothetical cooling center activations, work-shift pauses, or water distribution before issuing directives, explore scenarios in the simulator.
            </p>
          </div>
          <Link
            to="/gov/interventions"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap flex-shrink-0"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Evaluate Response Scenarios →</span>
          </Link>
        </div>
      </div>

      {/* SECTION 5 — MANUAL EVALUATION */}
      <div className="rounded-3xl ts-card p-6 sm:p-8 border ts-border shadow-xl bg-orange-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <h2 className="text-xs font-black uppercase tracking-wider text-orange-500">
                Manual Evaluation Trigger
              </h2>
            </div>
            <h3 className="text-lg font-black ts-text-primary mt-1">
              Evaluate Current Conditions
            </h3>
            <p className="text-xs ts-text-muted mt-1 leading-relaxed max-w-2xl">
              Refresh weather and thermal-stress telemetry across monitored clusters without sending messages. Use Regional alert dispatch above for jurisdiction-scoped subscriber warnings.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={isTriggeringCycle}
            onClick={handleTriggerCycle}
            leftIcon={
              isTriggeringCycle ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 text-white" />
              )
            }
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold whitespace-nowrap cursor-pointer shadow-md"
          >
            {isTriggeringCycle ? 'Evaluating Clusters...' : 'Refresh Monitoring Telemetry'}
          </Button>
        </div>

        {emailSuccessMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>{emailSuccessMsg}</span>
          </div>
        )}

        {emailErrorMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{emailErrorMsg}</span>
          </div>
        )}
      </div>

      {/* SECTION 6 — TECHNICAL MONITORING DETAILS (PROGRESSIVE DISCLOSURE) */}
      <div className="rounded-3xl ts-card p-6 border ts-border shadow-md">
        <button
          type="button"
          onClick={() => setShowTechDetails(!showTechDetails)}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider ts-text-subtle hover:ts-text-primary transition-colors cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-purple-500" />
            <span>Technical Monitoring Details & Daemon Telemetry</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>{showTechDetails ? 'Hide Details' : 'Show Details'}</span>
            {showTechDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showTechDetails && (
          <div className="mt-4 pt-4 border-t ts-border space-y-4 animate-ts-fade-in text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                <div className="text-[10px] uppercase font-bold ts-text-subtle">Worker Status</div>
                <div className="text-xs font-bold text-emerald-500 mt-0.5">Active Background Loop</div>
              </div>
              <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                <div className="text-[10px] uppercase font-bold ts-text-subtle">Monitored Clusters</div>
                <div className="text-xs font-bold ts-text-primary mt-0.5">{engineTelemetry?.monitored_areas_count || 5} Clusters</div>
              </div>
              <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                <div className="text-[10px] uppercase font-bold ts-text-subtle">Cycles Completed</div>
                <div className="text-xs font-bold text-orange-500 mt-0.5 font-mono">#{engineTelemetry?.total_cycles_completed ?? 0}</div>
              </div>
              <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                <div className="text-[10px] uppercase font-bold ts-text-subtle">Anti-Spam Cooldown</div>
                <div className="text-xs font-bold text-sky-500 mt-0.5">60 Minutes Window</div>
              </div>
            </div>

            {lastCycleResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold ts-text-primary">Last Evaluation Cycle Raw Telemetry</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="border-b ts-border ts-text-subtle">
                        <th className="py-2 px-3">Location</th>
                        <th className="py-2 px-3">Temp (°C)</th>
                        <th className="py-2 px-3">WBGT (°C)</th>
                        <th className="py-2 px-3">Risk Level</th>
                        <th className="py-2 px-3">Transition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y ts-border">
                      {lastCycleResults.map((r: any, i: number) => (
                        <tr key={i} className="ts-text-muted">
                          <td className="py-2 px-3 font-semibold ts-text-primary">{r.location}</td>
                          <td className="py-2 px-3 font-mono">{r.temperature?.toFixed(1) || '--'}</td>
                          <td className="py-2 px-3 font-mono">{r.wbgt?.toFixed(1) || '--'}</td>
                          <td className="py-2 px-3">
                            <Badge riskLevel={r.risk_level || null} size="sm">
                              {r.risk_level || '—'}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px]">{r.dispatch?.transition || 'Baseline'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 7 — TESTING & TECHNICAL TOOLS (GROUPED COLLAPSIBLE AREA) */}
      <div className="rounded-3xl ts-card p-6 border ts-border shadow-md">
        <button
          type="button"
          onClick={() => setShowTestingTools(!showTestingTools)}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider ts-text-subtle hover:ts-text-primary transition-colors cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Testing & Technical Operations Suite</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>{showTestingTools ? 'Collapse Tools' : 'Expand Tools'}</span>
            {showTestingTools ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showTestingTools && (
          <div className="mt-4 pt-4 border-t ts-border space-y-6 animate-ts-fade-in">
            {/* Authority Test Dispatch */}
            <Card variant="elevated" className="p-4 sm:p-5 border ts-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b ts-border pb-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-500">
                    Authority Test Dispatch & Inspection
                  </h4>
                  <p className="text-xs ts-text-muted mt-0.5">
                    Send a test advisory email to verify messaging delivery.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmailPreview(!showEmailPreview)}
                  leftIcon={<Mail className="w-3.5 h-3.5 text-sky-500" />}
                  className="text-xs cursor-pointer"
                >
                  {showEmailPreview ? 'Hide Sample Message' : 'Inspect Sample Message'}
                </Button>
              </div>

              <form onSubmit={handleSendTestAlert} className="mt-4 flex flex-col sm:flex-row gap-2.5 max-w-xl">
                <input
                  type="email"
                  required
                  placeholder="Enter recipient authority email..."
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl ts-input ts-text-primary focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSendingEmail || !recipientEmail.trim()}
                  leftIcon={
                    isSendingEmail ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )
                  }
                  className="text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  {isSendingEmail ? 'Dispatching...' : 'Dispatch Test Alert'}
                </Button>
              </form>

              {showEmailPreview && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-orange-400">🛡️ ThermoShield Heatwave Emergency Directive</span>
                    <span className="text-[10px] text-slate-400">To: {recipientEmail || 'authority@health.gov.in'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <h5 className="font-bold text-red-400 text-sm">🚨 HIGH HEAT RISK WARNING — {locationName}</h5>
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      Ambient: 37.8°C | Wet-Bulb (WBGT): 31.4°C | Severity: Stage 2 HAP Protocol
                    </p>
                  </div>
                  <ul className="space-y-1 text-slate-300 list-disc list-inside text-[11px]">
                    <li>Halt unshaded outdoor labor between 12:00 PM and 3:00 PM.</li>
                    <li>Deploy mobile drinking water tankers to congested transit hubs.</li>
                    <li>Open designated air-cooled municipal shelters.</li>
                  </ul>
                </div>
              )}
            </Card>

            {/* Cellular SMS Test Dispatch */}
            <Card variant="elevated" className="p-4 sm:p-5 border ts-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b ts-border pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                      Cellular SMS Test Dispatch & Truthfulness Inspector
                    </h4>
                    {deliveryStatus?.sms?.mode === 'LIVE' ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        Live Twilio Gateway
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        Demo Simulation Mode
                      </span>
                    )}
                  </div>
                  <p className="text-xs ts-text-muted mt-0.5">
                    Verify cellular SMS deliverability. Dispatches live via Twilio if configured, or outputs truthful simulation logs to the console.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSmsPreview(!showSmsPreview)}
                  leftIcon={<Smartphone className="w-3.5 h-3.5 text-emerald-500" />}
                  className="text-xs cursor-pointer"
                >
                  {showSmsPreview ? 'Hide SMS Format' : 'Inspect SMS Format'}
                </Button>
              </div>

              <form onSubmit={handleSendTestSMS} className="mt-4 flex flex-col sm:flex-row gap-2.5 max-w-xl">
                <input
                  type="tel"
                  required
                  placeholder="Enter recipient phone (+91 9811223344)..."
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl ts-input ts-text-primary focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSendingSMS || !recipientPhone.trim()}
                  leftIcon={
                    isSendingSMS ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )
                  }
                  className="text-xs font-bold whitespace-nowrap cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {isSendingSMS ? 'Dispatching SMS...' : 'Dispatch Test SMS'}
                </Button>
              </form>

              {smsSuccessMsg && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{smsSuccessMsg}</span>
                </div>
              )}

              {smsErrorMsg && (
                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{smsErrorMsg}</span>
                </div>
              )}

              {showSmsPreview && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-emerald-400">📱 Mobile SMS Preview (160 GSM Character Format)</span>
                    <span className="text-[10px] text-slate-400">To: {recipientPhone}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200">
                    [ThermoShield TEST ALERT] Heatwave early warning test for {locationName}. Stage 2 HAP protocol active. Seek shade and hydrate.
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Provider Mode: {deliveryStatus?.sms?.display_status || 'Demo Simulation Mode'} • Gateway Status: {deliveryStatus?.sms?.status || 'DEMO_SIMULATION'}
                  </div>
                </div>
              )}
            </Card>

            {/* Decision Engine Live Evaluation & Testing Suite */}
            <NotificationDecisionFeed variant="full" showSimulations={true} />
          </div>
        )}
      </div>

      {/* SECTION 8 — RESPONSE CONTEXT */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-4 h-4 text-purple-500" />
          <h2 className="text-xs font-black uppercase tracking-wider ts-text-subtle">
            Connected Response Tools
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              Geospatial regional mapping centered on curated monitoring reference coordinates.
            </p>
          </Link>

          <Link
            to="/gov/health-impact"
            className="p-4 rounded-2xl ts-card-elevated border ts-border hover:border-rose-500/50 transition-all group block"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center mb-2">
              <HeartPulse className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold ts-text-primary flex items-center justify-between">
              <span>Review Health Impact</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500" />
            </h3>
            <p className="text-[11px] ts-text-muted mt-1">
              Modelled service pressure planning indicators and surge estimation.
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
              Explore hypothetical cooling center and work-rest scenarios.
            </p>
          </Link>

          <Link
            to="/gov/matrix"
            className="p-4 rounded-2xl ts-card-elevated border ts-border hover:border-emerald-500/50 transition-all group block"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-2">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold ts-text-primary flex items-center justify-between">
              <span>View Full Municipal Matrix</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500" />
            </h3>
            <p className="text-[11px] ts-text-muted mt-1">
              Comparative analysis across regional monitoring locations.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GovernmentDispatch;
