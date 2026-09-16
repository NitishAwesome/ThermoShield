import React from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Phone,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';
import { Card } from '../ui';

interface Channel {
  id: string;
  Icon: React.FC<{ className?: string }>;
  label: string;
  status: 'live' | 'conditional' | 'candidate' | 'planned';
  statusLabel: string;
  description: string;
  note?: string;
}

const CHANNELS: Channel[] = [
  {
    id: 'in_app',
    Icon: Bell,
    label: 'In-App Alerts',
    status: 'live',
    statusLabel: 'Active',
    description: 'Heat warnings and reminders appear inside ThermoShield when the app is open.',
    note: 'Available to all users — no setup required.',
  },
  {
    id: 'email',
    Icon: Mail,
    label: 'Email Notifications',
    status: 'live',
    statusLabel: 'Active',
    description: 'Real email dispatches to your registered address via SMTP when heat warnings are triggered.',
    note: 'Subscribe via the Alerts page to activate.',
  },
  {
    id: 'browser',
    Icon: Smartphone,
    label: 'Browser Notifications (Web Notification API)',
    status: 'conditional',
    statusLabel: 'When Enabled',
    description:
      'Browser Notifications via the Web Notification API. Alerts are delivered while ThermoShield is open in the browser. These are not background Web Push notifications and do not provide service-worker push delivery after the web application is closed.',
    note: 'Enable browser notification permission above to activate.',
  },
  {
    id: 'sms',
    Icon: Phone,
    label: 'SMS Text Message',
    status: 'candidate',
    statusLabel: 'Candidate Channel',
    description: 'Architecturally wired (Twilio adapter built); currently runs in simulation/demo mode — no real SMS is delivered yet.',
    note: 'Live delivery activates when Twilio credentials are connected.',
  },
  {
    id: 'whatsapp',
    Icon: MessageSquare,
    label: 'WhatsApp Alert Bot',
    status: 'planned',
    statusLabel: 'Planned',
    description: 'Citizen messaging via WhatsApp Business API for regional heat advisories.',
    note: 'Scheduled pending WhatsApp Business Service Provider (BSP) credentials.',
  },
];

const STATUS_STYLES = {
  live: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  conditional: {
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  candidate: {
    dot: 'bg-sky-500',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    icon: 'text-sky-600 dark:text-sky-400',
  },
  planned: {
    dot: 'bg-purple-400',
    badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    icon: 'text-purple-600 dark:text-purple-400',
  },
};

interface NotificationChannelLegendProps {
  className?: string;
  compact?: boolean;
}

export const NotificationChannelLegend: React.FC<NotificationChannelLegendProps> = ({
  className = '',
  compact = false,
}) => {
  if (compact) {
    // Inline one-liner strip for use inside AlertPreferencesCTA
    return (
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] ts-text-muted ${className}`}>
        <Info className="w-3.5 h-3.5 flex-shrink-0 ts-text-subtle" />
        <span className="font-semibold ts-text-primary">Delivery channels:</span>
        {CHANNELS.map((ch) => {
          const styles = STATUS_STYLES[ch.status];
          return (
            <span key={ch.id} className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${styles.dot} flex-shrink-0`} />
              <span>{ch.label}</span>
              <span className={`text-[9px] font-bold px-1 py-0.5 rounded border ${styles.badge}`}>
                {ch.statusLabel}
              </span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <Card variant="default" className={`p-4 sm:p-5 border ts-border ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-orange-500" />
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono block">
            Notification Delivery Reality
          </span>
          <h4 className="text-sm font-bold ts-text-primary">
            What each channel actually delivers today
          </h4>
        </div>
      </div>

      <div className="space-y-2.5">
        {CHANNELS.map((ch) => {
          const styles = STATUS_STYLES[ch.status];
          const { Icon } = ch;
          return (
            <div
              key={ch.id}
              className="flex items-start gap-3 p-3 rounded-xl ts-card-subtle border ts-border"
            >
              {/* Status dot + icon */}
              <div className="relative flex-shrink-0 mt-0.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${styles.badge} border`}>
                  <Icon className={`w-3.5 h-3.5 ${styles.icon}`} />
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${styles.dot}`}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-xs font-bold ts-text-primary">{ch.label}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${styles.badge}`}>
                    {ch.statusLabel}
                  </span>
                </div>
                <p className="text-[11px] ts-text-muted leading-relaxed">{ch.description}</p>
                {ch.note && (
                  <p className="text-[10px] ts-text-subtle mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" />
                    {ch.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] ts-text-subtle mt-3 pt-2.5 border-t ts-border flex items-start gap-1.5">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
        ThermoShield discloses which channels are live vs. planned so you can make informed decisions about how you receive safety alerts. No delivery channel is misrepresented.
      </p>
    </Card>
  );
};

export default NotificationChannelLegend;
