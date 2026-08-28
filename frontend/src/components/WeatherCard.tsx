import React from 'react';
import { Thermometer, Droplets, Wind, Sun, Clock } from 'lucide-react';
import { WeatherCondition } from '../types';
import { formatTemperature, formatPercent, formatSpeed } from '../utils/risk';

interface WeatherCardProps {
  weather?: WeatherCondition;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather }) => {
  if (!weather) {
    return (
      <div className="rounded-2xl bg-slate-800/90 border border-slate-700 p-6 flex items-center justify-center text-slate-400 text-sm">
        No live weather data available.
      </div>
    );
  }

  const formattedTime = weather.time
    ? new Date(weather.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Live';

  return (
    <div className="rounded-2xl bg-slate-800/90 border border-slate-700/80 p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Thermometer className="w-5 h-5 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Live Weather Observations
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-full border border-slate-700/50">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{formattedTime}</span>
        </div>
      </div>

      {/* Main Temp Display */}
      <div className="mt-4 flex items-baseline justify-between">
        <div>
          <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            {formatTemperature(weather.temperature)}
          </span>
          <p className="text-xs text-slate-400 mt-1 font-medium">Ambient Dry-Bulb Temperature</p>
        </div>
      </div>

      {/* Weather Metrics Grid */}
      <div className="mt-4 grid grid-cols-3 gap-3 pt-3 border-t border-slate-700/60">
        {/* Humidity */}
        <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center text-center">
          <div className="flex items-center space-x-1 text-cyan-400 mb-1">
            <Droplets className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold text-slate-400">Humidity</span>
          </div>
          <span className="text-sm font-bold text-slate-100">{formatPercent(weather.humidity)}</span>
        </div>

        {/* Wind Speed */}
        <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center text-center">
          <div className="flex items-center space-x-1 text-teal-400 mb-1">
            <Wind className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold text-slate-400">Wind</span>
          </div>
          <span className="text-sm font-bold text-slate-100">
            {formatSpeed(weather.wind_speed)}
          </span>
        </div>

        {/* Solar Radiation */}
        <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center text-center">
          <div className="flex items-center space-x-1 text-amber-400 mb-1">
            <Sun className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold text-slate-400">Solar</span>
          </div>
          <span className="text-sm font-bold text-slate-100">
            {weather.solar_radiation !== null && weather.solar_radiation !== undefined
              ? `${Math.round(weather.solar_radiation)} W/m²`
              : '0 W/m²'}
          </span>
        </div>
      </div>
    </div>
  );
};
