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
} from 'lucide-react';
import { getCachedData, setCachedData } from '../services/cache';
import { useLocation } from '../context/LocationContext';
import { Card, CardHeader, CardContent, Badge, Button, EmptyState } from '../components/ui';

export const Alerts: React.FC = () => {
  const { coords, locationName, isLocating, setLocation, detectMyLocation } = useLocation();

  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const isActiveAlert = level === 'HIGH' || level === 'EXTREME';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
            Civic Protection Directives
          </span>
          <Badge variant="brand" size="sm">
            Real-Time Broadcast
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold ts-text-primary font-sans mt-0.5">
          Public Heat Alerts & Guidance
        </h1>
        <p className="text-sm ts-text-muted mt-1">
          Operational heatwave alerts, hydration protocols, work-rest cycles, and protection guidelines for people needing extra care in {locationName}.
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
        <LoadingState message="Compiling public health advisories..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-center justify-between text-sm">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchAlerts} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Retry
          </Button>
        </div>
      ) : thermalData ? (
        <div className="space-y-6">
          {/* Active Alert Banner Card */}
          <Card
            variant="elevated"
            className={`p-6 border-l-4 ${
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
                <Bell className={`w-5 h-5 ${level === 'EXTREME' || level === 'HIGH' ? 'text-red-400 animate-pulse' : 'text-orange-400'}`} />
                <h2 className="text-lg font-bold ts-text-primary">
                  Heat Threat Advisory Status:{' '}
                  <span className={level === 'EXTREME' ? 'text-red-400' : level === 'HIGH' ? 'text-orange-400' : 'text-emerald-400'}>
                    {level}
                  </span>
                </h2>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isActiveAlert
                    ? 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isActiveAlert ? 'ACTIVE ALERT' : 'ROUTINE MONITORING'}
                </span>
                <Badge riskLevel={level} size="sm">
                  {risk?.alert_category || level} TIER
                </Badge>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm ts-text-primary leading-relaxed font-medium">
                {risk?.reason || 'Calculated thermal strain and meteorological parameters evaluated.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs ts-text-muted pt-1">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  <span>Location: <strong className="ts-text-primary">{locationName}</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Telemetry: <span className="font-mono">{formattedTimestamp}</span></span>
                </div>
              </div>
            </div>
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
                      <span>Hydration Protocol</span>
                    </div>
                  }
                  badge={
                    <Badge variant="brand" size="sm">
                      {hydration?.priority || 'STANDARD'} PRIORITY
                    </Badge>
                  }
                />
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <span className="ts-text-muted block font-semibold">Recommended Intake:</span>
                    <span className="text-base font-bold text-sky-400 mt-0.5 block font-mono">
                      {hydration?.approximate_amount_ml
                        ? `~${hydration.approximate_amount_ml} mL (${hydration.recommended_interval})`
                        : hydration?.recommended_interval || '1 glass every 20 mins'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <span className="ts-text-muted block font-semibold">Electrolytes:</span>
                    <span className="text-xs font-semibold ts-text-primary mt-0.5 block">
                      {hydration?.electrolytes_recommended
                        ? 'Recommended (ORS / electrolyte fluids for outdoor work)'
                        : 'Standard drinking water sufficient'}
                    </span>
                  </div>

                  <p className="ts-text-muted leading-relaxed pt-1">
                    {hydration?.guidance}
                  </p>
                </CardContent>
              </div>

              <div className="p-4 border-t ts-border text-[11px] ts-text-subtle">
                Source Basis: {hydration?.basis || 'ISO 7243 Hydration Framework'}
              </div>
            </Card>

            {/* 2. Outdoor Activity & Work-Rest Cycles */}
            <Card variant="elevated" className="flex flex-col justify-between">
              <div>
                <CardHeader
                  title={
                    <div className="flex items-center space-x-2 text-orange-400 text-sm font-bold">
                      <Activity className="w-4 h-4" />
                      <span>Activity & Pacing</span>
                    </div>
                  }
                  badge={
                    <Badge variant="high" size="sm">
                      Work / Rest
                    </Badge>
                  }
                />
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <span className="ts-text-muted block font-semibold">Outdoor Activities & Sports:</span>
                    <span className="text-xs font-medium ts-text-primary mt-0.5 block">
                      {activity?.outdoor_activity?.includes('Normal outdoor recreation')
                        ? 'Normal outdoor activities can continue. Use basic sun and hydration precautions.'
                        : activity?.outdoor_activity || 'Limit high-intensity outdoor drills during peak daylight.'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <span className="ts-text-muted block font-semibold">Outdoor Work & Labor:</span>
                    <span className="text-xs font-medium ts-text-primary mt-0.5 block">
                      {activity?.heavy_physical_work?.includes('Standard occupational pacing')
                        ? 'Normal work can continue, with regular water and rest breaks.'
                        : activity?.heavy_physical_work || 'Mandate shaded rest breaks and frequent fluid replenishment.'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <span className="ts-text-muted block font-semibold">Hottest Hours of Day:</span>
                    <span className="text-xs font-bold text-orange-400 mt-0.5 block font-mono">
                      {activity?.peak_heat_hours ? `Peak Heat: ${activity.peak_heat_hours}` : '12:00 PM – 3:00 PM'}
                    </span>
                    <span className="text-[11px] ts-text-subtle block mt-0.5">
                      Take extra care during peak hours. Stay hydrated and avoid unnecessary direct sun.
                    </span>
                  </div>
                </CardContent>
              </div>

              <div className="p-4 border-t ts-border text-[11px] ts-text-subtle">
                Rest Requirement: {activity?.rest_guidance || 'Cool shaded respite required.'}
              </div>
            </Card>

            {/* 3. People Who Need Extra Protection */}
            <Card variant="elevated" className="flex flex-col justify-between">
              <div>
                <CardHeader
                  title={
                    <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 text-sm font-bold">
                      <HeartHandshake className="w-4 h-4" />
                      <span>People Needing Extra Protection</span>
                    </div>
                  }
                  badge={
                    <Badge variant={vulnerable?.priority ? 'extreme' : 'neutral'} size="sm">
                      {vulnerable?.priority ? 'Priority Attention' : 'Routine'}
                    </Badge>
                  }
                />
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl ts-card-subtle border ts-border">
                    <span className="ts-text-muted block font-semibold mb-1">Target Cohorts:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {vulnerable?.groups?.map((g, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold text-[11px] capitalize"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="ts-text-muted leading-relaxed pt-1">
                    {vulnerable?.guidance ||
                      'Keep vulnerable community members in well-ventilated, shaded spaces with frequent wellness checks.'}
                  </p>
                </CardContent>
              </div>

              <div className="p-4 border-t ts-border text-[11px] ts-text-subtle">
                Directive: Municipal welfare checks and public water station access prioritized.
              </div>
            </Card>
          </div>

          {/* Actionable Civic Advisories List */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Standardized Heat Safety Directives</span>
                </div>
              }
              subtitle="Evidence-based instructions for civic workers and residents."
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
                      <span className="leading-relaxed">{advisory}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs ts-text-muted p-4 text-center">
                  Standard baseline safety precautions apply. No elevated advisories triggered at this hour.
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
