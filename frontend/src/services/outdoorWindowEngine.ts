import { DailyForecast, HourlyForecast, WeatherCondition, UserProfile, RiskLevel } from '../types';

export type WindowStatus =
  | 'ACTIVE_NOW'
  | 'UPCOMING_TODAY'
  | 'UPCOMING_TOMORROW_MORNING'
  | 'NO_SIGNIFICANT_RELIEF';

export type VulnerabilityTier = 'STANDARD' | 'ELEVATED' | 'CRITICAL';

export interface ReliefFactor {
  id: string;
  metric: string;
  delta: string;
  labelKey: string;
  descriptionKey: string;
  iconType: 'sun' | 'thermometer' | 'wind' | 'shield';
}

export interface HourlyEvaluationPoint {
  timeIso: string;
  hourNum: number;
  displayHour: string;
  temp: number;
  apparentTemp: number;
  humidity: number;
  uvIndex: number;
  isDay: boolean;
  isSafer: boolean;
  isPeakHeat: boolean;
  reliefScore: number; // 0-100 relative comfort/easing score
  apparentTempDrop: number; // Degrees below peak
}

export interface SaferOutdoorWindowResult {
  status: WindowStatus;
  hasWindow: boolean;
  windowLabel: string;             // e.g. "5:30 PM – 7:30 PM" or "Tomorrow 6:00 AM – 8:00 AM"
  startHourIso: string | null;
  endHourIso: string | null;
  durationHours: number;

  // Peak comparison metrics
  peakTempC: number;
  peakApparentTempC: number;
  peakHourDisplay: string;

  // Window metrics
  windowAvgTempC: number;
  windowAvgApparentTempC: number;
  windowMaxUv: number;
  apparentTempReliefDeg: number;

  // Personalization context
  vulnerabilityTier: VulnerabilityTier;
  vulnerabilityReasonKey: string;
  recommendationKey: string;
  cautiousGuidanceKey: string;
  suitableActivitiesKey: string;

  // Explainability factors
  reliefFactors: ReliefFactor[];

  // 12-to-24 hour trajectory for visual trend strip
  hourlyTimeline: HourlyEvaluationPoint[];

  // Citizen-friendly daytime & active window enhancements (Prompt 15)
  activeNowUntil?: string | null;           // e.g. "3:30 AM" if status === 'ACTIVE_NOW'
  isNightOnlyWindow?: boolean;              // true if primary window is during night hours (e.g. 21:00 - 05:00)
  bestDaytimeWindow?: {
    label: string;                          // e.g. "6:00 AM – 8:30 AM"
    startHour: string;
    endHour: string;
    avgApparentTemp: number;
    reliefDeg: number;
  } | null;
  practicalDaytimeAdvice?: string;          // e.g. "Night hours are cooler, but for most daytime errands the safer practical window is before 9:30 AM / after 5:30 PM."
}

/**
 * Formats an ISO string (e.g. "2026-09-13T17:00") into a user-friendly hour string.
 */
function formatHourDisplay(isoString: string): string {
  try {
    const parts = isoString.split('T');
    if (parts.length < 2) return isoString;
    const timeParts = parts[1].split(':');
    const hour = parseInt(timeParts[0], 10);
    const minute = timeParts[1] ? `:${timeParts[1]}` : ':00';
    if (hour === 0) return `12${minute} AM`;
    if (hour < 12) return `${hour}${minute} AM`;
    if (hour === 12) return `12${minute} PM`;
    return `${hour - 12}${minute} PM`;
  } catch {
    return isoString;
  }
}

/**
 * Assesses user's vulnerability tier based on their profile and live risk score.
 */
export function assessVulnerabilityTier(
  profile?: UserProfile,
  currentRiskLevel?: RiskLevel
): { tier: VulnerabilityTier; reasonKey: string } {
  const isHighRisk = currentRiskLevel === 'HIGH' || currentRiskLevel === 'EXTREME' || currentRiskLevel === 'CRITICAL';
  const hasHealthConditions = (profile?.health?.conditions && profile.health.conditions.length > 0) || false;
  const isOlderAdult = profile?.health?.isOlderAdult || false;
  const isChild = profile?.health?.isChild || false;
  const isPregnant = profile?.health?.isPregnant || false;
  const isOutdoorWorker = profile?.health?.isOutdoorWorker || false;
  const isNotAcclimatized = profile?.exposure?.isAcclimatized === false;

  if (currentRiskLevel === 'CRITICAL' || ((isOlderAdult || hasHealthConditions || isPregnant) && currentRiskLevel === 'EXTREME')) {
    return {
      tier: 'CRITICAL',
      reasonKey: 'outdoorWindow.tierCriticalReason',
    };
  }

  if (isOlderAdult || isChild || isPregnant || hasHealthConditions || isOutdoorWorker || isNotAcclimatized || isHighRisk) {
    return {
      tier: 'ELEVATED',
      reasonKey: isOutdoorWorker
        ? 'outdoorWindow.tierOutdoorWorkerReason'
        : isOlderAdult
        ? 'outdoorWindow.tierOlderAdultReason'
        : 'outdoorWindow.tierElevatedReason',
    };
  }

  return {
    tier: 'STANDARD',
    reasonKey: 'outdoorWindow.tierStandardReason',
  };
}

/**
 * Pure evaluation function: analyzes hourly forecast data and identifies the optimal
 * Safer Outdoor / Thermal Relief Window relative to daytime heat peaks.
 */
export function evaluateSaferOutdoorWindow(
  forecast?: DailyForecast,
  currentWeather?: WeatherCondition,
  profile?: UserProfile,
  currentRiskLevel?: RiskLevel
): SaferOutdoorWindowResult {
  const { tier, reasonKey } = assessVulnerabilityTier(profile, currentRiskLevel);

  // 1. Gather or synthesize hourly points
  let hourly: HourlyForecast | undefined = forecast?.hourly;

  // Fallback if hourly is missing: synthesize standard 24-hour diurnal points from daily min/max
  if (!hourly || !hourly.time || hourly.time.length === 0) {
    const maxT = forecast?.max_temperature?.[0] || currentWeather?.temperature || 34.0;
    const minT = forecast?.min_temperature?.[0] || (maxT - 8.0);
    const now = new Date();
    const times: string[] = [];
    const temps: number[] = [];
    const humidities: number[] = [];
    const appTemps: number[] = [];
    const uvs: number[] = [];
    const isDays: number[] = [];

    const midT = (maxT + minT) / 2.0;
    const ampT = Math.max(2.0, (maxT - minT) / 2.0);

    for (let i = 0; i < 24; i++) {
      const dt = new Date(now.getTime() + i * 3600 * 1000);
      const iso = dt.toISOString().slice(0, 16);
      times.push(iso);
      const h = dt.getHours();
      const diurnal = Math.cos(((h - 14.5) * Math.PI) / 12.0);
      const t = Math.round((midT + ampT * diurnal) * 10) / 10;
      temps.push(t);
      const rh = Math.round((65 - 20 * diurnal) * 10) / 10;
      humidities.push(rh);
      const at = Math.round((t + (rh > 60 ? 3.5 : 1.5)) * 10) / 10;
      appTemps.push(at);
      const isDay = h >= 6 && h <= 18 ? 1 : 0;
      isDays.push(isDay);
      const uv = isDay ? Math.round(Math.max(0, Math.cos(((h - 12.5) * Math.PI) / 7.0) * 8.5) * 10) / 10 : 0;
      uvs.push(uv);
    }

    hourly = {
      time: times,
      temperature: temps,
      humidity: humidities,
      apparent_temperature: appTemps,
      uv_index: uvs,
      is_day: isDays,
    };
  }

  // 2. Identify the evaluation horizon (up to 24 hours from current time)
  const totalPoints = Math.min(24, hourly.time.length);
  const evaluationSlice: {
    timeIso: string;
    temp: number;
    apparentTemp: number;
    humidity: number;
    uvIndex: number;
    isDay: boolean;
    hourNum: number;
  }[] = [];

  for (let i = 0; i < totalPoints; i++) {
    const timeIso = hourly.time[i];
    const hourNum = new Date(timeIso).getHours();
    evaluationSlice.push({
      timeIso,
      temp: hourly.temperature[i] ?? 30.0,
      apparentTemp: hourly.apparent_temperature[i] ?? hourly.temperature[i] ?? 30.0,
      humidity: hourly.humidity[i] ?? 60.0,
      uvIndex: hourly.uv_index[i] ?? 0.0,
      isDay: (hourly.is_day[i] ?? (hourNum >= 6 && hourNum <= 18 ? 1 : 0)) === 1,
      hourNum,
    });
  }

  // 3. Find daytime peak heat
  let peakApparentTemp = -999;
  let peakTemp = -999;
  let peakIndex = 0;

  evaluationSlice.forEach((pt, idx) => {
    // Peak heat is checked primarily during daytime (10:00 to 17:00)
    if (pt.apparentTemp > peakApparentTemp) {
      peakApparentTemp = pt.apparentTemp;
      peakTemp = pt.temp;
      peakIndex = idx;
    }
  });

  if (peakApparentTemp < 0) {
    peakApparentTemp = currentWeather?.apparent_temperature || currentWeather?.temperature || 34.0;
    peakTemp = currentWeather?.temperature || 32.0;
  }

  const peakHourDisplay = formatHourDisplay(evaluationSlice[peakIndex]?.timeIso || '');

  // 4. Thresholds based on user vulnerability
  // Minimum apparent temperature drop required below peak to be considered "Relatively Safer"
  const minDropReq = tier === 'CRITICAL' ? 4.5 : tier === 'ELEVATED' ? 3.5 : 2.5;
  // Maximum absolute apparent temperature ceiling for safe outing
  const maxApparentCeiling = tier === 'CRITICAL' ? 32.0 : tier === 'ELEVATED' ? 34.5 : 37.0;
  // Maximum UV index tolerable
  const maxUvCeiling = tier === 'CRITICAL' ? 0.5 : tier === 'ELEVATED' ? 1.5 : 3.0;

  // 5. Evaluate each hour
  const evaluatedPoints: HourlyEvaluationPoint[] = evaluationSlice.map((pt, idx) => {
    const drop = Math.max(0, Math.round((peakApparentTemp - pt.apparentTemp) * 10) / 10);
    const isPeakHeat = idx === peakIndex || (pt.apparentTemp >= peakApparentTemp - 1.0 && pt.isDay);

    // Relief criteria:
    // 1. Apparent temp is below ceiling
    // 2. Either has meaningful drop from peak OR absolute apparent temp is comfortably low (< 30°C)
    // 3. UV is below tolerable ceiling
    // 4. Not the peak heat hour
    const satisfiesRelief =
      !isPeakHeat &&
      pt.apparentTemp <= maxApparentCeiling &&
      pt.uvIndex <= maxUvCeiling &&
      (drop >= minDropReq || pt.apparentTemp <= 29.5);

    // Calculate relative relief score (0 to 100)
    // Based on temperature easing, absence of solar radiant load, and humidity
    let score = 50;
    score += drop * 8; // Drop from peak boosts score
    if (!pt.isDay || pt.uvIndex < 1.0) score += 20; // Night / sunset relief
    if (pt.apparentTemp < 30) score += 15;
    if (isPeakHeat) score = 10;
    score = Math.min(100, Math.max(0, Math.round(score)));

    return {
      timeIso: pt.timeIso,
      hourNum: new Date(pt.timeIso).getHours(),
      displayHour: formatHourDisplay(pt.timeIso),
      temp: pt.temp,
      apparentTemp: pt.apparentTemp,
      humidity: pt.humidity,
      uvIndex: pt.uvIndex,
      isDay: pt.isDay,
      isSafer: satisfiesRelief,
      isPeakHeat,
      reliefScore: score,
      apparentTempDrop: drop,
    };
  });

  // 6. Find continuous blocks of safer hours
  interface WindowCandidate {
    startIndex: number;
    endIndex: number; // inclusive
    points: HourlyEvaluationPoint[];
    avgApparentTemp: number;
    avgTemp: number;
    maxUv: number;
    apparentTempDrop: number;
    isCurrent: boolean;
    isTomorrow: boolean;
  }

  const candidates: WindowCandidate[] = [];
  let currentBlock: HourlyEvaluationPoint[] = [];
  let blockStartIndex = -1;

  evaluatedPoints.forEach((pt, idx) => {
    if (pt.isSafer) {
      if (blockStartIndex === -1) blockStartIndex = idx;
      currentBlock.push(pt);
    } else {
      if (currentBlock.length >= 1) {
        // Record block
        const avgAt = currentBlock.reduce((acc, p) => acc + p.apparentTemp, 0) / currentBlock.length;
        const avgT = currentBlock.reduce((acc, p) => acc + p.temp, 0) / currentBlock.length;
        const maxUv = Math.max(...currentBlock.map((p) => p.uvIndex));
        const avgDrop = currentBlock.reduce((acc, p) => acc + p.apparentTempDrop, 0) / currentBlock.length;
        candidates.push({
          startIndex: blockStartIndex,
          endIndex: idx - 1,
          points: [...currentBlock],
          avgApparentTemp: Math.round(avgAt * 10) / 10,
          avgTemp: Math.round(avgT * 10) / 10,
          maxUv: Math.round(maxUv * 10) / 10,
          apparentTempDrop: Math.round(avgDrop * 10) / 10,
          isCurrent: blockStartIndex === 0,
          isTomorrow: new Date(currentBlock[0].timeIso).getDate() !== new Date(evaluatedPoints[0].timeIso).getDate(),
        });
      }
      currentBlock = [];
      blockStartIndex = -1;
    }
  });

  // Capture final block if still open
  if (currentBlock.length >= 1) {
    const avgAt = currentBlock.reduce((acc, p) => acc + p.apparentTemp, 0) / currentBlock.length;
    const avgT = currentBlock.reduce((acc, p) => acc + p.temp, 0) / currentBlock.length;
    const maxUv = Math.max(...currentBlock.map((p) => p.uvIndex));
    const avgDrop = currentBlock.reduce((acc, p) => acc + p.apparentTempDrop, 0) / currentBlock.length;
    candidates.push({
      startIndex: blockStartIndex,
      endIndex: evaluatedPoints.length - 1,
      points: [...currentBlock],
      avgApparentTemp: Math.round(avgAt * 10) / 10,
      avgTemp: Math.round(avgT * 10) / 10,
      maxUv: Math.round(maxUv * 10) / 10,
      apparentTempDrop: Math.round(avgDrop * 10) / 10,
      isCurrent: blockStartIndex === 0,
      isTomorrow: new Date(currentBlock[0].timeIso).getDate() !== new Date(evaluatedPoints[0].timeIso).getDate(),
    });
  }

  // 7. Select best candidate window
  let bestCandidate: WindowCandidate | null = null;
  let status: WindowStatus = 'NO_SIGNIFICANT_RELIEF';

  if (candidates.length > 0) {
    // If current hour is active in a window
    const activeNowCandidate = candidates.find((c) => c.isCurrent);
    if (activeNowCandidate) {
      bestCandidate = activeNowCandidate;
      status = 'ACTIVE_NOW';
    } else {
      // Find the upcoming window today
      const todayUpcoming = candidates.find((c) => !c.isTomorrow);
      if (todayUpcoming) {
        bestCandidate = todayUpcoming;
        status = 'UPCOMING_TODAY';
      } else {
        // Next window is tomorrow morning
        const tomorrowCandidate = candidates.find((c) => c.isTomorrow);
        if (tomorrowCandidate) {
          bestCandidate = tomorrowCandidate;
          status = 'UPCOMING_TOMORROW_MORNING';
        } else {
          bestCandidate = candidates[0];
          status = 'UPCOMING_TODAY';
        }
      }
    }
  }

  // If no candidates qualify
  if (!bestCandidate) {
    return {
      status: 'NO_SIGNIFICANT_RELIEF',
      hasWindow: false,
      windowLabel: 'No Significant Relief Today',
      startHourIso: null,
      endHourIso: null,
      durationHours: 0,
      peakTempC: Math.round(peakTemp * 10) / 10,
      peakApparentTempC: Math.round(peakApparentTemp * 10) / 10,
      peakHourDisplay,
      windowAvgTempC: Math.round(peakTemp * 10) / 10,
      windowAvgApparentTempC: Math.round(peakApparentTemp * 10) / 10,
      windowMaxUv: 8.0,
      apparentTempReliefDeg: 0,
      vulnerabilityTier: tier,
      vulnerabilityReasonKey: reasonKey,
      recommendationKey: 'outdoorWindow.noReliefRecommendation',
      cautiousGuidanceKey: 'outdoorWindow.noReliefGuidance',
      suitableActivitiesKey: 'outdoorWindow.noReliefActivities',
      reliefFactors: [],
      hourlyTimeline: evaluatedPoints,
    };
  }

  // 8. Generate window label & metrics
  const startPt = bestCandidate.points[0];
  const endPt = bestCandidate.points[bestCandidate.points.length - 1];

  // Duration in hours
  const durationHours = bestCandidate.points.length;
  const startDisplay = formatHourDisplay(startPt.timeIso);

  // For end time display, advance 1 hour from the last point's start
  const endDisplay = formatHourDisplay(
    new Date(new Date(endPt.timeIso).getTime() + 3600 * 1000).toISOString().slice(0, 16)
  );

  const prefix = status === 'UPCOMING_TOMORROW_MORNING' ? 'Tomorrow ' : '';
  const windowLabel = `${prefix}${startDisplay} – ${endDisplay}`;

  // 9. Generate explainability factors ("Why this window?")
  const reliefFactors: ReliefFactor[] = [
    {
      id: 'apparent_temp_drop',
      metric: `${bestCandidate.apparentTempDrop.toFixed(1)}°C`,
      delta: `-${bestCandidate.apparentTempDrop.toFixed(1)}°C`,
      labelKey: 'outdoorWindow.factorApparentTemp',
      descriptionKey: 'outdoorWindow.factorApparentTempDesc',
      iconType: 'thermometer',
    },
    {
      id: 'solar_radiation',
      metric: bestCandidate.maxUv < 1.0 ? 'Low (< 1.0)' : `${bestCandidate.maxUv.toFixed(1)} UV`,
      delta: 'Minimal direct solar load',
      labelKey: 'outdoorWindow.factorSolar',
      descriptionKey: 'outdoorWindow.factorSolarDesc',
      iconType: 'sun',
    },
    {
      id: 'cooling_dynamics',
      metric: `${bestCandidate.avgTemp.toFixed(1)}°C`,
      delta: `Easing from ${peakTemp.toFixed(1)}°C peak`,
      labelKey: 'outdoorWindow.factorCooling',
      descriptionKey: 'outdoorWindow.factorCoolingDesc',
      iconType: 'wind',
    },
    {
      id: 'biometeorological_strain',
      metric: tier === 'CRITICAL' ? 'High Caution' : tier === 'ELEVATED' ? 'Moderate Caution' : 'Relatively Safer',
      delta: 'Reduced physiological burden',
      labelKey: 'outdoorWindow.factorPhysiological',
      descriptionKey: 'outdoorWindow.factorPhysiologicalDesc',
      iconType: 'shield',
    },
  ];

  // 10. Personalized guidance keys
  let recommendationKey = 'outdoorWindow.recStandard';
  let cautiousGuidanceKey = 'outdoorWindow.guidanceStandard';
  let suitableActivitiesKey = 'outdoorWindow.activitiesStandard';

  if (tier === 'CRITICAL') {
    recommendationKey = 'outdoorWindow.recCritical';
    cautiousGuidanceKey = 'outdoorWindow.guidanceCritical';
    suitableActivitiesKey = 'outdoorWindow.activitiesCritical';
  } else if (tier === 'ELEVATED') {
    recommendationKey = 'outdoorWindow.recElevated';
    cautiousGuidanceKey = 'outdoorWindow.guidanceElevated';
    suitableActivitiesKey = 'outdoorWindow.activitiesElevated';
  }

  // 11. Citizen-friendly daytime & active window intelligence (Prompt 15)
  const isNightOnlyWindow = bestCandidate.points.every(
    (p) => !p.isDay || p.hourNum < 6 || p.hourNum >= 21
  );

  const activeNowUntil = status === 'ACTIVE_NOW' ? endDisplay : null;

  // Search for the best daytime outdoor window (06:00 to 19:00)
  const daytimePoints = evaluatedPoints.filter(
    (p) => p.hourNum >= 6 && p.hourNum <= 19
  );

  let bestDaytimeWindow: {
    label: string;
    startHour: string;
    endHour: string;
    avgApparentTemp: number;
    reliefDeg: number;
  } | null = null;

  if (daytimePoints.length > 0) {
    // Look for safer daytime candidate block first
    const daytimeSaferCandidate = candidates.find(
      (c) => c.points.some((p) => p.hourNum >= 6 && p.hourNum <= 19)
    );

    if (daytimeSaferCandidate) {
      const dStartPt = daytimeSaferCandidate.points[0];
      const dEndPt = daytimeSaferCandidate.points[daytimeSaferCandidate.points.length - 1];
      const dStartDisplay = formatHourDisplay(dStartPt.timeIso);
      const dEndDisplay = formatHourDisplay(
        new Date(new Date(dEndPt.timeIso).getTime() + 3600 * 1000).toISOString().slice(0, 16)
      );
      const isTm = daytimeSaferCandidate.isTomorrow ? 'Tomorrow ' : '';
      bestDaytimeWindow = {
        label: `${isTm}${dStartDisplay} – ${dEndDisplay}`,
        startHour: dStartDisplay,
        endHour: dEndDisplay,
        avgApparentTemp: daytimeSaferCandidate.avgApparentTemp,
        reliefDeg: daytimeSaferCandidate.apparentTempDrop,
      };
    } else {
      // Find the coolest 2-hour morning or evening daytime span
      let minDaySpanAvg = 999;
      let minSpanIdx = 0;
      for (let i = 0; i < daytimePoints.length - 1; i++) {
        const spanAvg = (daytimePoints[i].apparentTemp + daytimePoints[i + 1].apparentTemp) / 2.0;
        if (spanAvg < minDaySpanAvg) {
          minDaySpanAvg = spanAvg;
          minSpanIdx = i;
        }
      }
      const dStartPt = daytimePoints[minSpanIdx];
      const dEndPt = daytimePoints[Math.min(daytimePoints.length - 1, minSpanIdx + 1)];
      const dStartDisplay = formatHourDisplay(dStartPt.timeIso);
      const dEndDisplay = formatHourDisplay(
        new Date(new Date(dEndPt.timeIso).getTime() + 3600 * 1000).toISOString().slice(0, 16)
      );
      bestDaytimeWindow = {
        label: `${dStartDisplay} – ${dEndDisplay}`,
        startHour: dStartDisplay,
        endHour: dEndDisplay,
        avgApparentTemp: Math.round(minDaySpanAvg * 10) / 10,
        reliefDeg: Math.max(0.5, Math.round((peakApparentTemp - minDaySpanAvg) * 10) / 10),
      };
    }
  }

  // Meaningful practical advice for real citizens
  let practicalDaytimeAdvice = 'Plan necessary daytime errands during this window when solar radiant load is minimized.';
  if (isNightOnlyWindow) {
    practicalDaytimeAdvice =
      'Night hours are cooler, but for most daytime errands the safer practical window is before 9:30 AM / after 5:30 PM.';
  } else if (bestDaytimeWindow) {
    practicalDaytimeAdvice = `For normal daytime activities, the coolest practical window is ${bestDaytimeWindow.label} (~${bestDaytimeWindow.reliefDeg.toFixed(1)}°C below peak heat).`;
  }

  return {
    status,
    hasWindow: true,
    windowLabel,
    startHourIso: startPt.timeIso,
    endHourIso: endPt.timeIso,
    durationHours,
    peakTempC: Math.round(peakTemp * 10) / 10,
    peakApparentTempC: Math.round(peakApparentTemp * 10) / 10,
    peakHourDisplay,
    windowAvgTempC: bestCandidate.avgTemp,
    windowAvgApparentTempC: bestCandidate.avgApparentTemp,
    windowMaxUv: bestCandidate.maxUv,
    apparentTempReliefDeg: bestCandidate.apparentTempDrop,
    vulnerabilityTier: tier,
    vulnerabilityReasonKey: reasonKey,
    recommendationKey,
    cautiousGuidanceKey,
    suitableActivitiesKey,
    reliefFactors,
    hourlyTimeline: evaluatedPoints,
    activeNowUntil,
    isNightOnlyWindow,
    bestDaytimeWindow,
    practicalDaytimeAdvice,
  };
}
