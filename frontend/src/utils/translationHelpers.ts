import { TranslationDictionary } from '../i18n/types';

/**
 * Translates backend generated safety recommendations into localized strings.
 */
export function translateSafetyRecommendation(
  rec: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!rec) return '';
  const lower = rec.toLowerCase();

  // "Drink at least 750 mL of water per hour (small sips every 15-20 minutes)."
  const waterMatch = rec.match(/Drink at least (\d+)\s*mL/i);
  if (waterMatch) {
    return t('recommendation.waterPerHour', { amount: waterMatch[1] }, rec);
  }

  // "You are unacclimatized to heat: Limit strenuous outdoor labor during your initial 7–14 days."
  if (lower.includes('unacclimatized')) {
    return t('recommendation.unacclimatized', {}, rec);
  }

  // "UV Index is high (6.0): Wear broad-spectrum SPF 30+ sunscreen and UV-blocking eyewear."
  const uvMatch = rec.match(/UV Index is high \(([0-9.]+)\)/i);
  if (uvMatch) {
    return t('recommendation.uvHigh', { uv: uvMatch[1] }, rec);
  }

  // "Incorporate Oral Rehydration Salts (ORS), coconut water, or electrolyte-replenishing drinks."
  if (lower.includes('oral rehydration salts') || lower.includes('ors') || lower.includes('electrolyte-replenishing')) {
    return t('recommendation.orsElectrolytes', {}, rec);
  }

  // "Follow work-rest cycle: 40 min work / 20 min rest per hour in shade."
  if (lower.includes('follow work-rest cycle:')) {
    const cyclePart = rec.replace(/Follow work-rest cycle:\s*/i, '');
    return t('recommendation.followWorkRest', { cycle: cyclePart }, rec);
  }

  // "Wear UV-blocking wide-brim headgear, light-colored breathable clothing, and apply SPF 30+ sunscreen."
  if (lower.includes('wide-brim headgear') || lower.includes('breathable clothing')) {
    return t('recommendation.uvGear', {}, rec);
  }

  // "If taking diuretics, beta-blockers, or antihistamines, consult your healthcare provider regarding dosage during heatwaves."
  if (lower.includes('diuretics') || lower.includes('beta-blockers') || lower.includes('antihistamines')) {
    return t('recommendation.medications', {}, rec);
  }

  // "Ensure access to active indoor cooling (fans, evaporative cooler, or air conditioning) between 12:00 PM and 4:00 PM."
  if (lower.includes('access to active indoor cooling')) {
    return t('recommendation.indoorCooling', {}, rec);
  }

  return rec;
}

/**
 * Translates backend generated risk factors breakdown (factors & descriptions)
 */
export function translateRiskFactor(
  factor: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!factor) return '';
  const lower = factor.toLowerCase();

  // "Outdoor Exposure (3.0 hrs)"
  const expMatch = factor.match(/Outdoor Exposure \(([0-9.]+) hrs\)/i);
  if (expMatch) {
    return t('risk.factor.outdoorExposure', { hours: expMatch[1] }, factor);
  }

  // "Clothing: Standard"
  const clothMatch = factor.match(/Clothing:\s*([A-Za-z_ ]+)/i);
  if (clothMatch) {
    const rawType = clothMatch[1].trim().toLowerCase();
    let localizedType = clothMatch[1].trim();
    if (rawType.includes('light')) localizedType = t('risk.lightCotton');
    else if (rawType.includes('heavy') || rawType.includes('protective')) localizedType = t('risk.heavyCoverall');
    else if (rawType.includes('standard')) localizedType = t('risk.standardClothing');
    return t('risk.factor.clothing', { type: localizedType }, factor);
  }

  // "Ambient Thermal Load"
  if (lower.includes('ambient thermal load')) {
    return t('risk.factor.ambientThermalLoad', {}, factor);
  }

  // "High UV Index (7.5)"
  const uvMatch = factor.match(/High UV Index \(([0-9.]+)\)/i);
  if (uvMatch) {
    return t('risk.factor.highUvIndex', { uv: uvMatch[1] }, factor);
  }

  // "Age (42 yrs)"
  const ageMatch = factor.match(/Age \((\d+)\s*yrs\)/i);
  if (ageMatch) {
    return t('risk.factor.age', { age: ageMatch[1] }, factor);
  }

  // "Activity: Light"
  const actMatch = factor.match(/Activity:\s*([A-Za-z_ ]+)/i);
  if (actMatch) {
    const rawAct = actMatch[1].trim().toLowerCase();
    let localizedAct = actMatch[1].trim();
    if (rawAct.includes('sedentary')) localizedAct = t('profile.effortSedentary');
    else if (rawAct.includes('light')) localizedAct = t('profile.effortLight');
    else if (rawAct.includes('moderate')) localizedAct = t('profile.effortModerate');
    else if (rawAct.includes('heavy')) localizedAct = t('profile.effortHeavy');
    return t('risk.factor.activity', { activity: localizedAct }, factor);
  }

  // "Hydration: Moderate"
  const hydMatch = factor.match(/Hydration:\s*([A-Za-z_ ]+)/i);
  if (hydMatch) {
    const rawHyd = hydMatch[1].trim().toLowerCase();
    let localizedHyd = hydMatch[1].trim();
    if (rawHyd.includes('well')) localizedHyd = t('risk.hydrationWell');
    else if (rawHyd.includes('moderate')) localizedHyd = t('risk.hydrationModerate');
    else if (rawHyd.includes('dehydrated')) localizedHyd = t('risk.hydrationDehydrated');
    return t('risk.factor.hydration', { hydration: localizedHyd }, factor);
  }

  // "Pregnancy"
  if (lower.includes('pregnancy')) {
    return t('profile.currentlyPregnant', {}, factor);
  }

  // "Smoking / Tobacco"
  if (lower.includes('smoking') || lower.includes('tobacco')) {
    return t('risk.smoker', {}, factor);
  }

  // "Unacclimatized to Heat"
  if (lower.includes('unacclimatized')) {
    return t('risk.unacclimatized', {}, factor);
  }

  // Chronic conditions
  if (lower.includes('heart') || lower.includes('cardiovascular')) {
    return t('profile.condHeart', {}, factor);
  }
  if (lower.includes('hypertension')) {
    return t('profile.condHypertension', {}, factor);
  }
  if (lower.includes('asthma') || lower.includes('copd')) {
    return t('profile.condBreathing', {}, factor);
  }
  if (lower.includes('diabetes')) {
    return t('profile.condDiabetes', {}, factor);
  }
  if (lower.includes('kidney') || lower.includes('renal')) {
    return t('profile.condKidney', {}, factor);
  }
  if (lower.includes('neurological') || lower.includes('mobility')) {
    return t('profile.condMobility', {}, factor);
  }

  return factor;
}

/**
 * Translates backend generated explainability factors in ThermalCard
 */
export function translateExplainabilityFactor(
  ef: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!ef) return '';
  const lower = ef.toLowerCase();

  // "Relative humidity (73.0%) may reduce evaporative sweat cooling"
  const rhMatch = ef.match(/Relative humidity \(([0-9.]+)%\) may reduce/i);
  if (rhMatch) {
    return t('thermalCard.humidityCooling', { rh: rhMatch[1] }, ef);
  }

  // "Moderate solar radiation (664 W/m²) contributes to radiant heat burden"
  const solarModMatch = ef.match(/Moderate solar radiation \((\d+)\s*W\/m²\)/i);
  if (solarModMatch) {
    return t('thermalCard.solarRadiant', { solar: solarModMatch[1] }, ef);
  }

  // "Strong solar radiation (800 W/m²) generates high direct radiant heat load"
  const solarStrongMatch = ef.match(/Strong solar radiation \((\d+)\s*W\/m²\)/i);
  if (solarStrongMatch) {
    return t('thermalCard.solarStrong', { solar: solarStrongMatch[1] }, ef);
  }

  // "Wind speed (3.3 m/s) provides substantial convective cooling"
  const windMatch = ef.match(/Wind speed \(([0-9.]+)\s*m\/s\) provides/i);
  if (windMatch) {
    return t('thermalCard.windCooling', { wind: windMatch[1] }, ef);
  }

  // "Low wind speed (0.8 m/s) restricts convective heat dissipation"
  const windLowMatch = ef.match(/Low wind speed \(([0-9.]+)\s*m\/s\)/i);
  if (windLowMatch) {
    return t('thermalCard.windLow', { wind: windLowMatch[1] }, ef);
  }

  // "NOAA Heat Index (33.5°C) indicates moderate apparent warmth"
  const hiModMatch = ef.match(/NOAA Heat Index \(([0-9.]+)°C\) indicates moderate apparent warmth/i);
  if (hiModMatch) {
    return t('thermalCard.heatIndexApparent', { hi: hiModMatch[1] }, ef);
  }

  // "NOAA Heat Index (41.0°C) indicates dangerous apparent thermal strain"
  const hiDangerMatch = ef.match(/NOAA Heat Index \(([0-9.]+)°C\) indicates dangerous/i);
  if (hiDangerMatch) {
    return t('thermalCard.heatIndexDanger', { hi: hiDangerMatch[1] }, ef);
  }

  // "NOAA Heat Index (54.0°C) reached extreme danger threshold (≥54.0°C)"
  const hiExtremeMatch = ef.match(/NOAA Heat Index \(([0-9.]+)°C\) reached extreme danger threshold \(≥([0-9.]+)°C\)/i);
  if (hiExtremeMatch) {
    return t('thermalCard.heatIndexExtreme', { hi: hiExtremeMatch[1], thresh: hiExtremeMatch[2] }, ef);
  }

  // "Estimated WBGT (28.0°C) reached the moderate heat-strain caution zone (≥26.0°C)"
  const wbgtCautMatch = ef.match(/Estimated WBGT \(([0-9.]+)°C\) reached the moderate heat-strain caution zone \(≥([0-9.]+)°C\)/i);
  if (wbgtCautMatch) {
    return t('thermalCard.wbgtCaution', { wbgt: wbgtCautMatch[1], thresh: wbgtCautMatch[2] }, ef);
  }

  // "Estimated WBGT (30.0°C) crossed the high-risk occupational threshold (≥29.0°C)"
  const wbgtHighMatch = ef.match(/Estimated WBGT \(([0-9.]+)°C\) crossed the high-risk occupational threshold \(≥([0-9.]+)°C\)/i);
  if (wbgtHighMatch) {
    return t('thermalCard.wbgtHighRisk', { wbgt: wbgtHighMatch[1], thresh: wbgtHighMatch[2] }, ef);
  }

  // "Estimated WBGT (33.0°C) crossed the critical extreme threshold (≥32.0°C)"
  const wbgtExtMatch = ef.match(/Estimated WBGT \(([0-9.]+)°C\) crossed the critical extreme threshold \(≥([0-9.]+)°C\)/i);
  if (wbgtExtMatch) {
    return t('thermalCard.wbgtExtreme', { wbgt: wbgtExtMatch[1], thresh: wbgtExtMatch[2] }, ef);
  }

  // "Estimated WBGT (24.0°C) remains within the LOW prototype comfort range (<26.0°C)"
  const wbgtLowMatch = ef.match(/Estimated WBGT \(([0-9.]+)°C\) remains within the LOW prototype comfort range \(<([0-9.]+)°C\)/i);
  if (wbgtLowMatch) {
    return t('thermalCard.wbgtComfort', { wbgt: wbgtLowMatch[1], thresh: wbgtLowMatch[2] }, ef);
  }

  return ef;
}

/**
 * Translates backend generated reason strings (e.g. AlertBanner, RiskCard)
 */
export function translateReason(
  reason: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!reason) return '';

  // "Moderate thermal discomfort (Estimated WBGT: 27.1°C). Prolonged physical exertion may cause fatigue."
  const modMatch = reason.match(/Moderate thermal discomfort \(Estimated WBGT:\s*([0-9.]+)°C\)\.\s*Prolonged physical exertion may cause fatigue\./i);
  if (modMatch) {
    return t('alertBanner.reasonModerate', { wbgt: modMatch[1] }, reason);
  }

  // "Normal thermal comfort range (Estimated WBGT: 24.0°C). Minimal heat-related physiological stress."
  const normMatch = reason.match(/Normal thermal comfort range \(Estimated WBGT:\s*([0-9.]+)°C\)\.\s*Minimal heat-related physiological stress\./i);
  if (normMatch) {
    return t('alertBanner.reasonNormal', { wbgt: normMatch[1] }, reason);
  }

  // High thermal stress
  const highMatch = reason.match(/High thermal stress \(Estimated WBGT:\s*([0-9.]+)°C\)/i);
  if (highMatch) {
    return t('alertBanner.reasonHigh', { wbgt: highMatch[1] }, reason);
  }

  // Severe environmental thermal burden
  const extMatch = reason.match(/Severe environmental thermal burden \(Estimated WBGT:\s*([0-9.]+)°C\)/i);
  if (extMatch) {
    return t('alertBanner.reasonExtreme', { wbgt: extMatch[1] }, reason);
  }

  return reason;
}

/**
 * Translates personal heat strain level title
 */
export function translateHeatStrainLevel(
  level: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!level) return '';
  const lower = level.toLowerCase();
  if (lower.includes('dangerous')) return t('personalRisk.strainDangerous', {}, level);
  if (lower.includes('severe')) return t('personalRisk.strainSevere', {}, level);
  if (lower.includes('elevated')) return t('personalRisk.strainElevated', {}, level);
  if (lower.includes('moderate')) return t('personalRisk.strainModerate', {}, level);
  if (lower.includes('minimal')) return t('personalRisk.strainMinimal', {}, level);
  return level;
}

/**
 * Translates personal risk alert sentence
 */
export function translatePersonalAlert(
  alert: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!alert) return '';
  const lower = alert.toLowerCase();
  if (lower.startsWith('critical')) return t('personalRisk.alertCritical', {}, alert);
  if (lower.startsWith('extreme')) return t('personalRisk.alertExtreme', {}, alert);
  if (lower.startsWith('high')) return t('personalRisk.alertHigh', {}, alert);
  if (lower.startsWith('moderate')) return t('personalRisk.alertModerate', {}, alert);
  if (lower.startsWith('low')) return t('personalRisk.alertLow', {}, alert);
  return alert;
}

/**
 * Translates work-rest cycle directive
 */
export function translateWorkRestCycle(
  cycle: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!cycle) return '';
  const lower = cycle.toLowerCase();
  if (lower.includes('15 min work') || lower.includes('15 min')) return t('personalRisk.cycle1545', {}, cycle);
  if (lower.includes('25 min work') || lower.includes('25 min')) return t('personalRisk.cycle2535', {}, cycle);
  if (lower.includes('40 min work') || lower.includes('40 min')) return t('personalRisk.cycle4020', {}, cycle);
  if (lower.includes('50 min work') || lower.includes('50 min')) return t('personalRisk.cycle5010', {}, cycle);
  if (lower.includes('normal activity')) return t('personalRisk.cycleNormal', {}, cycle);
  return cycle;
}

/**
 * Translates factor breakdown descriptions in PersonalRisk
 */
export function translateFactorDescription(
  desc: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!desc) return '';
  const lower = desc.toLowerCase();

  // Activity descriptions
  if (lower.includes('low metabolic heat burden')) return t('factorDesc.lightActivity', {}, desc);
  if (lower.includes('moderate exertion') || lower.includes('250-350 w')) return t('factorDesc.moderateActivity', {}, desc);
  if (lower.includes('heavy physical labor') || lower.includes('400-600 w')) return t('factorDesc.heavyActivity', {}, desc);
  if (lower.includes('sedentary') || lower.includes('<100 w')) return t('factorDesc.sedentaryActivity', {}, desc);

  // Hydration descriptions
  if (lower.includes('adequate baseline')) return t('factorDesc.adequateHydration', {}, desc);
  if (lower.includes('well hydrated')) return t('factorDesc.wellHydrated', {}, desc);
  if (lower.includes('dehydrated / fasting') || lower.includes('fluid deficit')) return t('factorDesc.dehydrated', {}, desc);

  // Exposure descriptions
  const expMatch = desc.match(/([0-9.]+)h outside: sustained thermal accumulation/i);
  if (expMatch) return t('factorDesc.outsideHours', { hours: expMatch[1] }, desc);
  const unmitMatch = desc.match(/([0-9.]+)h outside: continuous unmitigated/i);
  if (unmitMatch) return t('factorDesc.outsideUnmitigated', { hours: unmitMatch[1] }, desc);
  const modExpMatch = desc.match(/([0-9.]+)h outside: moderate daytime/i);
  if (modExpMatch) return t('factorDesc.outsideModerate', { hours: modExpMatch[1] }, desc);
  if (lower.includes('<1h outside')) return t('factorDesc.outsideBrief', {}, desc);

  // Age descriptions
  if (lower.includes('age 35-49') || lower.includes('baseline adult profile')) return t('factorDesc.ageAdult', {}, desc);
  if (lower.includes('age ≤12') || lower.includes('accelerates heat absorption')) return t('factorDesc.ageChild', {}, desc);
  if (lower.includes('age ≥65') || lower.includes('reduced cardiac output')) return t('factorDesc.ageSenior', {}, desc);
  if (lower.includes('age 13-34') || lower.includes('young active')) return t('factorDesc.ageYouth', {}, desc);
  if (lower.includes('age 50-64') || lower.includes('thermoregulatory efficiency')) return t('factorDesc.ageMature', {}, desc);

  // Clothing descriptions
  if (lower.includes('standard workwear') || lower.includes('~0.7 clo')) return t('factorDesc.clothingStandard', {}, desc);
  if (lower.includes('light breathable cotton') || lower.includes('~0.3 clo')) return t('factorDesc.clothingLight', {}, desc);
  if (lower.includes('heavy ppe') || lower.includes('~1.8 clo')) return t('factorDesc.clothingHeavy', {}, desc);

  // Ambient / WBGT
  const wbgtExt = desc.match(/Extreme Environmental WBGT ([0-9.]+)°C/i);
  if (wbgtExt) return t('factorDesc.wbgtExtreme', { wbgt: wbgtExt[1] }, desc);
  const wbgtHi = desc.match(/High Environmental WBGT ([0-9.]+)°C/i);
  if (wbgtHi) return t('factorDesc.wbgtHigh', { wbgt: wbgtHi[1] }, desc);
  const wbgtMod = desc.match(/Moderate Environmental WBGT ([0-9.]+)°C/i);
  if (wbgtMod) return t('factorDesc.wbgtModerate', { wbgt: wbgtMod[1] }, desc);
  const wbgtMild = desc.match(/Mild Environmental WBGT ([0-9.]+)°C/i);
  if (wbgtMild) return t('factorDesc.wbgtMild', { wbgt: wbgtMild[1] }, desc);

  const ambSev = desc.match(/Severe Ambient Temperature ([0-9.]+)°C/i);
  if (ambSev) return t('factorDesc.ambientSevere', { temp: ambSev[1] }, desc);
  const ambHi = desc.match(/High Ambient Temperature ([0-9.]+)°C/i);
  if (ambHi) return t('factorDesc.ambientHigh', { temp: ambHi[1] }, desc);
  const ambEl = desc.match(/Elevated Ambient Temperature ([0-9.]+)°C/i);
  if (ambEl) return t('factorDesc.ambientElevated', { temp: ambEl[1] }, desc);
  const ambMod = desc.match(/Moderate Ambient Temperature ([0-9.]+)°C/i);
  if (ambMod) return t('factorDesc.ambientModerate', { temp: ambMod[1] }, desc);
  if (lower.includes('nominal ambient baseline')) return t('factorDesc.ambientNominal', {}, desc);

  // Lifestyle / Health
  if (lower.includes('uv flux')) return t('factorDesc.uvRadiation', {}, desc);
  if (lower.includes('basal metabolic rate')) return t('factorDesc.pregnancy', {}, desc);
  if (lower.includes('vasoconstriction')) return t('factorDesc.smoking', {}, desc);
  if (lower.includes('unaccustomed to extreme heat')) return t('factorDesc.unacclimatized', {}, desc);
  if (lower.includes('cardiovascular disease')) return t('factorDesc.cardiovascular', {}, desc);
  if (lower.includes('renal condition')) return t('factorDesc.renal', {}, desc);
  if (lower.includes('diabetes')) return t('factorDesc.diabetes', {}, desc);
  if (lower.includes('asthma') || lower.includes('copd')) return t('factorDesc.asthma', {}, desc);
  if (lower.includes('hypertension')) return t('factorDesc.hypertension', {}, desc);
  if (lower.includes('neurological condition')) return t('factorDesc.neurological', {}, desc);

  return desc;
}

/**
 * Translates municipal zone names
 */
export function translateZone(
  zone: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!zone) return '';
  const cleanZone = zone.replace(/\(zone\)/i, '').trim().toLowerCase();
  if (cleanZone.includes('western coastal')) return t('zone.westernCoastal', {}, zone);
  if (cleanZone.includes('northern plains')) return t('zone.northernPlains', {}, zone);
  if (cleanZone.includes('western arid')) return t('zone.westernArid', {}, zone);
  if (cleanZone.includes('central plateau')) return t('zone.centralPlateau', {}, zone);
  if (cleanZone.includes('southern coastal')) return t('zone.southernCoastal', {}, zone);
  if (cleanZone.includes('eastern delta')) return t('zone.easternDelta', {}, zone);
  if (cleanZone.includes('north-western') || cleanZone.includes('north western')) return t('zone.northWestern', {}, zone);
  if (cleanZone.includes('deccan plateau')) return t('zone.deccanPlateau', {}, zone);
  if (cleanZone.includes('southern plateau')) return t('zone.southernPlateau', {}, zone);
  if (cleanZone.includes('gangetic plains')) return t('zone.gangeticPlains', {}, zone);
  if (cleanZone.includes('eastern gangetic')) return t('zone.easternGangetic', {}, zone);
  return zone;
}

/**
 * Translates municipal vulnerability tags
 */
export function translateVulnerabilityTag(
  tag: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!tag) return '';
  const lower = tag.toLowerCase();
  if (lower.includes('coastal humidity & dense informal')) return t('vulnTag.mumbai', {}, tag);
  if (lower.includes('continental heat island')) return t('vulnTag.delhi', {}, tag);
  if (lower.includes('intense dry heat & high radiative')) return t('vulnTag.ahmedabad', {}, tag);
  if (lower.includes('central heatwave corridor')) return t('vulnTag.nagpur', {}, tag);
  if (lower.includes('tropical dew point & moisture')) return t('vulnTag.chennai', {}, tag);
  if (lower.includes('severe wet-bulb heat load')) return t('vulnTag.kolkata', {}, tag);
  if (lower.includes('thar desert border')) return t('vulnTag.jaipur', {}, tag);
  if (lower.includes('rapid urbanization & afternoon')) return t('vulnTag.hyderabad', {}, tag);
  if (lower.includes('microclimate urban density')) return t('vulnTag.bengaluru', {}, tag);
  if (lower.includes('agricultural & outdoor construction')) return t('vulnTag.lucknow', {}, tag);
  if (lower.includes('elevated healthcare sensitivity')) return t('vulnTag.patna', {}, tag);
  if (lower.includes('industrial workforce concentration')) return t('vulnTag.surat', {}, tag);
  return tag;
}

/**
 * Translates municipal public action advisories
 */
export function translateSummaryAdvisory(
  advisory: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!advisory) return '';
  const lower = advisory.toLowerCase();
  if (lower.includes('extreme thermal caution') || lower.includes('activate municipal cooling')) {
    return t('advisory.extremeCaution', {}, advisory);
  }
  if (lower.includes('high physiological heat strain') || lower.includes('increase hydration points')) {
    return t('advisory.highStrain', {}, advisory);
  }
  if (lower.includes('moderate thermal load') || lower.includes('routine hydration and shade')) {
    return t('advisory.moderateLoad', {}, advisory);
  }
  if (lower.includes('low heat strain') || lower.includes('baseline hydration')) {
    return t('advisory.lowStrain', {}, advisory);
  }
  return advisory;
}

/**
 * Translates profile completeness section labels
 */
export function translateProfileSection(
  section: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!section) return '';
  const lower = section.toLowerCase();
  if (lower.includes('basic information') || lower.includes('name & age')) return t('profile.secBasicInfo', {}, section);
  if (lower.includes('primary location') || lower.includes('city & state')) return t('profile.secLocation', {}, section);
  if (lower.includes('health & heat') || lower.includes('health considerations')) return t('profile.secHealth', {}, section);
  if (lower.includes('daily heat exposure') || lower.includes('outdoor exposure')) return t('profile.secExposure', {}, section);
  if (lower.includes('professional organization') || lower.includes('organization')) return t('profile.secOrganization', {}, section);
  if (lower.includes('assigned jurisdiction') || lower.includes('jurisdiction')) return t('profile.secJurisdiction', {}, section);
  return section;
}

/**
 * Translates profile personalization explanation
 */
export function translateProfileExplanation(
  explanation: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!explanation) return '';
  const lower = explanation.toLowerCase();
  if (lower.includes('customized using your age, health factors')) {
    return t('profile.summaryFullDesc', {}, explanation);
  }
  if (lower.includes('designated civic department')) {
    return t('profile.summaryOfficialDesc', {}, explanation);
  }
  if (lower.includes('general estimate because your personal profile')) {
    return t('profile.summaryBaselineDesc', {}, explanation);
  }
  if (lower.includes('personalized using your basic details and location')) {
    return t('profile.summaryPartialDesc', {}, explanation);
  }
  return explanation;
}

/**
 * Translates active factor bullet points in Profile
 */
export function translateActiveFactor(
  factor: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!factor) return '';
  const ageMatch = factor.match(/Age:\s*(\d+)\s*years/i);
  if (ageMatch) {
    return t('profile.factorAgeText', { age: ageMatch[1] }, factor);
  }
  const locMatch = factor.match(/Location:\s*(.*)/i);
  if (locMatch) {
    return t('profile.factorLocationText', { location: locMatch[1] }, factor);
  }
  const lower = factor.toLowerCase();
  if (lower.includes('outdoor worker')) {
    return t('profile.outdoorLaborer', {}, factor);
  }
  if (lower.includes('pregnancy')) {
    return t('profile.currentlyPregnant', {}, factor);
  }
  if (lower.includes('smoking') || lower.includes('tobacco')) {
    return t('risk.smoker', {}, factor);
  }
  if (lower.includes('unacclimatized')) {
    return t('risk.unacclimatized', {}, factor);
  }
  if (lower.startsWith('health:')) {
    return factor.replace(/health:/i, t('profile.secHealth', {}, 'Health') + ':');
  }
  if (lower.startsWith('daily activity:')) {
    return factor.replace(/daily activity:/i, t('profile.physicalEffortLevel', {}, 'Daily activity') + ':');
  }
  if (lower.startsWith('cooling access:')) {
    return factor.replace(/cooling access:/i, t('profile.coolingAccessLabel', {}, 'Cooling access') + ':');
  }
  return factor;
}

/**
 * Translates alert tier badges
 */
export function translateAlertTier(
  tier: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!tier) return '';
  const lower = tier.toLowerCase();
  if (lower.includes('yellow')) return t('alerts.yellowTier', {}, tier);
  if (lower.includes('orange')) return t('alerts.orangeTier', {}, tier);
  if (lower.includes('red')) return t('alerts.redTier', {}, tier);
  if (lower.includes('green')) return t('alerts.greenTier', {}, tier);
  return tier;
}

/**
 * Translates backend generated advisory reason strings in Alerts
 */
export function translateAlertReason(
  reason: string | undefined,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!reason) return '';
  const wbgtMatch = reason.match(/WBGT:\s*([0-9.]+)\s*°?C/i);
  const wbgt = wbgtMatch ? wbgtMatch[1] : '27.0';
  const lower = reason.toLowerCase();
  if (lower.includes('moderate thermal discomfort')) {
    return t('alerts.reasonModerate', { wbgt }, reason);
  }
  if (lower.includes('high thermal risk') || lower.includes('harmful heat illness')) {
    return t('alerts.reasonHigh', { wbgt }, reason);
  }
  if (lower.includes('extreme thermal danger') || lower.includes('heat stroke imminent')) {
    return t('alerts.reasonExtreme', { wbgt }, reason);
  }
  if (lower.includes('normal thermal comfort') || lower.includes('conditions remain within safe')) {
    return t('alerts.reasonNormal', { wbgt }, reason);
  }
  return reason;
}

/**
 * Translates general risk levels (LOW, MODERATE, HIGH, EXTREME, CRITICAL)
 * Robust to 'risk.' prefix, mixed casing, and enum variations.
 */
export function translateRiskLevel(
  level: string | undefined | null,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!level) return '';
  const clean = level.trim().toLowerCase().replace(/^risk\./, '');
  switch (clean) {
    case 'extreme':
      return t('risk.extreme', {}, 'चरम');
    case 'critical':
      return t('risk.critical', {}, 'गंभीर');
    case 'high':
      return t('risk.high', {}, 'उच्च');
    case 'moderate':
      return t('risk.moderate', {}, 'मध्यम');
    case 'low':
      return t('risk.low', {}, 'निम्न');
    default:
      if (clean.includes('extreme')) return t('risk.extreme', {}, 'चरम');
      if (clean.includes('critical')) return t('risk.critical', {}, 'गंभीर');
      if (clean.includes('high')) return t('risk.high', {}, 'उच्च');
      if (clean.includes('mod')) return t('risk.moderate', {}, 'मध्यम');
      if (clean.includes('low')) return t('risk.low', {}, 'निम्न');
      return level;
  }
}

/**
 * Translates vulnerable group names
 */
export function translateVulnerableGroup(
  group: string,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!group) return '';
  const norm = group.trim().toLowerCase();
  if (norm.includes('unacclimatized')) return t('alerts.groupUnacclimatized', {}, 'गैर-अनुकूलित व्यक्ति');
  if (norm.includes('elderly') || norm.includes('senior')) return t('alerts.groupElderly', {}, 'वृद्धजन');
  if (norm.includes('infant') || norm.includes('child') || norm.includes('pediatric')) return t('alerts.groupInfants', {}, 'शिशु और बच्चे');
  if (norm.includes('pregnant')) return t('alerts.groupPregnant', {}, 'गर्भवती महिलाएं');
  if (norm.includes('construction') || norm.includes('outdoor') || norm.includes('worker') || norm.includes('laborer') || norm.includes('farmer')) return t('alerts.groupOutdoorWorkers', {}, 'बाहरी श्रमिक');
  if (norm.includes('vendor') || norm.includes('delivery')) return t('alerts.groupStreetVendors', {}, 'स्ट्रीट वेंडर व डिलीवरी कर्मी');
  if (norm.includes('chronic') || norm.includes('cardio') || norm.includes('respiratory') || norm.includes('disease') || norm.includes('illness') || norm.includes('hypertension')) return t('alerts.groupChronic', {}, 'दीर्घकालिक रोगी');
  if (norm.includes('homeless')) return t('alerts.groupHomeless', {}, 'बेघर नागरिक');
  if (norm.includes('general')) return t('alerts.groupGeneral', {}, 'सामान्य नागरिक');
  return group;
}

/**
 * Translates priority badge for alerts
 */
export function translateAlertPriority(
  priority: string | undefined | null,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!priority) return t('alerts.routine', {}, 'सामान्य');
  const norm = priority.trim().toLowerCase();
  if (norm.includes('extreme') || norm.includes('critical')) return t('alerts.priorityExtreme', {}, 'चरम प्राथमिकता');
  if (norm.includes('high')) return t('alerts.priorityHigh', {}, 'उच्च प्राथमिकता');
  if (norm.includes('mod') || norm.includes('priority')) return t('alerts.priorityModerate', {}, 'मध्यम (प्राथमिकता)');
  return t('alerts.priorityRoutine', {}, 'सामान्य');
}

/**
 * Translates hydration interval guidance from backend
 */
export function translateHydrationInterval(
  interval: string | undefined | null,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!interval) return '';
  const norm = interval.trim().toLowerCase();
  if (norm.includes('20') && norm.includes('30')) return t('alerts.interval20to30', {}, 'शारीरिक गतिविधि के दौरान हर 20-30 मिनट में');
  if (norm.includes('15') && norm.includes('20')) return t('alerts.interval15to20', {}, 'कार्य के दौरान हर 15-20 मिनट में');
  if (norm.includes('routine') || norm.includes('before')) return t('alerts.intervalRoutine', {}, 'नियमित अंतराल / गतिविधि से पहले और बाद में');
  return interval;
}

/**
 * Translates hydration guidance from backend
 */
export function translateHydrationGuidance(
  guidance: string | undefined | null,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!guidance) return '';
  const norm = guidance.trim().toLowerCase();
  if (norm.includes('drink water regularly during outdoor') || norm.includes('relying solely on thirst')) {
    return t('alerts.hydrationGuidanceModerate', {}, 'शारीरिक गतिविधि के दौरान नियमित रूप से पानी पिएं। केवल प्यास पर निर्भर रहने के बजाय योजनाबद्ध अंतराल पर तरल पदार्थ लें। अत्यधिक पसीने के दौरान संतुलित इलेक्ट्रोलाइट्स उपयोगी हो सकते हैं।');
  }
  if (norm.includes('for active outdoor work') || norm.includes('240 ml')) {
    return t('alerts.hydrationGuidanceHigh', {}, 'सक्रिय बाहरी कार्य के लिए, हर 15–20 मिनट में लगभग 1 कप (240 मिली) पानी पिएं। 2 घंटे से अधिक पसीना आने पर संतुलित इलेक्ट्रोलाइट्स या ओआरएस लें।');
  }
  if (norm.includes('mandatory fluid replacement') || norm.includes('hyponatremia')) {
    return t('alerts.hydrationGuidanceExtreme', {}, 'अनिवार्य तरल प्रतिस्थापन: हर 15–20 मिनट में 250–300 मिली पिएं। ओआरएस या इलेक्ट्रोलाइट घोल का पर्याप्त उपयोग करें। हाइपोनेट्रेमिया से बचने के लिए 1.5 लीटर/घंटे से अधिक न पिएं।');
  }
  if (norm.includes('maintain baseline daily fluid') || norm.includes('2.0–2.5 l')) {
    return t('alerts.hydrationGuidanceLow', {}, 'दैनिक आधारभूत तरल पदार्थ (~2.0–2.5 लीटर) बनाए रखें। नियमित व्यायाम से पहले, दौरान और बाद में पानी पिएं। सामान्य परिस्थितियों में निश्चित कार्यस्थल कोटा आवश्यक नहीं है।');
  }
  return guidance;
}

/**
 * Translates hydration framework basis
 */
export function translateHydrationBasis(
  basis: string | undefined | null,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!basis) return '';
  const norm = basis.trim().toLowerCase();
  if (norm.includes('niosh') || norm.includes('osha')) return t('alerts.basisNiosh', {}, 'NIOSH/OSHA व्यावसायिक ताप सुरक्षा मार्गदर्शन');
  if (norm.includes('iso')) return t('alerts.basisIso', {}, 'ISO 7243 हाइड्रेशन फ्रेमवर्क');
  if (norm.includes('general')) return t('alerts.basisGeneral', {}, 'सामान्य सार्वजनिक स्वास्थ्य और जलयोजन मार्गदर्शन');
  return basis;
}

/**
 * Translates outdoor activity advice
 */
export function translateActivityOutdoor(
  outdoor: string | undefined | null,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!outdoor) return '';
  const norm = outdoor.trim().toLowerCase();
  if (norm.includes('avoid non-essential') || norm.includes('suspend all outdoor')) {
    return t('alerts.outdoorExtreme', {}, 'अनावश्यक बाहरी गतिविधियों से बचें। सभी बाहरी खेल और सार्वजनिक कार्यक्रम स्थगित करें।');
  }
  if (norm.includes('reschedule intense') || norm.includes('early morning')) {
    return t('alerts.outdoorHigh', {}, 'तीव्र खेल और व्यायाम को सुबह (<8:30 बजे) या शाम (>6:00 बजे) के लिए पुनर्निर्धारित करें।');
  }
  if (norm.includes('permissible with periodic rest') || norm.includes('outdoor activities permissible')) {
    return t('alerts.outdoorModerate', {}, 'छायादार क्षेत्रों में आवधिक विश्राम के साथ बाहरी गतिविधियां अनुमत हैं।');
  }
  if (norm.includes('normal outdoor recreation')) {
    return t('alerts.normalRecreationOk', {}, 'सामान्य बाहरी गतिविधियाँ जारी रह सकती हैं। बुनियादी धूप और जलयोजन सावधानियों का उपयोग करें।');
  }
  return outdoor;
}

/**
 * Translates heavy physical work advice
 */
export function translateHeavyPhysicalWork(
  work: string | undefined | null,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!work) return '';
  const norm = work.trim().toLowerCase();
  if (norm.includes('immediate suspension of heavy') || norm.includes('30-45 minute')) {
    return t('alerts.heavyExtreme', {}, 'चरम गर्मी के दौरान भारी शारीरिक श्रम को तुरंत रोकें, या प्रति घंटे 30-45 मिनट छायादार विश्राम अनिवार्य करें।');
  }
  if (norm.includes('reduce physical exertion') || norm.includes('15-20 minute shaded')) {
    return t('alerts.heavyHigh', {}, 'शारीरिक श्रम की तीव्रता कम करें। हर 45-60 मिनट के काम पर 15-20 मिनट का छायादार विश्राम ब्रेक लागू करें।');
  }
  if (norm.includes('pace continuous physical') || norm.includes('10-minute rest breaks')) {
    return t('alerts.heavyModerate', {}, 'लगातार शारीरिक श्रम की गति नियंत्रित रखें। धूप से बचकर हर घंटे 10 मिनट का विश्राम ब्रेक लें।');
  }
  if (norm.includes('standard occupational')) {
    return t('alerts.normalWorkOk', {}, 'नियमित पानी और विश्राम अंतराल के साथ सामान्य कार्य जारी रह सकता है।');
  }
  return work;
}

/**
 * Translates peak heat hours advice
 */
export function translatePeakHeatHours(
  hours: string | undefined | null,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!hours) return '';
  // Convert "(Limit prolonged direct sun exposure)" or "(Minimize direct sun exposure)"
  let clean = hours
    .replace(/\(Limit prolonged direct sun exposure\)/i, '(लंबे समय तक सीधी धूप से बचें)')
    .replace(/\(Minimize direct sun exposure\)/i, '(सीधी धूप में कम से कम रहें)')
    .replace(/\(Strictly avoid unshaded physical exertion\)/i, '(धूप में शारीरिक श्रम से पूरी तरह बचें)')
    .replace(/\(Standard routine sun protection\)/i, '(सामान्य धूप सुरक्षा)');
  return clean;
}

/**
 * Translates rest guidance
 */
export function translateRestGuidance(
  rest: string | undefined | null,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!rest) return '';
  const norm = rest.trim().toLowerCase();
  if (norm.includes('mandatory access to active cooling') || norm.includes('misting fans')) {
    return t('alerts.restExtreme', {}, 'सक्रिय शीतलन क्षेत्रों (वातानुकूलित स्थान, मिस्टिंग पंखे, छायादार आश्रय) तक अनिवार्य पहुंच।');
  }
  if (norm.includes('well-ventilated, shaded cooling zones') || norm.includes('drinking water')) {
    return t('alerts.restHigh', {}, 'पीने के पानी से सुसज्जित अच्छी तरह हवादार, छायादार शीतलन क्षेत्रों में विश्राम करें।');
  }
  if (norm.includes('take rest breaks in shaded areas when experiencing early fatigue')) {
    return t('alerts.restModerate', {}, 'शुरुआती थकान या गर्मी महसूस होने पर छायादार क्षेत्रों में विश्राम करें।');
  }
  if (norm.includes('standard scheduled rest')) {
    return t('alerts.restLow', {}, 'मानक निर्धारित विश्राम अंतराल।');
  }
  return rest;
}

/**
 * Translates vulnerable population guidance
 */
export function translateVulnerableGuidance(
  guidance: string | undefined | null,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!guidance) return '';
  const norm = guidance.trim().toLowerCase();
  if (norm.includes('critical vulnerability alert') || norm.includes('fatal heat stroke')) {
    return t('alerts.vulnExtreme', {}, 'गंभीर जोखिम चेतावनी: त्वरित ताप थकावट और घातक हीट स्ट्रोक का अत्यधिक जोखिम। सामुदायिक शीतलन केंद्र खोलें। एकाकी वृद्धजनों का सक्रिय हालचाल लें।');
  }
  if (norm.includes('high vulnerability alert') || norm.includes('heat syncope')) {
    return t('alerts.vulnHigh', {}, 'उच्च जोखिम चेतावनी: निर्जलीकरण और हीट सिंकोप का बढ़ा हुआ जोखिम। बाहरी श्रमिकों के लिए छायादार स्थान सुनिश्चित करें। संवेदनशील नागरिक घर के अंदर हवादार कमरों में रहें।');
  }
  if (norm.includes('monitor individuals with pre-existing') || norm.includes('well-ventilated indoor spaces')) {
    return t('alerts.vulnModerate', {}, 'हृदय या श्वसन संबंधी बीमारियों वाले व्यक्तियों की निगरानी करें। सुनिश्चित करें कि शिशु और वृद्धजन अच्छी तरह हवादार इनडोर स्थानों में रहें।');
  }
  if (norm.includes('standard baseline health precautions')) {
    return t('alerts.vulnLow', {}, 'मानक आधारभूत स्वास्थ्य सावधानियां। सुनिश्चित करें कि बच्चे और वृद्धजन नियमित रूप से स्वस्थ हाइड्रेशन बनाए रखें।');
  }
  return guidance;
}

/**
 * Translates civic advisories bullet points
 */
export function translateCivicAdvisory(
  advisory: string | undefined | null,
  t: (key: keyof TranslationDictionary | string, params?: Record<string, string | number>, fallback?: string) => string
): string {
  if (!advisory) return '';
  const norm = advisory.trim().toLowerCase();
  if (norm.includes('avoid prolonged outdoor exposure')) {
    return t('alerts.advCritical', {}, '[गंभीर चेतावनी] विशेषकर दोपहर के घंटों में लंबे समय तक बाहर रहने से बचें।');
  }
  if (norm.includes('schedule heavy outdoor work during cooler')) {
    return t('alerts.advWorkSafety', {}, '[कार्य सुरक्षा] भारी बाहरी काम ठंडे समय में निर्धारित करें और छायादार शीतलन क्षेत्रों का उपयोग करें।');
  }
  if (norm.includes('maintain frequent hydration with water and electrolyte')) {
    return t('alerts.advHydration', {}, '[जलयोजन] पानी और इलेक्ट्रोलाइट घोल से बार-बार हाइड्रेटेड रहें; प्यास लगने का इंतज़ार न करें।');
  }
  if (norm.includes('pay special attention to vulnerable populations')) {
    return t('alerts.advVulnGroups', {}, '[संवेदनशील समूह] संवेदनशील आबादी (बुजुर्ग, बच्चे, बाहरी श्रमिक) पर विशेष ध्यान दें।');
  }
  if (norm.includes('monitor for signs of severe heat distress')) {
    return t('alerts.advHealthMonitoring', {}, '[स्वास्थ्य निगरानी] गंभीर ताप संकट के लक्षणों पर नज़र रखें और आवश्यकता पड़ने पर तुरंत चिकित्सा सहायता लें।');
  }
  if (norm.includes('reduce prolonged strenuous outdoor activity')) {
    return t('alerts.advHighStress', {}, '[उच्च ताप तनाव] चरम धूप के घंटों में लंबे समय तक बाहरी कठिन गतिविधियों को कम करें।');
  }
  if (norm.includes('take regular fluid breaks')) {
    return t('alerts.advFluidBreaks', {}, '[जलयोजन] बार-बार जलयोजन बनाए रखें और नियमित तरल ब्रेक लें।');
  }
  if (norm.includes('wear lightweight, light-colored clothing')) {
    return t('alerts.advSunProtection', {}, '[सुरक्षा] हल्के, हल्के रंग के कपड़े पहनें और धूप से सुरक्षा का उपयोग करें।');
  }
  if (norm.includes('utilize shaded or well-ventilated cooling areas')) {
    return t('alerts.advRestShade', {}, '[विश्राम व छाया] विश्राम के दौरान छायादार या अच्छी तरह हवादार शीतलन क्षेत्रों का उपयोग करें।');
  }
  if (norm.includes('monitor infants, the elderly, and outdoor laborers')) {
    return t('alerts.advVulnCare', {}, '[संवेदनशील देखभाल] ताप थकान के लिए शिशुओं, बुजुर्गों और बाहरी श्रमिकों की निगरानी करें।');
  }
  if (norm.includes('maintain regular hydration if engaging in continuous physical work')) {
    return t('alerts.advModerateCaution', {}, '[मध्यम सावधानी] बाहर लगातार शारीरिक कार्य करने पर नियमित जलयोजन बनाए रखें।');
  }
  if (norm.includes('limit direct sunlight exposure during peak solar')) {
    return t('alerts.advSunExposure', {}, '[धूप से बचाव] अत्यधिक सौर तीव्रता की अवधि में सीधी धूप से बचें।');
  }
  if (norm.includes('ensure steady fluid intake throughout the day')) {
    return t('alerts.advFluidIntake', {}, '[तरल सेवन] दिनभर नियमित तरल पदार्थ का सेवन सुनिश्चित करें।');
  }
  if (norm.includes('standard environmental thermal conditions')) {
    return t('alerts.advNormalConditions', {}, '[सामान्य स्थितियां] मानक पर्यावरणीय तापीय स्थितियां। सामान्य दैनिक गतिविधियां जारी रह सकती हैं।');
  }
  if (norm.includes('impaired sweat evaporation')) {
    return t('alerts.advHighHumidity', {}, '[उच्च आर्द्रता] पसीना वाष्पीकरण बाधित; सक्रिय वायु संचलन और वेंटिलेशन सुनिश्चित करें।');
  }
  if (norm.includes('high solar irradiance')) {
    return t('alerts.advSolarLoad', {}, '[तीव्र सौर भार] उच्च सौर विकिरण; बाहर निकलते समय छायादार मार्गों को प्राथमिकता दें।');
  }
  return advisory;
}

