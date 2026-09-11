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
  Activity,
  HeartHandshake,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatTemperature, formatPercent, formatSpeed } from '../utils/risk';
import { getCachedData, setCachedData } from '../services/cache';
import { useLocation } from '../context/LocationContext';
import { useTranslation } from '../context/LanguageContext';
import { Card, CardHeader, CardContent, Badge, Button } from '../components/ui';

// Utility for natural, clear plain-language phrasing
const toPlainLanguage = (text?: string): string => {
  if (!text) return '';
  let clean = text;
  clean = clean.replace(
    /Normal outdoor recreation, sports, and daily activities may proceed without restriction\.?/gi,
    'Normal outdoor activities can continue. Use basic sun and hydration precautions.'
  );
  clean = clean.replace(
    /Standard occupational pacing and routine break schedules\.?/gi,
    'Normal work can continue, with regular water and rest breaks.'
  );
  clean = clean.replace(
    /Peak Danger Window:\s*(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)(?:\s*\([^)]*\))?/gi,
    'Hottest Hours: Take extra care between $1 and $2. Stay hydrated and avoid unnecessary direct sun.'
  );
  return clean;
};

export const RiskDetails: React.FC = () => {
  const { coords, locationName, isLocating, setLocation, detectMyLocation } = useLocation();
  const { t } = useTranslation();

  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showScientificDetails, setShowScientificDetails] = useState<boolean>(false);

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
  const level = (risk?.level || 'LOW').toUpperCase();

  // Calm Risk Badge Title
  const getActionBadge = () => {
    if (level === 'LOW') {
      return { text: t('riskCard.lowRisk'), variant: 'low' as const };
    }
    if (level === 'MODERATE') {
      return { text: t('riskCard.moderateBurden'), variant: 'moderate' as const };
    }
    if (level === 'HIGH') {
      return { text: t('riskCard.highStrain'), variant: 'high' as const };
    }
    return { text: t('riskCard.extremeHazard'), variant: 'extreme' as const };
  };

  const actionBadge = getActionBadge();

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
            {t('nav.activeZone')}
          </span>
          <Badge variant="brand" size="sm">
            {t('nav.riskAnalysis')}
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold ts-text-primary font-sans mt-0.5">
          {t('riskDetails.title')}
        </h1>
        <p className="text-sm ts-text-muted mt-1">
          {t('riskDetails.subtitle')} ({locationName})
        </p>
      </div>

      {/* Location Search Bar */}
      <div className="relative z-40 ts-card p-4 shadow-lg rounded-2xl border ts-border">
        <LocationSearch
          currentLocationName={locationName}
          onSelectLocation={setLocation}
          onUseMyLocation={detectMyLocation}
          isLocating={isLocating}
        />
      </div>

      {isLoading ? (
        <LoadingState message={t('common.loading')} />
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: TODAY'S HEAT RISK */}
          <Card
            variant="elevated"
            className="p-4 sm:p-6 border-l-4 border-l-orange-500 relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider ts-text-subtle block">
                  {t('riskDetails.todayRiskSummary')}
                </span>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black ts-text-primary font-sans mt-1">
                  {t('riskDetails.todayHeatRisk')}: {level}
                </h2>
                <p className="text-xs sm:text-sm ts-text-muted mt-1 max-w-2xl leading-relaxed">
                  {toPlainLanguage(risk?.reason) ||
                    t('riskDetails.safeBaseline')}
                </p>
              </div>

              <div className="flex items-center space-x-3 flex-shrink-0">
                <Badge riskLevel={level} size="lg" showDot showIcon>
                  {level} {t('alerts.title')}
                </Badge>
              </div>
            </div>
          </Card>

          {/* SECTION 2: WHAT IS DRIVING THE RISK? */}
          <div className="mb-2">
            <h2 className="text-lg font-bold ts-text-primary">{t('riskDetails.primaryDrivers')}</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Heat Stress on the Body */}
            <Card variant="elevated" className="p-4 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b ts-border pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider ts-text-muted flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-orange-400" />
                    {t('riskDetails.heatStressBody')}
                  </span>
                  <Badge riskLevel={level} size="sm">
                    {level}
                  </Badge>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <div className="text-4xl sm:text-5xl font-black font-mono text-orange-400">
                      {formatTemperature(indices?.wbgt_c)}
                    </div>
                    <span className="text-xs ts-text-muted font-semibold mt-1 block">
                      Wet-Bulb Globe Temperature (WBGT)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs ts-text-subtle block font-semibold">{t('riskCard.heatStrainIndex')}</span>
                    <span className="text-2xl font-black font-mono ts-text-primary">
                      {risk?.score !== undefined ? `${Math.round(risk.score * 100)}` : '—'}
                      <span className="text-xs ts-text-muted font-normal ml-0.5">/100</span>
                    </span>
                  </div>
                </div>


                <p className="text-xs ts-text-muted mt-4 leading-relaxed ts-card-subtle p-3 rounded-xl border ts-border">
                  Direct physical heat stress experienced outdoors, factoring in ambient temperature, humidity, direct sunlight, and wind cooling.
                </p>
              </div>
            </Card>

            {/* Estimated Community Health Risk */}
            <Card variant="elevated" className="p-6 flex flex-col justify-between border-purple-500/30">
              <div>
                <div className="flex items-center justify-between border-b ts-border pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                    {t('riskCard.civicHealthRisk')}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] font-mono font-bold border border-purple-500/30">
                    {t('riskCard.planningEstimate')}
                  </span>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <div className="text-4xl sm:text-5xl font-black font-mono text-purple-700 dark:text-purple-400">
                      {riskData?.risk?.risk_score !== undefined
                        ? riskData.risk.risk_score.toFixed(1)
                        : '—'}
                      <span className="text-base font-semibold ts-text-muted ml-1">/ 100</span>
                    </div>
                    <span className="text-xs ts-text-muted font-semibold mt-1 block">
                      {t('riskCard.civicHealthRisk')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs ts-text-subtle block font-semibold">{t('riskCard.healthcareDemand')}</span>
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300 font-mono">
                      {riskData?.risk?.predicted_health_impact_proxy !== undefined
                        ? `~${riskData.risk.predicted_health_impact_proxy.toFixed(1)} cases/ward`
                        : 'Calibrating...'}
                    </span>
                  </div>
                </div>

                <p className="text-xs ts-text-muted mt-4 leading-relaxed ts-card-subtle p-3 rounded-xl border ts-border">
                  <strong className="text-purple-700 dark:text-purple-300">{t('riskCard.planningEstimate')}: </strong>
                  Helps municipal authorities anticipate clinic pressure and prepare early relief. This is a planning model, not a medical diagnosis.
                </p>
              </div>
            </Card>
          </div>

          {/* SECTION 3: CURRENT CONDITIONS */}
          <Card>
            <CardHeader
              title={t('dashboard.currentThermalMetrics')}
              subtitle={t('weatherCard.subtitle')}
              badge={
                <Badge variant="brand" size="sm">
                  {t('riskCard.liveTelemetry')}
                </Badge>
              }
            />
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl ts-card-subtle border ts-border">
                  <div className="flex items-center space-x-1.5 ts-text-muted text-xs mb-1">
                    <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                    <span>{t('dashboard.temperature')}</span>
                  </div>
                  <div className="text-2xl font-black font-mono ts-text-primary">
                    {formatTemperature(weather?.temperature)}
                  </div>
                  <span className="text-[10.5px] ts-text-subtle block mt-0.5">{t('weatherCard.dryBulb')}</span>
                </div>

                <div className="p-3.5 rounded-xl ts-card-subtle border ts-border">
                  <div className="flex items-center space-x-1.5 ts-text-muted text-xs mb-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t('dashboard.humidity')}</span>
                  </div>
                  <div className="text-2xl font-black font-mono ts-text-primary">
                    {formatPercent(weather?.humidity)}
                  </div>
                  <span className="text-[10.5px] ts-text-subtle block mt-0.5">{t('matrix.humidity')}</span>
                </div>

                <div className="p-3.5 rounded-xl ts-card-subtle border ts-border">
                  <div className="flex items-center space-x-1.5 ts-text-muted text-xs mb-1">
                    <Wind className="w-3.5 h-3.5 text-teal-400" />
                    <span>{t('dashboard.windSpeed')}</span>
                  </div>
                  <div className="text-2xl font-black font-mono ts-text-primary">
                    {formatSpeed(weather?.wind_speed)}
                  </div>
                  <span className="text-[10.5px] ts-text-subtle block mt-0.5">{t('dashboard.windSpeed')}</span>
                </div>

                <div className="p-3.5 rounded-xl ts-card-subtle border ts-border">
                  <div className="flex items-center space-x-1.5 ts-text-muted text-xs mb-1">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('weatherCard.solarFlux')}</span>
                  </div>
                  <div className="text-2xl font-black font-mono ts-text-primary">
                    {weather?.solar_radiation ? `${Math.round(weather.solar_radiation)}` : '0'}
                    <span className="text-xs font-normal ts-text-muted ml-1">W/m²</span>
                  </div>
                  <span className="text-[10.5px] ts-text-subtle block mt-0.5">{t('weatherCard.solarFlux')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: UNDERSTANDING THE HEAT (Thermal Metrics Comparison) */}
          <Card>
            <CardHeader
              title={t('thermalCard.title')}
              subtitle={t('thermalCard.subtitle')}
            />
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* WBGT (Dominant) */}
                <div className="p-4 rounded-xl ts-card-subtle border border-orange-500/40 bg-orange-500/5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-orange-400">{t('thermalCard.wbgtPrimary')}</span>
                    <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded font-bold">
                      WBGT
                    </span>
                  </div>
                  <div className="text-3xl font-black font-mono text-orange-400 mt-2">
                    {formatTemperature(indices?.wbgt_c)}
                  </div>
                  <p className="text-xs ts-text-muted mt-2 leading-relaxed">
                    {t('thermalCard.wbgtDesc')}
                  </p>
                </div>

                {/* Heat Index */}
                <div className="p-4 rounded-xl ts-card-subtle border ts-border">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold ts-text-primary">{t('thermalCard.heatIndexShaded')}</span>
                    <span className="text-[10px] bg-slate-800 ts-text-muted px-1.5 py-0.5 rounded">
                      NOAA
                    </span>
                  </div>
                  <div className="text-3xl font-black font-mono ts-text-primary mt-2">
                    {indices?.heat_index_c !== null && indices?.heat_index_c !== undefined
                      ? `${indices.heat_index_c.toFixed(1)}°C`
                      : 'N/A'}
                  </div>
                  <p className="text-xs ts-text-muted mt-2 leading-relaxed">
                    {t('thermalCard.heatIndexDesc')}
                  </p>
                </div>

                {/* Apparent Temp */}
                <div className="p-4 rounded-xl ts-card-subtle border ts-border">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold ts-text-primary">{t('thermalCard.apparentConvective')}</span>
                    <span className="text-[10px] bg-slate-800 ts-text-muted px-1.5 py-0.5 rounded">
                      AT
                    </span>
                  </div>
                  <div className="text-3xl font-black font-mono ts-text-primary mt-2">
                    {formatTemperature(indices?.apparent_temperature_c)}
                  </div>
                  <p className="text-xs ts-text-muted mt-2 leading-relaxed">
                    {t('thermalCard.apparentDesc')}
                  </p>
                </div>

                {/* Natural Wet-Bulb */}
                <div className="p-4 rounded-xl ts-card-subtle border ts-border">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold ts-text-primary">{t('thermalCard.wetBulbEvaporative')}</span>
                    <span className="text-[10px] bg-slate-800 ts-text-muted px-1.5 py-0.5 rounded">
                      NWB
                    </span>
                  </div>
                  <div className="text-3xl font-black font-mono ts-text-primary mt-2">
                    {formatTemperature(indices?.wet_bulb_temp_c)}
                  </div>
                  <p className="text-xs ts-text-muted mt-2 leading-relaxed">
                    {t('thermalCard.wetBulbDesc')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 5: WHY ARE WE SEEING THIS RISK? */}
          <Card>
            <CardHeader
              title={t('riskDrivers.title')}
              subtitle={t('riskDrivers.subtitle')}
            />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl ts-card-subtle border ts-border">
                  <div className="flex items-center space-x-2 text-orange-400 font-bold text-xs mb-3">
                    <Shield className="w-4 h-4" />
                    <span>{t('thermalCard.riskBasisTitle')}</span>
                  </div>
                  <ul className="space-y-2.5">
                    {risk?.risk_basis && risk.risk_basis.length > 0 ? (
                      risk.risk_basis.map((rb, idx) => {
                        const isHigh = rb.toLowerCase().includes('high') || rb.toLowerCase().includes('extreme') || rb.toLowerCase().includes('danger');
                        return (
                          <li key={idx} className="text-xs ts-text-muted flex items-start space-x-2">
                            {isHigh ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            )}
                            <span className="leading-snug">{toPlainLanguage(rb)}</span>
                          </li>
                        );
                      })
                    ) : (
                      <li className="text-xs ts-text-muted flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{t('riskDetails.safeBaseline')}</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="p-4 rounded-xl ts-card-subtle border ts-border">
                  <div className="flex items-center space-x-2 text-sky-400 font-bold text-xs mb-3">
                    <Info className="w-4 h-4" />
                    <span>{t('thermalCard.envObsTitle')}</span>
                  </div>
                  <ul className="space-y-2.5">
                    {risk?.environmental_factors && risk.environmental_factors.length > 0 ? (
                      risk.environmental_factors.map((ef, idx) => {
                        const isWarning = ef.toLowerCase().includes('humid') || ef.toLowerCase().includes('solar') || ef.toLowerCase().includes('stagnant');
                        return (
                          <li key={idx} className="text-xs ts-text-muted flex items-start space-x-2">
                            {isWarning ? (
                              <AlertTriangle className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            )}
                            <span className="leading-snug">{toPlainLanguage(ef)}</span>
                          </li>
                        );
                      })
                    ) : (
                      <li className="text-xs ts-text-muted flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{t('riskDetails.conditionsComfortable')}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 6: RECOMMENDED ACTIONS */}
          <Card className="border-orange-500/30">
            <CardHeader
              title={t('alerts.safetyProtocols')}
              subtitle={t('alerts.subtitle')}
              badge={
                <Badge variant={actionBadge.variant} size="sm">
                  {actionBadge.text}
                </Badge>
              }
            />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hydration */}
                <div className="p-4 rounded-xl ts-card-subtle border ts-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-400 block mb-1">
                    {t('alerts.hydrationProtocol')}
                  </span>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {toPlainLanguage(thermalData?.thermal?.hydration?.guidance) ||
                      'Drink water regularly throughout the day. Do not wait until you feel thirsty.'}
                  </p>
                </div>

                {/* Outdoor Activities */}
                <div className="p-4 rounded-xl ts-card-subtle border ts-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1">
                    {t('alerts.activityPacing')}
                  </span>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {toPlainLanguage(
                      thermalData?.thermal?.activity_guidance?.heavy_physical_work ||
                        thermalData?.thermal?.activity_guidance?.outdoor_activity
                    ) || 'Normal outdoor activities can continue. Take regular breaks if working outdoors.'}
                  </p>
                </div>

                {/* People Who Need Extra Protection */}
                <div className="p-4 rounded-xl ts-card-subtle border ts-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 block mb-1">
                    {t('alerts.vulnerableProtection')}
                  </span>
                  <p className="text-xs ts-text-muted leading-relaxed">
                    {toPlainLanguage(thermalData?.thermal?.vulnerable_population?.guidance) ||
                      'Check on children, elderly relatives, and people who work outside.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 7: SCIENTIFIC DETAILS (Progressive Disclosure) */}
          <Card>
            <div
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => setShowScientificDetails(!showScientificDetails)}
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold ts-text-primary">
                    {t('riskDetails.scientificMethodology')}
                  </h3>
                  <p className="text-xs ts-text-muted mt-0.5">
                    {t('riskDetails.scientificDesc')}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="ts-text-muted self-start sm:self-auto flex-shrink-0">
                {showScientificDetails ? (
                  <span className="flex items-center gap-1 text-xs">
                    {t('riskDetails.collapse')} <ChevronUp className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs">
                    {t('riskDetails.inspectScientific')} <ChevronDown className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>


            {showScientificDetails && (
              <CardContent className="border-t ts-border pt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs ts-text-muted leading-relaxed">
                  <div className="p-4 rounded-xl ts-card-subtle border ts-border">
                    <h4 className="font-bold ts-text-primary mb-1.5">Wet-Bulb Globe Temperature (ISO 7243)</h4>
                    <p>
                      ThermoShield evaluates WBGT using the Liljegren outdoor physical equilibrium algorithm, accounting for cosine solar zenith angle, atmospheric turbidity, air density, and wind convective heat transfer.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl ts-card-subtle border ts-border">
                    <h4 className="font-bold ts-text-primary mb-1.5">Natural Wet-Bulb (Stull 2011)</h4>
                    <p>
                      Calculated using the empirical polynomial approximation across ambient dry-bulb temperature (T) and relative humidity (RH). Represents the survivability cooling envelope for the human body.
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

        </div>
      )}
    </div>
  );
};

export default RiskDetails;
