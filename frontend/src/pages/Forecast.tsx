import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ForecastResponse } from '../types';
import { LocationSearch } from '../components/LocationSearch';
import { ForecastChart } from '../components/ForecastChart';
import { RiskEvolutionTimeline } from '../components/RiskEvolutionTimeline';
import { SaferOutdoorWindowCard } from '../components/SaferOutdoorWindowCard';
import { LoadingState } from '../components/LoadingState';
import {
  Calendar,
  Thermometer,
  Sun,
  CloudSun,
  AlertTriangle,
  RefreshCw,
  Info,
  HeartPulse,
  Bell,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatTemperature } from '../utils/risk';
import { getCachedData, setCachedData } from '../services/cache';
import { useLocation } from '../context/LocationContext';
import { Card, CardHeader, CardContent, Badge, EmptyState, Button } from '../components/ui';
import { useTranslation } from '../context/LanguageContext';
import { DataRealityBadge, FallbackModeBanner } from '../components/provenance';

// Focused Forecast Subcomponents
import { PeakHeatCard } from '../components/forecast/PeakHeatCard';
import { OutdoorActivityGuide } from '../components/forecast/OutdoorActivityGuide';

export const Forecast: React.FC = () => {
  const { t, currentLanguage } = useTranslation();
  const { coords, locationName, isLocating, setLocation, detectMyLocation } = useLocation();

  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isFallback = Boolean(
    forecastData?.is_fallback ||
    forecastData?.source_status === 'OFFLINE_FALLBACK'
  );
  const sourceName = forecastData?.source_name || 'Regional Baseline Dataset';

  const fetchForecast = async () => {
    const cached = getCachedData(coords.lat, coords.lon);
    if (cached?.forecast) {
      setForecastData(cached.forecast);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await api.getForecast(coords.lat, coords.lon);
      setForecastData(res);
      setCachedData(coords.lat, coords.lon, { forecast: res });
    } catch (err: any) {
      if (!cached?.forecast) {
        setError(err.message || 'Failed to load 5-day heat forecast.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [coords.lat, coords.lon]);

  const getDayAdvice = (maxTemp: number) => {
    if (maxTemp >= 40.0) {
      return 'Extreme heat danger. Restrict outdoor tasks to early morning.';
    }
    if (maxTemp >= 36.0) {
      return 'Very hot afternoon. Take frequent shade breaks and hydrate.';
    }
    if (maxTemp >= 32.0) {
      return 'Warm conditions. Normal heat precautions and steady hydration.';
    }
    return 'Comfortable weather. Safe for standard outdoor schedules.';
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono">
            Outdoor Heat Planning
          </span>
          <Badge variant="brand" size="sm">
            5-Day Horizon
          </Badge>
          <DataRealityBadge
            tier={isFallback ? 'OFFLINE_FALLBACK' : 'LIVE'}
            size="xs"
            customLabel={isFallback ? 'Demonstration Baseline' : 'Live Open-Meteo'}
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black ts-text-primary font-sans mt-0.5">
          {t('forecast.title', 'Today’s Heat Forecast & Safe Outdoor Hours')}
        </h1>
        <p className="text-xs sm:text-sm ts-text-muted mt-1 leading-relaxed">
          {t(
            'forecast.subtitle',
            'Know when it is safer to be outdoors and plan your daily activities around peak heat in ' + locationName
          )}
        </p>
      </div>

      {/* Fallback Mode Banner */}
      {isFallback && (
        <FallbackModeBanner
          sourceName={sourceName}
          onRetry={fetchForecast}
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

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <p>{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchForecast}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      )}

      {isLoading && !forecastData ? (
        <LoadingState message={t('common.loading', 'Loading multi-day outdoor planning forecast...')} />
      ) : forecastData ? (
        <div className="space-y-6">
          {/* SECTION 1 — SAFER OUTDOOR WINDOW (Detailed Planning Center) */}
          <SaferOutdoorWindowCard forecast={forecastData.forecast} />

          {/* SECTION 2 — TODAY'S HEAT THROUGH THE DAY (Detailed Timeline) */}
          <RiskEvolutionTimeline forecast={forecastData.forecast} />

          {/* SECTION 3 — PEAK HEAT PERIOD */}
          <PeakHeatCard
            peakHours="12:00 PM – 4:00 PM"
            maxTemp={forecastData.forecast.max_temperature[0]}
          />

          {/* SECTION 4 — 5-DAY HEAT OUTLOOK & FORECAST CHART */}
          <Card variant="default" className="border ts-border p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b ts-border pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="text-base sm:text-lg font-bold ts-text-primary">
                  {t('forecast.outlookMatrix', '5-Day Heat Outlook')}
                </h3>
              </div>
              <Badge variant="neutral" size="sm">
                {locationName.split(',')[0]}
              </Badge>
            </div>

            {/* Daily Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {forecastData.forecast.dates.map((dateStr, idx) => {
                const maxTemp = forecastData.forecast.max_temperature[idx];
                const minTemp = forecastData.forecast.min_temperature[idx];
                const isExtreme = maxTemp >= 40.0;
                const isHigh = maxTemp >= 36.0 && maxTemp < 40.0;

                const dateObj = new Date(dateStr);
                const localeCode = currentLanguage === 'en' ? 'en-US' : currentLanguage;
                const dayName = dateObj.toLocaleDateString(localeCode, { weekday: 'short' });
                const formattedDate = dateObj.toLocaleDateString(localeCode, { month: 'short', day: 'numeric' });

                return (
                  <div
                    key={dateStr}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isExtreme
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-500/40 shadow-xs'
                        : isHigh
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/40'
                        : 'ts-card-subtle border ts-border'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2 border-b ts-border pb-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider ts-text-subtle block font-mono">
                            {idx === 0 ? t('forecast.today', 'Today') : `${dayName}`}
                          </span>
                          <span className="text-xs ts-text-primary font-medium">{formattedDate}</span>
                        </div>
                        {isExtreme ? (
                          <Sun className="w-4 h-4 text-rose-500 animate-pulse" />
                        ) : isHigh ? (
                          <CloudSun className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CloudSun className="w-4 h-4 text-sky-500" />
                        )}
                      </div>

                      {/* Temperatures */}
                      <div className="space-y-1 my-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="ts-text-muted">Max:</span>
                          <span
                            className={`font-mono font-bold ${
                              isExtreme ? 'text-rose-600 dark:text-rose-400' : isHigh ? 'text-amber-600 dark:text-amber-400' : 'ts-text-primary'
                            }`}
                          >
                            {formatTemperature(maxTemp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="ts-text-muted">Min:</span>
                          <span className="font-mono text-slate-500">
                            {formatTemperature(minTemp)}
                          </span>
                        </div>
                      </div>

                      {/* Risk Badge */}
                      <div className="pt-1">
                        <Badge
                          variant={isExtreme ? 'extreme' : isHigh ? 'high' : 'low'}
                          size="sm"
                        >
                          {isExtreme ? 'Extreme Heat' : isHigh ? 'High Heat' : 'Moderate Heat'}
                        </Badge>
                      </div>
                    </div>

                    {/* Simple Actionable Advice */}
                    <div className="mt-3 pt-2 border-t ts-border text-[11px] ts-text-muted leading-tight">
                      {getDayAdvice(maxTemp)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual Temperature Trend Chart */}
            <div className="pt-4 border-t ts-border">
              <span className="text-xs font-bold ts-text-primary uppercase tracking-wider font-mono block mb-2">
                Temperature Over the Next 5 Days
              </span>
              <ForecastChart forecast={forecastData.forecast} />
            </div>
          </Card>

          {/* SECTION 5 — PLAN FOR OUTDOOR ACTIVITIES */}
          <OutdoorActivityGuide
            todayMaxTemp={forecastData?.forecast?.max_temperature?.[0]}
            apparentTemp={forecastData?.forecast?.apparent_temperature_max?.[0]}
          />

          {/* SECTION 6 — CONNECTION TO PERSONAL RISK & ALERTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Personal Risk Connection */}
            <Card
              variant="default"
              className="p-5 border border-purple-500/25 bg-gradient-to-br from-purple-50/30 via-transparent to-indigo-50/20 dark:from-slate-900 dark:via-slate-900/90 dark:to-purple-950/20 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 font-mono">
                  <HeartPulse className="w-4 h-4" />
                  <span>Personal Health Impact</span>
                </div>
                <h4 className="text-base font-bold ts-text-primary">
                  Today’s heat affects people differently
                </h4>
                <p className="text-xs ts-text-muted leading-relaxed">
                  Your age, health conditions, hydration, and clothing modify your personal danger level and hydration targets.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t ts-border">
                <Link
                  to="/personal-risk"
                  className="inline-flex items-center gap-2 py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  <span>Check My Heat Risk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>

            {/* Active Alerts Connection */}
            <Card
              variant="default"
              className="p-5 border border-orange-500/25 bg-gradient-to-br from-orange-50/30 via-transparent to-amber-50/20 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono">
                  <Bell className="w-4 h-4" />
                  <span>Public Safety Alerts</span>
                </div>
                <h4 className="text-base font-bold ts-text-primary">
                  Official warnings for {locationName}
                </h4>
                <p className="text-xs ts-text-muted leading-relaxed">
                  View municipal directives, community hydration stations, and essential first aid for heat exhaustion and heat stroke.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t ts-border">
                <Link
                  to="/alerts"
                  className="inline-flex items-center gap-2 py-2 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  <span>View Active Alerts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>

            {/* Try Safety Actions Connection (Simulator Experimentation) */}
            <Card
              variant="default"
              className="p-5 border border-amber-500/25 bg-gradient-to-br from-amber-50/30 via-transparent to-orange-50/20 dark:from-slate-900 dark:via-slate-900/90 dark:to-amber-950/20 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                  <Sliders className="w-4 h-4" />
                  <span>Planning Outdoor Activity?</span>
                </div>
                <h4 className="text-base font-bold ts-text-primary">
                  Check safer outdoor hours first, then explore safety changes
                </h4>
                <p className="text-xs ts-text-muted leading-relaxed">
                  Want to explore how changes in activity intensity, rest pauses, hydration, or clothing may affect heat stress during outdoor hours?
                </p>
              </div>

              <div className="flex-shrink-0">
                <Link
                  to="/interventions"
                  className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors shadow-xs whitespace-nowrap"
                >
                  <span>Try Safety Actions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Calendar className="w-8 h-8 text-slate-400" />}
          title="Forecast Unavailable"
          description="No forecast data returned for the specified coordinates. Try selecting another nearby city."
          action={
            <Button variant="primary" onClick={fetchForecast} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Retry Forecast
            </Button>
          }
        />
      )}
    </div>
  );
};

export default Forecast;
