import React, { useState } from 'react';
import { Bell, Mail, ShieldCheck, CheckCircle2, ArrowRight, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../ui';
import { api } from '../../services/api';
import { useTranslation } from '../../context/LanguageContext';
import { NotificationChannelLegend } from './NotificationChannelLegend';

interface AlertPreferencesCTAProps {
  locationName: string;
  coords: { lat: number; lon: number };
  userEmail?: string;
  userName?: string;
  className?: string;
}

export const AlertPreferencesCTA: React.FC<AlertPreferencesCTAProps> = ({
  locationName,
  coords,
  userEmail = '',
  userName,
  className = '',
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>(userEmail);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleQuickSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    setIsSubscribing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.subscribeCitizenAlerts({
        email: email.trim(),
        name: userName,
        location_name: locationName,
        lat: coords.lat,
        lon: coords.lon,
      });
      setSuccessMessage(
        `✓ Email alerts enabled for ${res.email}. You'll receive in-app feed alerts and email warnings whenever High or Extreme heat is detected for ${locationName}.`
      );
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.detail || err?.message || 'Failed to activate alerts.'
      );
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <Card
      variant="default"
      className={`p-5 sm:p-6 border border-orange-500/25 bg-gradient-to-br from-orange-50/40 via-transparent to-amber-50/20 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 shadow-xs ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 dark:bg-orange-400/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Bell className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono">
              Direct Heat Warning Dispatch
            </span>
          </div>

          <h4 className="text-base sm:text-lg font-black ts-text-primary">
            {t('alerts.stayUpdatedTitle', 'Get Heat Alerts for Your Area')}
          </h4>

          <p className="text-xs sm:text-sm ts-text-muted leading-relaxed">
            Never miss an extreme heatwave warning. Receive immediate notices with local hydration and safety protocols for <strong>{locationName}</strong>.
          </p>
        </div>

        {/* Action Controls */}
        <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-2.5">
          <form onSubmit={handleQuickSubscribe} className="flex gap-2">
            <div className="relative flex-1 sm:w-60">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="Enter email for alerts..."
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl ts-input ts-text-primary placeholder:ts-text-subtle focus:outline-none"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubscribing || !email.trim()}
              leftIcon={
                isSubscribing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )
              }
              className="text-xs font-bold whitespace-nowrap"
            >
              {isSubscribing ? 'Subscribing...' : 'Get Alerts'}
            </Button>
          </form>

          <Link
            to="/notification-settings"
            className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border ts-border text-xs font-semibold ts-text-muted hover:ts-text-primary hover:bg-slate-500/10 transition-colors"
          >
            <span>Manage Notification Preferences</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Truthful channel disclosure */}
      <div className="mt-3 pt-3 border-t ts-border">
        <NotificationChannelLegend compact />
      </div>

      {successMessage && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </Card>
  );
};

export default AlertPreferencesCTA;
