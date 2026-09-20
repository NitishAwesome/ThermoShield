/**
 * Authority Access Request Compatibility Validator
 * Ensures mutual consistency across Organization, Department, Designation,
 * Functional Role, Administrative Level, and Operational Jurisdiction.
 */

export interface AuthorityValidationResult {
  valid: boolean;
  errors: string[];
  normalizedRole: string;
  normalizedJurisdictionId: string;
  normalizedJurisdictionName: string;
  normalizedJurisdictionType: string;
  defaultPermissions: string[];
}

export interface AuthorityRequestParams {
  organization?: string;
  department?: string;
  designation?: string;
  requestedRole?: string;
  jurisdictionType?: string;
  jurisdictionId?: string;
}

import { INDIAN_MUNICIPAL_CORPORATIONS } from '../data/indianMunicipalCorporations';

interface OrgRule {
  id: string;
  name: string;
  allowedLevels: string[];
  primaryJurisdiction: string;
  allowedRoles: string[];
  isMunicipal?: boolean;
}

const CONFIGURED_ORGS: Record<string, OrgRule> = {
  MCGM: {
    id: 'MCGM',
    name: 'Municipal Corporation of Greater Mumbai (MCGM / BMC)',
    allowedLevels: ['MUNICIPAL_CORPORATION', 'ADMINISTRATIVE_WARD'],
    primaryJurisdiction: 'IN-MH-MCGM',
    allowedRoles: ['municipal_hap_officer', 'ward_officer', 'responder', 'official'],
    isMunicipal: true,
  },
  MH_SDMA: {
    id: 'MH_SDMA',
    name: 'Maharashtra State Disaster Management Authority (SDMA)',
    allowedLevels: ['STATE_UT'],
    primaryJurisdiction: 'IN-MH',
    allowedRoles: ['state_coordinator', 'national_analyst', 'responder', 'official'],
  },
  MH_PHD: {
    id: 'MH_PHD',
    name: 'Maharashtra Public Health Department',
    allowedLevels: ['STATE_UT', 'DISTRICT'],
    primaryJurisdiction: 'IN-MH',
    allowedRoles: ['state_coordinator', 'district_authority', 'official'],
  },
  PUNE_DDMA: {
    id: 'PUNE_DDMA',
    name: 'District Disaster Management Authority — Pune',
    allowedLevels: ['DISTRICT'],
    primaryJurisdiction: 'IN-MH-DIST-PUN',
    allowedRoles: ['district_authority', 'responder', 'official'],
  },
  NAGPUR_DDMA: {
    id: 'NAGPUR_DDMA',
    name: 'District Disaster Management Authority — Nagpur',
    allowedLevels: ['DISTRICT'],
    primaryJurisdiction: 'IN-MH-DIST-NAGPUR',
    allowedRoles: ['district_authority', 'responder', 'official'],
  },
  NDMA: {
    id: 'NDMA',
    name: 'National Disaster Management Authority (NDMA)',
    allowedLevels: ['COUNTRY'],
    primaryJurisdiction: 'IN',
    allowedRoles: ['national_analyst', 'system_admin', 'responder', 'official'],
  },
  IMD: {
    id: 'IMD',
    name: 'India Meteorological Department (IMD)',
    allowedLevels: ['COUNTRY'],
    primaryJurisdiction: 'IN',
    allowedRoles: ['national_analyst', 'analyst'],
  },
  NCDC: {
    id: 'NCDC',
    name: 'National Centre for Disease Control (NCDC)',
    allowedLevels: ['COUNTRY'],
    primaryJurisdiction: 'IN',
    allowedRoles: ['national_analyst', 'district_authority', 'official'],
  },
};

const ROLE_CANONICAL_MAP: Record<string, string> = {
  'heat action plan officer': 'municipal_hap_officer',
  'municipal_hap_officer': 'municipal_hap_officer',
  'heat-risk analyst': 'national_analyst',
  'national_analyst': 'national_analyst',
  'public health monitoring': 'district_authority',
  'district_authority': 'district_authority',
  'emergency / field response': 'responder',
  'responder': 'responder',
  'ward operations': 'ward_officer',
  'ward_officer': 'ward_officer',
  'state coordination': 'state_coordinator',
  'state_coordinator': 'state_coordinator',
  'national analysis': 'national_analyst',
  'system_admin': 'system_admin',
  'official': 'official',
};

const DEFAULT_ROLE_PERMS: Record<string, string[]> = {
  national_analyst: ['VIEW_JURISDICTION', 'VIEW_NATIONAL_CONTEXT', 'VIEW_SUBORDINATE_REGIONS', 'ANALYZE_RISK', 'RECOMMEND_HAP_ACTION', 'EXPORT_REPORT'],
  state_coordinator: ['VIEW_JURISDICTION', 'VIEW_PARENT_CONTEXT', 'VIEW_NATIONAL_CONTEXT', 'VIEW_SUBORDINATE_REGIONS', 'ANALYZE_RISK', 'RECOMMEND_HAP_ACTION', 'EXPORT_REPORT'],
  district_authority: ['VIEW_JURISDICTION', 'VIEW_PARENT_CONTEXT', 'VIEW_SUBORDINATE_REGIONS', 'ANALYZE_RISK', 'RECOMMEND_HAP_ACTION', 'ACTIVATE_HAP', 'APPROVE_HAP_ACTION', 'DISPATCH_RESPONDER', 'EXPORT_REPORT'],
  municipal_hap_officer: ['VIEW_JURISDICTION', 'VIEW_PARENT_CONTEXT', 'VIEW_NATIONAL_CONTEXT', 'VIEW_SUBORDINATE_REGIONS', 'ANALYZE_RISK', 'RECOMMEND_HAP_ACTION', 'APPROVE_HAP_ACTION', 'ACTIVATE_HAP', 'CLOSE_HAP_ACTION', 'SEND_PUBLIC_ADVISORY', 'DISPATCH_RESPONDER', 'EXPORT_REPORT'],
  ward_officer: ['VIEW_JURISDICTION', 'VIEW_PARENT_CONTEXT', 'ACKNOWLEDGE_TASK', 'DISPATCH_RESPONDER', 'RECOMMEND_HAP_ACTION'],
  responder: ['VIEW_JURISDICTION', 'ACKNOWLEDGE_TASK'],
  system_admin: ['MANAGE_JURISDICTION_USERS', 'VIEW_JURISDICTION'],
};

function matchOrg(orgStr?: string): OrgRule | null {
  if (!orgStr) return null;
  const upper = orgStr.trim().toUpperCase();
  if (CONFIGURED_ORGS[upper]) return CONFIGURED_ORGS[upper];

  // Match against 50+ Indian Municipal Corporations Catalog
  const mcMatch = INDIAN_MUNICIPAL_CORPORATIONS.find(
    (c) =>
      c.shortCode.toUpperCase() === upper ||
      c.id.toUpperCase() === upper ||
      c.name.toUpperCase() === upper ||
      upper.includes(c.name.toUpperCase()) ||
      (upper.includes(c.city.toUpperCase()) && (upper.includes('MUNICIPAL') || upper.includes('NAGAR NIGAM') || upper.includes('CORPORATION') || upper.includes('MAHANAGARA')))
  );

  if (mcMatch) {
    return {
      id: mcMatch.shortCode,
      name: mcMatch.name,
      allowedLevels: ['MUNICIPAL_CORPORATION', 'ADMINISTRATIVE_WARD'],
      primaryJurisdiction: mcMatch.id,
      allowedRoles: ['municipal_hap_officer', 'ward_officer', 'responder', 'official'],
      isMunicipal: true,
    };
  }

  if (upper.includes('MCGM') || upper.includes('GREATER MUMBAI') || upper.includes('BMC')) return CONFIGURED_ORGS.MCGM;
  if (upper.includes('SDMA') || (upper.includes('MAHARASHTRA') && upper.includes('DISASTER'))) return CONFIGURED_ORGS.MH_SDMA;
  if (upper.includes('MAHARASHTRA') && (upper.includes('HEALTH') || upper.includes('PHD'))) return CONFIGURED_ORGS.MH_PHD;
  if (upper.includes('PUNE') && upper.includes('DDMA')) return CONFIGURED_ORGS.PUNE_DDMA;
  if (upper.includes('NAGPUR') && upper.includes('DDMA')) return CONFIGURED_ORGS.NAGPUR_DDMA;
  if (upper.includes('NDMA') || upper.includes('NATIONAL DISASTER')) return CONFIGURED_ORGS.NDMA;
  if (upper.includes('IMD') || upper.includes('METEOROLOGICAL')) return CONFIGURED_ORGS.IMD;
  if (upper.includes('NCDC') || upper.includes('DISEASE CONTROL')) return CONFIGURED_ORGS.NCDC;

  return null;
}

export function validateAuthorityAccessRequest(params: AuthorityRequestParams): AuthorityValidationResult {
  const errors: string[] = [];
  const { organization, department, designation, requestedRole, jurisdictionId } = params;

  let normalizedRole = 'user';
  let normalizedJurisdictionId = jurisdictionId || 'IN';
  let normalizedJurisdictionName = 'India (National)';
  let normalizedJurisdictionType = 'COUNTRY';

  if (!organization || !organization.trim()) {
    errors.push('Government organization is required.');
    return {
      valid: false,
      errors,
      normalizedRole,
      normalizedJurisdictionId,
      normalizedJurisdictionName,
      normalizedJurisdictionType,
      defaultPermissions: [],
    };
  }

  const orgConfig = matchOrg(organization);
  if (!orgConfig) {
    errors.push(`Organization '${organization}' is not recognized in the configured catalog.`);
    return {
      valid: false,
      errors,
      normalizedRole,
      normalizedJurisdictionId,
      normalizedJurisdictionName,
      normalizedJurisdictionType,
      defaultPermissions: [],
    };
  }

  // Role Normalization
  const roleInput = (requestedRole || '').trim().toLowerCase();
  normalizedRole = ROLE_CANONICAL_MAP[roleInput] || roleInput;

  if (!orgConfig.allowedRoles.includes(normalizedRole)) {
    const allowed = orgConfig.allowedRoles.map((r) => r.replace(/_/g, ' ')).join(', ');
    errors.push(`Role '${requestedRole}' is incompatible with ${orgConfig.name}. Compatible roles: ${allowed}.`);
  }

  // Jurisdiction checks
  const reqJuris = (jurisdictionId || '').trim();
  if (!reqJuris) {
    errors.push('Operational jurisdiction is required.');
    return {
      valid: false,
      errors,
      normalizedRole,
      normalizedJurisdictionId,
      normalizedJurisdictionName,
      normalizedJurisdictionType,
      defaultPermissions: [],
    };
  }

  normalizedJurisdictionId = reqJuris;

  if (orgConfig.isMunicipal || orgConfig.id === 'MCGM') {
    const primaryId = orgConfig.primaryJurisdiction;
    const isPrimary = reqJuris.toUpperCase() === primaryId.toUpperCase();
    const isWard = reqJuris.toUpperCase().startsWith(`${primaryId.toUpperCase()}-`) || reqJuris.toLowerCase().startsWith('ward_');
    const isMatched = isPrimary || isWard || reqJuris.toUpperCase().includes(orgConfig.id.toUpperCase());

    if (!isMatched) {
      errors.push(`${orgConfig.name} operates strictly within its designated municipal corporation (${primaryId}) or subordinate wards. Requested jurisdiction '${reqJuris}' is invalid.`);
    } else {
      normalizedJurisdictionId = isWard ? reqJuris : primaryId;
      normalizedJurisdictionType = isWard ? 'ADMINISTRATIVE_WARD' : 'MUNICIPAL_CORPORATION';
      normalizedJurisdictionName = isWard
        ? `${orgConfig.name} Ward (${reqJuris.replace(`${primaryId}-`, '')})`
        : orgConfig.name;
    }
  } else if (orgConfig.id === 'MH_SDMA' || orgConfig.id === 'MH_PHD') {
    if (reqJuris !== 'IN-MH' && !reqJuris.startsWith('IN-MH-DIST-')) {
      errors.push(`'${orgConfig.name}' operates strictly within Maharashtra (IN-MH) or its subordinate districts. Requested jurisdiction '${reqJuris}' is invalid.`);
    } else {
      normalizedJurisdictionType = reqJuris.startsWith('IN-MH-DIST-') ? 'DISTRICT' : 'STATE_UT';
      normalizedJurisdictionName = reqJuris.startsWith('IN-MH-DIST-')
        ? `District (${reqJuris.replace('IN-MH-DIST-', '')})`
        : 'Maharashtra';
    }
  } else if (orgConfig.id === 'PUNE_DDMA') {
    if (reqJuris !== 'IN-MH-DIST-PUN' && !reqJuris.toUpperCase().includes('PUN')) {
      errors.push(`Pune DDMA operates strictly within Pune District (IN-MH-DIST-PUN). Requested jurisdiction '${reqJuris}' is invalid.`);
    } else {
      normalizedJurisdictionId = 'IN-MH-DIST-PUN';
      normalizedJurisdictionType = 'DISTRICT';
      normalizedJurisdictionName = 'Pune District';
    }
  } else if (orgConfig.id === 'NAGPUR_DDMA') {
    if (reqJuris !== 'IN-MH-DIST-NAGPUR' && !reqJuris.toUpperCase().includes('NAGPUR')) {
      errors.push(`Nagpur DDMA operates strictly within Nagpur District (IN-MH-DIST-NAGPUR). Requested jurisdiction '${reqJuris}' is invalid.`);
    } else {
      normalizedJurisdictionId = 'IN-MH-DIST-NAGPUR';
      normalizedJurisdictionType = 'DISTRICT';
      normalizedJurisdictionName = 'Nagpur District';
    }
  } else if (['NDMA', 'IMD', 'NCDC'].includes(orgConfig.id)) {
    if (reqJuris !== 'IN') {
      errors.push(`'${orgConfig.name}' operates at National level (IN). Requested jurisdiction '${reqJuris}' is invalid.`);
    } else {
      normalizedJurisdictionId = 'IN';
      normalizedJurisdictionType = 'COUNTRY';
      normalizedJurisdictionName = 'India (National)';
    }
  }

  // Cross-field role semantic alignment
  if (normalizedRole === 'municipal_hap_officer' && normalizedJurisdictionType !== 'MUNICIPAL_CORPORATION') {
    errors.push('Municipal HAP Nodal Officer role must be paired with a Municipal Corporation jurisdiction (e.g. Greater Mumbai).');
  }
  if (normalizedRole === 'ward_officer' && normalizedJurisdictionType !== 'ADMINISTRATIVE_WARD') {
    errors.push('Ward Officer role must be paired with an Administrative Ward jurisdiction.');
  }
  if (normalizedRole === 'state_coordinator' && normalizedJurisdictionType !== 'STATE_UT') {
    errors.push('State Coordinator role must be paired with a State / UT jurisdiction (e.g. Maharashtra).');
  }
  if (normalizedRole === 'national_analyst' && !['COUNTRY', 'STATE_UT'].includes(normalizedJurisdictionType)) {
    errors.push('National / Regional Analyst cannot be assigned below State level.');
  }

  const defaultPermissions = DEFAULT_ROLE_PERMS[normalizedRole] || ['VIEW_JURISDICTION'];

  return {
    valid: errors.length === 0,
    errors,
    normalizedRole,
    normalizedJurisdictionId,
    normalizedJurisdictionName,
    normalizedJurisdictionType,
    defaultPermissions,
  };
}
