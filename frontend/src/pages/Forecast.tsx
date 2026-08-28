import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ForecastResponse } from '../types';
import { LocationSearch } from '../components/LocationSearch';
import { ForecastChart } from '../components/ForecastChart';
import { LoadingState } from '../components/LoadingState';
import { Calendar, Thermometer, Sun, CloudSun, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { formatTemperature } from '../utils/risk';
import { getCachedData, setCachedData } from '../services/cache';
import { useLocation } from '../context/LocationContext';

export const Forecast: React.FC = () => {
  const { coords, locationName, isLocating, setLocation, detectMyLocation } = useLocation();

  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(err.message || 'Failed to load 5-day synoptic forecast.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [coords.lat, coords.lon]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-sans">
            5-Day Extreme Heatwave Synoptic Forecast
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Predictive temperature progression and multi-day thermal trend trajectory
          </p>
        </div>
      </div>

      {/* Location Search Bar */}
      <div className="relative z-40 bg-slate-900/80 p-4 rounded-2xl border border-slate-800/90 backdrop-blur-md shadow-lg">
        <LocationSearch
          currentLocationName={locationName}
          onSelectLocation={setLocation}
          onUseMyLocation={detectMyLocation}
          isLocating={isLocating}
        />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={fetchForecast}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-bold text-red-200 flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {isLoading && !forecastData ? (
        <LoadingState message="Loading multi-day meteorological forecast..." />
      ) : forecastData ? (
        <div className="space-y-6">
          {/* Visual Trend Chart */}
          <ForecastChart forecast={forecastData.forecast} />

          {/* 5-Day Card Grid */}
          <div>
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <span>Daily High / Low Outlook Matrix ({locationName})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {forecastData.forecast.dates.map((dateStr, idx) => {
                const maxTemp = forecastData.forecast.max_temperature[idx];
                const minTemp = forecastData.forecast.min_temperature[idx];
                const isExtreme = maxTemp >= 40.0;
                const isHigh = maxTemp >= 36.0 && maxTemp < 40.0;

                const dateObj = new Date(dateStr);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                return (
                  <div
                    key={dateStr}
                    className={`p-4 rounded-xl border transition-all ${
                      isExtreme
                        ? 'bg-red-950/20 border-red-500/40 hover:border-red-400 shadow-lg shadow-red-950/30'
                        : isHigh
                        ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                          {idx === 0 ? 'Today' : dayName}
                        </span>
                        <span className="text-xs text-slate-300 font-medium">{formattedDate}</span>
                      </div>
                      {isExtreme ? (
                        <Sun className="w-6 h-6 text-red-400 animate-pulse" />
                      ) : isHigh ? (
                        <CloudSun className="w-6 h-6 text-amber-400" />
                      ) : (
                        <CloudSun className="w-6 h-6 text-cyan-400" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center space-x-1">
                          <Thermometer className="w-3.5 h-3.5 text-red-400" />
                          <span>Max Temp:</span>
                        </span>
                        <span
                          className={`text-base font-extrabold font-mono ${
                            isExtreme ? 'text-red-400' : isHigh ? 'text-amber-400' : 'text-slate-100'
                          }`}
                        >
                          {formatTemperature(maxTemp)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center space-x-1">
                          <Thermometer className="w-3.5 h-3.5 text-blue-400" />
                          <span>Min Temp:</span>
                        </span>
                        <span className="text-sm font-semibold font-mono text-slate-300">
                          {formatTemperature(minTemp)}
                        </span>
                      </div>

                      {/* Daily Advisory Tag */}
                      <div className="pt-2">
                        {isExtreme ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Extreme Heat Threat</span>
                          </span>
                        ) : isHigh ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Elevated Vigilance</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            <CheckCircle className="w-2.5 h-2.5" />
                            <span>Moderate Range</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Forecast;
