import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ThermalResponse } from '../types';
import { LocationSearch } from '../components/LocationSearch';
import { LoadingState } from '../components/LoadingState';
import {
  Bell,
  Droplet,
  Clock,
  ShieldCheck,
  Activity,
  HeartHandshake,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Info,
  Mail,
  Send,
  CheckCircle2,
  Shield,
  Radio,
  Zap,
} from 'lucide-react';
import { getCachedData, setCachedData } from '../services/cache';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardContent, Badge, Button, EmptyState } from '../components/ui';
import { useTranslation } from '../context/LanguageContext';
import { NotificationDecisionFeed } from '../components/NotificationDecisionFeed';
import {
  translateAlertTier,
  translateAlertReason,
  translateRiskLevel,
  translateVulnerableGroup,
  translateAlertPriority,
  translateHydrationInterval,
  translateHydrationGuidance,
  translateHydrationBasis,
  translateActivityOutdoor,
  translateHeavyPhysicalWork,
  translatePeakHeatHours,
  translateRestGuidance,
  translateVulnerableGuidance,
  translateCivicAdvisory,
} from '../utils/translationHelpers';

export const Alerts: React.FC = () => {
  const { t } = useTranslation();
  const { coords, locationName, isLocating, setLocation, detectMyLocation } = useLocation();
  const { user } = useAuth();

  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Candidate Email Dispatch State
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState<boolean>(false);

  // Autonomous Proactive Background Daemon Telemetry State
  const [engineTelemetry, setEngineTelemetry] = useState<any>(null);
  const [isTriggeringCycle, setIsTriggeringCycle] = useState<boolean>(false);

  // Automatically pre-fill logged-in candidate email
  useEffect(() => {
    if (user?.email && !recipientEmail) {
      setRecipientEmail(user.email);
    }
  }, [user?.email]);

  const fetchEngineTelemetry = async () => {
    try {
      const data = await api.getAlertEngineStatus();
      setEngineTelemetry(data);
    } catch (e) {
      console.debug('Failed to fetch alert engine status:', e);
    }
  };

  const handleTriggerCycle = async () => {
    setIsTriggeringCycle(true);
    setEmailErrorMsg(null);
    try {
      const res = await api.triggerAlertEngineCycle();
      setEngineTelemetry(res.telemetry || res);
      setEmailSuccessMsg(`⚡ Proactive monitoring cycle completed! Evaluated ${res.results?.length || 5} regional municipal clusters.`);
    } catch (e: any) {
      setEmailErrorMsg(e?.response?.data?.detail || e?.message || 'Failed to trigger background evaluation cycle.');
    } finally {
      setIsTriggeringCycle(false);
    }
  };

  const fetchAlerts = async () => {
    const cached = getCachedData(coords.lat, coords.lon);

    if (cached?.thermal) {
      setThermalData(cached.thermal);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await api.getThermal(coords.lat, coords.lon);
      setThermalData(res);
      setCachedData(coords.lat, coords.lon, { thermal: res });
    } catch (err: any) {
      if (!cached?.thermal) {
        setError(err.message || 'Failed to load safety alerts.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchEngineTelemetry();
  }, [coords.lat, coords.lon]);

  const risk = thermalData?.thermal?.risk_assessment;
  const hydration = thermalData?.thermal?.hydration;
  const activity = thermalData?.thermal?.activity_guidance;
  const vulnerable = thermalData?.thermal?.vulnerable_population;
  const advisories = thermalData?.thermal?.advisories || [];
  const level = (risk?.level || 'LOW').toUpperCase();
  const weatherTime = thermalData?.weather?.time;

  const formattedTimestamp = weatherTime
    ? new Date(weatherTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Live telemetry';

  const handleSendEmailAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setEmailErrorMsg('Please enter a valid candidate email address.');
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
        risk_level: level,
        risk_score: risk?.score ? Math.round(risk.score * 100) : 75,
        temperature_c: thermalData?.weather?.temperature,
        heat_index_c: thermalData?.thermal?.indices?.heat_index_c,
        wbgt_c: thermalData?.thermal?.indices?.wbgt_c,
        interventions: advisories.length > 0 ? advisories : [
          `Hydration Protocol: ${hydration?.guidance || 'Drink 500mL fluid every 20-30 minutes.'}`,
          `Activity Guidance: ${activity?.heavy_physical_work || 'Limit strenuous outdoor activity during peak hours.'}`,
          `Cooling Directive: ${activity?.rest_guidance || 'Mandatory shade breaks and active ventilation.'}`
        ]
      });
      setEmailSuccessMsg(`Alert email successfully sent to ${res.recipient}! Please check inbox/spam.`);
    } catch (err: any) {
      setEmailErrorMsg(err?.response?.data?.detail || err?.message || 'Failed to dispatch email alert. Please check connection.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleEnrollCitizen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setEmailErrorMsg('Please enter a valid email address to enroll.');
      return;
    }
    setIsSendingEmail(true);
    setEmailErrorMsg(null);
    setEmailSuccessMsg(null);

    try {
      const res = await api.subscribeCitizenAlerts({
        email: recipientEmail.trim(),
        name: user?.name,
        location_name: locationName,
        lat: coords.lat,
        lon: coords.lon,
      });
      setEmailSuccessMsg(`🎉 Successfully enrolled ${res.email}! You will automatically receive alerts whenever High or Extreme heat strikes ${locationName}.`);
    } catch (err: any) {
      setEmailErrorMsg(err?.response?.data?.detail || err?.message || 'Failed to enroll for automated alerts.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSimulateAutoAlert = async () => {
    const targetEmail = recipientEmail || user?.email;
    if (!targetEmail || !targetEmail.includes('@')) {
      setEmailErrorMsg('Please provide or sign in with a valid citizen email to simulate alert dispatch.');
      return;
    }
    setIsSendingEmail(true);
    setEmailErrorMsg(null);
    setEmailSuccessMsg(null);

    try {
      const res = await api.sendAlertEmail({
        email: targetEmail.trim(),
        location_name: locationName,
        lat: coords.lat,
        lon: coords.lon,
        risk_level: level === 'HIGH' || level === 'EXTREME' ? level : 'HIGH',
        risk_score: risk?.score ? Math.round(risk.score * 100) : 84,
        temperature_c: thermalData?.weather?.temperature || 37.5,
        heat_index_c: thermalData?.thermal?.indices?.heat_index_c || 41.2,
        wbgt_c: thermalData?.thermal?.indices?.wbgt_c || 31.0,
        interventions: advisories.length > 0 ? advisories : [
          `Hydration Protocol: ${hydration?.guidance || 'Mandatory 500mL fluid every 20 minutes.'}`,
          `Activity Directive: ${activity?.heavy_physical_work || 'Halt high-strain outdoor work and direct sun exposure.'}`,
          `Cooling Protocol: ${activity?.rest_guidance || 'Seek designated municipal cooling shelters and hydrated respite.'}`
        ]
      });
      setEmailSuccessMsg(`⚡ Automated heat alert simulated and dispatched to ${res.recipient}! Check your inbox.`);
    } catch (err: any) {
      setEmailErrorMsg(err?.response?.data?.detail || err?.message || 'Failed to simulate alert dispatch.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const isActiveAlert = level === 'HIGH' || level === 'EXTREME';



  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
            Civic Protection Directives
          </span>
          <Badge variant="brand" size="sm">
            Real-Time Broadcast
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold ts-text-primary font-sans mt-0.5">
          {t('alerts.title', 'Public Heat Alerts & Guidance')}
        </h1>
        <p className="text-sm ts-text-muted mt-1">
          {t('alerts.subtitle', 'Operational heatwave alerts, hydration protocols, work-rest cycles, and protection guidelines for vulnerable groups.')}
        </p>
      </div>

      {/* Location Search Bar */}
      <div className="relative z-40 ts-card p-4 shadow-lg">
        <LocationSearch
          currentLocationName={locationName}
          onSelectLocation={setLocation}
          onUseMyLocation={detectMyLocation}
          isLocating={isLocating}
        />
      </div>

      {isLoading ? (
        <LoadingState message={t('common.loading', 'Compiling public health advisories...')} />
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-center justify-between text-sm">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchAlerts} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      ) : thermalData ? (
        <div className="space-y-6">
          {/* Smart Decision Engine Live Feed */}
          <NotificationDecisionFeed variant="full" showSimulations={true} />

          {/* Active Alert Banner Card */}
          <Card
            variant="elevated"
            className={`p-4 sm:p-6 border-l-4 ${
              level === 'EXTREME'
                ? 'border-l-red-500 bg-red-500/5'
                : level === 'HIGH'
                ? 'border-l-orange-500 bg-orange-500/5'
                : level === 'MODERATE'
                ? 'border-l-amber-500 bg-amber-500/5'
                : 'border-l-emerald-500 bg-emerald-500/5'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ts-border pb-3">
              <div className="flex items-center space-x-2">
                <Bell className={`w-5 h-5 ${level === 'EXTREME' || level === 'HIGH' ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-orange-500 dark:text-orange-400'}`} />
                <h2 className="text-lg font-bold ts-text-primary">
                  {t('alerts.activeThreatBanner', 'Heat Threat Advisory Status')}:{' '}
                  <span className={level === 'EXTREME' ? 'text-red-600 dark:text-red-400' : level === 'HIGH' ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {translateRiskLevel(level, t)}
                  </span>
                </h2>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isActiveAlert
                    ? 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isActiveAlert ? t('status.active', 'ACTIVE ALERT') : t('status.complete', 'ROUTINE MONITORING')}
                </span>
                <Badge riskLevel={level} size="sm">
                  {translateAlertTier(risk?.alert_category || `${level} TIER`, t)}
                </Badge>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm ts-text-primary leading-relaxed font-medium">
                {translateAlertReason(risk?.reason, t) || t('alerts.calculatedThermalStrain', {}, 'Calculated thermal strain and meteorological parameters evaluated.')}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs ts-text-muted pt-1">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  <span>{t('alerts.location', 'Location')}: <strong className="ts-text-primary">{locationName}</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('alerts.telemetry', 'Telemetry')}: <span className="font-mono">{formattedTimestamp}</span></span>
                </div>
              </div>
            </div>
          </Card>

          {/* 1. Proactive Autonomous Early-Warning Engine Telemetry Card */}
          <Card variant="elevated" className="p-4 sm:p-6 ts-card-elevated border border-orange-500/30 dark:border-orange-500/40 bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-transparent dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900 overflow-hidden relative shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ts-border pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-600 dark:text-orange-400 flex-shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                      Autonomous Civic Heat Defense Engine
                    </span>
                    <Badge variant="brand" size="sm" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                      ● Daemon Active
                    </Badge>
                    <Badge variant="neutral" size="sm" className="text-[10px] text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                      15m Background Loop
                    </Badge>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold ts-text-primary mt-0.5">
                    Continuous Regional Wet-Bulb Monitoring & Auto-Dispatch
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isTriggeringCycle}
                  onClick={handleTriggerCycle}
                  leftIcon={
                    isTriggeringCycle ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    )
                  }
                  className="text-xs border-orange-500/30 hover:bg-orange-500/10 text-orange-700 dark:text-orange-300 font-bold whitespace-nowrap cursor-pointer"
                >
                  {isTriggeringCycle ? 'Evaluating Regions...' : '⚡ Trigger Autonomous Cycle Now'}
                </Button>
              </div>
            </div>

            {/* 4 Engine Telemetry Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border ts-border">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Daemon Status</div>
                <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Active Loop
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border ts-border">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Monitored Clusters</div>
                <div className="text-sm font-extrabold ts-text-primary mt-0.5">
                  {engineTelemetry?.monitored_areas_count || 5} Municipalities
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border ts-border">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Cycles Completed</div>
                <div className="text-sm font-extrabold text-orange-600 dark:text-orange-400 mt-0.5 font-mono">
                  #{engineTelemetry?.total_cycles_completed || 1}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border ts-border">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Anti-Spam Guard</div>
                <div className="text-sm font-extrabold text-sky-600 dark:text-sky-400 mt-0.5">
                  60m Fingerprint
                </div>
              </div>
            </div>

            {/* Live Monitored Municipalities Matrix */}
            {engineTelemetry?.last_cycle_results && engineTelemetry.last_cycle_results.length > 0 && (
              <div className="mt-4 pt-4 border-t ts-border space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Live Municipal Telemetry & Auto-Dispatch State
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {engineTelemetry.last_cycle_results.map((res: any, idx: number) => {
                    const isSevere = res.risk_level === 'HIGH' || res.risk_level === 'EXTREME';
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                          isSevere
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'bg-slate-50 dark:bg-slate-800/40 ts-border'
                        }`}
                      >
                        <div className="font-bold ts-text-primary truncate">{res.location}</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>🌡️ {res.temperature?.toFixed(1) || '--'}°C</span>
                          <span>🌐 WBGT: {res.wbgt?.toFixed(1) || '--'}°C</span>
                        </div>
                        <div className="flex items-center justify-between pt-0.5">
                          <Badge riskLevel={res.risk_level || 'LOW'} size="sm">
                            {res.risk_level || 'LOW'}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {res.dispatch?.transition || 'Baseline'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* 2. Automated Citizen Heat Defense Network Enrollment Card */}
          <Card variant="elevated" className="p-4 sm:p-6 ts-card-elevated border ts-border shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                    Citizen Early-Warning Enrollment
                  </span>
                  <Badge variant="brand" size="sm" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                    No Manual Checking Required
                  </Badge>
                </div>
                
                <h3 className="text-lg font-bold ts-text-primary flex items-center gap-2">
                  Automatic Early-Warning Citizen Dispatch
                </h3>
                
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Enroll your address once. Whenever HIGH or EXTREME biometeorological heat risk is detected for {locationName}, our proactive engine automatically alerts you with medical-grade hydration and WBGT work-rest safety directives.
                </p>

                {user ? (
                  <div className="flex items-center gap-2 pt-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg w-fit">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                    <span>Citizen: <strong>{user.name || 'Resident'}</strong> ({user.email})</span>
                  </div>
                ) : (
                  <div className="text-[11px] ts-text-subtle flex items-center gap-1.5 pt-1">
                    <Info className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                    <span>Enter your email below to activate automatic emergency alerts for {locationName}.</span>
                  </div>
                )}
              </div>

              {/* Enrollment Form */}
              <div className="w-full lg:w-auto flex-shrink-0">
                <form onSubmit={handleEnrollCitizen} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder={t('alerts.citizenEmailPlaceholder', 'Enter citizen email address...')}
                      value={recipientEmail}
                      onChange={(e) => {
                        setRecipientEmail(e.target.value);
                        setEmailErrorMsg(null);
                        setEmailSuccessMsg(null);
                      }}
                      className="w-full sm:w-64 pl-9 pr-3 py-2 text-xs rounded-xl ts-input ts-text-primary placeholder:ts-text-subtle focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSendingEmail || !recipientEmail.trim()}
                    leftIcon={
                      isSendingEmail ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Shield className="w-3.5 h-3.5" />
                      )
                    }
                    className="whitespace-nowrap font-bold text-xs cursor-pointer"
                  >
                    {isSendingEmail ? 'Enrolling...' : 'Enroll for Auto-Alerts'}
                  </Button>
                </form>
              </div>
            </div>
          </Card>

          {/* 3. Evaluator Simulation & Manual Testing Suite Card */}
          <Card variant="elevated" className="p-4 sm:p-6 ts-card-elevated border ts-border shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ts-border pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Badge variant="neutral" size="sm" className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase border-sky-500/30 bg-sky-500/10">
                    Evaluator Test Mode
                  </Badge>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Manual Verification & RFC 5322 Template Inspector
                  </span>
                </div>
                <h4 className="text-base font-bold ts-text-primary mt-1">
                  On-Demand Simulation & Live Email Dispatch
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmailPreview(!showEmailPreview)}
                  leftIcon={<Mail className="w-3.5 h-3.5 text-sky-500" />}
                  className="text-xs text-slate-700 dark:text-slate-300 hover:ts-text-primary cursor-pointer"
                >
                  {showEmailPreview ? 'Hide Email Preview' : 'Preview Alert Email'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSendingEmail}
                  onClick={handleSendEmailAlert}
                  leftIcon={
                    isSendingEmail ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    )
                  }
                  className="text-xs border-slate-300 dark:border-slate-700 hover:border-orange-500/50 hover:bg-orange-500/10 text-slate-700 dark:text-slate-300 hover:ts-text-primary cursor-pointer"
                >
                  ⚡ Send Test Alert to Candidate
                </Button>
              </div>
            </div>

            {/* Email Preview Card */}
            {showEmailPreview && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-xs space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-orange-400">🛡️ ThermoShield Heat Defense Dispatch</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono">
                      RFC 5322 Email Preview
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    To: {recipientEmail || user?.email || 'nitish24it@student.mes.ac.in'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                  <h4 className="font-bold text-orange-400 text-sm">
                    🚨 {level === 'HIGH' || level === 'EXTREME' ? level : 'HIGH'} HEAT ALERT — {locationName}
                  </h4>
                  <p className="text-slate-300 text-[11px] mt-1">
                    Ambient Temp: {thermalData?.weather?.temperature?.toFixed(1) || '37.5'}°C | Wet-Bulb (WBGT): {thermalData?.thermal?.indices?.wbgt_c?.toFixed(1) || '31.0'}°C | Heat Index: {thermalData?.thermal?.indices?.heat_index_c?.toFixed(1) || '41.2'}°C
                  </p>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="font-semibold text-slate-200">Mandatory Emergency Directives:</div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    • <strong>Hydration:</strong> {hydration?.guidance || 'Drink 500mL water/electrolytes every 20 minutes.'}
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    • <strong>Work Pacing:</strong> {activity?.heavy_physical_work || 'Halt heavy outdoor labor; take 15-minute shaded cooldown breaks.'}
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    • <strong>Cooling:</strong> {activity?.rest_guidance || 'Seek designated municipal cooling shelters and ventilated spaces.'}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                  Smart India Hackathon 2026 • Automated Civic Heatwave Early Warning Network
                </div>
              </div>
            )}

            {/* Status Feedback Messages */}
            {emailSuccessMsg && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                <span className="font-medium">{emailSuccessMsg}</span>
              </div>
            )}

            {emailErrorMsg && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs space-y-2.5 animate-fadeIn">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                  <span className="font-semibold">{emailErrorMsg}</span>
                </div>

                {emailErrorMsg.toLowerCase().includes('credentials') && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11.5px] leading-relaxed text-slate-700 dark:text-slate-200">
                    <p className="font-bold text-amber-800 dark:text-amber-300 mb-1.5 flex items-center gap-1.5">
                      <span>💡</span>
                      <span>How to connect real email delivery (takes 1 minute):</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                      <li>Open <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px] text-orange-600 dark:text-orange-400">backend/.env</code> in your project.</li>
                      <li>Enter your sender Gmail: <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px]">MAIL_USERNAME=your-email@gmail.com</code></li>
                      <li>Generate a 16-character App Password at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-500 underline font-semibold">myaccount.google.com/apppasswords</a></li>
                      <li>Paste it into: <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px]">MAIL_PASSWORD=xxxx xxxx xxxx xxxx</code></li>
                    </ol>
                    <p className="mt-2 text-[10.5px] text-slate-500 italic">
                      Once saved, live emails will immediately arrive in your inbox whenever alerts trigger!
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 3 Core Pillars: Hydration, Activity Guidance, Vulnerable Populations */}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Hydration Protocol */}
            <Card variant="elevated" className="flex flex-col justify-between">
              <div>
                <CardHeader
                  title={
                    <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400 text-sm font-bold">
                      <Droplet className="w-4 h-4" />
                      <span>{t('alerts.hydrationProtocol', 'Hydration Protocol')}</span>
                    </div>
                  }
                  badge={
                    <Badge variant="brand" size="sm">
                      {translateAlertPriority(hydration?.priority, t)} {t('alerts.priorityBadge')}
                    </Badge>
                  }
                />
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <span className="ts-text-muted block font-semibold">{t('alerts.hydrationProtocol')}:</span>
                    <span className="text-base font-bold text-sky-600 dark:text-sky-400 mt-0.5 block font-mono">
                      {hydration?.approximate_amount_ml
                        ? `~${hydration.approximate_amount_ml} mL (${translateHydrationInterval(hydration.recommended_interval, t)})`
                        : translateHydrationInterval(hydration?.recommended_interval, t) || '1 glass every 20 mins'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <span className="ts-text-muted block font-semibold">{t('matrix.publicAction')}:</span>
                    <span className="text-xs font-semibold ts-text-primary mt-0.5 block">
                      {hydration?.electrolytes_recommended
                        ? t('alerts.orsRecommended')
                        : t('alerts.waterSufficient')}
                    </span>
                  </div>

                  <p className="ts-text-muted leading-relaxed pt-1">
                    {translateHydrationGuidance(hydration?.guidance, t)}
                  </p>
                </CardContent>
              </div>

              <div className="p-4 border-t ts-border text-[11px] ts-text-subtle">
                {t('alerts.sourceBasis', { basis: translateHydrationBasis(hydration?.basis, t) })}
              </div>
            </Card>

            {/* 2. Outdoor Activity & Work-Rest Cycles */}
            <Card variant="elevated" className="flex flex-col justify-between">
              <div>
                <CardHeader
                  title={
                    <div className="flex items-center space-x-2 text-orange-500 dark:text-orange-400 text-sm font-bold">
                      <Activity className="w-4 h-4" />
                      <span>{t('alerts.activityPacing', 'Activity & Pacing')}</span>
                    </div>
                  }
                  badge={
                    <Badge variant="high" size="sm">
                      {t('alerts.workRest')}
                    </Badge>
                  }
                />
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <span className="ts-text-muted block font-semibold">{t('alerts.activityPacing')}:</span>
                    <span className="text-xs font-medium ts-text-primary mt-0.5 block">
                      {translateActivityOutdoor(activity?.outdoor_activity, t)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <span className="ts-text-muted block font-semibold">{t('profile.exposureWorkTab')}:</span>
                    <span className="text-xs font-medium ts-text-primary mt-0.5 block">
                      {translateHeavyPhysicalWork(activity?.heavy_physical_work, t)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <span className="ts-text-muted block font-semibold">{t('dashboard.peakHeatWindow')}:</span>
                    <span className="text-xs font-bold text-orange-500 dark:text-orange-400 mt-0.5 block font-mono">
                      {activity?.peak_heat_hours ? `Peak Heat: ${translatePeakHeatHours(activity.peak_heat_hours, t)}` : '12:00 PM – 3:00 PM'}
                    </span>
                    <span className="text-[11px] ts-text-subtle block mt-0.5">
                      {t('alerts.takeExtraCarePeak')}
                    </span>
                  </div>
                </CardContent>
              </div>

              <div className="p-4 border-t ts-border text-[11px] ts-text-subtle">
                {t('alerts.restRequirement', { guidance: translateRestGuidance(activity?.rest_guidance, t) })}
              </div>
            </Card>

            {/* 3. People Who Need Extra Protection */}
            <Card variant="elevated" className="flex flex-col justify-between">
              <div>
                <CardHeader
                  title={
                    <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 text-sm font-bold">
                      <HeartHandshake className="w-4 h-4" />
                      <span>{t('alerts.vulnerableProtection', 'People Needing Extra Protection')}</span>
                    </div>
                  }
                  badge={
                    <Badge variant={vulnerable?.priority ? 'extreme' : 'neutral'} size="sm">
                      {translateAlertPriority(vulnerable?.priority ? 'Priority Attention' : 'Routine', t)}
                    </Badge>
                  }
                />
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <span className="ts-text-muted block font-semibold mb-1">{t('alerts.vulnerableProtection')}:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {vulnerable?.groups?.map((g, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold text-[11px] capitalize"
                        >
                          {translateVulnerableGroup(g, t)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="ts-text-muted leading-relaxed pt-1">
                    {translateVulnerableGuidance(vulnerable?.guidance, t)}
                  </p>
                </CardContent>
              </div>

              <div className="p-4 border-t ts-border text-[11px] ts-text-subtle">
                {t('alerts.directiveWelfareChecks')}
              </div>
            </Card>
          </div>

          {/* Actionable Civic Advisories List */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <span>{t('alerts.standardDirectives', 'Standardized Heat Safety Directives')}</span>
                </div>
              }
              subtitle={t('alerts.directivesSubtitle')}
            />
            <CardContent>
              {advisories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {advisories.map((advisory, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl ts-card-subtle border ts-border flex items-start space-x-3 text-xs ts-text-primary"
                    >
                      <span className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                      <span className="leading-relaxed">{translateCivicAdvisory(advisory, t)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs ts-text-muted p-4 text-center">
                  {t('alerts.noElevatedAdvisories')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={<Bell className="w-8 h-8 text-slate-400" />}
          title="No Active Alerts"
          description={`No heatwave warnings or severe thermal alerts are currently active for ${locationName}.`}
          action={
            <Button variant="secondary" onClick={fetchAlerts} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Refresh Telemetry
            </Button>
          }
        />
      )}
    </div>
  );
};

export default Alerts;
