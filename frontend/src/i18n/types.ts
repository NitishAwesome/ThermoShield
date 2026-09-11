export type LanguageCode =
  | 'en'
  | 'hi'
  | 'mr'
  | 'gu'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'bn';

export interface LanguageOption {
  code: LanguageCode;
  label: string; // Native script
  englishLabel: string;
  flag?: string;
}

export interface TranslationDictionary {
  // Navigation
  'nav.dashboard': string;
  'nav.home': string;
  'nav.personalRisk': string;
  'nav.myHeatRisk': string;
  'nav.myRisk': string;
  'nav.alerts': string;
  'nav.alertsAndGuidance': string;
  'nav.forecast': string;
  'nav.riskAnalysis': string;
  'nav.analysis': string;
  'nav.municipalMatrix': string;
  'nav.matrix': string;
  'nav.interventions': string;
  'nav.interventionSimulator': string;
  'nav.actions': string;
  'nav.profile': string;
  'nav.myProfile': string;
  'nav.more': string;
  'nav.tools': string;
  'nav.additionalFeatures': string;
  'nav.activeZone': string;

  // Common UI Actions
  'common.showMore': string;
  'common.showLess': string;
  'common.back': string;
  'common.next': string;
  'common.previous': string;
  'common.search': string;
  'common.clear': string;
  'common.cancel': string;
  'common.save': string;
  'common.saveChanges': string;
  'common.loading': string;
  'common.error': string;
  'common.retry': string;
  'common.viewDetails': string;
  'common.learnMore': string;
  'common.close': string;
  'common.settings': string;
  'common.selectLanguage': string;
  'common.language': string;

  // Auth & Roles
  'auth.signIn': string;
  'auth.register': string;
  'auth.join': string;
  'auth.signOut': string;
  'role.citizen': string;
  'role.healthOfficial': string;
  'role.responder': string;
  'role.analyst': string;

  // Theme
  'theme.displayTheme': string;
  'theme.darkMode': string;
  'theme.lightMode': string;
  'theme.dark': string;
  'theme.light': string;

  // Status & Common States
  'status.active': string;
  'status.complete': string;
  'status.incomplete': string;
  'status.updated': string;
  'status.saved': string;
  'status.reset': string;

  // Common Empty States
  'empty.noData': string;
  'empty.noAlerts': string;
  'empty.awaitingCalculation': string;

  // Dashboard Page
  'dashboard.title': string;
  'dashboard.subtitle': string;
  'dashboard.searchCityPlaceholder': string;
  'dashboard.currentThermalMetrics': string;
  'dashboard.heatStressIndex': string;
  'dashboard.temperature': string;
  'dashboard.humidity': string;
  'dashboard.apparentTemp': string;
  'dashboard.uvIndex': string;
  'dashboard.windSpeed': string;
  'dashboard.wbgtTitle': string;
  'dashboard.hourlyTrend': string;
  'dashboard.peakHeatWindow': string;
  'dashboard.personalizedSummaryTitle': string;
  'dashboard.lowRiskDesc': string;
  'dashboard.elevatedRiskDesc': string;
  'dashboard.goodMorning': string;
  'dashboard.goodAfternoon': string;
  'dashboard.goodEvening': string;

  // Personal Risk Page
  'risk.advisoryTitle': string;
  'risk.advisorySubtitle': string;
  'risk.savedProfileMode': string;
  'risk.scenarioMode': string;
  'risk.basedOnSavedProfile': string;
  'risk.testingScenario': string;
  'risk.resetToProfile': string;
  'risk.saveToProfile': string;
  'risk.incompleteProfileNotice': string;
  'risk.completeProfileCTA': string;
  'risk.section1Title': string;
  'risk.waterIntakeTarget': string;
  'risk.workRestCycle': string;
  'risk.section2Title': string;
  'risk.section3Title': string;
  'risk.section4Title': string;
  'risk.scientificAccordionDesc': string;
  'risk.recalculateBtn': string;
  'risk.ageLabel': string;
  'risk.healthConsiderations': string;
  'risk.activityLevel': string;
  'risk.hydrationStatus': string;
  'risk.outdoorHours': string;
  'risk.attireUniform': string;
  'risk.weatherSync': string;

  // Forecast Page
  'forecast.title': string;
  'forecast.subtitle': string;
  'forecast.chartTitle': string;
  'forecast.maxTemp': string;
  'forecast.minTemp': string;
  'forecast.outlookMatrix': string;
  'forecast.today': string;
  'forecast.extremeHeat': string;
  'forecast.elevatedHeat': string;
  'forecast.normalRange': string;

  // Alerts Page
  'alerts.title': string;
  'alerts.subtitle': string;
  'alerts.activeThreatBanner': string;
  'alerts.automatedDispatch': string;
  'alerts.safetyProtocols': string;
  'alerts.allAlerts': string;
  'alerts.criticalOnly': string;
  'alerts.subscribeBtn': string;
  'alerts.hydrationProtocol': string;
  'alerts.activityPacing': string;
  'alerts.vulnerableProtection': string;
  'alerts.standardDirectives': string;
  'alerts.testEmergency': string;
  'alerts.location': string;
  'alerts.telemetry': string;

  // Matrix Page
  'matrix.title': string;
  'matrix.subtitle': string;
  'matrix.allZones': string;
  'matrix.searchArea': string;
  'matrix.focusAreaBtn': string;
  'matrix.refreshAll': string;
  'matrix.totalMonitored': string;
  'matrix.severeAlerts': string;
  'matrix.avgAirTemp': string;
  'matrix.avgWbgt': string;
  'matrix.allSeverities': string;
  'matrix.keyConditions': string;
  'matrix.airTemp': string;
  'matrix.humidity': string;
  'matrix.wetBulb': string;
  'matrix.localVulnerability': string;
  'matrix.publicAction': string;
  'matrix.civicHealthRiskIndex': string;
  'matrix.activeFocus': string;

  // Interventions Page
  'intervention.title': string;
  'intervention.subtitle': string;
  'intervention.baselineRisk': string;
  'intervention.simulatedReduction': string;
  'intervention.projectedRisk': string;
  'intervention.coolingCentersToggle': string;
  'intervention.workSuspensionToggle': string;
  'intervention.hydrationHubsToggle': string;
  'intervention.vulnerablePopulation': string;

  // Risk Details Page
  'riskDetails.title': string;
  'riskDetails.subtitle': string;
  'riskDetails.primaryDrivers': string;

  // Profile Page
  'profile.title': string;
  'profile.subtitle': string;
  'profile.completenessTitle': string;
  'profile.basicInfoTab': string;
  'profile.healthTab': string;
  'profile.exposureTab': string;
  'profile.preparednessTab': string;
  'profile.accountTab': string;
  'profile.saveBtn': string;
  'profile.useCurrentLocation': string;
  'profile.savedSuccessToast': string;

  // Auth Pages
  'auth.loginTitle': string;
  'auth.loginSubtitle': string;
  'auth.registerTitle': string;
  'auth.registerSubtitle': string;
  'auth.fullName': string;
  'auth.email': string;
  'auth.password': string;
  'auth.phone': string;
  'auth.role': string;
  'auth.demoPersonasTitle': string;
  'auth.alreadyHaveAccount': string;
  'auth.dontHaveAccount': string;

  // Role Banner
  'roleBanner.viewingAs': string;
  'roleBanner.quickActions': string;
  'roleBanner.changeView': string;
  'roleBanner.switchPersona': string;
  'roleBanner.showFullDetails': string;
  'roleBanner.showLessDetails': string;
  'roleBanner.officialTitle': string;
  'roleBanner.officialDesc': string;
  'roleBanner.responderTitle': string;
  'roleBanner.responderDesc': string;
  'roleBanner.analystTitle': string;
  'roleBanner.analystDesc': string;
  'roleBanner.citizenTitle': string;
  'roleBanner.citizenDesc': string;
  'roleBanner.details': string;
  'roleBanner.compact': string;
  'roleBanner.minimize': string;

  // Risk Card
  'riskCard.currentLocation': string;
  'riskCard.liveTelemetry': string;
  'riskCard.title': string;
  'riskCard.extremeHazard': string;
  'riskCard.highStrain': string;
  'riskCard.moderateBurden': string;
  'riskCard.lowRisk': string;
  'riskCard.heatStrainIndex': string;
  'riskCard.civicHealthRisk': string;
  'riskCard.planningEstimate': string;
  'riskCard.physiologicalStrain': string;
  'riskCard.healthcareDemand': string;
  'riskCard.assessmentReason': string;

  // Thermal Card
  'thermalCard.title': string;
  'thermalCard.subtitle': string;
  'thermalCard.engineBadge': string;
  'thermalCard.simpleView': string;
  'thermalCard.scientificReferences': string;
  'thermalCard.wbgtPrimary': string;
  'thermalCard.wbgtDesc': string;
  'thermalCard.heatIndexShaded': string;
  'thermalCard.heatIndexDesc': string;
  'thermalCard.apparentConvective': string;
  'thermalCard.apparentDesc': string;
  'thermalCard.wetBulbEvaporative': string;
  'thermalCard.wetBulbDesc': string;
  'thermalCard.riskBasisTitle': string;
  'thermalCard.envObsTitle': string;
  'thermalCard.baselineStandard': string;
  'thermalCard.baselineNormal': string;

  // Weather Card
  'weatherCard.title': string;
  'weatherCard.subtitle': string;
  'weatherCard.dryBulb': string;
  'weatherCard.feelsLike': string;
  'weatherCard.solarFlux': string;
  'weatherCard.telemetryInactive': string;
  'weatherCard.telemetryWaiting': string;

  // Risk Drivers
  'riskDrivers.title': string;
  'riskDrivers.subtitle': string;
  'riskDrivers.decisionSupport': string;
  'riskDrivers.primaryDriver': string;
  'riskDrivers.airTemp': string;
  'riskDrivers.humidity': string;
  'riskDrivers.solarFlux': string;
  'riskDrivers.windSpeed': string;
  'riskDrivers.thermalStrain': string;
  'riskDrivers.calibratedWeightings': string;
  'riskDrivers.civicHealthReadiness': string;
  'riskDrivers.extremeHeat': string;
  'riskDrivers.severeHeat': string;
  'riskDrivers.moderateHeat': string;
  'riskDrivers.mildHeat': string;
  'riskDrivers.highSuppression': string;
  'riskDrivers.optimal': string;

  // Forecast Chart
  'forecastChart.title': string;
  'forecastChart.maxTempLegend': string;
  'forecastChart.minTempLegend': string;
  'forecastChart.noData': string;

  // Location Search
  'locationSearch.placeholder': string;
  'locationSearch.useMyLocation': string;
  'locationSearch.locating': string;
  'locationSearch.activeZone': string;
  'locationSearch.noLocations': string;
  'locationSearch.tryMajorCity': string;

  // Alert Banner
  'alertBanner.riskAlert': string;
  'alertBanner.severity': string;
  'alertBanner.whyItMatters': string;
  'alertBanner.vulnerableNotice': string;
  'alertBanner.peakSunWindow': string;

  // Profile Extended
  'profile.saveProfile': string;
  'profile.changesSaved': string;
  'profile.viewPersonalRisk': string;
  'profile.setupAccuracy': string;
  'profile.complete': string;
  'profile.completeAdvisory': string;
  'profile.incompleteAdvisory': string;
  'profile.missing': string;
  'profile.personalLocationTab': string;
  'profile.healthVulnerabilityTab': string;
  'profile.exposureWorkTab': string;
  'profile.emergencyPrepTab': string;
  'profile.professionalTab': string;
  'profile.fullNameLabel': string;
  'profile.ageLabel': string;
  'profile.genderLabel': string;
  'profile.cityLabel': string;
  'profile.stateLabel': string;
  'profile.districtLabel': string;
  'profile.languageLabel': string;
  'profile.organizationLabel': string;
  'profile.jurisdictionLabel': string;
  'profile.departmentLabel': string;

  // Risk Details Extended
  'riskDetails.heatStressBody': string;
  'riskDetails.todayRiskSummary': string;
  'riskDetails.todayHeatRisk': string;
  'riskDetails.safeBaseline': string;
  'riskDetails.conditionsComfortable': string;
  'riskDetails.scientificMethodology': string;
  'riskDetails.scientificDesc': string;
  'riskDetails.collapse': string;
  'riskDetails.inspectScientific': string;

  // Personal Risk Extended
  'risk.assessmentMode': string;
  'risk.lightCotton': string;
  'risk.standardClothing': string;
  'risk.heavyCoverall': string;
  'risk.methodologyNote': string;
  'risk.awaitingCalcDesc': string;
  'risk.pregnant': string;
  'risk.smoker': string;
  'risk.acclimatized': string;
  'risk.unacclimatized': string;
  'risk.activeCount': string;
  'risk.condition.cardiovascular': string;
  'risk.condition.asthma': string;
  'risk.condition.diabetes': string;
  'risk.condition.kidney': string;
  'risk.condition.hypertension': string;
  'risk.condition.neurological': string;
  'risk.activity.sedentary': string;
  'risk.activity.sedentaryDesc': string;
  'risk.activity.light': string;
  'risk.activity.lightDesc': string;
  'risk.activity.moderate': string;
  'risk.activity.moderateDesc': string;
  'risk.activity.heavy': string;
  'risk.activity.heavyDesc': string;
  'risk.hydration.wellHydrated': string;
  'risk.hydration.moderate': string;
  'risk.hydration.dehydrated': string;
  'risk.ageYears': string;
  'risk.ageYearsVal': string;
  'risk.ageBracketChildren': string;
  'risk.ageBracketAdults': string;
  'risk.ageBracketSeniors': string;
  'risk.drinkBeforeThirsty': string;
  'risk.recommendedBreakPeak': string;
  'risk.profileFactorsApplied': string;
  'risk.adjustScenarioFactors': string;
  'risk.profileFactorsDesc': string;
  'risk.adjustScenarioDesc': string;
  'risk.section2Subtitle': string;
  'risk.whyAtThisLevel': string;
  'risk.whyAtThisLevelConditions': string;
  'risk.whyAtThisLevelExposure': string;
  'risk.whyAtThisLevelComfort': string;
  'risk.actionChecklist': string;
  'risk.actionChecklistSubtitle': string;
  'risk.emergencyResourcesOnHand': string;
  'risk.resourceWater': string;
  'risk.resourceCooler': string;
  'risk.resourceShade': string;
  'risk.resourceCoolingCenter': string;
  'risk.medicalDisclaimer': string;
  'risk.calculatedUsing': string;
  'risk.outOf100': string;
  'risk.factor.outdoorExposure': string;
  'risk.factor.clothing': string;
  'risk.factor.ambientThermalLoad': string;
  'risk.factor.highUvIndex': string;
  'risk.factor.age': string;
  'risk.factor.activity': string;
  'risk.factor.hydration': string;

  // Recommendations
  'recommendation.waterPerHour': string;
  'recommendation.unacclimatized': string;
  'recommendation.uvHigh': string;
  'recommendation.orsElectrolytes': string;
  'recommendation.followWorkRest': string;
  'recommendation.uvGear': string;
  'recommendation.medications': string;
  'recommendation.indoorCooling': string;

  // Dashboard Extended
  'dashboard.personalizedIntelligence': string;
  'dashboard.welcomeUser': string;
  'dashboard.calibrateAmbientLoad': string;
  'dashboard.openRiskCalc': string;
  'dashboard.personalExposure': string;
  'dashboard.profileTailored': string;
  'dashboard.generalBaseline': string;
  'dashboard.elevatedVsCivic': string;
  'dashboard.basedOn': string;
  'dashboard.currentWeather': string;
  'dashboard.advisoryComfort': string;
  'dashboard.advisoryExtreme': string;
  'dashboard.advisoryHigh': string;
  'dashboard.advisoryModerate': string;
  'dashboard.factorSeniorVuln': string;
  'dashboard.factorChildSens': string;
  'dashboard.factorAge': string;
  'dashboard.factorHealthConditions': string;
  'dashboard.factorPregnancy': string;
  'dashboard.factorOutdoorWorker': string;
  'dashboard.factorHighExposure': string;
  'dashboard.factorNoCooling': string;
  'dashboard.extremeHeatwaveEarlyWarning': string;
  'dashboard.decisionSupportBadge': string;

  // Role Banner Extended
  'roleBanner.featureCitizen1': string;
  'roleBanner.featureCitizen2': string;
  'roleBanner.featureCitizen3': string;
  'roleBanner.featureOfficial1': string;
  'roleBanner.featureOfficial2': string;
  'roleBanner.featureOfficial3': string;
  'roleBanner.featureResponder1': string;
  'roleBanner.featureResponder2': string;
  'roleBanner.featureResponder3': string;
  'roleBanner.featureAnalyst1': string;
  'roleBanner.featureAnalyst2': string;
  'roleBanner.featureAnalyst3': string;

  // Area Risk Showcase Extended
  'matrix.fetchFallbackWarning': string;
  'matrix.noAreasMatch': string;
  'matrix.noSevereDetected': string;
  'matrix.allOperatingBaseline': string;
  'matrix.tryClearingFilters': string;
  'matrix.zoneLabel': string;
  'matrix.guestExplorer': string;
  'matrix.nationalSurveillance': string;
  'matrix.guestExplorerDesc': string;
  'matrix.zoneSuffix': string;
  'matrix.explanationExtreme': string;
  'matrix.explanationHigh': string;
  'matrix.explanationModerate': string;
  'matrix.explanationLow': string;

  // Alerts Extended
  'alerts.networkTitle': string;
  'alerts.autoBroadcastActive': string;
  'alerts.cooldownGuard': string;
  'alerts.autoDispatchHeading': string;
  'alerts.autoDispatchDescription': string;
  'alerts.enterEmailAutonomous': string;
  'alerts.citizenEmailPlaceholder': string;
  'alerts.fromSender': string;
  'alerts.priorityBadge': string;
  'alerts.orsRecommended': string;
  'alerts.waterSufficient': string;
  'alerts.sourceBasis': string;
  'alerts.restRequirement': string;
  'alerts.directiveWelfareChecks': string;
  'alerts.directivesSubtitle': string;
  'alerts.noElevatedAdvisories': string;
  'alerts.normalRecreationOk': string;
  'alerts.limitOutdoorDrills': string;
  'alerts.normalWorkOk': string;
  'alerts.mandateShadedBreaks': string;
  'alerts.takeExtraCarePeak': string;
  'alerts.vulnerableVentilated': string;
  'alerts.priorityAttention': string;
  'alerts.routine': string;
  'alerts.workRest': string;

  // Intervention Extended
  'intervention.conditionsStable': string;
  'intervention.conditionsStableDesc': string;
  'intervention.disclaimerTitle': string;
  'intervention.disclaimerText': string;
  'intervention.section1Title': string;
  'intervention.section1Subtitle': string;
  'intervention.tickLow': string;
  'intervention.tickHigh': string;
  'intervention.tickExtreme': string;
  'intervention.tickDry': string;
  'intervention.tickComfort': string;
  'intervention.tickSaturated': string;
  'intervention.timeOfDay': string;
  'intervention.timeMidnight': string;
  'intervention.timeNoon': string;
  'intervention.timeNight': string;
  'intervention.tickThreshold': string;
  'intervention.section2Title': string;
  'intervention.section2Subtitle': string;
  'intervention.selectedCount': string;
  'intervention.modeledReduction': string;
  'intervention.applySimulation': string;
  'intervention.simulating': string;
  'intervention.impactTitle': string;
  'intervention.impactSubtitle': string;
  'intervention.scenarioEstimateBadge': string;
  'intervention.noPoliciesActive': string;
  'intervention.policiesActive': string;
  'intervention.recommendedActions': string;
  'intervention.recommendedActionsSubtitle': string;
  'intervention.categoryHydration': string;
  'intervention.categoryWork': string;
  'intervention.categoryProtocols': string;
  'intervention.categoryVulnerable': string;
  'intervention.badgeHydration': string;
  'intervention.badgeExposure': string;
  'intervention.badgeEmergency': string;
  'intervention.badgeProtection': string;
  'intervention.actionHydrationBreak': string;
  'intervention.actionEvaporativeCooling': string;
  'intervention.actionWaterFacilities': string;
  'intervention.actionPeakHeatHours': string;
  'intervention.actionNonEssentialLabor': string;
  'intervention.actionSunExposure': string;
  'intervention.actionVulnerableOutreach': string;
  'intervention.actionCoolingShelters': string;
  'intervention.actionEmergencyAlert': string;
  'intervention.actionStandardProtocols': string;

  // Thermal Card & Environmental Explanations
  'thermalCard.humidityCooling': string;
  'thermalCard.solarRadiant': string;
  'thermalCard.solarStrong': string;
  'thermalCard.windCooling': string;
  'thermalCard.windLow': string;
  'thermalCard.heatIndexApparent': string;
  'thermalCard.heatIndexDanger': string;
  'thermalCard.heatIndexExtreme': string;
  'thermalCard.wbgtCaution': string;
  'thermalCard.wbgtHighRisk': string;
  'thermalCard.wbgtExtreme': string;
  'thermalCard.wbgtComfort': string;
  'alertBanner.reasonModerate': string;
  'alertBanner.reasonNormal': string;
  'alertBanner.reasonHigh': string;
  'alertBanner.reasonExtreme': string;

  // Risk Map
  'riskMap.strainScore': string;
  'riskMap.airTemp': string;
  'riskMap.relativeHumidity': string;
  'riskMap.action': string;
  'riskMap.actionHigh': string;
  'riskMap.actionRoutine': string;
  'riskMap.estimatedWbgt': string;
  'riskMap.civicRiskScore': string;
  'riskMap.clickToRecalculate': string;
  'riskMap.mapTelemetry': string;

  // Auth Extended
  'auth.continueWithGoogle': string;
  'auth.signUpWithGoogle': string;
  'auth.orUseCredentials': string;
  'auth.orUseEmail': string;
  'auth.forgotEmail': string;
  'auth.useDemoPassword': string;
  'auth.passwordStrength': string;
  'auth.verifying': string;
  'auth.returnToDashboard': string;

  // Extended Profile, Risk & Matrix Translations
  'profile.informationalOnly': string;
  'profile.healthConditionsSubtitle': string;
  'profile.privacySafetyNoteTitle': string;
  'profile.privacySafetyNoteText': string;
  'profile.primaryLocationSubtitle': string;
  'profile.basicDetailsSubtitle': string;
  'profile.thermalStrainAgeNote': string;
  'profile.childBracket': string;
  'profile.adultBracket': string;
  'profile.seniorBracket': string;
  'profile.emailLabel': string;
  'profile.civicRoleSubtitle': string;
  'profile.exposureSubtitle': string;
  'profile.condHeart': string;
  'profile.condHeartDesc': string;
  'profile.condHypertension': string;
  'profile.condHypertensionDesc': string;
  'profile.condBreathing': string;
  'profile.condBreathingDesc': string;
  'profile.condDiabetes': string;
  'profile.condDiabetesDesc': string;
  'profile.condKidney': string;
  'profile.condKidneyDesc': string;
  'profile.condMobility': string;
  'profile.condMobilityDesc': string;
  'profile.additionalFactors': string;
  'profile.currentlyPregnant': string;
  'profile.outdoorLaborer': string;
  'profile.pastHeatIllness': string;
  'profile.timeSpentOutdoors': string;
  'profile.mostlyIndoors': string;
  'profile.mostlyIndoorsDesc': string;
  'profile.mixedOutdoors': string;
  'profile.mixedOutdoorsDesc': string;
  'profile.mostlyOutdoors': string;
  'profile.mostlyOutdoorsDesc': string;
  'profile.physicalEffortLevel': string;
  'profile.effortSedentary': string;
  'profile.effortSedentaryDesc': string;
  'profile.effortLight': string;
  'profile.effortLightDesc': string;
  'profile.effortModerate': string;
  'profile.effortModerateDesc': string;
  'profile.effortHeavy': string;
  'profile.effortHeavyDesc': string;
  'profile.coolingAccessLabel': string;
  'profile.coolingReliable': string;
  'profile.coolingLimited': string;
  'profile.coolingNone': string;
  'profile.peakExposureLabel': string;
  'profile.peakMorning': string;
  'profile.peakAfternoon': string;
  'profile.peakEvening': string;
  'profile.peakMultiple': string;
  'profile.acclimatizationLabel': string;
  'profile.acclimatizationQuestion': string;
  'profile.preparednessSubtitle': string;
  'profile.prepWaterDesc': string;
  'profile.prepShadeDesc': string;
  'profile.prepCoolingDesc': string;
  'profile.prepStationDesc': string;
  'profile.footerSecure': string;
  'profile.footerCalibrate': string;
  'profile.activeFactorsLabel': string;
  'personalRisk.strainDangerous': string;
  'personalRisk.strainSevere': string;
  'personalRisk.strainElevated': string;
  'personalRisk.strainModerate': string;
  'personalRisk.strainMinimal': string;
  'personalRisk.alertCritical': string;
  'personalRisk.alertExtreme': string;
  'personalRisk.alertHigh': string;
  'personalRisk.alertModerate': string;
  'personalRisk.alertLow': string;
  'personalRisk.cycle1545': string;
  'personalRisk.cycle2535': string;
  'personalRisk.cycle4020': string;
  'personalRisk.cycle5010': string;
  'personalRisk.cycleNormal': string;
  'factorDesc.lightActivity': string;
  'factorDesc.moderateActivity': string;
  'factorDesc.heavyActivity': string;
  'factorDesc.sedentaryActivity': string;
  'factorDesc.adequateHydration': string;
  'factorDesc.wellHydrated': string;
  'factorDesc.dehydrated': string;
  'factorDesc.outsideHours': string;
  'factorDesc.outsideUnmitigated': string;
  'factorDesc.outsideModerate': string;
  'factorDesc.outsideBrief': string;
  'factorDesc.ageAdult': string;
  'factorDesc.ageChild': string;
  'factorDesc.ageSenior': string;
  'factorDesc.ageYouth': string;
  'factorDesc.ageMature': string;
  'factorDesc.clothingStandard': string;
  'factorDesc.clothingLight': string;
  'factorDesc.clothingHeavy': string;
  'factorDesc.ambientElevated': string;
  'factorDesc.ambientHigh': string;
  'factorDesc.ambientSevere': string;
  'factorDesc.ambientModerate': string;
  'factorDesc.ambientNominal': string;
  'factorDesc.wbgtExtreme': string;
  'factorDesc.wbgtHigh': string;
  'factorDesc.wbgtModerate': string;
  'factorDesc.wbgtMild': string;
  'factorDesc.uvRadiation': string;
  'factorDesc.pregnancy': string;
  'factorDesc.smoking': string;
  'factorDesc.unacclimatized': string;
  'factorDesc.cardiovascular': string;
  'factorDesc.renal': string;
  'factorDesc.diabetes': string;
  'factorDesc.asthma': string;
  'factorDesc.hypertension': string;
  'factorDesc.neurological': string;
  'factorDesc.chronicGeneric': string;
  'zone.westernCoastal': string;
  'zone.northernPlains': string;
  'zone.westernArid': string;
  'zone.centralPlateau': string;
  'zone.southernCoastal': string;
  'zone.easternDelta': string;
  'zone.northWestern': string;
  'zone.deccanPlateau': string;
  'zone.southernPlateau': string;
  'zone.gangeticPlains': string;
  'zone.easternGangetic': string;
  'vulnTag.mumbai': string;
  'vulnTag.delhi': string;
  'vulnTag.ahmedabad': string;
  'vulnTag.nagpur': string;
  'vulnTag.chennai': string;
  'vulnTag.kolkata': string;
  'vulnTag.jaipur': string;
  'vulnTag.hyderabad': string;
  'vulnTag.bengaluru': string;
  'vulnTag.lucknow': string;
  'vulnTag.patna': string;
  'vulnTag.surat': string;
  'advisory.extremeCaution': string;
  'advisory.highStrain': string;
  'advisory.moderateLoad': string;
  'advisory.lowStrain': string;
  'auth.strengthWeak': string;
  'auth.strengthModerate': string;
  'auth.strengthGood': string;
  'auth.strengthStrong': string;
  'auth.strengthTooShort': string;
  'profile.secBasicInfo': string;
  'profile.secLocation': string;
  'profile.secHealth': string;
  'profile.secExposure': string;
  'profile.secOrganization': string;
  'profile.secJurisdiction': string;
  'profile.summaryFullDesc': string;
  'profile.summaryOfficialDesc': string;
  'profile.summaryBaselineDesc': string;
  'profile.summaryPartialDesc': string;
  'alerts.tier': string;
  'alerts.yellowTier': string;
  'alerts.orangeTier': string;
  'alerts.redTier': string;
  'alerts.greenTier': string;
  'alerts.reasonModerate': string;
  'alerts.reasonHigh': string;
  'alerts.reasonExtreme': string;
  'alerts.reasonNormal': string;
  'profile.factorAgeText': string;
  'profile.factorLocationText': string;

  // Risk Levels & Common
  'risk.low': string;
  'risk.moderate': string;
  'risk.high': string;
  'risk.extreme': string;
  'risk.critical': string;
  'common.years': string;
  'common.risk': string;

  // Dashboard Role Headers
  'dashboard.roleOfficialTitle': string;
  'dashboard.roleOfficialSubtitle': string;
  'dashboard.roleResponderTitle': string;
  'dashboard.roleResponderSubtitle': string;
  'dashboard.roleAnalystTitle': string;
  'dashboard.roleAnalystSubtitle': string;

  // Risk Drivers Detailed
  'riskDrivers.elevated': string;
  'riskDrivers.veryDry': string;
  'riskDrivers.noSolar': string;
  'riskDrivers.intenseRadiant': string;
  'riskDrivers.moderateRadiant': string;
  'riskDrivers.lowRadiant': string;
  'riskDrivers.calmAir': string;
  'riskDrivers.stagnantAir': string;
  'riskDrivers.hotConvective': string;
  'riskDrivers.activeVentilation': string;
  'riskDrivers.tempBaselineDesc': string;
  'riskDrivers.thermalStressDesc': string;
  'riskDrivers.contribScale': string;
  'riskDrivers.observedLabel': string;
  'riskDrivers.civicScoreDesc': string;

  // ThermalCard Scientific Formulations
  'thermalCard.scientificStandardsTitle': string;
  'thermalCard.isoDesc': string;
  'thermalCard.noaaDesc': string;
  'thermalCard.steadmanDesc': string;
  'thermalCard.stullDesc': string;

  // WeatherCard Synoptic Note & UV
  'weatherCard.synopticNote': string;
  'weather.humidity': string;
  'weather.windSpeed': string;
  'uv.extreme': string;
  'uv.veryHigh': string;
  'uv.high': string;
  'uv.moderate': string;
  'uv.low': string;

  // AlertBanner Hydration & Notice
  'alertBanner.drinkAmountInterval': string;
  'alertBanner.stayVentilated': string;

  // Alerts Guidance & Civic Directives
  'alerts.groupUnacclimatized': string;
  'alerts.groupElderly': string;
  'alerts.groupInfants': string;
  'alerts.groupPregnant': string;
  'alerts.groupOutdoorWorkers': string;
  'alerts.groupStreetVendors': string;
  'alerts.groupChronic': string;
  'alerts.groupHomeless': string;
  'alerts.groupGeneral': string;
  'alerts.priorityModerate': string;
  'alerts.priorityHigh': string;
  'alerts.priorityExtreme': string;
  'alerts.interval20to30': string;
  'alerts.interval15to20': string;
  'alerts.intervalRoutine': string;
  'alerts.hydrationGuidanceModerate': string;
  'alerts.hydrationGuidanceHigh': string;
  'alerts.hydrationGuidanceExtreme': string;
  'alerts.hydrationGuidanceLow': string;
  'alerts.basisNiosh': string;
  'alerts.basisIso': string;
  'alerts.basisGeneral': string;
  'alerts.outdoorExtreme': string;
  'alerts.outdoorHigh': string;
  'alerts.outdoorModerate': string;
  'alerts.heavyExtreme': string;
  'alerts.heavyHigh': string;
  'alerts.heavyModerate': string;
  'alerts.restExtreme': string;
  'alerts.restHigh': string;
  'alerts.restModerate': string;
  'alerts.restLow': string;
  'alerts.vulnExtreme': string;
  'alerts.vulnHigh': string;
  'alerts.vulnModerate': string;
  'alerts.vulnLow': string;
  'alerts.advCritical': string;
  'alerts.advWorkSafety': string;
  'alerts.advHydration': string;
  'alerts.advVulnGroups': string;
  'alerts.advHealthMonitoring': string;
  'alerts.advHighStress': string;
  'alerts.advFluidBreaks': string;
  'alerts.advSunProtection': string;
  'alerts.advRestShade': string;
  'alerts.advVulnCare': string;
  'alerts.advModerateCaution': string;
  'alerts.advSunExposure': string;
  'alerts.advFluidIntake': string;
  'alerts.advNormalConditions': string;
  'alerts.advHighHumidity': string;
  'alerts.advSolarLoad': string;
}

