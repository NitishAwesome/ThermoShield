import { User, UserProfile } from '../types';

/**
 * Standardized set of recognized Government/Authority administrative roles.
 * Matches backend auth router GOV_ROLES and authority validation specifications.
 */
export const AUTHORIZED_GOV_ROLES = [
  'official',
  'responder',
  'analyst',
  'admin',
  'municipal_hap_officer',
  'state_coordinator',
  'district_authority',
  'ward_officer',
  'health_officer',
  'national_analyst',
  'system_admin',
] as const;

export type AuthorizedGovRole = (typeof AUTHORIZED_GOV_ROLES)[number];

/**
 * Checks if a given role string belongs to recognized government/authority roles.
 * Normalizes casing, hyphens, and spaces.
 */
export function isGovRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (normalized === 'user' || normalized === 'citizen') {
    return false;
  }

  if (AUTHORIZED_GOV_ROLES.includes(normalized as any)) {
    return true;
  }

  // Permissive fallback for authority role patterns
  return (
    normalized.includes('officer') ||
    normalized.includes('coordinator') ||
    normalized.includes('authority') ||
    normalized.includes('analyst') ||
    normalized.includes('admin') ||
    normalized.includes('magistrate')
  );
}

/**
 * Checks if a user and/or their profile corresponds to an authorized authority account.
 * Handles priority order:
 * 1. user.portal_type === 'AUTHORITY'
 * 2. user.role matches government roles
 * 3. profile.role matches government roles
 * 4. user.organization or user.jurisdiction_id presence (unless explicitly citizen)
 */
export function isGovUser(
  user?: Partial<User> | null,
  profile?: Partial<UserProfile> | null
): boolean {
  if (!user && !profile) return false;

  const userRoleLower = (user?.role || '').trim().toLowerCase();
  const profileRoleLower = (profile?.role || '').trim().toLowerCase();

  // 1. Explicit portal_type check
  if (user?.portal_type === 'AUTHORITY') {
    return true;
  }

  // 2. User direct role check
  if (isGovRole(user?.role)) {
    return true;
  }

  // 3. Profile role check
  if (isGovRole(profile?.role)) {
    return true;
  }

  // 4. Presence of authority organization or jurisdiction metadata
  if (
    (user?.organization || user?.jurisdiction_id || profile?.organization || profile?.jurisdiction) &&
    userRoleLower !== 'user' &&
    userRoleLower !== 'citizen' &&
    profileRoleLower !== 'user' &&
    profileRoleLower !== 'citizen'
  ) {
    return true;
  }

  return false;
}
