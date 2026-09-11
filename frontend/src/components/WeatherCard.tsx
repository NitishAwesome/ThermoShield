import React from 'react';
import { Thermometer, Droplets, Wind, Sun, Clock, Flame, ShieldAlert, SunMedium } from 'lucide-react';
import { WeatherCondition } from '../types';
import { formatTemperature, formatPercent, formatSpeed } from '../utils/risk';
import { Card, CardHeader, CardContent, Badge, EmptyState } from './ui';
import { useTranslation } from '../context/LanguageContext';

interface WeatherCardProps {
  weather?: WeatherCondition;
  className?: string;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, className = '' }) => {
  const { t } = useTranslation();

  if (!weather) {
    return (
      <Card className={className}>
        <EmptyState
          icon={<Thermometer className="w-6 h-6 text-slate-400" />}
          title={t('weatherCard.telemetryInactive')}
          description={t('weatherCard.telemetryWaiting')}
        />
      </Card>
    );
  }

  const formattedTime = weather.time
    ? new Date(weather.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : t('riskCard.liveTelemetry');

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

  return (
    <Card variant="elevated" className={`flex flex-col justify-between ${className}`}>
      <CardHeader
        title={t('weatherCard.title')}
        subtitle={t('weatherCard.subtitle')}
        badge={
          <Badge variant="brand" size="sm" showDot>
            {t('riskCard.liveTelemetry')}
          </Badge>
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
                {t('weatherCard.dryBulb')}
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
              {t('weatherCard.synopticNote')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0 ml-3">
            <Thermometer className="w-6 h-6" />
          </div>
        </div>

        {/* 4 Meteorological Environmental Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Relative Humidity */}
          <div className="p-2.5 rounded-xl ts-card-subtle border ts-border text-center flex flex-col items-center justify-center">
            <div className="flex items-center space-x-1 text-sky-400 mb-1">
              <Droplets className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold ts-text-muted">{t('weather.humidity')}</span>
            </div>
            <span className="text-base sm:text-lg font-bold font-mono ts-text-primary">
              {formatPercent(weather.humidity)}
            </span>
          </div>

          {/* Wind Speed */}
          <div className="p-2.5 rounded-xl ts-card-subtle border ts-border text-center flex flex-col items-center justify-center">
            <div className="flex items-center space-x-1 text-teal-400 mb-1">
              <Wind className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold ts-text-muted">{t('weather.windSpeed')}</span>
            </div>
            <span className="text-base sm:text-lg font-bold font-mono ts-text-primary">
              {formatSpeed(weather.wind_speed)}
            </span>
          </div>

          {/* Solar Irradiance */}
          <div className="p-2.5 rounded-xl ts-card-subtle border ts-border text-center flex flex-col items-center justify-center">
            <div className="flex items-center space-x-1 text-amber-400 mb-1">
              <Sun className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold ts-text-muted">{t('weatherCard.solarFlux')}</span>
            </div>
            <span className="text-base sm:text-lg font-bold font-mono ts-text-primary">
              {weather.solar_radiation !== null && weather.solar_radiation !== undefined
                ? `${Math.round(weather.solar_radiation)}`
                : '0'}
              <span className="text-[10px] font-normal ts-text-muted ml-0.5">W/m²</span>
            </span>
          </div>

          {/* UV Radiation Index */}
          <div className="p-2.5 rounded-xl ts-card-subtle border ts-border text-center flex flex-col items-center justify-center">
            <div className="flex items-center space-x-1 text-orange-400 mb-1">
              <SunMedium className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold ts-text-muted">{t('dashboard.uvIndex')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-base sm:text-lg font-bold font-mono ts-text-primary">
                {uvIndex.toFixed(1)}
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${uvBadge.color}`}>
                {uvBadge.label}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
