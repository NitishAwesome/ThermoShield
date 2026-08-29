import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ThermalResponse, RiskResponse } from '../types';
import { LocationSearch } from '../components/LocationSearch';
import { LoadingState } from '../components/LoadingState';
import {
  Flame,
  CheckCircle2,
  AlertTriangle,
  Info,
  Cpu,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Shield,
  BookOpen,
} from 'lucide-react';
import { formatTemperature, formatPercent, formatSpeed, getRiskBadgeStyles } from '../utils/risk';
import { getCachedData, setCachedData } from '../services/cache';
import { useLocation } from '../context/LocationContext';

export const RiskDetails: React.FC = () => {
  const { coords, locationName, isLocating, setLocation, detectMyLocation } = useLocation();

  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const cached = getCachedData(coords.lat, coords.lon);
      if (cached?.thermal) {
        setThermalData(cached.thermal);
        if (cached.risk) setRiskData(cached.risk);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const [thermalRes, riskRes] = await Promise.allSettled([
          api.getThermal(coords.lat, coords.lon),
          api.getRisk(coords.lat, coords.lon),
        ]);

        let updatedThermal: ThermalResponse | null = null;
        let updatedRisk: RiskResponse | null = null;

        if (thermalRes.status === 'fulfilled') {
          updatedThermal = thermalRes.value;
          setThermalData(thermalRes.value);
        }
        if (riskRes.status === 'fulfilled') {
          updatedRisk = riskRes.value;
          setRiskData(riskRes.value);
        } else {
          setRiskData(null);
        }

        if (updatedThermal) {
          setCachedData(coords.lat, coords.lon, {
            thermal: updatedThermal,
            risk: updatedRisk,
          });
        }

        if (thermalRes.status === 'rejected' && !cached?.thermal) {
          setError('Failed to load biometeorological thermal stress data.');
        }
      } catch (err: any) {
        if (!cached?.thermal) {
          setError(err.message || 'An unexpected error occurred while fetching risk analysis.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [coords.lat, coords.lon]);

  const risk = thermalData?.thermal?.risk_assessment;
  const indices = thermalData?.thermal?.indices;
  const weather = thermalData?.weather;
  const styles = getRiskBadgeStyles(risk?.level);

  // Derive thermal stress feature value (0-100) from normalized risk_assessment score
  const derivedThermalStress =
    thermalData?.thermal?.risk_assessment?.score !== undefined
      ? (thermalData.thermal.risk_assessment.score * 100).toFixed(1)
      : 'N/A';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-sans">
          Heat & Health Risk Analysis
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Understand current heat strain, weather conditions, and modeled pressure on local health services.
        </p>
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

      {isLoading ? (
        <LoadingState message="Computing thermal indices & ML predictions..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* Top Overview Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Heat Strain Card */}
            <div className={`p-6 rounded-2xl bg-slate-800/90 border ${styles.border} shadow-xl backdrop-blur-md flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Environmental Heat Strain</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${styles.badge}`}>
                    {risk?.level || 'LOW'}
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-cyan-400">
                    {formatTemperature(indices?.wbgt_c)}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">Primary Indicator: Estimated Wet-Bulb Globe Temperature</p>
                </div>
                <p className="text-xs text-slate-300 mt-4 leading-relaxed border-t border-slate-700/60 pt-3">
                  {risk?.reason || 'Standard biometeorological assessment.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60 flex justify-between items-center text-xs">
                <span className="text-slate-400">Thermal Severity Score:</span>
                <span className="font-bold text-slate-100">
                  {risk?.score !== undefined ? risk.score.toFixed(2) : 'N/A'} / 1.00
                </span>
              </div>
            </div>

            {/* Civic Health Risk Model Card */}
            <div className="p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Civic Health Risk Model</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-mono font-bold border border-purple-500/30">
                    Decision-Support Model
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-purple-400">
                    {riskData?.risk?.risk_score !== undefined ? riskData.risk.risk_score.toFixed(1) : 'N/A'}
                  </span>
                  <span className="text-sm font-semibold text-slate-400 ml-1">/ 100</span>
                  <p className="text-xs text-slate-400 mt-1">Civic Health Risk Score</p>
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-slate-300 border-t border-slate-700/60 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Modeled Clinic Surge:</span>
                    <span className="font-bold text-purple-300">
                      {riskData?.risk?.predicted_health_impact_proxy !== undefined
                        ? `~${riskData.risk.predicted_health_impact_proxy.toFixed(2)} visits/ward`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Model Type:</span>
                    <span className="text-slate-300 font-mono">Random Forest Regression</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
                Estimates potential hospital and clinic surge volume for municipal resource planning. Not an individual medical probability or diagnosis.
              </div>
            </div>

            {/* Current Weather Conditions Card */}
            <div className="p-6 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-md flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-slate-400">Current Weather Conditions</span>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Air Temperature:</span>
                    <span className="text-base font-bold text-white">
                      {formatTemperature(weather?.temperature)}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Relative Humidity:</span>
                    <span className="text-base font-bold text-cyan-300">
                      {formatPercent(weather?.humidity)}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Wind Speed:</span>
                    <span className="text-base font-bold text-teal-300">
                      {formatSpeed(weather?.wind_speed)}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">Solar Radiation:</span>
                    <span className="text-base font-bold text-amber-300">
                      {weather?.solar_radiation ? `${Math.round(weather.solar_radiation)} W/m²` : '0 W/m²'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 flex justify-between">
                <span>Weather Data Source:</span>
                <span className="font-semibold text-slate-200">Open-Meteo High-Res</span>
              </div>
            </div>
          </div>

          {/* 4 Biometeorological Indices Comparative Grid */}
          <div className="rounded-2xl bg-slate-800/90 border border-slate-700/80 p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span>Comparative Heat Index Breakdown</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* WBGT */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/30">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-cyan-300">Estimated WBGT</span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold">
                    PRIMARY
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-cyan-400 mt-2 font-sans">
                  {formatTemperature(indices?.wbgt_c)}
                </p>
                <p className="text-xs text-slate-300 mt-2">
                  Combined environmental heat index factoring in air temperature, humidity, wind, and direct sunlight.
                </p>
                <span className="inline-block mt-2 text-[10px] text-slate-400 font-mono">Standard: ISO 7243</span>
              </div>

              {/* Heat Index */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-orange-300">NOAA Heat Index</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                    {indices?.heat_index_status || 'VALID'}
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-orange-400 mt-2 font-sans">
                  {indices?.heat_index_c !== null && indices?.heat_index_c !== undefined
                    ? `${indices.heat_index_c.toFixed(1)}°C`
                    : 'N/A (Limit)'}
                </p>
                <p className="text-xs text-slate-300 mt-2">
                  Apparent human heat perception under shaded conditions based on temperature and relative humidity.
                </p>
                <span className="inline-block mt-2 text-[10px] text-slate-400 font-mono">Standard: NOAA Rothfusz</span>
              </div>

              {/* Apparent Temp */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80">
                <div className="text-xs font-bold text-slate-300">Apparent Temperature</div>
                <p className="text-3xl font-extrabold text-slate-100 mt-2 font-sans">
                  {formatTemperature(indices?.apparent_temperature_c)}
                </p>
                <p className="text-xs text-slate-300 mt-2">
                  Feels-like temperature accounting for water vapor pressure and convective cooling from wind.
                </p>
                <span className="inline-block mt-2 text-[10px] text-slate-400 font-mono">Standard: Steadman (1984)</span>
              </div>

              {/* Stull Wet-Bulb */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80">
                <div className="text-xs font-bold text-slate-300">Natural Wet-Bulb (Tw)</div>
                <p className="text-3xl font-extrabold text-slate-100 mt-2 font-sans">
                  {formatTemperature(indices?.wet_bulb_temp_c)}
                </p>
                <p className="text-xs text-slate-300 mt-2">
                  Thermodynamic lowest temperature achievable by evaporative sweat cooling in the current air.
                </p>
                <span className="inline-block mt-2 text-[10px] text-slate-400 font-mono">Standard: Stull (2011)</span>
              </div>
            </div>
          </div>

          {/* Explainability Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Why this rating? */}
            <div className="rounded-2xl bg-slate-800/90 border border-slate-700/80 p-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center space-x-2 border-b border-slate-700/60 pb-3 mb-4 text-orange-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Why this rating?</span>
              </div>
              <ul className="space-y-2.5">
                {risk?.risk_basis?.map((rb, idx) => (
                  <li key={idx} className="text-xs text-slate-200 flex items-start space-x-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-orange-400 font-bold">•</span>
                    <span>{rb}</span>
                  </li>
                ))}
                {(!risk?.risk_basis || risk.risk_basis.length === 0) && (
                  <li className="text-xs text-slate-400">Standard baseline environmental conditions.</li>
                )}
              </ul>
            </div>

            {/* Why current conditions matter */}
            <div className="rounded-2xl bg-slate-800/90 border border-slate-700/80 p-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center space-x-2 border-b border-slate-700/60 pb-3 mb-4 text-cyan-400 font-bold text-sm">
                <Info className="w-5 h-5" />
                <span>Why current conditions matter</span>
              </div>
              <ul className="space-y-2.5">
                {risk?.environmental_factors?.map((ef, idx) => (
                  <li key={idx} className="text-xs text-slate-200 flex items-start space-x-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{ef}</span>
                  </li>
                ))}
                {(!risk?.environmental_factors || risk.environmental_factors.length === 0) && (
                  <li className="text-xs text-slate-400">Normal meteorological parameters.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Technical Details & Model Architecture Drawer */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl backdrop-blur-md">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2 mb-3">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Technical Details & Methodology (SIH Evaluation Reference)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Model Feature Ingestion:</span>
                <span className="font-semibold text-slate-200">Thermal Stress Score: {derivedThermalStress} / 100</span>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ingests physical thermal severity along with demographic baseline vulnerability.
                </p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Scientific Framework:</span>
                <span className="font-semibold text-slate-200">Dual-Layer Biometeorology</span>
                <p className="text-[10px] text-slate-400 mt-1">
                  Layer 1 computes thermodynamic strain; Layer 2 forecasts health facility load.
                </p>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Standards Compliance:</span>
                <span className="font-semibold text-slate-200">ISO 7243, NOAA, OSHA</span>
                <p className="text-[10px] text-slate-400 mt-1">
                  Thresholds aligned with peer-reviewed heat-health action guidelines.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RiskDetails;
