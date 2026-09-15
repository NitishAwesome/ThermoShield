import { User, UserProfile } from '../types';

export interface EffectiveIdentity {
  displayName: string;
  initials: string;
  email: string;
  role: string;
  roleBadgeLabel: string;
  isCitizen: boolean;
  homeLocation: string | null;
  accountTypeLabel: string;
}

/**
 * Priority order for user display name:
 * 1. Saved Profile Full Name (if non-empty)
 * 2. Authenticated User Name (if non-empty)
 * 3. Email username prefix (if email provided)
 * 4. Fallback: "Citizen" / "ThermoShield Resident"
 */
export function getEffectiveDisplayName(
  profile?: Partial<UserProfile> | null,
  user?: Partial<User> | null
): string {
  if (profile?.fullName && profile.fullName.trim()) {
    return profile.fullName.trim();
  }
  if (user?.name && user.name.trim()) {
    return user.name.trim();
  }
  const email = profile?.email || user?.email;
  if (email && email.trim()) {
    const prefix = email.split('@')[0].trim();
    if (prefix) {
      // Capitalize first letter or format nicely
      return prefix.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  return 'Citizen';
}

/**
 * Computes 1- or 2-letter uppercase initials for avatar badges.
 * E.g., "Nitish Gupta" -> "NG"
 *       "Dr. Aarav Sharma" -> "AS" (skipping title if desired or taking first 2 words)
 *       "Siddharth" -> "S"
 */
export function getEffectiveInitials(
  nameOrDisplayName?: string | null,
  email?: string | null
): string {
  if (!nameOrDisplayName || !nameOrDisplayName.trim()) {
    if (email && email.trim()) {
      return email.charAt(0).toUpperCase();
    }
    return 'C';
  }

  // Strip leading honorifics like Dr., Mr., Ms. for initials if there are subsequent words
  const clean = nameOrDisplayName.trim().replace(/^(dr\.|mr\.|mrs\.|ms\.|prof\.)\s+/i, '');
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const firstChar = words[0].charAt(0).toUpperCase();
    const secondChar = words[1].charAt(0).toUpperCase();
    if (firstChar && secondChar) {
      return `${firstChar}${secondChar}`;
    }
  }

  if (words.length === 1 && words[0].length > 0) {
    return words[0].charAt(0).toUpperCase();
  }

  return nameOrDisplayName.charAt(0).toUpperCase() || 'C';
}

/**
 * Maps normalized role string to user-friendly badge label
 */
export function getRoleBadgeLabel(role?: string | null): string {
  switch ((role || '').toLowerCase()) {
    case 'official':
      return 'Health Official';
    case 'responder':
      return 'NDRF Responder';
    case 'analyst':
      return 'Climate Analyst';
    case 'admin':
      return 'Administrator';
    default:
      return 'Citizen';
  }
}

/**
 * Resolves complete standardized identity information combining both
 * ProfileContext and AuthContext states.
 */
export function getEffectiveIdentity(
  profile?: Partial<UserProfile> | null,
  user?: Partial<User> | null
): EffectiveIdentity {
  const role = (profile?.role || user?.role || 'user').toLowerCase();
  const isCitizen = role === 'user' || role === 'citizen';
  const displayName = getEffectiveDisplayName(profile, user);
  const email = profile?.email || user?.email || '';
  const initials = getEffectiveInitials(displayName, email);
  const roleBadgeLabel = getRoleBadgeLabel(role);

  let homeLocation: string | null = null;
  if (profile?.city && profile.city.trim()) {
    homeLocation = profile.state && profile.state.trim()
      ? `${profile.city.trim()}, ${profile.state.trim()}`
      : profile.city.trim();
  }

  const isDemo =
    email.includes('demo') ||
    email.includes('siddharth') ||
    email.includes('aarav') ||
    email.includes('rajesh') ||
    email.includes('pooja');

  const accountTypeLabel = isDemo
    ? 'Demonstration Profile'
    : isCitizen
    ? 'Citizen Safety Account'
    : 'Authority Account';

  return {
    displayName,
    initials,
    email,
    role,
    roleBadgeLabel,
    isCitizen,
    homeLocation,
    accountTypeLabel,
  };
}
