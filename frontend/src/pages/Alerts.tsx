import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ThermalResponse, LocationItem } from '../types';
import { LocationSearch } from '../components/LocationSearch';
import { LoadingState } from '../components/LoadingState';
import {
  Bell,
  Droplet,
  Clock,
  UserCheck,
  AlertOctagon,
  ShieldCheck,
  Activity,
  HeartHandshake,
  AlertTriangle,
} from 'lucide-react';
import { getRiskBadgeStyles } from '../utils/risk';

import { getCachedData, setCachedData } from '../services/cache';

export const Alerts: React.FC = () => {
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: 19.076, lon: 72.8777 });
  const [locationName, setLocationName] = useState<string>('Mumbai, Maharashtra');
  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    fetchAlerts();
  }, [coords.lat, coords.lon]);

  const handleSelectLocation = (loc: LocationItem) => {
    setLocationName(loc.name);
    setCoords({ lat: loc.latitude, lon: loc.longitude });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationName(`GPS (${pos.coords.latitude.toFixed(3)}°N, ${pos.coords.longitude.toFixed(3)}°E)`);
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => alert(`Location error: ${err.message}`)
    );
  };

  const risk = thermalData?.thermal?.risk_assessment;
  const hydration = thermalData?.thermal?.hydration;
  const activity = thermalData?.thermal?.activity_guidance;
  const vulnerable = thermalData?.thermal?.vulnerable_population;
  const advisories = thermalData?.thermal?.advisories || [];
  const styles = getRiskBadgeStyles(risk?.level);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-sans">
          Public Health Alerts & Civic Safety Advisories
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Evidence-based civic heat action plan guidelines, occupational work/rest cycles, and hydration protocols
        </p>
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
        <LoadingState message="Compiling public health advisories..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* Active Alert Banner Card */}
          <div className={`p-6 rounded-2xl bg-slate-800/90 border ${styles.border} shadow-xl backdrop-blur-md`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className={`w-6 h-6 ${styles.text}`} />
                <h2 className="text-lg font-bold text-slate-100">
                  Current Threat Level:{' '}
                  <span className={styles.text}>{risk?.level} RISK</span>
                </h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${styles.badge}`}>
                {risk?.alert_category} TIER
              </span>
            </div>
            <p className="text-sm text-slate-200 mt-2">{risk?.reason}</p>
          </div>

          {/* 3 Core Pillars: Hydration, Activity Guidance, Vulnerable Populations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Hydration Protocol */}
            <div className="p-6 rounded-2xl bg-slate-800/90 border border-cyan-500/30 shadow-xl backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-4">
                  <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                    <Droplet className="w-5 h-5" />
                    <span>Hydration Protocol</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                    {hydration?.priority} PRIORITY
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-semibold">Drinking Interval & Volume:</span>
                    <span className="text-sm font-bold text-cyan-300 mt-0.5 block">
                      {hydration?.approximate_amount_ml
                        ? `~${hydration.approximate_amount_ml} mL (${hydration.recommended_interval})`
                        : hydration?.recommended_interval}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-semibold">Electrolyte Supplementation:</span>
                    <span className="text-xs font-semibold text-slate-200 mt-0.5 block">
                      {hydration?.electrolytes_recommended
                        ? 'Recommended (ORS / electrolyte solutions for prolonged sweating)'
                        : 'Standard drinking water sufficient'}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed pt-1">
                    {hydration?.guidance}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
                Source Basis: <span className="text-slate-300 font-medium">{hydration?.basis}</span>
              </div>
            </div>

            {/* 2. Occupational & Activity Guidance */}
            <div className="p-6 rounded-2xl bg-slate-800/90 border border-orange-500/30 shadow-xl backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-4">
                  <div className="flex items-center space-x-2 text-orange-400 font-bold text-sm">
                    <Activity className="w-5 h-5" />
                    <span>Work & Activity Pacing</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono font-bold">
                    REST CYCLES
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-semibold">Outdoor Recreation:</span>
                    <span className="text-xs font-medium text-slate-200 mt-0.5 block">
                      {activity?.outdoor_activity}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-semibold">Heavy Labor Work/Rest:</span>
                    <span className="text-xs font-medium text-slate-200 mt-0.5 block">
                      {activity?.heavy_physical_work}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-semibold">Peak Danger Hours:</span>
                    <span className="text-xs font-bold text-orange-300 mt-0.5 block">
                      {activity?.peak_heat_hours}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
                Rest Requirement: <span className="text-slate-300 font-medium">{activity?.rest_guidance}</span>
              </div>
            </div>

            {/* 3. Vulnerable Population Safeguards */}
            <div className="p-6 rounded-2xl bg-slate-800/90 border border-purple-500/30 shadow-xl backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-4">
                  <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                    <HeartHandshake className="w-5 h-5" />
                    <span>Vulnerable Demographic Protection</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    vulnerable?.priority ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {vulnerable?.priority ? 'PRIORITY TARGET' : 'ROUTINE'}
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-semibold mb-1">Target Vulnerable Groups:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {vulnerable?.groups?.map((g, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] capitalize"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-slate-300 leading-relaxed pt-1">
                    {vulnerable?.guidance}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
                Action Plan: Deploy community cooling stations and conduct proactive elder welfare checks.
              </div>
            </div>
          </div>

          {/* Actionable Civic Advisories List */}
          <div className="rounded-2xl bg-slate-800/90 border border-slate-700/80 p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Civic Heatwave Action Plan (HAP) Directives</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {advisories.map((advisory, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-700/70 flex items-start space-x-3 text-xs text-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                  <span className="leading-relaxed">{advisory}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
