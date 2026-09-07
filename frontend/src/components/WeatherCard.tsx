import React from 'react';
import { Thermometer, Droplets, Wind, Sun, Clock } from 'lucide-react';
import { WeatherCondition } from '../types';
import { formatTemperature, formatPercent, formatSpeed } from '../utils/risk';
import { Card, CardHeader, CardContent, Badge, EmptyState } from './ui';

interface WeatherCardProps {
  weather?: WeatherCondition;
  className?: string;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, className = '' }) => {
  if (!weather) {
    return (
      <Card className={className}>
        <EmptyState
          icon={<Thermometer className="w-6 h-6 text-slate-400" />}
          title="Telemetry Inactive"
          description="Waiting for live weather telemetry feed from local sensor or station."
        />
      </Card>
    );
  }

  const formattedTime = weather.time
    ? new Date(weather.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Live telemetry';

  return (
    <Card variant="elevated" className={`flex flex-col justify-between ${className}`}>
      <CardHeader
        title="Live Weather Observations"
        subtitle="Real-time synoptic atmospheric measurements."
        badge={
          <Badge variant="brand" size="sm" showDot>
            Live Feed
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
        {/* Main Temperature Display */}
        <div className="p-4 rounded-xl ts-card-subtle border ts-border flex items-baseline justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider ts-text-muted block">
              Dry-Bulb Temperature
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono ts-text-primary tracking-tight mt-1">
              {formatTemperature(weather.temperature)}
            </div>
            <p className="text-[11px] ts-text-subtle mt-0.5">
              Standard thermodynamic air temperature in shaded enclosure.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Thermometer className="w-6 h-6" />
          </div>
        </div>

        {/* 3 Secondary Weather Metrics */}
        <div className="grid grid-cols-3 gap-3">
          {/* Relative Humidity */}
          <div className="p-3 rounded-xl ts-card-subtle border ts-border text-center flex flex-col items-center justify-center">
            <div className="flex items-center space-x-1 text-sky-400 mb-1">
              <Droplets className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold ts-text-muted">Humidity</span>
            </div>
            <span className="text-lg sm:text-xl font-bold font-mono ts-text-primary">
              {formatPercent(weather.humidity)}
            </span>
          </div>

          {/* Wind Speed */}
          <div className="p-3 rounded-xl ts-card-subtle border ts-border text-center flex flex-col items-center justify-center">
            <div className="flex items-center space-x-1 text-teal-400 mb-1">
              <Wind className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold ts-text-muted">Wind Speed</span>
            </div>
            <span className="text-lg sm:text-xl font-bold font-mono ts-text-primary">
              {formatSpeed(weather.wind_speed)}
            </span>
          </div>

          {/* Solar Flux */}
          <div className="p-3 rounded-xl ts-card-subtle border ts-border text-center flex flex-col items-center justify-center">
            <div className="flex items-center space-x-1 text-amber-400 mb-1">
              <Sun className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold ts-text-muted">Solar Flux</span>
            </div>
            <span className="text-lg sm:text-xl font-bold font-mono ts-text-primary">
              {weather.solar_radiation !== null && weather.solar_radiation !== undefined
                ? `${Math.round(weather.solar_radiation)}`
                : '0'}
              <span className="text-xs font-normal ts-text-muted ml-0.5">W/m²</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
