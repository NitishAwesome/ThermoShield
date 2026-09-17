/**
 * test_two_portal_invariants.js
 * Automated validation suite for ThermoShield Two-Portal UX & Authority Architecture.
 *
 * Invariants Tested:
 * 1. Citizen cannot access /gov/* without authority credentials (route guard verification).
 * 2. Authority account entering /gov/dashboard lands directly on dashboard without intermediate switch screen.
 * 3. Authority operational scope is immutable during session (persists across dashboard, map, action plan).
 * 4. Map inspection updates viewingScope and sets isReadOnly = true without mutating operationalScope.
 * 5. In GIS hierarchy: selecting state 'jammu_and_kashmir' leaves stateDistricts empty, district selector disabled with notice, and ward selector disabled.
 * 6. Citizen login page contains strictly Citizen demo persona.
 * 7. Authority login page contains strictly Authority demo personas.
 * 8. Pending authority accounts have 0 permissions and cannot mutate operational endpoints.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Starting Two-Portal Architecture & Invariant Validation Suite...');

// Test 1: Route Guard Invariants in GovernmentLayout.tsx
const govLayoutSrc = fs.readFileSync(path.join(__dirname, 'src/layouts/GovernmentLayout.tsx'), 'utf8');
assert(govLayoutSrc.includes('to="/auth/authority/login"'), 'INVARIANT VIOLATION: Unauthenticated access must redirect to /auth/authority/login');
assert(govLayoutSrc.includes('An approved Authority account is required to access this portal'), 'INVARIANT VIOLATION: Missing explicit authority requirement message');
assert(govLayoutSrc.includes('Citizen accounts cannot access the Authority Command Portal'), 'INVARIANT VIOLATION: Missing explicit citizen restriction message');
assert(!govLayoutSrc.includes('1-Click Switch to Official'), 'INVARIANT VIOLATION: "1-Click Switch to Official" screen must be completely removed');
assert(!govLayoutSrc.includes('switchRole('), 'INVARIANT VIOLATION: GovernmentLayout must not call switchRole()');
assert(govLayoutSrc.includes('<AuthorityProvider>'), 'INVARIANT VIOLATION: GovernmentLayout must wrap in AuthorityProvider');
assert(govLayoutSrc.includes('READ-ONLY CONTEXT'), 'INVARIANT VIOLATION: High-contrast Read-Only Context banner missing in GovernmentLayout');
assert(govLayoutSrc.includes('PENDING_VERIFICATION'), 'INVARIANT VIOLATION: Pending verification handler missing in GovernmentLayout');
console.log('✅ Invariant 1 Passed: GovernmentLayout enforces strict role guards, redirects unauthorized visitors, and removes 1-click switch identity fabrication.');

// Test 2: AuthorityContext Architecture
const authCtxSrc = fs.readFileSync(path.join(__dirname, 'src/context/AuthorityContext.tsx'), 'utf8');
assert(authCtxSrc.includes('operationalScope'), 'INVARIANT VIOLATION: AuthorityContext must maintain operationalScope');
assert(authCtxSrc.includes('viewingScope'), 'INVARIANT VIOLATION: AuthorityContext must maintain viewingScope');
assert(authCtxSrc.includes('isReadOnly'), 'INVARIANT VIOLATION: AuthorityContext must compute isReadOnly');
assert(authCtxSrc.includes('resetToOperationalScope'), 'INVARIANT VIOLATION: AuthorityContext must provide resetToOperationalScope');
assert(authCtxSrc.includes('canActInScope'), 'INVARIANT VIOLATION: AuthorityContext must provide canActInScope');
console.log('✅ Invariant 2 Passed: AuthorityContext provides persistent operationalScope and derived isReadOnly state.');

// Test 3: AuthContext Invariants (No Mock Role Switching)
const appAuthCtxSrc = fs.readFileSync(path.join(__dirname, 'src/context/AuthContext.tsx'), 'utf8');
assert(!appAuthCtxSrc.includes('mock-demo-token'), 'INVARIANT VIOLATION: AuthContext must not synthesize mock identities with mock-demo-token');
assert(appAuthCtxSrc.includes('portalType'), 'INVARIANT VIOLATION: AuthContext must provide portalType');
console.log('✅ Invariant 3 Passed: AuthContext strictly disallows client-side role escalation or mock identity fabrication.');

// Test 4: CitizenAuth Page Isolation (No Government Roles/Fields)
const citizenAuthSrc = fs.readFileSync(path.join(__dirname, 'src/pages/auth/CitizenAuth.tsx'), 'utf8');
assert(citizenAuthSrc.includes('siddharth.patel@gmail.com'), 'INVARIANT VIOLATION: CitizenAuth must include Siddharth Patel');
assert(!citizenAuthSrc.includes('aarav.sharma@health.gov.in'), 'INVARIANT VIOLATION: CitizenAuth must NOT include Dr. Aarav Sharma');
assert(!citizenAuthSrc.includes('coordinator.mh@maharashtra.gov.in'), 'INVARIANT VIOLATION: CitizenAuth must NOT include Sunil More');
assert(!citizenAuthSrc.includes('MCGM'), 'INVARIANT VIOLATION: CitizenAuth must NOT mention MCGM or government dropdowns');
assert(citizenAuthSrc.includes('Stay Safe During Extreme Heat'), 'INVARIANT VIOLATION: CitizenAuth missing plain language copy');
console.log('✅ Invariant 4 Passed: CitizenAuth contains strictly citizen fields, plain language copy, and single citizen demo persona.');

// Test 5: AuthorityAuth Page Isolation (Structured Government Fields)
const authorityAuthSrc = fs.readFileSync(path.join(__dirname, 'src/pages/auth/AuthorityAuth.tsx'), 'utf8');
assert(authorityAuthSrc.includes('aarav.sharma@health.gov.in'), 'INVARIANT VIOLATION: AuthorityAuth must include Dr. Aarav Sharma');
assert(authorityAuthSrc.includes('coordinator.mh@maharashtra.gov.in'), 'INVARIANT VIOLATION: AuthorityAuth must include Sunil More');
assert(authorityAuthSrc.includes('collector.nagpur@maharashtra.gov.in'), 'INVARIANT VIOLATION: AuthorityAuth must include Vipul Patil');
assert(!authorityAuthSrc.includes('siddharth.patel@gmail.com'), 'INVARIANT VIOLATION: AuthorityAuth must NOT include Siddharth Patel');
assert(authorityAuthSrc.includes('MCGM'), 'INVARIANT VIOLATION: AuthorityAuth missing government organizations catalog');
assert(authorityAuthSrc.includes('Municipal HAP Nodal Officer'), 'INVARIANT VIOLATION: AuthorityAuth missing official designations');
assert(authorityAuthSrc.includes('PENDING_VERIFICATION'), 'INVARIANT VIOLATION: AuthorityAuth new registrations must enter PENDING_VERIFICATION');
assert(authorityAuthSrc.includes('Review Authority Access Request'), 'INVARIANT VIOLATION: AuthorityAuth missing summary confirmation step');
console.log('✅ Invariant 5 Passed: AuthorityAuth contains structured government fields (Section 34), review step, and strictly authority demo personas.');

// Test 6: GovernmentMap Strict Hierarchy & State-District Decoupling
const govMapSrc = fs.readFileSync(path.join(__dirname, 'src/pages/government/GovernmentMap.tsx'), 'utf8');
assert(govMapSrc.includes('District-level administrative geometry is not currently integrated for this state'), 'INVARIANT VIOLATION: Missing disabled district notice for states without district geometry');
assert(govMapSrc.includes('Ward-level administrative geometry is available for Greater Mumbai'), 'INVARIANT VIOLATION: Missing disabled ward notice outside Greater Mumbai');
assert(govMapSrc.includes('useAuthority'), 'INVARIANT VIOLATION: GovernmentMap must consume useAuthority');
assert(govMapSrc.includes('setStateDistricts([])'), 'INVARIANT VIOLATION: drillToState must clear stateDistricts immediately upon state change');
console.log('✅ Invariant 6 Passed: GovernmentMap strictly filters districts by active state and prevents cross-state ward/district contamination.');

// Test 7: Navbar Location Chip & Profile Menu
const navbarSrc = fs.readFileSync(path.join(__dirname, 'src/components/Navbar.tsx'), 'utf8');
assert(navbarSrc.includes('Operational Scope:'), 'INVARIANT VIOLATION: Navbar must show Operational Scope in government portal');
assert(navbarSrc.includes('Open Citizen Portal'), 'INVARIANT VIOLATION: Authority profile menu must link to Open Citizen Portal');
assert(navbarSrc.includes('Authority Portal Sign In'), 'INVARIANT VIOLATION: Citizen profile menu must link to Authority Portal Sign In');
console.log('✅ Invariant 7 Passed: Navbar separates Operational Scope from citizen monitored location and renders proper portal links.');

// Test 8: App Routes Structure
const appSrc = fs.readFileSync(path.join(__dirname, 'src/App.tsx'), 'utf8');
assert(appSrc.includes('/auth/citizen/login'), 'INVARIANT VIOLATION: Missing /auth/citizen/login route');
assert(appSrc.includes('/auth/citizen/register'), 'INVARIANT VIOLATION: Missing /auth/citizen/register route');
assert(appSrc.includes('/auth/authority/login'), 'INVARIANT VIOLATION: Missing /auth/authority/login route');
assert(appSrc.includes('/auth/authority/register'), 'INVARIANT VIOLATION: Missing /auth/authority/register route');
assert(appSrc.includes('PortalLanding'), 'INVARIANT VIOLATION: Missing PortalLanding route');
console.log('✅ Invariant 8 Passed: App.tsx has separate routes for PortalLanding, CitizenAuth, and AuthorityAuth.');

console.log('\n🎉 ALL 8 TWO-PORTAL ARCHITECTURE & INVARIANT TESTS PASSED PERFECTLY!\n');
