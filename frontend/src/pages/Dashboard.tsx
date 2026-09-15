import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  ThermalResponse,
  RiskResponse,
  WeatherResponse,
} from '../types';
import { LocationSearch } from '../components/LocationSearch';
import { RiskCard } from '../components/RiskCard';
import { WeatherCard } from '../components/WeatherCard';
import { CitizenActionGuidance } from '../components/CitizenActionGuidance';
import { SaferOutdoorWindowCard } from '../components/SaferOutdoorWindowCard';
import { LocationConfirmationBanner } from '../components/LocationConfirmationBanner';
import { SevereHeatCheckInCard } from '../components/SevereHeatCheckInCard';
import { VulnerableFamilyProtectionCard } from '../components/VulnerableFamilyProtectionCard';
import { AlertBanner } from '../components/AlertBanner';
import { LoadingState } from '../components/LoadingState';
import { RoleWelcomeBanner } from '../components/RoleWelcomeBanner';
import { PersonalizedDashboardSummary } from '../components/PersonalizedDashboardSummary';
import {
  AlertCircle,
  RefreshCw,
  HeartPulse,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Clock,
  Radio,
  Sliders,
} from 'lucide-react';
import { getCachedData, setCachedData } from '../services/cache';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { Button, Card } from '../components/ui';
import { subscribeToLiveRisk, type LiveRisk } from '../services/liveRisk';
import { useTranslation } from '../context/LanguageContext';
import { DataRealityBadge, FallbackModeBanner, MethodologyDisclosureModal } from '../components/provenance';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const {
    coords,
    locationName,
    isLocating,
    setLocation,
    detectMyLocation,
    checkLocationMismatch,
  } = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { profile } = useProfile();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [liveRisk, setLiveRisk] = useState<LiveRisk | null>(null);
  const [liveRiskError, setLiveRiskError] = useState<string | null>(null);

  const [thermalData, setThermalData] = useState<ThermalResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);

  const isFallbackMode = Boolean(
    weatherData?.is_fallback ||
    weatherData?.weather?.is_fallback ||
    weatherData?.source_status === 'OFFLINE_FALLBACK' ||
    thermalData?.weather?.is_fallback ||
    thermalData?.weather?.source_status === 'OFFLINE_FALLBACK'
  );
  const weatherSourceName = weatherData?.source_name || thermalData?.weather?.source_name || 'Regional Baseline Dataset';

  const fetchData = async (lat: number, lon: number) => {
    // 1. Instant Cache Check for instantaneous UI rendering
    const cached = getCachedData(lat, lon);
    if (cached?.thermal) {
      setThermalData(cached.thermal);
      setWeatherData({
        location: cached.thermal.location,
        weather: cached.thermal.weather,
        forecast: cached.thermal.forecast,
      });
      if (cached.risk) setRiskData(cached.risk);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      // Parallel fetch for thermal stress and ML risk
      const [thermalRes, riskRes] = await Promise.allSettled([
        api.getThermal(lat, lon),
        api.getRisk(lat, lon, { email: user?.email }),
      ]);

      let updatedThermal: ThermalResponse | null = null;
      let updatedRisk: RiskResponse | null = null;

      // 1. Primary Thermal Engine (includes complete weather payload)
      if (thermalRes.status === 'fulfilled') {
        updatedThermal = thermalRes.value;
        setThermalData(thermalRes.value);
        setWeatherData({
          location: thermalRes.value.location,
          weather: thermalRes.value.weather,
          forecast: thermalRes.value.forecast,
        });
        setError(null);
      } else {
        console.error('Thermal API call failed:', thermalRes.reason);
      }

      // 2. ML Risk Prediction (Non-blocking fallback)
      if (riskRes.status === 'fulfilled') {
        updatedRisk = riskRes.value;
        setRiskData(riskRes.value);
      } else {
        console.warn('ML Risk model currently unavailable:', riskRes.reason);
        if (!cached?.risk) {
          setRiskData(null);
        }
      }

      // Update cache
      if (updatedThermal) {
        setCachedData(lat, lon, {
          thermal: updatedThermal,
          risk: updatedRisk || cached?.risk,
        });
      }

      // If core thermal fails and no thermal data is present, notify user
      if (thermalRes.status === 'rejected' && !updatedThermal && !cached?.thermal) {
        setError(
          'Unable to connect to ThermoShield telemetry engine. Please ensure backend is running.'
        );
      } else if (thermalRes.status === 'fulfilled') {
        setError(null);
      }
    } catch (err: any) {
      if (!cached?.thermal) {
        setError(
          err.message ||
            'An unexpected error occurred while fetching thermal intelligence.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(coords.lat, coords.lon);
  }, [coords.lat, coords.lon]);

  // Check for location change if auto-monitoring preference is active
  useEffect(() => {
    if (profile.notificationPreferences?.locationContext?.autoLocationMonitoring) {
      checkLocationMismatch();
    }
  }, [
    profile.notificationPreferences?.locationContext?.autoLocationMonitoring,
    checkLocationMismatch,
  ]);

  // Live Firebase Risk Subscription
  useEffect(() => {
    const locationId = riskData?.location?.id;

    if (locationId == null) {
      setLiveRisk(null);
      return;
    }

    setLiveRiskError(null);

    const unsubscribe = subscribeToLiveRisk(
      String(locationId),
      (updatedRisk) => {
        setLiveRisk(updatedRisk);
      },
      (firebaseError) => {
        console.error('Firebase live-risk subscription failed:', firebaseError);
        setLiveRiskError(firebaseError.message);
        setLiveRisk(null);
      }
    );

    return unsubscribe;
  }, [riskData?.location?.id]);

  const activeRiskLevel =
    thermalData?.thermal?.risk_assessment?.level || riskData?.risk?.risk_level || 'LOW';

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. LOCATION CONTEXT & PERSONALIZED CITIZEN HEADER                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ts-border">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-mono">
              Citizen Heat Safety
            </span>
            <span className="text-xs ts-text-muted">• SIH26083</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black ts-text-primary tracking-tight font-sans mt-1">
            {isAuthenticated && user?.name
              ? `Welcome back, ${user.name}`
              : t('dashboard.title', "Today's Heat Conditions & Safety")}
          </h1>

          <p className="text-xs sm:text-sm ts-text-muted mt-0.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
            <span>
              Showing conditions for:{' '}
              <strong className="ts-text-primary font-semibold">{locationName}</strong>
            </span>
          </p>
        </div>

        {/* Live / Fallback Freshness & Reality Indicator */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <DataRealityBadge
            tier={isFallbackMode ? 'OFFLINE_FALLBACK' : 'LIVE'}
            size="sm"
            onClick={() => setIsMethodologyOpen(true)}
          />
          <button
            type="button"
            onClick={() => setIsMethodologyOpen(true)}
            className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            title="Inspect Data Reality & Provenance Standards"
          >
            <span>Methodology</span>
          </button>
        </div>
      </div>

      {/* Fallback Mode Banner: Displayed when offline demonstration dataset is active */}
      {isFallbackMode && (
        <FallbackModeBanner
          sourceName={weatherSourceName}
          onRetry={() => fetchData(coords.lat, coords.lon)}
        />
      )}

      {/* Role Welcome Banner: Compact Mode (Never overwhelming for the user) */}
      <RoleWelcomeBanner user={user} initialMode="compact" />

      {/* Location Confirmation Banner (Appears only when automatic change is detected) */}
      <LocationConfirmationBanner />

      {/* Search & Location Bar */}
      <div className="relative z-10 ts-card p-3 sm:p-4 shadow-sm">
        <LocationSearch
          currentLocationName={locationName}
          onSelectLocation={setLocation}
          onUseMyLocation={detectMyLocation}
          isLocating={isLocating}
        />
      </div>

      {/* Error Alert: Shown only if telemetry completely fails */}
      {error && !thermalData && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-center justify-between">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-red-900 dark:text-red-200">
                {t('common.error', 'Error')}: Weather Telemetry Inactive
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(coords.lat, coords.lon)}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      )}

      {isLoading && !thermalData ? (
        <LoadingState message={t('common.loading', 'Loading personal heat telemetry...')} />
      ) : (
        <>
          {/* Personalized Health Situation Summary (When user has profile or active conditions) */}
          <PersonalizedDashboardSummary
            user={user}
            profile={profile}
            locationName={locationName}
            thermalData={thermalData}
          />

          {/* ========================================================================= */}
          {/* 2. ACTIVE HEAT ALERT (High Priority when hazard exists)                   */}
          {/* ========================================================================= */}
          {thermalData?.thermal?.risk_assessment && (
            <AlertBanner
              riskAssessment={thermalData.thermal.risk_assessment}
              hydration={thermalData.thermal.hydration}
              activity={thermalData.thermal.activity_guidance}
              vulnerable={thermalData.thermal.vulnerable_population}
            />
          )}

          {/* ========================================================================= */}
          {/* 3 & 5. TODAY'S HEAT RISK + CURRENT LOCAL CONDITIONS                       */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Today's Heat Risk (Citizen Mode: Plain language, no confusing WBGT or civic metrics) */}
            <RiskCard
              variant="citizen"
              riskAssessment={thermalData?.thermal?.risk_assessment}
              locationName={locationName}
              temperature={thermalData?.weather?.temperature}
              humidity={thermalData?.weather?.humidity}
              windSpeed={thermalData?.weather?.wind_speed}
              timestamp={thermalData?.weather?.time}
            />

            {/* Current Local Conditions (Citizen-friendly: Temp, Feels Like, Humidity, Wind, UV) */}
            <WeatherCard
              variant="citizen"
              weather={thermalData?.weather || weatherData?.weather}
            />
          </div>

          {/* ========================================================================= */}
          {/* 4. WHAT YOU SHOULD DO NOW (Practical immediate actions)                   */}
          {/* ========================================================================= */}
          <CitizenActionGuidance
            riskAssessment={thermalData?.thermal?.risk_assessment}
            hydration={thermalData?.thermal?.hydration}
            activity={thermalData?.thermal?.activity_guidance}
            vulnerable={thermalData?.thermal?.vulnerable_population}
            temperature={thermalData?.weather?.temperature}
          />

          {/* ========================================================================= */}
          {/* 6. SAFER OUTDOOR TIME (Compact summary + CTA to /forecast)                */}
          {/* ========================================================================= */}
          <SaferOutdoorWindowCard
            variant="compact"
            forecast={thermalData?.forecast || weatherData?.forecast}
            weather={thermalData?.weather || weatherData?.weather}
            currentRiskLevel={activeRiskLevel}
          />

          {/* ========================================================================= */}
          {/* 7. PERSONAL HEAT RISK CTA (Lead deeper into /personal-risk)               */}
          {/* ========================================================================= */}
          <Card
            variant="elevated"
            className="p-5 sm:p-6 border border-orange-500/35 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-transparent shadow-md"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25 flex-shrink-0">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      Personalized Heat Calculation
                    </span>
                    {isAuthenticated && user && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/30">
                        {user.role?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold ts-text-primary mt-0.5">
                    How does today's heat affect you?
                  </h3>
                  <p className="text-xs sm:text-sm ts-text-muted mt-0.5 max-w-2xl leading-relaxed">
                    Your age, chronic health conditions, outdoor exposure, work intensity, and clothing
                    significantly change your personal heat vulnerability.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto flex-shrink-0">
                <Link
                  to="/personal-risk"
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Check My Heat Risk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </Card>

          {/* ========================================================================= */}
          {/* 8. EXPLORATORY SAFETY ACTIONS (Lower priority than alerts & personal risk) */}
          {/* ========================================================================= */}
          <Card
            variant="default"
            className="p-5 sm:p-6 border ts-border ts-card-subtle bg-gradient-to-r from-orange-500/5 via-transparent to-amber-500/5"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 font-mono">
                    Explore Safety Actions
                  </div>
                  <h3 className="text-sm sm:text-base font-bold ts-text-primary mt-0.5">
                    Want to explore how safety changes could affect your heat exposure?
                  </h3>
                  <p className="text-xs ts-text-muted mt-0.5 max-w-xl leading-relaxed">
                    See how changes like resting in shade, drinking water, adjusting activity timing, or improving cooling may affect estimated heat stress.
                  </p>
                </div>
              </div>

              <Link
                to="/interventions"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border ts-border ts-card-subtle hover:bg-orange-500/10 hover:border-orange-500/30 text-xs font-bold ts-text-primary transition-all flex items-center justify-center space-x-2 whitespace-nowrap flex-shrink-0"
              >
                <span>Try Safety Actions</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
              </Link>
            </div>
          </Card>

          {/* ========================================================================= */}
          {/* 9. FAMILY PROTECTION & SEVERE HEAT CHECK-IN                               */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            {/* Severe Heat Situational Check-In (Domestic Context: at home, working outdoors, transit) */}
            <SevereHeatCheckInCard
              currentRiskLevel={activeRiskLevel}
              temperature={thermalData?.weather?.temperature}
              wbgt={thermalData?.thermal?.indices?.wbgt_c}
            />

            {/* Vulnerable Family Member Protection Card */}
            <VulnerableFamilyProtectionCard
              currentRiskLevel={activeRiskLevel}
              temperature={thermalData?.weather?.temperature}
              wbgt={thermalData?.thermal?.indices?.wbgt_c}
            />
          </div>
        </>
      )}

      {/* Transparency & Scientific Methodology Modal */}
      <MethodologyDisclosureModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
        defaultTier={isFallbackMode ? 'OFFLINE_FALLBACK' : 'LIVE'}
      />
    </div>
  );
};

export default Dashboard;
