import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ThermalResponse } from '../types';
import { LocationSearch } from '../components/LocationSearch';
import { LoadingState } from '../components/LoadingState';
import {
  Bell,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  ArrowRight,
} from 'lucide-react';
import { getCachedData, setCachedData } from '../services/cache';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardContent, Button, EmptyState } from '../components/ui';
import { useTranslation } from '../context/LanguageContext';
import { translateCivicAdvisory } from '../utils/translationHelpers';
import { DataRealityBadge, FallbackModeBanner } from '../components/provenance';

// Focused Citizen Alert Components
import { CurrentAlertStatus } from '../components/alerts/CurrentAlertStatus';
import { CitizenSafetyActions } from '../components/alerts/CitizenSafetyActions';
import { OutdoorActivityGuidance } from '../components/alerts/OutdoorActivityGuidance';
import { VulnerableProtection } from '../components/alerts/VulnerableProtection';
import { HeatIllnessGuide } from '../components/alerts/HeatIllnessGuide';
import { AlertPreferencesCTA } from '../components/alerts/AlertPreferencesCTA';

export const Alerts: React.FC = () => {
  const { t } = useTranslation();
  const { coords, locationName, isLocating, setLocation, detectMyLocation } = useLocation();
  const { user } = useAuth();

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

  const isFallback = Boolean(
    thermalData?.weather?.is_fallback ||
    thermalData?.weather?.source_status === 'OFFLINE_FALLBACK'
  );

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Top Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono">
            Public Safety & Heat Warnings
          </span>
          <DataRealityBadge
            tier={isFallback ? 'OFFLINE_FALLBACK' : 'CALCULATED'}
            size="xs"
            customLabel={isFallback ? 'Demonstration Baseline' : 'Calculated Warnings'}
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black ts-text-primary font-sans mt-0.5">
          {t('alerts.title', 'Public Heat Alerts & Safety Guidance')}
        </h1>
        <p className="text-xs sm:text-sm ts-text-muted mt-1 leading-relaxed">
          {t(
            'alerts.subtitle',
            'Real-time heat danger warnings, hydration protocols, work-rest schedules, and protective actions for your community.'
          )}
        </p>
      </div>

      {/* Fallback Mode Banner */}
      {isFallback && (
        <FallbackModeBanner
          sourceName={thermalData?.weather?.source_name || 'Regional Baseline Dataset'}
          onRetry={fetchAlerts}
        />
      )}

      {/* Location Search Bar */}
      <div className="relative z-30 ts-card p-3 sm:p-4 shadow-sm border ts-border rounded-2xl">
        <LocationSearch
          currentLocationName={locationName}
          onSelectLocation={setLocation}
          onUseMyLocation={detectMyLocation}
          isLocating={isLocating}
        />
      </div>

      {isLoading ? (
        <LoadingState message={t('common.loading', 'Checking active heat alerts and public health advisories...')} />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center justify-between text-xs sm:text-sm">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchAlerts} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      ) : thermalData ? (
        <div className="space-y-6">
          {/* 1. CURRENT ALERT STATUS */}
          <CurrentAlertStatus
            riskLevel={level}
            locationName={locationName}
            temperature={thermalData.weather?.temperature}
            apparentTemp={thermalData.weather?.apparent_temperature}
            wbgt={thermalData.thermal?.indices?.wbgt_c}
            humidity={thermalData.weather?.humidity}
            reason={risk?.reason}
            peakHours={activity?.peak_heat_hours || '12:00 PM – 4:00 PM'}
            lastUpdated={formattedTimestamp}
          />

          {/* 2. WHAT YOU SHOULD DO NOW */}
          <CitizenSafetyActions
            riskLevel={level}
            approximateWaterMl={hydration?.approximate_amount_ml}
            hydrationInterval={hydration?.recommended_interval}
            orsRecommended={hydration?.electrolytes_recommended}
          />

          {/* 3. OUTDOOR WORK & ACTIVITY GUIDANCE */}
          <OutdoorActivityGuidance
            restGuidance={activity?.rest_guidance}
            heavyWorkGuidance={activity?.heavy_physical_work}
            peakHours={activity?.peak_heat_hours || '12:00 PM – 4:00 PM'}
          />

          {/* 4. PROTECT PEOPLE WHO NEED EXTRA CARE */}
          <VulnerableProtection
            groups={vulnerable?.groups}
            guidance={vulnerable?.guidance}
          />

          {/* 5. RECOGNIZE HEAT ILLNESS */}
          <HeatIllnessGuide />

          {/* Actionable Civic Advisories List (if present) */}
          {advisories.length > 0 && (
            <Card variant="default" className="border ts-border p-4 sm:p-5">
              <div className="flex items-center space-x-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-base font-bold ts-text-primary">
                  {t('alerts.standardDirectives', 'Local Municipal Heat Directives')}
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {advisories.map((advisory, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl ts-card-subtle border ts-border flex items-start space-x-2.5 text-xs ts-text-primary font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                    <span className="leading-relaxed">{translateCivicAdvisory(advisory, t)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Contextual Exploratory CTA: Only shown during elevated heat, secondary to emergency guidance */}
          {level !== 'LOW' && (
            <Card
              variant="default"
              className="p-5 sm:p-6 border border-orange-500/30 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-transparent overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider font-mono">
                    <Sliders className="w-4 h-4" />
                    <span>Explore Safety Adjustments</span>
                  </div>
                  <h4 className="text-base font-bold ts-text-primary">
                    Want to explore how changes in rest, hydration, activity, or cooling could affect heat stress?
                  </h4>
                  <p className="text-xs ts-text-muted max-w-xl leading-relaxed">
                    You've seen what actions are recommended. Test how changes like shade breaks, work restrictions, or hydration stations may lower physiological strain.
                  </p>
                </div>

                <Link
                  to="/interventions"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all whitespace-nowrap flex-shrink-0"
                >
                  <span>Try Safety Actions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          )}

          {/* 6. ALERT PREFERENCES */}
          <AlertPreferencesCTA
            locationName={locationName}
            coords={coords}
            userEmail={user?.email}
            userName={user?.name}
          />
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
