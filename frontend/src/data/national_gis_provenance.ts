/**
 * THERMOSHIELD NATIONAL GIS PROVENANCE & DATA REALITY CATALOG
 *
 * This module documents the source, license, and provenance status of all
 * administrative boundary datasets utilized in the India-wide heat-risk GIS.
 */

export interface GisDatasetProvenance {
  filename: string;
  datasetName: string;
  sourceOrganization: string;
  upstreamRepoPath: string;
  sourceUrl: string;
  license: string;
  retrievedDate: string;
  administrativeLevel: string;
  provenanceStatus: 'VERIFIED_PUBLIC_SOURCE' | 'CURATED_REFERENCE_GEOMETRY' | 'NOT_VERIFIED';
  disclaimer: string;
}

export const NATIONAL_BOUNDARY_PROVENANCE: GisDatasetProvenance = {
  filename: 'india_boundary_reference.json',
  datasetName: 'India National Boundary Outer Reference Envelope',
  sourceOrganization: 'DataMeet India Community / Natural Earth Open Spatial',
  upstreamRepoPath: 'datameet/maps/States/Admin2.shp (outer boundary union)',
  sourceUrl: 'https://github.com/datameet/maps',
  license: 'MIT License (DataMeet 2020)',
  retrievedDate: '2026-09-16',
  administrativeLevel: 'Country (Level 0)',
  provenanceStatus: 'CURATED_REFERENCE_GEOMETRY',
  disclaimer: 'Curated administrative reference boundary for national meteorological clipping and visualization. Not an official Survey of India cartographic publication.',
};

export const INDIA_STATES_PROVENANCE: GisDatasetProvenance = {
  filename: 'india_states_reference.json',
  datasetName: 'India States & Union Territories Reference Boundaries (36 Units: 28 States, 8 UTs)',
  sourceOrganization: 'Community Open GIS Compilation (adarshbiradar/maps-geojson)',
  upstreamRepoPath: 'adarshbiradar/maps-geojson/master/india.json',
  sourceUrl: 'https://raw.githubusercontent.com/adarshbiradar/maps-geojson/master/india.json',
  license: 'NOT VERIFIED',
  retrievedDate: '2026-09-16',
  administrativeLevel: 'State & Union Territory (Level 1)',
  provenanceStatus: 'CURATED_REFERENCE_GEOMETRY',
  disclaimer: 'Curated state reference polygons covering all 28 States and 8 Union Territories (including Telangana, Ladakh, and merged Dadra & Nagar Haveli and Daman & Diu). Upstream repository does not bundle an explicit LICENSE file; license status is marked NOT VERIFIED.',
};

export const MAHARASHTRA_DISTRICTS_PROVENANCE: GisDatasetProvenance = {
  filename: 'maharashtra_districts_reference.json',
  datasetName: 'Maharashtra Districts Administrative Reference Boundaries (36 Districts)',
  sourceOrganization: 'Community Open GIS Compilation (adarshbiradar/maps-geojson)',
  upstreamRepoPath: 'adarshbiradar/maps-geojson/master/states/maharashtra.json',
  sourceUrl: 'https://raw.githubusercontent.com/adarshbiradar/maps-geojson/master/states/maharashtra.json',
  license: 'NOT VERIFIED',
  retrievedDate: '2026-09-16',
  administrativeLevel: 'District (Level 2)',
  provenanceStatus: 'CURATED_REFERENCE_GEOMETRY',
  disclaimer: 'Curated district boundaries for all 36 Maharashtra districts including Palghar (2014 bifurcation from Thane) and Mumbai Suburban. Modern official renamings (Ahilyanagar, Chhatrapati Sambhajinagar, Dharashiv) are indexed with backward-compatible aliases. Upstream repository does not bundle an explicit LICENSE file; license status is marked NOT VERIFIED.',
};

export const MUMBAI_WARDS_PROVENANCE: GisDatasetProvenance = {
  filename: 'mumbai_admin_wards.json',
  datasetName: 'Greater Mumbai 24 Administrative Ward Boundaries (BMC/MCGM Wards A-T)',
  sourceOrganization: 'Municipal Corporation of Greater Mumbai (MCGM / BMC)',
  upstreamRepoPath: 'MCGM GIS Portal Administrative Boundaries',
  sourceUrl: 'https://portal.mcgm.gov.in',
  license: 'Government Open Data / Public Administrative Boundary',
  retrievedDate: '2026-09-15',
  administrativeLevel: 'Municipal Ward (Level 3)',
  provenanceStatus: 'VERIFIED_PUBLIC_SOURCE',
  disclaimer: 'Official municipal administrative ward boundaries for the 24 BMC wards of Greater Mumbai.',
};

export const NATIONAL_INTELLIGENCE_METADATA = {
  coverageScope: 'India-wide meteorological sampling grid covering all 28 States and 8 Union Territories (36 Units), with 36-district Maharashtra drill-down and 24-ward municipal operational detail for Mumbai.',
  samplingResolution: '2.5° regular meteorological sampling grid (~275 km spacing) constrained to Indian landmass + state representative centroid anchors.',
  meteorologicalSource: 'Open-Meteo Global Forecasting System (Current observations & 5-day hourly numerical forecast).',
  thermalLineage: 'Stull natural wet-bulb calculation + radiative globe temperature approximation (WBGT) + Rothfusz Heat Index polynomial.',
  vulnerabilityScope: 'Demographic vulnerability is NOT integrated nationwide. National and state risk layers represent thermal/meteorological stress only.',
  healthModelScope: 'Synthetic-trained ML health-impact model is a comparative prototype proxy calibrated for Mumbai municipal planning, not an official nationwide epidemiological projection.',
  mumbaiOperationalStatus: '24 BMC Administrative Wards (A to T) with per-ward high-resolution forecast and localized Heat Action Plan triggers.',
} as const;

