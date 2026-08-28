import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ForecastResponse, LocationItem } from '../types';
import { LocationSearch } from '../components/LocationSearch';
import { ForecastChart } from '../components/ForecastChart';
import { LoadingState } from '../components/LoadingState';
import { Calendar, Thermometer, Sun, CloudSun, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatTemperature } from '../utils/risk';

import { getCachedData, setCachedData } from '../services/cache';

export const Forecast: React.FC = () => {
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: 19.076, lon: 72.8777 });
  const [locationName, setLocationName] = useState<string>('Mumbai, Maharashtra');
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    fetchForecast();
  }, [coords.lat, coords.lon]);

  const handleSelectLocation = (loc: LocationItem) => {
    setLocationName(loc.name);
    setCoords({ lat: loc.latitude, lon: loc.longitude });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationName(`Current Location (${pos.coords.latitude.toFixed(3)}°N, ${pos.coords.longitude.toFixed(3)}°E)`);
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => alert(`Location access error: ${err.message}`)
    );
  };

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
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <LocationSearch
          currentLocationName={locationName}
          onSelectLocation={handleSelectLocation}
          onUseMyLocation={handleUseMyLocation}
        />
      </div>

      {isLoading ? (
        <LoadingState message="Fetching 5-day weather & heat forecast..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      ) : forecastData ? (
        <>
          {/* Main Forecast Chart */}
          <ForecastChart forecast={forecastData.forecast} />

          {/* Daily Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {forecastData.forecast.dates.map((dateStr, idx) => {
              const d = new Date(dateStr);
              const maxT = forecastData.forecast.max_temperature[idx];
              const minT = forecastData.forecast.min_temperature[idx];
              const isHeatwaveDay = maxT >= 40.0;
              const isHighDay = maxT >= 35.0 && maxT < 40.0;

              return (
                <div
                  key={dateStr}
                  className={`p-4 rounded-2xl bg-slate-800/90 border ${
                    isHeatwaveDay
                      ? 'border-red-500/40 shadow-red-500/10'
                      : isHighDay
                      ? 'border-orange-500/40'
                      : 'border-slate-700/80'
                  } shadow-lg backdrop-blur-md flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-3">
                      <span className="text-xs font-bold text-slate-400">
                        {d.toLocaleDateString([], { weekday: 'short' })}
                      </span>
                      <span className="text-xs text-slate-300 font-mono">
                        {d.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-center my-3">
                      {isHeatwaveDay ? (
                        <Sun className="w-10 h-10 text-red-400 animate-spin" />
                      ) : isHighDay ? (
                        <Sun className="w-10 h-10 text-orange-400" />
                      ) : (
                        <CloudSun className="w-10 h-10 text-amber-400" />
                      )}
                    </div>

                    <div className="text-center">
                      <div className="flex items-baseline justify-center space-x-2">
                        <span className="text-2xl font-extrabold text-white">
                          {formatTemperature(maxT)}
                        </span>
                        <span className="text-xs text-slate-400">
                          / {formatTemperature(minT)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">Max / Min Air Temp</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-700/50 text-center">
                    {isHeatwaveDay ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Heatwave Risk</span>
                      </span>
                    ) : isHighDay ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                        <span>Caution Period</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" />
                        <span>Standard Range</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
};
