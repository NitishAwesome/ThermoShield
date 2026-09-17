import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ThermalResponse, RiskLevel } from '../types';
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
import { ALL_STATE_HEAT_ALERTS, getStateCategoryStyle, getNationalAlertStatistics } from '../data/stateHeatAlerts';

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

  const [selectedStateCategoryFilter, setSelectedStateCategoryFilter] = useState<'ALL' | 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN'>('ALL');
  const [stateSearchText, setStateSearchText] = useState<string>('');
  const nationalAlertStats = useMemo(() => getNationalAlertStatistics(), []);

  const filteredStates = useMemo(() => {
    return ALL_STATE_HEAT_ALERTS.filter((s) => {
      const matchCat = selectedStateCategoryFilter === 'ALL' || s.alertCategory === selectedStateCategoryFilter;
      const matchSearch =
        !stateSearchText ||
        s.stateName.toLowerCase().includes(stateSearchText.toLowerCase()) ||
        s.capitalCity.toLowerCase().includes(stateSearchText.toLowerCase()) ||
        s.affectedDistricts.some((d) => d.toLowerCase().includes(stateSearchText.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [selectedStateCategoryFilter, stateSearchText]);

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
  const level: RiskLevel | null = (risk?.level as RiskLevel) || null;
  const weatherTime = thermalData?.weather?.time;

  const formattedTimestamp = weatherTime
    ? new Date(weatherTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : thermalData?.weather
    ? 'Recent telemetry'
    : 'Telemetry inactive';

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
            tier={
              isLoading && !thermalData
                ? 'LOADING'
                : !thermalData && !isLoading
                ? 'UNAVAILABLE'
                : isFallback
                ? 'OFFLINE_FALLBACK'
                : 'CALCULATED'
            }
            size="xs"
            customLabel={
              !thermalData && !isLoading
                ? 'Telemetry Inactive'
                : isLoading && !thermalData
                ? 'Loading Advisories'
                : isFallback
                ? 'Demonstration Baseline'
                : 'Calculated Warnings'
            }
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

          {/* 6. NATIONAL STATE-WISE HEATWAVE ADVISORIES (37 STATES & UNION TERRITORIES) */}
          <div className="space-y-4 pt-4 border-t ts-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-red-500 font-mono">
                    Official Survey of India & IMD Directive
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black ts-text-primary mt-1">
                  National State-Wise Heatwave Warnings
                </h2>
                <p className="text-xs ts-text-muted mt-0.5">
                  Official meteorological alert statuses across all 37 Indian States and Union Territories with SDMA guidelines.
                </p>
              </div>

              <Link
                to="/citizen/heatmap"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold text-xs transition-colors self-start sm:self-auto border border-orange-500/30"
              >
                <span>View On Interactive GIS Heatmap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* National KPI summary pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-red-500">Severe Heat Wave</div>
                  <div className="text-base font-black text-red-600 dark:text-red-400 font-mono">
                    {nationalAlertStats.redCount} States (Red)
                  </div>
                </div>
                <span className="text-lg">🔴</span>
              </div>

              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-orange-500">Heat Wave</div>
                  <div className="text-base font-black text-orange-600 dark:text-orange-400 font-mono">
                    {nationalAlertStats.orangeCount} States (Orange)
                  </div>
                </div>
                <span className="text-lg">🟠</span>
              </div>

              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-yellow-600 dark:text-yellow-400">Hot Day / Night</div>
                  <div className="text-base font-black text-yellow-600 dark:text-yellow-400 font-mono">
                    {nationalAlertStats.yellowCount} States (Yellow)
                  </div>
                </div>
                <span className="text-lg">🟡</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-emerald-500">Normal Conditions</div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {nationalAlertStats.greenCount} States (Green)
                  </div>
                </div>
                <span className="text-lg">🟢</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                {(['ALL', 'RED', 'ORANGE', 'YELLOW', 'GREEN'] as const).map((cat) => {
                  const isSel = selectedStateCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedStateCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                        isSel
                          ? cat === 'RED'
                            ? 'bg-red-600 text-white shadow-sm'
                            : cat === 'ORANGE'
                            ? 'bg-orange-600 text-white shadow-sm'
                            : cat === 'YELLOW'
                            ? 'bg-yellow-500 text-slate-950 shadow-sm'
                            : cat === 'GREEN'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-orange-500 text-white shadow-sm'
                          : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                      }`}
                    >
                      {cat === 'ALL' ? 'All 37 States/UTs' : `${cat} ALERT`}
                    </button>
                  );
                })}
              </div>

              <div className="relative min-w-[220px]">
                <input
                  type="text"
                  value={stateSearchText}
                  onChange={(e) => setStateSearchText(e.target.value)}
                  placeholder="Search state, district, capital..."
                  className="w-full px-3.5 py-1.5 rounded-xl bg-slate-500/10 border ts-border text-xs ts-text-primary placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
                />
                {stateSearchText && (
                  <button
                    type="button"
                    onClick={() => setStateSearchText('')}
                    className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* State Warning Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredStates.map((st) => {
                const cStyle = getStateCategoryStyle(st.alertCategory);
                return (
                  <div
                    key={st.stateCode}
                    className={`p-4 rounded-2xl ts-card border transition-all ${
                      st.alertCategory === 'RED'
                        ? 'border-red-500/40 bg-red-500/5'
                        : st.alertCategory === 'ORANGE'
                        ? 'border-orange-500/30 bg-orange-500/5'
                        : 'ts-border'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b ts-border pb-2 mb-2.5">
                      <div>
                        <div className="font-extrabold text-sm ts-text-primary flex items-center gap-1.5">
                          <span>{st.stateName}</span>
                          <span className="font-mono text-xs text-slate-400">({st.stateCode})</span>
                        </div>
                        <div className="text-[10.5px] ts-text-subtle">
                          Capital: {st.capitalCity} • {st.authorityName.split('(')[0]}
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold ${cStyle.badgeBg}`}>
                        {st.alertCategory} ALERT
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center p-2 rounded-xl bg-slate-500/10 mb-2.5 font-mono text-xs">
                      <div>
                        <span className="text-[10px] ts-text-subtle block">Max Temp</span>
                        <strong className="text-orange-500">{st.temperatureC}°C</strong>
                      </div>
                      <div>
                        <span className="text-[10px] ts-text-subtle block">Heat Index</span>
                        <strong className="text-amber-500">{st.apparentTemperatureC}°C</strong>
                      </div>
                      <div>
                        <span className="text-[10px] ts-text-subtle block">Wet-Bulb</span>
                        <strong className="text-rose-500">{st.wetBulbC}°C</strong>
                      </div>
                    </div>

                    <p className="text-xs ts-text-muted leading-relaxed mb-2">
                      <strong className="text-slate-300">IMD Classification:</strong> {st.imdClassification}
                    </p>

                    <div className="text-[11px] ts-text-subtle mb-2">
                      <strong className="text-slate-300">Key Monitored Districts:</strong> {st.affectedDistricts.join(', ')}
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-500/5 border border-slate-500/10 text-[11px] space-y-1">
                      <span className="font-bold text-slate-300 block">Priority Advisory:</span>
                      <p className="text-slate-400 leading-snug">{st.actionAdvisories[0]}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7. ALERT PREFERENCES */}
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
