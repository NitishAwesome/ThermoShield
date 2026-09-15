import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  Droplets,
  Clock,
  Sun,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useNotificationDecision } from '../context/NotificationDecisionContext';
import { useTranslation } from '../context/LanguageContext';
import { Card, CardHeader, CardContent, Badge, Button } from './ui';
import { EvaluatedNotificationEvent, NotificationSeverity } from '../types';

interface NotificationDecisionFeedProps {
  variant?: 'compact' | 'full' | 'settings_preview';
  showSimulations?: boolean;
  className?: string;
}

export const NotificationDecisionFeed: React.FC<NotificationDecisionFeedProps> = ({
  variant = 'full',
  showSimulations = true,
  className = '',
}) => {
  const { t } = useTranslation();
  const {
    eligibleEvents,
    suppressedEvents,
    activeMode,
    history,
    simulationScenario,
    setSimulationScenario,
    acknowledgeEvent,
    clearHistory,
    refreshEvaluation,
  } = useNotificationDecision();

  const [showSuppressedDetails, setShowSuppressedDetails] = useState<boolean>(false);

  const getEventIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-rose-500" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'Droplets':
        return <Droplets className="w-5 h-5 text-sky-500" />;
      case 'Clock':
        return <Clock className="w-5 h-5 text-indigo-500" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      default:
        return <Info className="w-5 h-5 text-orange-500" />;
    }
  };

  const getSeverityBadge = (severity: NotificationSeverity, isEmergency?: boolean) => {
    if (isEmergency || severity === 'critical') {
      return (
        <Badge variant="extreme" size="sm">
          {t('severity.critical', 'Critical Safety Alert')}
        </Badge>
      );
    }
    if (severity === 'warning') {
      return (
        <Badge variant="high" size="sm">
          {t('severity.warning', 'Warning')}
        </Badge>
      );
    }
    if (severity === 'advisory') {
      return (
        <Badge variant="moderate" size="sm">
          {t('severity.advisory', 'Advisory')}
        </Badge>
      );
    }
    return (
      <Badge variant="low" size="sm">
        {t('severity.info', 'Notice')}
      </Badge>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header & Mode Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl ts-card-elevated border ts-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0 text-orange-600 dark:text-orange-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold ts-text-primary">
                {t('engine.liveFeedTitle', 'Smart Decision Engine Live Feed')}
              </h3>
              <Badge variant="brand" size="sm">
                {t('engine.activeModeNotice', { mode: activeMode.toUpperCase() })}
              </Badge>
            </div>
            <p className="text-xs ts-text-muted mt-0.5">
              {t(
                'engine.liveFeedSubtitle',
                'Real-time biometeorological evaluation based on your personal profile, local thermal stress, and selected notification mode.'
              )}
            </p>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-y-1.5">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
            {t('engine.eligibleCount', { count: eligibleEvents.length })}
          </span>
          {suppressedEvents.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSuppressedDetails(!showSuppressedDetails)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary transition-colors flex items-center space-x-1"
            >
              <span>{t('engine.suppressedCount', { count: suppressedEvents.length })}</span>
              {showSuppressedDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Interactive SIH Decision Testing Bar */}
      {showSimulations && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/25 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-bold ts-text-primary flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>SIH Decision Testing Console</span>
              {simulationScenario && (
                <Badge variant="high" size="sm">
                  {t('engine.simulationActive', 'Simulation Active')}
                </Badge>
              )}
            </span>
            <button
              type="button"
              onClick={clearHistory}
              className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('engine.clearCooldowns', 'Reset Anti-Spam Cooldowns')}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant={simulationScenario === 'spike' ? 'primary' : 'outline'}
              onClick={() => setSimulationScenario('spike')}
              leftIcon={<Flame className="w-3.5 h-3.5 text-rose-500" />}
              className="text-xs"
            >
              {t('engine.simulateSpike', 'Simulate Heat Spike (43.5°C)')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={simulationScenario === 'moderate' ? 'primary' : 'outline'}
              onClick={() => setSimulationScenario('moderate')}
              leftIcon={<Sun className="w-3.5 h-3.5 text-amber-500" />}
              className="text-xs"
            >
              {t('engine.simulateModerate', 'Simulate Moderate Day (35°C)')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={simulationScenario === 'normal' ? 'primary' : 'outline'}
              onClick={() => setSimulationScenario('normal')}
              leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
              className="text-xs"
            >
              {t('engine.simulateNormal', 'Simulate Normal Conditions (28.5°C)')}
            </Button>

            {simulationScenario && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSimulationScenario(null)}
                leftIcon={<X className="w-3.5 h-3.5" />}
                className="text-xs text-slate-400 hover:text-white"
              >
                {t('engine.clearSimulation', 'Use Live Weather')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Eligible Events List */}
      {eligibleEvents.length === 0 ? (
        <div className="p-6 rounded-2xl ts-card-subtle border ts-border text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold ts-text-primary">
            {t('engine.noActiveAlerts', 'No urgent notifications right now. Thermal conditions and personal risk are currently within safe thresholds.')}
          </h4>
          <p className="text-xs ts-text-muted max-w-md mx-auto">
            ThermoShield actively screens background conditions to avoid duplicate alerts and routine noise.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {eligibleEvents.map((event) => (
            <div
              key={event.id}
              className={`p-4 rounded-2xl border transition-all animate-ts-fade-in ${
                event.severity === 'critical' || event.isEmergencyAlert
                  ? 'bg-rose-500/10 border-rose-500/40'
                  : event.severity === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/35'
                  : 'ts-card-elevated border-orange-500/25'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-xl ts-card-subtle border ts-border flex-shrink-0 mt-0.5">
                    {getEventIcon(event.iconName)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h4 className="text-sm font-extrabold ts-text-primary">
                        {t(event.titleKey, event.titleFallback)}
                      </h4>
                      {getSeverityBadge(event.severity, event.isEmergencyAlert)}
                      {event.metricHighlight && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30">
                          {event.metricHighlight.label}: {event.metricHighlight.value}
                        </span>
                      )}
                    </div>
                    <p className="text-xs ts-text-muted mt-1 leading-relaxed">
                      {t(event.messageKey, event.messageParams || {}, event.messageFallback)}
                    </p>

                    {event.recommendedActionKey && (
                      <div className="mt-2 text-[11px] font-medium text-orange-700 dark:text-orange-300 flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                        <span>
                          {t(event.recommendedActionKey, event.recommendedActionFallback || '')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => acknowledgeEvent(event.id, event.type)}
                  className="p-1.5 rounded-lg ts-card-subtle hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                  title={t('engine.acknowledge', 'Dismiss notification')}
                  aria-label={t('engine.acknowledge', 'Dismiss notification')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suppressed / Cooldown Diagnostics Accordion */}
      {suppressedEvents.length > 0 && showSuppressedDetails && (
        <div className="p-4 rounded-2xl ts-card-subtle border ts-border space-y-2 animate-in slide-in-from-top-2 duration-150 text-xs">
          <div className="flex items-center justify-between border-b ts-border pb-2">
            <span className="font-bold ts-text-primary uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('engine.diagnosticsTitle', 'Decision Engine Suppression Log')}</span>
            </span>
            <span className="text-[10px] ts-text-subtle">
              Anti-spam & mode enforcement
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {suppressedEvents.map((suppressed) => (
              <div
                key={suppressed.id}
                className="p-2.5 rounded-xl ts-card-elevated border ts-border flex items-center justify-between text-xs gap-3"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0" />
                  <div>
                    <div className="font-semibold ts-text-primary">
                      {suppressed.type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] ts-text-muted">
                      {t(
                        suppressed.reasonExplanationKey,
                        {
                          mode: activeMode.toUpperCase(),
                          minutes: suppressed.cooldownRemainingMinutes || 0,
                        },
                        suppressed.reasonExplanationFallback
                      )}
                    </div>
                  </div>
                </div>

                {suppressed.reason === 'COOLDOWN_ACTIVE' && (
                  <Badge variant="neutral" size="sm">
                    {suppressed.cooldownRemainingMinutes}m left
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDecisionFeed;
