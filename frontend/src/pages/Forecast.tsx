import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ForecastResponse } from '../types';
import { LocationSearch } from '../components/LocationSearch';
import { ForecastChart } from '../components/ForecastChart';
import { LoadingState } from '../components/LoadingState';
import { Calendar, Thermometer, Sun, CloudSun, AlertTriangle, CheckCircle, RefreshCw, Info } from 'lucide-react';
import { formatTemperature } from '../utils/risk';
import { getCachedData, setCachedData } from '../services/cache';
import { useLocation } from '../context/LocationContext';
import { Card, CardHeader, CardContent, Badge, EmptyState, Button } from '../components/ui';

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
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Synoptic Outlook
            </span>
            <Badge variant="brand" size="sm">
              5-Day Window
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold ts-text-primary font-sans mt-0.5">
            5-Day Meteorological Forecast
          </h1>
          <p className="text-sm ts-text-muted mt-1">
            Synoptic high and low temperature trajectories for proactive heat planning in {locationName}.
          </p>
        </div>
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

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchForecast}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry
          </Button>
        </div>
      )}

      {isLoading && !forecastData ? (
        <LoadingState message="Loading multi-day meteorological forecast..." />
      ) : forecastData ? (
        <div className="space-y-6">
          {/* Visual Trend Chart */}
          <ForecastChart forecast={forecastData.forecast} />

          {/* 5-Day Outlook Matrix */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-orange-400" />
                  <span>5-Day Synoptic Outlook Matrix</span>
                </div>
              }
              subtitle="Daily high and low temperature limits. Data from validated synoptic meteorological feeds."
              badge={
                <Badge variant="neutral" size="sm">
                  {locationName.split(',')[0]}
                </Badge>
              }
            />
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
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
                          ? 'bg-red-500/10 border-red-500/40 shadow-md'
                          : isHigh
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'ts-card-subtle border ts-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3 border-b ts-border pb-2">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider ts-text-subtle block">
                            {idx === 0 ? 'Day 1 (Today)' : `Day ${idx + 1} (${dayName})`}
                          </span>
                          <span className="text-xs ts-text-primary font-medium">{formattedDate}</span>
                        </div>
                        {isExtreme ? (
                          <Sun className="w-5 h-5 text-red-400 animate-pulse" />
                        ) : isHigh ? (
                          <CloudSun className="w-5 h-5 text-amber-400" />
                        ) : (
                          <CloudSun className="w-5 h-5 text-sky-400" />
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs ts-text-muted flex items-center space-x-1">
                            <Thermometer className="w-3.5 h-3.5 text-red-400" />
                            <span>Max:</span>
                          </span>
                          <span
                            className={`text-base font-extrabold font-mono ${
                              isExtreme ? 'text-red-400' : isHigh ? 'text-amber-400' : 'ts-text-primary'
                            }`}
                          >
                            {formatTemperature(maxTemp)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs ts-text-muted flex items-center space-x-1">
                            <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                            <span>Min:</span>
                          </span>
                          <span className="text-sm font-semibold font-mono ts-text-muted">
                            {formatTemperature(minTemp)}
                          </span>
                        </div>

                        {/* Daily Advisory Tag */}
                        <div className="pt-2">
                          {isExtreme ? (
                            <Badge variant="extreme" size="sm" showIcon>
                              Extreme Heat
                            </Badge>
                          ) : isHigh ? (
                            <Badge variant="high" size="sm" showIcon>
                              Elevated Heat
                            </Badge>
                          ) : (
                            <Badge variant="low" size="sm" showIcon>
                              Normal Range
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Outlook transparency note */}
              <div className="mt-4 p-3 rounded-xl ts-card-subtle border ts-border flex items-center space-x-2 text-xs ts-text-muted">
                <Info className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span>
                  Weather forecast displays real meteorological data. Multi-day civic risk score modeling is computed dynamically upon date arrival to maintain empirical integrity.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={<Calendar className="w-8 h-8 text-slate-400" />}
          title="Forecast Unavailable"
          description="No synoptic forecast data returned for the specified coordinates. Try selecting another nearby city."
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
