import React from 'react';
import { Thermometer, Droplets, Wind, Clock, Flame, SunMedium } from 'lucide-react';
import { WeatherCondition } from '../types';
import { formatTemperature, formatPercent, formatSpeed } from '../utils/risk';
import { Card, CardHeader, CardContent } from './ui';
import { useTranslation } from '../context/LanguageContext';
import { DataRealityBadge } from './provenance';
import { TelemetryState } from '../utils/telemetryState';

interface WeatherCardProps {
  weather?: WeatherCondition;
  locationName?: string;
  className?: string;
  variant?: 'citizen' | 'full';
  telemetryState?: TelemetryState;
  isFallback?: boolean;
  weatherSourceName?: string;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  weather,
  locationName,
  className = '',
  variant = 'citizen',
  telemetryState,
  isFallback = false,
  weatherSourceName,
}) => {
  const { t } = useTranslation();

  const isAvailable = Boolean(
    weather &&
    weather.temperature !== undefined &&
    weather.temperature !== null &&
    !isNaN(weather.temperature) &&
    telemetryState !== 'UNAVAILABLE'
  );

  // If weather observations are unavailable, render clean neutral unavailable state
  if (!isAvailable || !weather) {
    return (
      <Card variant="elevated" className={`flex flex-col justify-between shadow-md ${className}`}>
        <CardHeader
          title={t('weatherCard.title', 'Current Local Conditions')}
          subtitle={locationName ? `${locationName.split(',')[0]} • Observations unavailable` : 'Observations unavailable'}
          badge={
            <DataRealityBadge
              tier="UNAVAILABLE"
              size="xs"
              customLabel="Unavailable"
            />
          }
          action={
            <div className="flex items-center space-x-1.5 text-xs ts-text-muted px-2.5 py-1 rounded-lg ts-card-subtle border ts-border">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-[11px]">—</span>
            </div>
          }
        />
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl ts-card-subtle border ts-border flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider ts-text-muted">
                  {variant === 'citizen' ? t('weather.temperature', 'Current Temperature') : 'Dry-Bulb Air Temperature'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                  Unavailable
                </span>
              </div>
              <div className="flex items-baseline space-x-3">
                <div className="text-4xl sm:text-5xl font-black font-mono ts-text-muted tracking-tight">
                  —
                </div>
                <div className="flex items-center space-x-1 text-xs sm:text-sm font-semibold text-slate-400 bg-slate-500/10 px-2.5 py-1 rounded-lg border border-slate-500/20">
                  <Flame className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Feels like —</span>
                </div>
              </div>
              <p className="text-[11px] ts-text-subtle">
                Weather observations are currently unavailable for this location.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-xl ts-card-subtle border ts-border flex items-center space-x-2.5">
              <Droplets className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <div className="text-[10.5px] ts-text-muted uppercase font-bold">Humidity</div>
                <div className="text-sm font-black font-mono ts-text-muted">—</div>
              </div>
            </div>
            <div className="p-3 rounded-xl ts-card-subtle border ts-border flex items-center space-x-2.5">
              <Wind className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <div className="text-[10.5px] ts-text-muted uppercase font-bold">Wind Speed</div>
                <div className="text-sm font-black font-mono ts-text-muted">—</div>
              </div>
            </div>
            <div className="p-3 rounded-xl ts-card-subtle border ts-border flex items-center space-x-2.5">
              <SunMedium className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <div className="text-[10.5px] ts-text-muted uppercase font-bold">UV Index</div>
                <div className="text-sm font-black font-mono ts-text-muted">—</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const effectiveFallback = Boolean(
    isFallback ||
    weather.is_fallback ||
    weather.source_status === 'OFFLINE_FALLBACK' ||
    telemetryState === 'OFFLINE_FALLBACK'
  );

  const formattedTime = weather.time
    ? new Date(weather.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : effectiveFallback
    ? 'Offline Fallback'
    : 'Live Observation';

  const feelsLike = weather.apparent_temperature ?? weather.temperature;
  const uvIndex = weather.uv_index ?? (weather.solar_radiation && weather.solar_radiation > 400 ? 7.5 : 2.0);

  const getUvBadge = (uv: number) => {
    if (uv >= 11) return { label: t('uv.extreme', 'Extreme'), color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' };
    if (uv >= 8) return { label: t('uv.veryHigh', 'Very High'), color: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30' };
    if (uv >= 6) return { label: t('uv.high', 'High'), color: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30' };
    if (uv >= 3) return { label: t('uv.moderate', 'Moderate'), color: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30' };
    return { label: t('uv.low', 'Low'), color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' };
  };

  const uvBadge = getUvBadge(uvIndex);

  // Provenance tier
  const realityTier = effectiveFallback
    ? 'OFFLINE_FALLBACK'
    : weather.source_status === 'STALE_CACHED' || telemetryState === 'STALE_CACHED'
    ? 'STALE_CACHED'
    : weather.source_status === 'CACHED' || telemetryState === 'CACHED'
    ? 'CACHED'
    : 'LIVE';

  const realityLabel = effectiveFallback
    ? 'Offline Fallback'
    : weather.source_status === 'STALE_CACHED'
    ? 'Stale Cached'
    : weather.source_status === 'CACHED'
    ? 'Cached Data'
    : 'Live Data';

  return (
    <Card variant="elevated" className={`flex flex-col justify-between shadow-md ${className}`}>
      <CardHeader
        title={t('weatherCard.title', 'Current Local Conditions')}
        subtitle={
          variant === 'citizen'
            ? effectiveFallback
              ? 'Offline Regional Baseline • Continuous fallback'
              : 'Live Open-Meteo observations • Regional coordinate'
            : t('weatherCard.subtitle')
        }
        badge={
          <DataRealityBadge
            tier={realityTier}
            size="xs"
            customLabel={realityLabel}
          />
        }
        action={
          <div className="flex items-center space-x-1.5 text-xs ts-text-muted px-2.5 py-1 rounded-lg ts-card-subtle border ts-border">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">{formattedTime}</span>
          </div>
        }
      />
      <CardContent className="space-y-4">
        {/* Main Temperature Display & Feels Like */}
        <div className="p-4 rounded-xl ts-card-subtle border ts-border flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider ts-text-muted">
                {variant === 'citizen' ? t('weather.temperature', 'Current Temperature') : t('weatherCard.dryBulb')}
              </span>
              {weather.weather_description && (
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {weather.weather_description}
                </span>
              )}
            </div>
            <div className="flex items-baseline space-x-3">
              <div className="text-4xl sm:text-5xl font-black font-mono ts-text-primary tracking-tight">
                {formatTemperature(weather.temperature)}
              </div>
              <div className="flex items-center space-x-1 text-xs sm:text-sm font-semibold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
                <Flame className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{t('weatherCard.feelsLike', { temp: formatTemperature(feelsLike) })}</span>
              </div>
            </div>
            <p className="text-[11px] ts-text-subtle">
              {variant === 'citizen'
                ? `Feels like ${formatTemperature(feelsLike)} based on relative humidity and air temperature.`
                : t('weatherCard.synopticNote')}
            </p>
          </div>
        </div>

        {/* 3 Secondary Critical Meteorological Parameters */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {/* Relative Humidity */}
          <div className="p-3 rounded-xl ts-card-subtle border ts-border flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 flex-shrink-0">
              <Droplets className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10.5px] ts-text-muted uppercase font-bold tracking-wider">
                {t('weather.humidity', 'Humidity')}
              </div>
              <div className="text-sm font-black font-mono ts-text-primary mt-0.5">
                {formatPercent(weather.humidity)}
              </div>
            </div>
          </div>

          {/* Wind Speed */}
          <div className="p-3 rounded-xl ts-card-subtle border ts-border flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 flex-shrink-0">
              <Wind className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10.5px] ts-text-muted uppercase font-bold tracking-wider">
                {t('weather.windSpeed', 'Wind')}
              </div>
              <div className="text-sm font-black font-mono ts-text-primary mt-0.5">
                {formatSpeed(weather.wind_speed)}
              </div>
            </div>
          </div>

          {/* Solar / UV Index */}
          <div className="p-3 rounded-xl ts-card-subtle border ts-border flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 flex-shrink-0">
              <SunMedium className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10.5px] ts-text-muted uppercase font-bold tracking-wider">
                UV Index
              </div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-sm font-black font-mono ts-text-primary">
                  {uvIndex.toFixed(1)}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${uvBadge.color}`}>
                  {uvBadge.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherCard;
