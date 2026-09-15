import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Building2,
  RefreshCw,
  Send,
  Sliders,
  Droplets,
  HardHat,
  HeartPulse,
  Zap,
  ChevronRight,
  Info,
  UserCheck,
  Calendar,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { Card, Badge, Button } from '../../components/ui';
import { api } from '../../services/api';
import {
  HeatActionPlanResponse,
  HeatActionItem,
  HeatActionCategory,
  HeatActionTriggerState,
  RiskLevel,
} from '../../types';

// Curated municipal ward quick choices
const BMC_WARDS = [
  { id: 'ward_f_south', name: 'Ward F/South (Parel, Sewri, Naigaon)', district: 'Mumbai City', vuln: 75 },
  { id: 'ward_g_north', name: 'Ward G/North (Dharavi, Dadar West, Mahim)', district: 'Mumbai City', vuln: 88 },
  { id: 'ward_m_east', name: 'Ward M/East (Govandi, Mankhurd, Deonar)', district: 'Eastern Suburbs', vuln: 85 },
  { id: 'ward_k_west', name: 'Ward K/West (Andheri West, Juhu, Versova)', district: 'Western Suburbs', vuln: 45 },
  { id: 'ward_k_east', name: 'Ward K/East (Andheri East, Jogeshwari East)', district: 'Western Suburbs', vuln: 68 },
  { id: 'ward_a', name: 'Ward A (Colaba, Fort, Nariman Point)', district: 'South Mumbai', vuln: 25 },
  { id: 'ward_e', name: 'Ward E (Byculla, Mazgaon, Kamathipura)', district: 'South Mumbai', vuln: 78 },
  { id: 'ward_l', name: 'Ward L (Kurla, Chunabhatti, Sakinaka)', district: 'Eastern Suburbs', vuln: 82 },
  { id: 'ward_c', name: 'Ward C (Chandanwadi, Bhuleshwar, Kalbadevi)', district: 'South Mumbai', vuln: 72 },
  { id: 'ward_h_east', name: 'Ward H/East (Bandra East, Khar East)', district: 'Western Suburbs', vuln: 62 },
];

const CATEGORIES: { key: HeatActionCategory | 'ALL'; label: string; icon: any }[] = [
  { key: 'ALL', label: 'All Categories', icon: Filter },
  { key: 'COOLING', label: 'Cooling & Respite', icon: Droplets },
  { key: 'OUTDOOR_WORK', label: 'Outdoor Work', icon: HardHat },
  { key: 'HYDRATION', label: 'Hydration & Water', icon: Droplets },
  { key: 'HEALTH_PREPAREDNESS', label: 'Health Preparedness', icon: HeartPulse },
  { key: 'INFRASTRUCTURE', label: 'Critical Infrastructure', icon: Zap },
];

export const GovernmentHeatActionPlan: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialWard = searchParams.get('ward') || 'ward_f_south';

  const [selectedWardId, setSelectedWardId] = useState<string>(initialWard);
  const [plan, setPlan] = useState<HeatActionPlanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<HeatActionCategory | 'ALL'>('ALL');
  const [notesState, setNotesState] = useState<Record<string, string>>({});
  const [updatingAction, setUpdatingAction] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Sync ward param with URL
  const loadPlan = async (wardId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHeatActionPlan(wardId);
      setPlan(data);
    } catch (err: any) {
      console.error('Failed to load heat action plan:', err);
      setError('Unable to load heat action plan. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan(selectedWardId);
    setSearchParams({ ward: selectedWardId });
  }, [selectedWardId]);

  const handleDecisionUpdate = async (
    actionKey: string,
    decisionStatus: 'Reviewed' | 'Acknowledged' | 'Deferred' | 'Action Initiated Externally'
  ) => {
    if (!plan) return;
    setUpdatingAction(actionKey);
    try {
      const note = notesState[actionKey] || '';
      await api.updateActionDecision({
        area_id: plan.area_id,
        action_key: actionKey,
        decision_status: decisionStatus,
        officer_notes: note,
      });

      // Update local state smoothly
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          recommended_actions: prev.recommended_actions.map((act) =>
            act.action === actionKey
              ? {
                  ...act,
                  decision_status: decisionStatus,
                  decision_notes: note,
                  decision_timestamp: new Date().toISOString(),
                }
              : act
          ),
        };
      });

      setFeedbackMessage(`Status updated to "${decisionStatus}" for ${actionKey}`);
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err) {
      console.error('Decision update error:', err);
      alert('Failed to record decision. Please verify backend connection.');
    } finally {
      setUpdatingAction(null);
    }
  };

  const filteredActions = useMemo(() => {
    if (!plan) return [];
    if (activeCategory === 'ALL') return plan.recommended_actions;
    return plan.recommended_actions.filter((a) => a.category === activeCategory);
  }, [plan, activeCategory]);

  const getTriggerStateDisplay = (state?: HeatActionTriggerState) => {
    switch (state) {
      case 'ACTION_REVIEW_REQUIRED_NOW':
        return {
          title: 'ACTION REVIEW REQUIRED NOW',
          subtitle: 'Critical biometeorological threshold exceeded. Immediate administrative directives warranted.',
          color: 'bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300',
          badge: 'bg-red-500 text-white',
          pulse: true,
        };
      case 'PREPARE_WITHIN_24_HOURS':
        return {
          title: 'PREPARE WITHIN 24 HOURS',
          subtitle: 'Predictive models project severe thermal surge approaching tomorrow. Pre-stage civic assets.',
          color: 'bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300',
          badge: 'bg-orange-500 text-white',
          pulse: false,
        };
      case 'PREPARE_WITHIN_3_DAYS':
        return {
          title: 'PREPARE WITHIN 3 DAYS',
          subtitle: 'Multi-day forecast shows thermal accumulation. Coordinate inter-departmental readiness.',
          color: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300',
          badge: 'bg-amber-500 text-white',
          pulse: false,
        };
      default:
        return {
          title: 'MONITOR NORMAL BASELINE',
          subtitle: 'Thermal conditions remain within seasonal tolerances. Routine civic vigilance maintained.',
          color: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
          badge: 'bg-emerald-500 text-white',
          pulse: false,
        };
    }
  };

  const triggerMeta = getTriggerStateDisplay(plan?.trigger_state);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30">
              City Administration Decision Engine
            </span>
            <span className="text-xs ts-text-muted">• SIH26083 Localized Trigger API</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black ts-text-primary flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-orange-500" />
            Heat Action Plan Triggers & Review
          </h1>
          <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-3xl">
            Machine-readable, zone-specific operational triggers for city administration to initiate, coordinate, and review Heat Action Plan directives before dangerous microclimate peaks.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPlan(selectedWardId)}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-evaluate</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/gov/dispatch?ward=${selectedWardId}`)}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch Channels</span>
          </Button>
        </div>
      </div>

      {/* Ward Selector Bar */}
      <Card variant="elevated" className="p-4 border ts-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold ts-text-muted uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-orange-500" />
              Select Administrative Ward / Municipal Zone:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {BMC_WARDS.map((w) => {
                const isSelected = w.id === selectedWardId;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWardId(w.id)}
                    className={`p-2 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-orange-300 font-bold shadow-sm'
                        : 'ts-card-subtle border ts-border hover:bg-slate-500/10 ts-text-primary'
                    }`}
                  >
                    <div className="truncate font-semibold">{w.name.split('(')[0]}</div>
                    <div className="text-[10px] ts-text-muted truncate">
                      {w.district} • Vuln: {w.vuln}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Loading & Error States */}
      {loading && (
        <Card variant="elevated" className="p-12 text-center ts-text-muted space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-orange-500" />
          <p className="text-sm font-bold ts-text-primary">Evaluating Localized Heat Action Plan...</p>
          <p className="text-xs">Computing biometeorological WBGT, socio-demographic vulnerability, and rule justifications.</p>
        </Card>
      )}

      {error && !loading && (
        <Card variant="elevated" className="p-6 border-red-500/40 bg-red-500/10 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 mx-auto text-red-500" />
          <p className="text-sm font-bold text-red-600 dark:text-red-300">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadPlan(selectedWardId)}>
            Retry Evaluation
          </Button>
        </Card>
      )}

      {/* Main Content Area */}
      {plan && !loading && (
        <div className="space-y-6 animate-fadeIn">
          {/* Feedback Toast */}
          {feedbackMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {feedbackMessage}
              </span>
              <button
                type="button"
                onClick={() => setFeedbackMessage(null)}
                className="text-[10px] uppercase underline hover:opacity-80"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Trigger State Banner */}
          <div className={`p-5 sm:p-6 rounded-2xl border shadow-lg ${triggerMeta.color} space-y-3`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-sm ${triggerMeta.badge} ${
                    triggerMeta.pulse ? 'animate-pulse' : ''
                  }`}
                >
                  {plan.trigger_state.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-mono font-bold">
                  Target: {plan.area_name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    plan.risk_level === 'EXTREME'
                      ? 'extreme'
                      : plan.risk_level === 'HIGH'
                      ? 'high'
                      : 'moderate'
                  }
                  size="sm"
                >
                  Current Thermal Risk: {plan.risk_level} ({plan.risk_score}/100)
                </Badge>
              </div>
            </div>

            <h2 className="text-lg sm:text-xl font-black">{triggerMeta.title}</h2>
            <p className="text-xs sm:text-sm leading-relaxed opacity-90">{triggerMeta.subtitle}</p>

            {/* Telemetry Strip */}
            <div className="pt-3 border-t border-current/20 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-black/10 dark:bg-white/5">
                <span className="text-[10px] opacity-75 block">Ambient Temp</span>
                <span className="font-bold text-sm">{plan.evaluated_telemetry.temperature_c}°C</span>
              </div>
              <div className="p-2 rounded-lg bg-black/10 dark:bg-white/5">
                <span className="text-[10px] opacity-75 block">Rel Humidity</span>
                <span className="font-bold text-sm">{plan.evaluated_telemetry.humidity_pct}%</span>
              </div>
              <div className="p-2 rounded-lg bg-black/10 dark:bg-white/5">
                <span className="text-[10px] opacity-75 block">Derived WBGT</span>
                <span className="font-bold text-sm text-red-500 dark:text-red-400">
                  {plan.evaluated_telemetry.wbgt_c}°C
                </span>
              </div>
              <div className="p-2 rounded-lg bg-black/10 dark:bg-white/5">
                <span className="text-[10px] opacity-75 block">Heat Index</span>
                <span className="font-bold text-sm">{plan.evaluated_telemetry.heat_index_c}°C</span>
              </div>
              <div className="p-2 rounded-lg bg-black/10 dark:bg-white/5">
                <span className="text-[10px] opacity-75 block">Vulnerability</span>
                <span className="font-bold text-sm">{plan.evaluated_telemetry.vulnerability_score}/100</span>
              </div>
              <div className="p-2 rounded-lg bg-black/10 dark:bg-white/5">
                <span className="text-[10px] opacity-75 block">Forecast Trend</span>
                <span className="font-bold text-sm uppercase">{plan.evaluated_telemetry.forecast_trend}</span>
              </div>
            </div>
          </div>

          {/* Rule Transparency (Why Triggered) */}
          <Card variant="elevated" className="p-5 border ts-border space-y-3">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-black ts-text-primary uppercase tracking-wider font-sans">
                Rule Transparency — Why This Trigger Appeared
              </h3>
            </div>
            <p className="text-xs ts-text-muted">
              Municipal recommendations are derived strictly from published National Disaster Management Authority (NDMA) thresholds and verified biometeorological indices (no hidden AI black-boxes):
            </p>
            <div className="space-y-2 pt-1">
              {plan.trigger_reasons.map((reason, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl ts-card-subtle border ts-border text-xs flex items-start space-x-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="ts-text-primary leading-relaxed">{reason}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const isActive = activeCategory === c.key;
              const count =
                c.key === 'ALL'
                  ? plan.recommended_actions.length
                  : plan.recommended_actions.filter((a) => a.category === c.key).length;

              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActiveCategory(c.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'ts-card-subtle border ts-border hover:bg-slate-500/10 ts-text-muted hover:ts-text-primary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{c.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-500/15 ts-text-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Cards List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black ts-text-primary uppercase tracking-wider">
                Recommended Actions for Authority Review ({filteredActions.length})
              </h3>
              <span className="text-[11px] ts-text-muted">
                Each action requires municipal officer verification & decision tracking
              </span>
            </div>

            {filteredActions.length === 0 ? (
              <Card variant="elevated" className="p-8 text-center ts-text-muted text-xs">
                No recommended actions found in this category for the current trigger level.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredActions.map((action, idx) => {
                  const currentDecision = action.decision_status || action.status || 'RECOMMENDED_FOR_REVIEW';
                  const isCritical = action.priority === 'CRITICAL';
                  const isHigh = action.priority === 'HIGH';

                  return (
                    <Card
                      key={action.action}
                      variant="elevated"
                      className={`p-5 border transition-all space-y-4 ${
                        isCritical
                          ? 'border-red-500/40 shadow-sm'
                          : isHigh
                          ? 'border-orange-500/30'
                          : 'ts-border'
                      }`}
                    >
                      {/* Top Action Meta */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-500/15 text-slate-700 dark:text-slate-300 border ts-border">
                            {action.category.replace(/_/g, ' ')}
                          </span>

                          <Badge
                            variant={
                              isCritical ? 'extreme' : isHigh ? 'high' : 'moderate'
                            }
                            size="sm"
                          >
                            Priority: {action.priority}
                          </Badge>

                          {/* Decision Status Pill */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              currentDecision === 'Action Initiated Externally'
                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-300'
                                : currentDecision === 'Acknowledged'
                                ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-300'
                                : currentDecision === 'Deferred'
                                ? 'bg-slate-500/15 border-slate-500 text-slate-600 dark:text-slate-400'
                                : 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-300'
                            }`}
                          >
                            Status: {currentDecision}
                          </span>
                        </div>

                        {action.decision_timestamp && (
                          <span className="text-[10px] ts-text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Logged: {new Date(action.decision_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-base font-black ts-text-primary">{action.title}</h4>
                        <p className="text-xs sm:text-sm ts-text-muted leading-relaxed mt-1">
                          {action.description}
                        </p>
                      </div>

                      {/* Rule Justification Box */}
                      <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 text-xs space-y-1">
                        <span className="font-bold text-orange-600 dark:text-orange-400 block text-[11px] uppercase tracking-wider">
                          Why Recommended (Rule Justification):
                        </span>
                        <p className="ts-text-muted leading-relaxed italic">{action.justification}</p>
                      </div>

                      {/* Manual Authority Decision Workflow Controls */}
                      <div className="pt-3 border-t ts-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold ts-text-primary mr-1 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-orange-500" />
                            Officer Decision:
                          </span>

                          {(['Reviewed', 'Acknowledged', 'Deferred', 'Action Initiated Externally'] as const).map(
                            (statusOption) => (
                              <button
                                key={statusOption}
                                type="button"
                                disabled={updatingAction === action.action}
                                onClick={() => handleDecisionUpdate(action.action, statusOption)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                  currentDecision === statusOption
                                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                    : 'ts-card-subtle border ts-border hover:bg-slate-500/10 ts-text-muted'
                                }`}
                              >
                                {statusOption}
                              </button>
                            )
                          )}
                        </div>

                        {/* Direct Dispatch & Simulator Links */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/gov/dispatch?ward=${selectedWardId}&directive=${encodeURIComponent(action.title)}`
                              )
                            }
                            className="text-xs py-1 px-2.5 flex items-center gap-1"
                          >
                            <Send className="w-3 h-3 text-orange-500" />
                            <span>Dispatch Channel</span>
                          </Button>
                        </div>
                      </div>

                      {/* Optional Notes Input for Officer Record */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Add officer note / circular number (e.g. 'Circular #401 issued to PWD contractor')..."
                          value={notesState[action.action] !== undefined ? notesState[action.action] : action.decision_notes || ''}
                          onChange={(e) =>
                            setNotesState({ ...notesState, [action.action]: e.target.value })
                          }
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg ts-input border ts-border focus:outline-none focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleDecisionUpdate(action.action, (action.decision_status || 'Reviewed') as any)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-500/15 hover:bg-slate-500/25 ts-text-primary border ts-border transition-colors cursor-pointer"
                        >
                          Save Note
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Operational Boundaries & Separation Notice */}
          <Card variant="subtle" className="p-4 border ts-border text-xs ts-text-muted space-y-2">
            <div className="flex items-center gap-2 font-bold ts-text-primary">
              <Sliders className="w-4 h-4 text-amber-500" />
              <span>Operational Boundary Notice</span>
            </div>
            <p className="leading-relaxed">
              <strong>Heat Action Plan Engine:</strong> Delivers operational directives based on live biometeorological observations and official forecast models.
              To explore hypothetical urban greening, albedo modifications, or cooling center capacity expansions before real-world implementation, visit the independent{' '}
              <button
                type="button"
                onClick={() => navigate('/gov/interventions')}
                className="text-orange-500 underline font-bold hover:opacity-80 inline"
              >
                Intervention Simulator
              </button>
              .
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GovernmentHeatActionPlan;
