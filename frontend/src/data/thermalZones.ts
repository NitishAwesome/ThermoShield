import { ThermalZone } from '../types';

/**
 * PROTOTYPE URBAN THERMAL ZONES — GREATER MUMBAI METROPOLITAN REGION
 * 
 * DATA REALITY & SCIENTIFIC TRANSPARENCY NOTICE:
 * These geographic zones are clearly designated PROTOTYPE MONITORING SUBDIVISIONS
 * created for the SIH26083 demonstration. They are NOT official municipal ward boundaries
 * and do NOT represent physical street-level IoT sensor hardware.
 * 
 * Meteorological inputs are localized using regional Open-Meteo feeds adjusted by
 * microclimatic urban heat island (UHI) modifiers, building density, and coastal proximity models.
 */

export const MUMBAI_PROTOTYPE_ZONES: ThermalZone[] = [
  {
    id: 'zone-mumbai-south',
    name: 'South Mumbai Coastal Core',
    shortName: 'South Mumbai',
    district: 'Mumbai City',
    zone: 'Coastal Urban Core',
    representativeCoords: [18.9320, 72.8340],
    polygon: [
      [18.9020, 72.8120],
      [18.9550, 72.8180],
      [18.9720, 72.8450],
      [18.9480, 72.8620],
      [18.9100, 72.8480],
      [18.9020, 72.8120],
    ],
    baselineTempOffsetC: -0.5, // Coastal sea-breeze moderation
    vulnerabilityIndex: 0.42,
    vulnerabilityFactors: [
      'High commercial office density',
      'Moderate elderly demographic concentration',
      'Coastal sea-breeze thermal buffer',
    ],
    demographicsNote: 'Predominantly commercial and heritage core with moderate daytime pedestrian exposure.',
    areaType: 'prototype_zone',
  },
  {
    id: 'zone-mumbai-central',
    name: 'Central Mumbai Dense Urban Belt (Dharavi / Dadar)',
    shortName: 'Central Mumbai (Dharavi)',
    district: 'Mumbai City / Suburban',
    zone: 'High-Density Residential & Informal Settlements',
    representativeCoords: [19.0400, 72.8550],
    polygon: [
      [19.0180, 72.8300],
      [19.0620, 72.8380],
      [19.0650, 72.8750],
      [19.0220, 72.8700],
      [19.0180, 72.8300],
    ],
    baselineTempOffsetC: 1.8, // Acute Urban Heat Island (UHI) due to corrugated tin roofs and high building density
    vulnerabilityIndex: 0.88,
    vulnerabilityFactors: [
      'Very high density informal housing (corrugated tin roofs)',
      'High concentration of informal outdoor/cottage-industry labor',
      'Limited indoor ventilation & mechanical cooling access',
      'Elevated heat illness vulnerability',
    ],
    demographicsNote: 'Dense residential belt with high nighttime heat retention and widespread outdoor daily labor.',
    areaType: 'prototype_zone',
  },
  {
    id: 'zone-mumbai-west',
    name: 'Western Suburban Transit Corridor (Bandra / Andheri)',
    shortName: 'Western Suburbs (Andheri)',
    district: 'Mumbai Suburban',
    zone: 'Commercial & Transport Corridor',
    representativeCoords: [19.1136, 72.8697],
    polygon: [
      [19.0650, 72.8250],
      [19.1450, 72.8320],
      [19.1500, 72.8780],
      [19.0700, 72.8700],
      [19.0650, 72.8250],
    ],
    baselineTempOffsetC: 0.8,
    vulnerabilityIndex: 0.62,
    vulnerabilityFactors: [
      'High volume public transit interchange points',
      'Dense street vendor & delivery worker concentration',
      'Vehicular combustion heat contribution',
    ],
    demographicsNote: 'Heavy transit corridor with peak daytime pedestrian exposure along major rail and road arteries.',
    areaType: 'prototype_zone',
  },
  {
    id: 'zone-mumbai-east',
    name: 'Eastern Suburban Logistics Hub (Kurla / Ghatkopar / Chembur)',
    shortName: 'Eastern Suburbs (Kurla)',
    district: 'Mumbai Suburban',
    zone: 'Industrial & Transport Nexus',
    representativeCoords: [19.0728, 72.9005],
    polygon: [
      [19.0450, 72.8720],
      [19.1220, 72.8900],
      [19.1250, 72.9350],
      [19.0480, 72.9180],
      [19.0450, 72.8720],
    ],
    baselineTempOffsetC: 1.2,
    vulnerabilityIndex: 0.74,
    vulnerabilityFactors: [
      'Warehousing and industrial loading workforce',
      'Reduced maritime breeze penetration',
      'Industrial particulate and ambient heat amplification',
    ],
    demographicsNote: 'Logistics and industrial workforce with extensive unshaded loading yard operations.',
    areaType: 'prototype_zone',
  },
  {
    id: 'zone-mumbai-north',
    name: 'Northern Suburban Canopy & Mixed Belt (Borivali / Malad)',
    shortName: 'Northern Suburbs (Borivali)',
    district: 'Mumbai Suburban',
    zone: 'Residential & Forest Fringe',
    representativeCoords: [19.2288, 72.8541],
    polygon: [
      [19.1680, 72.8200],
      [19.2650, 72.8350],
      [19.2680, 72.9150],
      [19.1720, 72.8850],
      [19.1680, 72.8200],
    ],
    baselineTempOffsetC: 0.3, // Microclimate cooled near SGNP green canopy
    vulnerabilityIndex: 0.51,
    vulnerabilityFactors: [
      'Mixed residential with substantial senior citizen population',
      'Significant green canopy buffer on eastern national park fringe',
      'High suburban commuter population',
    ],
    demographicsNote: 'Residential belt with moderate risk, buffered on the east by forest cover.',
    areaType: 'prototype_zone',
  },
  {
    id: 'zone-mumbai-inland',
    name: 'Thane & Navi Mumbai Inland Plateau',
    shortName: 'Inland Belt (Thane / Navi Mumbai)',
    district: 'Thane / Raigad',
    zone: 'Inland Continental / Industrial Plateau',
    representativeCoords: [19.1860, 72.9750],
    polygon: [
      [19.1150, 72.9420],
      [19.2350, 72.9650],
      [19.2380, 73.0450],
      [19.1180, 73.0250],
      [19.1150, 72.9420],
    ],
    baselineTempOffsetC: 2.2, // Cut off from sea breeze, high daytime continental heating
    vulnerabilityIndex: 0.79,
    vulnerabilityFactors: [
      'Continental inland temperature elevation (+2°C to +3°C above coast)',
      'Large industrial MIDC worker population',
      'Delayed evening cooling due to topographic hills',
    ],
    demographicsNote: 'Inland urban corridor experiencing highest daytime peak temperatures in the MMR region.',
    areaType: 'prototype_zone',
  },
];
