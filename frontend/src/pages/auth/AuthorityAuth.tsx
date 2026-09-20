import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  Layers,
  ActivitySquare,
  MapPin,
  Clock,
  CheckCircle2,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { isGovUser } from '../../utils/authRoles';
import { Card, Button, SearchableCombobox, ComboboxOption } from '../../components/ui';
import indiaStatesReference from '../../data/india_states_reference.json';
import maharashtraDistrictsReference from '../../data/maharashtra_districts_reference.json';
import { MUMBAI_ADMIN_WARDS } from '../../data/mumbaiWards';
import { validateAuthorityAccessRequest } from '../../utils/authorityValidation';
import { api } from '../../services/api';
import { INDIAN_MUNICIPAL_CORPORATIONS } from '../../data/indianMunicipalCorporations';

// ============================================================================
// CONFIGURED ADMINISTRATIVE CATALOGS (Section 34 A & C)
// Configured catalog entries only — no "Other" options (Item 6, 7, 8, 9, 10)
// ============================================================================

interface GovOrgConfig {
  id: string;
  name: string;
  defaultScope: string;
  departments: string[];
}

const MUNICIPAL_GOV_ORGS: GovOrgConfig[] = INDIAN_MUNICIPAL_CORPORATIONS.map((mc) => ({
  id: mc.shortCode,
  name: mc.name,
  defaultScope: mc.id,
  departments: mc.departments,
}));

const GOV_ORGANIZATIONS: GovOrgConfig[] = [
  ...MUNICIPAL_GOV_ORGS,
  {
    id: 'MH_SDMA',
    name: 'Maharashtra State Disaster Management Authority (SDMA)',
    defaultScope: 'IN-MH',
    departments: [
      'Disaster Management Cell',
      'State Emergency Operations Centre',
      'Heat Action / Climate Cell',
      'Emergency Response',
      'Administration',
    ],
  },
  {
    id: 'MH_PHD',
    name: 'Maharashtra Public Health Department',
    defaultScope: 'IN-MH',
    departments: [
      'Public Health',
      'Urban Health',
      'Administration',
      'Emergency Response',
    ],
  },
  {
    id: 'PUNE_DDMA',
    name: 'District Disaster Management Authority — Pune',
    defaultScope: 'IN-MH-DIST-PUN',
    departments: [
      'Disaster Management Cell',
      'Emergency Response',
      'Public Health',
      'Administration',
    ],
  },
  {
    id: 'NAGPUR_DDMA',
    name: 'District Disaster Management Authority — Nagpur',
    defaultScope: 'IN-MH-DIST-NAGPUR',
    departments: [
      'Disaster Management Cell',
      'Emergency Response',
      'Public Health',
      'Administration',
    ],
  },
  {
    id: 'NDMA',
    name: 'National Disaster Management Authority (NDMA)',
    defaultScope: 'IN',
    departments: [
      'Disaster Management Cell',
      'Emergency Response',
      'Administration',
    ],
  },
  {
    id: 'IMD',
    name: 'India Meteorological Department (IMD)',
    defaultScope: 'IN',
    departments: [
      'Meteorological Analysis',
      'Heat Action / Climate Cell',
      'Administration',
    ],
  },
  {
    id: 'NCDC',
    name: 'National Centre for Disease Control (NCDC)',
    defaultScope: 'IN',
    departments: [
      'Public Health',
      'Urban Health',
      'Administration',
    ],
  },
];

// Configured Official Designations — real-world job titles (Item 9)
const OFFICIAL_DESIGNATIONS: string[] = [
  'Nodal Officer',
  'Assistant Municipal Commissioner',
  'District Collector / District Magistrate',
  'Health Officer',
  'Medical Officer',
  'Disaster Management Officer',
  'State Coordinator',
  'Analyst',
  'Field Response Officer',
];

// Configured Requested Functional Roles — desired ThermoShield responsibility (Item 10)
interface FunctionalRoleConfig {
  id: string;
  backendRole: string;
  label: string;
  secondaryLabel: string;
}

const FUNCTIONAL_ROLES: FunctionalRoleConfig[] = [
  {
    id: 'Heat Action Plan Officer',
    backendRole: 'municipal_hap_officer',
    label: 'Heat Action Plan Officer',
    secondaryLabel: 'Coordinate municipal heat advisories, cool roofs, and intervention actions',
  },
  {
    id: 'Heat-Risk Analyst',
    backendRole: 'national_analyst',
    label: 'Heat-Risk Analyst',
    secondaryLabel: 'Monitor biometeorological indices and predictive spatial trends',
  },
  {
    id: 'Public Health Monitoring',
    backendRole: 'district_authority',
    label: 'Public Health Monitoring',
    secondaryLabel: 'Surveil heat-related morbidity indicators and hospital surge readiness',
  },
  {
    id: 'Emergency / Field Response',
    backendRole: 'responder',
    label: 'Emergency / Field Response',
    secondaryLabel: 'Oversee cooling centers, drinking water distribution, and field teams',
  },
  {
    id: 'Ward Operations',
    backendRole: 'ward_officer',
    label: 'Ward Operations',
    secondaryLabel: 'Manage localized ward-level alerts and community outreach',
  },
  {
    id: 'State Coordination',
    backendRole: 'state_coordinator',
    label: 'State Coordination',
    secondaryLabel: 'Multi-district coordination and state-level resource management',
  },
  {
    id: 'National Analysis',
    backendRole: 'national_analyst',
    label: 'National Analysis',
    secondaryLabel: 'Nationwide heatwave surveillance and inter-agency coordination',
  },
];

// Administrative Levels for Operational Scope (Item 11)
const ADMIN_LEVELS: ComboboxOption[] = [
  { id: 'COUNTRY', label: 'National', secondaryLabel: 'India Nationwide Scope (36 States / UTs)' },
  { id: 'STATE_UT', label: 'State / UT', secondaryLabel: 'State Disaster Management / Public Health' },
  { id: 'DISTRICT', label: 'District', secondaryLabel: 'District Magistrate / Collectorate / DDMA' },
  { id: 'MUNICIPAL_CORPORATION', label: 'Municipal Body', secondaryLabel: 'Municipal Corporation (e.g. Greater Mumbai)' },
  { id: 'ADMINISTRATIVE_WARD', label: 'Ward', secondaryLabel: 'Administrative Ward (Subordinate Municipal Division)' },
];

// Evaluated Demo Personas (Strictly Authority accounts, Item 13)
const AUTHORITY_DEMO_ACCOUNTS = [
  {
    name: 'Dr. Aarav Sharma',
    email: 'aarav.sharma@health.gov.in',
    role: 'municipal_hap_officer',
    designation: 'Municipal HAP Nodal Officer',
    organization: 'Municipal Corporation of Greater Mumbai (MCGM)',
    jurisdiction: 'Greater Mumbai (24 Wards)',
    jurisdictionId: 'IN-MH-MCGM',
    landingRoute: '/gov/dashboard',
    badge: 'BMC Mumbai HAP Officer',
  },
  {
    name: 'Dr. Kirit Patel',
    email: 'kirit.patel@ahmedabadcity.gov.in',
    role: 'municipal_hap_officer',
    designation: 'HAP Nodal Health Officer',
    organization: 'Ahmedabad Municipal Corporation (AMC)',
    jurisdiction: 'Ahmedabad (46 Wards)',
    jurisdictionId: 'IN-GJ-AMC',
    landingRoute: '/gov/dashboard',
    badge: 'Ahmedabad AMC Officer',
  },
  {
    name: 'Anjali Deshmukh',
    email: 'climate.cell@punecorporation.org',
    role: 'municipal_hap_officer',
    designation: 'Environment & Climate Officer',
    organization: 'Pune Municipal Corporation (PMC)',
    jurisdiction: 'Pune (15 Wards)',
    jurisdictionId: 'IN-MH-PMC',
    landingRoute: '/gov/dashboard',
    badge: 'Pune PMC Officer',
  },
  {
    name: 'Vikram Malhotra',
    email: 'vikram.malhotra@mcd.gov.in',
    role: 'municipal_hap_officer',
    designation: 'Disaster Cell In-Charge',
    organization: 'Municipal Corporation of Delhi (MCD)',
    jurisdiction: 'Delhi NCR (290 Wards)',
    jurisdictionId: 'IN-DL-MCD',
    landingRoute: '/gov/dashboard',
    badge: 'Delhi MCD Officer',
  },
  {
    name: 'Sunil More',
    email: 'coordinator.mh@maharashtra.gov.in',
    role: 'state_coordinator',
    designation: 'State Disaster Management Officer',
    organization: 'Maharashtra SDMA',
    jurisdiction: 'Maharashtra (36 Districts)',
    jurisdictionId: 'IN-MH',
    landingRoute: '/gov/dashboard',
    badge: 'State Coordinator',
  },
  {
    name: 'Vipul Patil',
    email: 'collector.nagpur@maharashtra.gov.in',
    role: 'district_authority',
    designation: 'District Collector & Magistrate',
    organization: 'District Administration Nagpur',
    jurisdiction: 'Nagpur Revenue District',
    jurisdictionId: 'IN-MH-DIST-NAGPUR',
    landingRoute: '/gov/dashboard',
    badge: 'District Magistrate',
  },
  {
    name: 'Mahesh Kulkarni',
    email: 'ward.ke@mcgm.gov.in',
    role: 'ward_officer',
    designation: 'Assistant Municipal Commissioner',
    organization: 'BMC Ward K/East Office',
    jurisdiction: 'BMC Ward K/East (Andheri E)',
    jurisdictionId: 'IN-MH-MCGM-KE',
    landingRoute: '/gov/dashboard',
    badge: 'Ward Officer',
  },
  {
    name: 'Pooja Iyer',
    email: 'pooja.iyer@imd.gov.in',
    role: 'national_analyst',
    designation: 'Lead Climate Analyst',
    organization: 'India Meteorological Department (IMD)',
    jurisdiction: 'India (National Scope)',
    jurisdictionId: 'IN',
    landingRoute: '/gov/dashboard',
    badge: 'National Analyst',
  },
  {
    name: 'Rajesh Verma',
    email: 'rajesh.verma@disastermgmt.gov.in',
    role: 'responder',
    designation: 'Team Commander',
    organization: 'National Disaster Response Force (NDRF)',
    jurisdiction: 'Quick Response (Greater Mumbai)',
    jurisdictionId: 'IN-MH-MCGM',
    landingRoute: '/gov/dashboard',
    badge: 'NDRF Responder',
  },
  {
    name: 'Devendra Rao',
    email: 'admin@thermoshield.gov.in',
    role: 'system_admin',
    designation: 'Chief Systems Administrator',
    organization: 'ThermoShield GovTech Infrastructure',
    jurisdiction: 'National Infrastructure (IN)',
    jurisdictionId: 'IN',
    landingRoute: '/gov/dashboard',
    badge: 'System Admin',
  },
];

export const AuthorityAuth: React.FC<{ initialMode?: 'login' | 'register' }> = ({
  initialMode = 'login',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, refreshUser, isAuthenticated, error: authError, clearError, user, logout } = useAuth();
  const { profile } = useProfile();

  const [mode, setMode] = useState<'login' | 'register'>(() => {
    if (location.pathname.includes('register') || location.pathname.includes('signup')) {
      return 'register';
    }
    return initialMode;
  });

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration form state (Item 3)
  const [fullName, setFullName] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Official Details
  const [selectedOrgId, setSelectedOrgId] = useState('MCGM');
  const [selectedDept, setSelectedDept] = useState('Public Health');
  const [selectedDesignation, setSelectedDesignation] = useState('Nodal Officer');
  const [officialId, setOfficialId] = useState(''); // Free text, optional (Item 4)

  // Operational Scope (Item 11: No default national scope, default is unselected "")
  const [adminLevel, setAdminLevel] = useState<string>('');
  const [selectedStateId, setSelectedStateId] = useState<string>('IN-MH');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('IN-MH-DIST-MUMBAI-CITY');
  const [selectedMunicipalId, setSelectedMunicipalId] = useState<string>('IN-MH-MCGM');
  const [selectedWardId, setSelectedWardId] = useState<string>('ward_f_south');

  // Requested Access (Item 10)
  const [selectedFunctionalRole, setSelectedFunctionalRole] = useState<string>('Heat Action Plan Officer');

  // Review step & status modals (Item 14)
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isRegisteredPending, setIsRegisteredPending] = useState(false);
  const [isVerifyingTransition, setIsVerifyingTransition] = useState(false);
  const [isVerificationReady, setIsVerificationReady] = useState(false);
  const [isDemoAccordionOpen, setIsDemoAccordionOpen] = useState(false); // Collapsed by default (Item 13)

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>((location.state as any)?.error || null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state error if redirected with new authorization error
  useEffect(() => {
    if ((location.state as any)?.error) {
      setLocalError((location.state as any).error);
    }
  }, [location.state]);

  // Sync mode with URL path
  useEffect(() => {
    if (location.pathname.includes('register') || location.pathname.includes('signup')) {
      setMode('register');
    } else {
      setMode('login');
    }
    clearError();
  }, [location.pathname, clearError]);

  // Direct already-authenticated officials to dashboard
  useEffect(() => {
    // CRITICAL: NEVER auto-redirect if there is an error in location.state (prevents redirect loop)
    if ((location.state as any)?.error) {
      return;
    }

    // Only redirect if authenticated AND confirmed to be an authorized authority user
    if (isAuthenticated && isGovUser(user, profile)) {
      const stateFrom = (location.state as any)?.from;
      const dest = stateFrom && !stateFrom.startsWith('/auth') ? stateFrom : '/gov/dashboard';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, user, profile, navigate, location.state]);

  // Selected organization object
  const currentOrg = useMemo(() => {
    return GOV_ORGANIZATIONS.find((o) => o.id === selectedOrgId) || GOV_ORGANIZATIONS[0];
  }, [selectedOrgId]);

  // Options for Organization Combobox
  const orgOptions: ComboboxOption[] = useMemo(() => {
    return GOV_ORGANIZATIONS.map((org) => ({
      id: org.id,
      label: org.name,
      badge: org.id,
    }));
  }, []);

  // Department Combobox Options dependent on selected Organization (Item 8)
  const departmentOptions: ComboboxOption[] = useMemo(() => {
    return (currentOrg.departments || []).map((dept) => ({
      id: dept,
      label: dept,
    }));
  }, [currentOrg]);

  // Reset department if current selection is not compatible
  useEffect(() => {
    if (!currentOrg.departments.includes(selectedDept)) {
      setSelectedDept(currentOrg.departments[0] || 'Administration');
    }
  }, [currentOrg, selectedDept]);

  // Auto-sync administrative level and municipal jurisdiction when organization is selected
  useEffect(() => {
    const mc = INDIAN_MUNICIPAL_CORPORATIONS.find((c) => c.shortCode === selectedOrgId || c.name === currentOrg.name);
    if (mc) {
      if (!adminLevel || adminLevel === 'MUNICIPAL_CORPORATION') {
        setAdminLevel('MUNICIPAL_CORPORATION');
        setSelectedMunicipalId(mc.id);
        setSelectedStateId(`IN-${mc.stateCode}`);
      }
    }
  }, [selectedOrgId, currentOrg]);

  // Designation Combobox Options (Item 9)
  const designationOptions: ComboboxOption[] = useMemo(() => {
    return OFFICIAL_DESIGNATIONS.map((d) => ({
      id: d,
      label: d,
    }));
  }, []);

  // Functional Role Combobox Options (Item 10)
  const functionalRoleOptions: ComboboxOption[] = useMemo(() => {
    return FUNCTIONAL_ROLES.map((r) => ({
      id: r.id,
      label: r.label,
      secondaryLabel: r.secondaryLabel,
    }));
  }, []);

  // State Combobox Options from reference (36 States/UTs)
  const stateOptions: ComboboxOption[] = useMemo(() => {
    return (indiaStatesReference.features as any[]).map((f) => ({
      id: f.properties.state_id || f.id,
      label: f.properties.state_name,
      secondaryLabel: f.properties.type,
      badge: (f.properties.state_id || f.id).toUpperCase(),
    }));
  }, []);

  // District Combobox Options for Maharashtra (36 districts)
  const districtOptions: ComboboxOption[] = useMemo(() => {
    return (maharashtraDistrictsReference.features as any[]).map((f) => ({
      id: f.properties.district_id,
      label: f.properties.district_name,
      secondaryLabel: 'Maharashtra Revenue District',
      badge: f.properties.district_id.replace('IN-MH-DIST-', '').toUpperCase(),
    }));
  }, []);

  // Municipal Corporation Combobox Options (50+ Indian Municipal Corporations)
  const municipalOptions: ComboboxOption[] = useMemo(() => {
    return INDIAN_MUNICIPAL_CORPORATIONS.map((mc) => ({
      id: mc.id,
      label: mc.name,
      secondaryLabel: `${mc.wardCount} Wards • ${mc.city}, ${mc.state}`,
      badge: mc.shortCode,
    }));
  }, []);

  // Ward Combobox Options (24 BMC Wards)
  const wardOptions: ComboboxOption[] = useMemo(() => {
    return MUMBAI_ADMIN_WARDS.map((w) => ({
      id: w.id,
      label: `Ward ${w.wardCode} — ${w.name}`,
      secondaryLabel: 'BMC Administrative Ward',
      badge: `Ward ${w.wardCode}`,
    }));
  }, []);

  // Resolve Effective Jurisdiction ID based on selected cascade
  const effectiveJurisdictionId = useMemo(() => {
    switch (adminLevel) {
      case 'COUNTRY':
        return 'IN';
      case 'STATE_UT':
        return selectedStateId;
      case 'DISTRICT':
        return selectedDistrictId;
      case 'MUNICIPAL_CORPORATION':
        return selectedMunicipalId;
      case 'ADMINISTRATIVE_WARD': {
        const wardObj = MUMBAI_ADMIN_WARDS.find((w) => w.id === selectedWardId);
        return wardObj ? `IN-MH-MCGM-${wardObj.wardCode.toUpperCase()}` : selectedWardId;
      }
      default:
        return 'Not specified';
    }
  }, [adminLevel, selectedStateId, selectedDistrictId, selectedMunicipalId, selectedWardId]);

  // Resolve Human-Readable Jurisdiction Name
  const effectiveJurisdictionName = useMemo(() => {
    switch (adminLevel) {
      case 'COUNTRY':
        return 'India (National Scope)';
      case 'STATE_UT': {
        const st = stateOptions.find((s) => s.id === selectedStateId);
        return st ? st.label : 'State / UT';
      }
      case 'DISTRICT': {
        const dist = districtOptions.find((d) => d.id === selectedDistrictId);
        return dist ? `${dist.label}, Maharashtra` : 'District';
      }
      case 'MUNICIPAL_CORPORATION': {
        const mc = INDIAN_MUNICIPAL_CORPORATIONS.find((m) => m.id === selectedMunicipalId);
        return mc ? mc.name : 'Municipal Corporation';
      }
      case 'ADMINISTRATIVE_WARD': {
        const ward = wardOptions.find((w) => w.id === selectedWardId);
        return ward ? ward.label : 'Administrative Ward';
      }
      default:
        return 'Please select an administrative level';
    }
  }, [adminLevel, selectedStateId, selectedDistrictId, selectedMunicipalId, selectedWardId, stateOptions, districtOptions, wardOptions]);

  // Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter your official email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      setSuccessMsg('Authority verified! Entering Command Portal...');
      const rawDest = (location.state as any)?.from || '/gov/dashboard';
      const safeDest = rawDest && !rawDest.startsWith('/auth') ? rawDest : '/gov/dashboard';
      setTimeout(() => navigate(safeDest, { replace: true }), 400);
    } catch (err: any) {
      setLocalError(err.message || 'Invalid official credentials or suspended account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Review Dialog before registration submission (Item 14)
  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!fullName.trim()) {
      setLocalError('Full name is required.');
      return;
    }
    if (!officialEmail.trim()) {
      setLocalError('Official email address is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      setLocalError('Official phone number is required.');
      return;
    }
    if (!regPassword || regPassword.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    if (!adminLevel) {
      setLocalError('Please select an operational administrative level.');
      return;
    }

    // Mutual compatibility validation (Section 34 F & Authority Access Audit)
    const validation = validateAuthorityAccessRequest({
      organization: currentOrg.name,
      department: selectedDept,
      designation: selectedDesignation,
      requestedRole: selectedFunctionalRole,
      jurisdictionType: adminLevel,
      jurisdictionId: effectiveJurisdictionId,
    });

    if (!validation.valid) {
      setLocalError(validation.errors.join(' '));
      return;
    }

    setIsReviewOpen(true);
  };

  // Final Registration API submission from Review Dialog
  const handleFinalRegister = async () => {
    setIsSubmitting(true);
    setLocalError(null);
    clearError();

    // Verify compatibility before registration
    const validation = validateAuthorityAccessRequest({
      organization: currentOrg.name,
      department: selectedDept,
      designation: selectedDesignation,
      requestedRole: selectedFunctionalRole,
      jurisdictionType: adminLevel,
      jurisdictionId: effectiveJurisdictionId,
    });

    if (!validation.valid) {
      setLocalError(validation.errors.join(' '));
      setIsReviewOpen(false);
      setIsSubmitting(false);
      return;
    }

    try {
      await register({
        name: fullName.trim(),
        email: officialEmail.trim(),
        phone_number: phoneNumber.trim(),
        password: regPassword,
        role: validation.normalizedRole,
        organization: currentOrg.name,
        department: selectedDept,
        designation: selectedDesignation,
        official_id: officialId.trim() || undefined,
        requested_jurisdiction: validation.normalizedJurisdictionId,
      });

      setIsReviewOpen(false);
      setIsVerifyingTransition(true);

      // Lightweight ~1 second verification transition screen (Section 5 & 6)
      setTimeout(async () => {
        try {
          await api.autoApproveAuthority().catch(() => null);
        } catch {
          // Ignore if already approved
        }
        await refreshUser().catch(() => null);
        setIsVerificationReady(true);

        setTimeout(() => {
          navigate('/gov/dashboard');
        }, 500);
      }, 1000);
    } catch (err: any) {
      setLocalError(err.message || 'Registration request failed. Please verify inputs.');
      setIsReviewOpen(false);
      setIsSubmitting(false);
    }
  };

  // 1-Click Demo Persona Sign-In (Item 13)
  const handleDemoSignIn = async (acc: (typeof AUTHORITY_DEMO_ACCOUNTS)[0]) => {
    setIsSubmitting(true);
    setLocalError(null);
    clearError();
    try {
      await login({
        email: acc.email,
        password: 'demo12345',
      });
      setSuccessMsg(`Signed in as ${acc.name} (${acc.designation}). Redirecting...`);
      const rawDest = (location.state as any)?.from || acc.landingRoute;
      const safeDest = rawDest && !rawDest.startsWith('/auth') ? rawDest : acc.landingRoute;
      setTimeout(() => navigate(safeDest, { replace: true }), 400);
    } catch (err: any) {
      setLocalError(`Demo sign-in failed for ${acc.name}. Ensure backend is running.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Screen for 1-Second Auto-Approval Transition (Section 5 & 6)
  if (isVerifyingTransition) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 animate-fadeIn">
        <Card variant="elevated" className="max-w-md w-full p-8 border border-amber-500/40 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10 transition-all duration-300">
            {isVerificationReady ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-scaleIn" />
            ) : (
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black ts-text-primary">
              {isVerificationReady ? '✓ Authority Access Ready' : 'Verifying Authority Access...'}
            </h2>
            <p className="text-xs sm:text-sm ts-text-muted max-w-sm mx-auto leading-relaxed">
              Checking your organization, role and operational jurisdiction...
            </p>
          </div>

          <div className="p-4 rounded-xl ts-card-subtle border ts-border text-left text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="ts-text-subtle">Organization:</span>
              <span className="font-bold ts-text-primary truncate max-w-[200px]">{currentOrg.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="ts-text-subtle">Operational Scope:</span>
              <span className="font-bold text-amber-500 dark:text-amber-400 truncate max-w-[200px]">
                {effectiveJurisdictionName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="ts-text-subtle">Role:</span>
              <span className="font-bold ts-text-primary">{selectedFunctionalRole}</span>
            </div>
          </div>

          <p className="text-[11px] text-amber-500/80 font-medium">
            {isVerificationReady ? 'Entering Authority Command Portal...' : 'This normally takes only a moment.'}
          </p>
        </Card>
      </div>
    );
  }

  // Screen for newly registered pending accounts (fallback if auto-approval is disabled in production)
  if (isRegisteredPending) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 animate-fadeIn">
        <Card variant="elevated" className="max-w-xl w-full p-6 sm:p-8 border border-amber-500/40 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
              Status: PENDING_VERIFICATION
            </span>
            <h2 className="text-xl sm:text-2xl font-black ts-text-primary">
              Access Request Submitted
            </h2>
            <p className="text-xs sm:text-sm ts-text-muted max-w-md mx-auto leading-relaxed">
              Your official access request for <strong className="ts-text-primary">{selectedDesignation}</strong> at <strong className="ts-text-primary">{currentOrg.name}</strong> has been registered.
            </p>
          </div>

          <div className="p-4 rounded-xl ts-card-subtle border ts-border text-left text-xs space-y-2">
            <div className="font-bold ts-text-primary flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Requested Scope: {effectiveJurisdictionName}</span>
            </div>
            <p className="ts-text-muted leading-relaxed">
              Submitting an access request does not grant operational authority. Your account remains in verification until authorized for operational heat action plan deployment.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border ts-border ts-card-subtle hover:bg-slate-500/10 text-xs font-bold ts-text-primary transition-all flex items-center justify-center space-x-1.5"
            >
              <span>Citizen Safety View</span>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[88vh] flex items-center justify-center py-8 px-4 sm:px-6 pb-28 sm:pb-16 bg-slate-950/20">
      {/* Centered Cohesive Two-Column Authentication Shell (Item 1) */}
      <div className="max-w-5xl w-full rounded-3xl overflow-hidden border ts-border shadow-2xl bg-slate-950/50 backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 items-stretch animate-fadeIn">

        {/* LEFT COLUMN: Informational Panel (~41.7%, shared visual height) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-amber-700/90 via-orange-800/90 to-slate-950 text-white p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="space-y-6">
            {/* Header / Brand */}
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-amber-200">
                  Authority Command Portal
                </span>
                <h2 className="text-xl font-black leading-none text-white font-sans">
                  ThermoShield
                </h2>
              </div>
            </div>

            {/* Simplified Title & Subtitle (Item 2) */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight font-sans">
                Plan and Coordinate Heat Response
              </h1>
              <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
                Surveillance and decision-support workspace for Municipal Corporations, Disaster Management Authorities, and Public Health Officials.
              </p>
            </div>

            {/* Plain Language Value Propositions (Item 2) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5 border border-white/20">
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Monitor your jurisdiction</div>
                  <div className="text-[11px] text-amber-100/80 leading-snug">
                    Track heat conditions across your assigned area.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5 border border-white/20">
                  <ActivitySquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Identify priority areas</div>
                  <div className="text-[11px] text-amber-100/80 leading-snug">
                    Find locations requiring attention.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5 border border-white/20">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Coordinate response</div>
                  <div className="text-[11px] text-amber-100/80 leading-snug">
                    Review Heat Action Plan recommendations and operational actions.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Portal Switcher */}
          <div className="pt-6 mt-6 border-t border-white/15 text-[11px] text-amber-100/80 flex items-center justify-between">
            <span>Inter-Agency Heat Governance</span>
            <Link
              to="/auth/citizen/login"
              className="font-bold text-white underline hover:text-amber-200 flex items-center gap-1"
            >
              <span>Citizen Portal</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: Form & Registration Panel (~58.3%) */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between ts-card-elevated bg-slate-900/90">
          <div className="space-y-5">
            {/* Top Bar: Title & Mode Toggle */}
            <div className="flex items-center justify-between border-b ts-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 font-mono">
                  Authority Command Portal
                </span>
                <h2 className="text-xl sm:text-2xl font-black ts-text-primary">
                  {mode === 'login' ? 'Official Sign In' : 'Authority Access Request'}
                </h2>
              </div>

              <div className="flex items-center space-x-1 p-1 rounded-xl ts-card-subtle border ts-border text-xs">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'ts-text-muted hover:ts-text-primary'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'ts-text-muted hover:ts-text-primary'
                  }`}
                >
                  Request Access
                </button>
              </div>
            </div>

            {/* Error Message */}
            {(localError || authError) && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{localError || authError}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Currently Signed In as Citizen Notice */}
            {isAuthenticated && !isGovUser(user, profile) && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                <div className="flex items-start gap-2 text-amber-500 dark:text-amber-400 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Currently Signed In with Citizen Account</span>
                </div>
                <p className="ts-text-muted text-[11px] leading-relaxed">
                  You are signed in as <strong className="ts-text-primary">{user?.name || user?.email}</strong>. 
                  Access to the Authority Command Portal requires an official account with administrative credentials.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:text-amber-400 underline"
                  >
                    <span>Return to Citizen Portal</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setLocalError(null);
                    }}
                    className="text-[11px] font-bold text-red-400 hover:text-red-300 underline cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* MODE 1: Official Sign In */}
            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold ts-text-subtle uppercase tracking-wider mb-1">
                    Official Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. aarav.sharma@health.gov.in"
                      required
                      className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/60 border ts-border ts-text-primary focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold ts-text-subtle uppercase tracking-wider mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full text-xs font-medium pl-9 pr-10 py-2.5 rounded-xl bg-slate-900/60 border ts-border ts-text-primary focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Authority Command Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* MODE 2: Simplified Structured Authority Registration (Item 3) */
              <form onSubmit={handleOpenReview} className="space-y-4 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">

                {/* 1. OFFICIAL DETAILS SECTION */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b ts-border pb-1">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Official Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold ts-text-subtle uppercase tracking-wider mb-1">
                        Full Name <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Dr. Aarav Sharma"
                        required
                        className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-900/60 border ts-border ts-text-primary focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold ts-text-subtle uppercase tracking-wider mb-1">
                        Official Email <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={officialEmail}
                        onChange={(e) => setOfficialEmail(e.target.value)}
                        placeholder="name@gov.in"
                        required
                        className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-900/60 border ts-border ts-text-primary focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold ts-text-subtle uppercase tracking-wider mb-1">
                        Official Phone <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+91 98200 12345"
                        required
                        className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-900/60 border ts-border ts-text-primary focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold ts-text-subtle uppercase tracking-wider mb-1">
                        Password <span className="text-amber-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          required
                          minLength={8}
                          className="w-full text-xs font-medium px-3 pr-9 py-2 rounded-xl bg-slate-900/60 border ts-border ts-text-primary focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Searchable Comboboxes: Organization & Department */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SearchableCombobox
                      label="Government Organization"
                      placeholder="Select organization..."
                      searchPlaceholder="Search organization (e.g. MCGM, SDMA)..."
                      options={orgOptions}
                      value={selectedOrgId}
                      onChange={(val) => setSelectedOrgId(val)}
                      required
                      helpText="Configured administrative catalog"
                    />

                    <SearchableCombobox
                      label="Department / Operational Cell"
                      placeholder="Select department..."
                      searchPlaceholder="Search department..."
                      options={departmentOptions}
                      value={selectedDept}
                      onChange={(val) => setSelectedDept(val)}
                      required
                    />
                  </div>

                  {/* Searchable Combobox: Official Designation & Employee ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SearchableCombobox
                      label="Official Designation"
                      placeholder="Select designation..."
                      searchPlaceholder="Search designation (e.g. Nodal Officer)..."
                      options={designationOptions}
                      value={selectedDesignation}
                      onChange={(val) => setSelectedDesignation(val)}
                      required
                      helpText="Your official job title within your organization"
                    />

                    <div>
                      <label className="block text-[11px] font-bold ts-text-subtle uppercase tracking-wider mb-1">
                        Official Employee / Service ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={officialId}
                        onChange={(e) => setOfficialId(e.target.value)}
                        placeholder="e.g. MCGM-HAP-2026-01 or leave blank"
                        className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-slate-900/60 border ts-border ts-text-primary focus:outline-none focus:border-amber-500"
                      />
                      <p className="text-[10px] ts-text-subtle mt-1">Optional organizational identification reference</p>
                    </div>
                  </div>
                </div>

                {/* 2. OPERATIONAL SCOPE CASCADE (Item 3 & 11) */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between border-b ts-border pb-1">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Operational Scope</span>
                    </span>
                    {adminLevel && (
                      <span className="text-[10px] text-amber-400/90 font-mono">
                        Scope ID: {effectiveJurisdictionId}
                      </span>
                    )}
                  </div>

                  {/* Administrative Level Combobox */}
                  <SearchableCombobox
                    label="Administrative Level"
                    placeholder="Select administrative level..."
                    searchPlaceholder="Search level (National, State, District, Municipal, Ward)..."
                    options={ADMIN_LEVELS}
                    value={adminLevel}
                    onChange={(val) => setAdminLevel(val)}
                    required
                    helpText="Defines your geographic jurisdiction hierarchy"
                  />

                  {/* Dynamic Cascade: Only show relevant fields based on level (Item 3 & 11) */}
                  {!adminLevel && (
                    <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs text-center italic">
                      Please select an administrative level above to configure your operational jurisdiction.
                    </div>
                  )}

                  {adminLevel === 'COUNTRY' && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>National Jurisdiction Selected: Covers India nationwide surveillance (36 States & UTs).</span>
                    </div>
                  )}

                  {adminLevel === 'STATE_UT' && (
                    <div>
                      <SearchableCombobox
                        label="State / Union Territory"
                        placeholder="Select State / UT..."
                        searchPlaceholder="Type to search (e.g. Mah, Del, Guj)..."
                        options={stateOptions}
                        value={selectedStateId}
                        onChange={(val) => setSelectedStateId(val)}
                        required
                      />
                    </div>
                  )}

                  {adminLevel === 'DISTRICT' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SearchableCombobox
                        label="State / Union Territory"
                        placeholder="Select State / UT..."
                        searchPlaceholder="Type to search State..."
                        options={stateOptions}
                        value={selectedStateId}
                        onChange={(val) => setSelectedStateId(val)}
                        required
                      />

                      {selectedStateId === 'IN-MH' || selectedStateId === 'maharashtra' ? (
                        <SearchableCombobox
                          label="Revenue District"
                          placeholder="Select district..."
                          searchPlaceholder="Type to search (e.g. Nagpur, Pune)..."
                          options={districtOptions}
                          value={selectedDistrictId}
                          onChange={(val) => setSelectedDistrictId(val)}
                          required
                        />
                      ) : (
                        <div>
                          <label className="block text-[11px] font-bold ts-text-subtle uppercase tracking-wider mb-1">
                            Revenue District
                          </label>
                          <div className="text-xs p-2.5 rounded-xl bg-slate-900 border ts-border text-amber-400/90 leading-relaxed">
                            District geometry is currently integrated for Maharashtra (36 districts).
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {adminLevel === 'MUNICIPAL_CORPORATION' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SearchableCombobox
                        label="State / Union Territory"
                        placeholder="Filter by State / UT..."
                        searchPlaceholder="Search state..."
                        options={stateOptions}
                        value={selectedStateId}
                        onChange={(val) => {
                          setSelectedStateId(val);
                          // Auto-select first municipal corporation in this state if current is not in state
                          const stCode = val.replace('IN-', '');
                          const inState = INDIAN_MUNICIPAL_CORPORATIONS.filter((mc) => mc.stateCode === stCode);
                          if (inState.length > 0 && !inState.some((mc) => mc.id === selectedMunicipalId)) {
                            setSelectedMunicipalId(inState[0].id);
                            setSelectedOrgId(inState[0].shortCode);
                          }
                        }}
                        required
                      />

                      <SearchableCombobox
                        label="Municipal Body"
                        placeholder="Select municipal body..."
                        searchPlaceholder="Search 50+ bodies (e.g. AMC, PMC, MCD, BBMP)..."
                        options={municipalOptions}
                        value={selectedMunicipalId}
                        onChange={(val) => {
                          setSelectedMunicipalId(val);
                          const mc = INDIAN_MUNICIPAL_CORPORATIONS.find((c) => c.id === val);
                          if (mc) {
                            setSelectedStateId(`IN-${mc.stateCode}`);
                            setSelectedOrgId(mc.shortCode);
                          }
                        }}
                        required
                        helpText="Select from 50+ Indian municipal corporations"
                      />
                    </div>
                  )}

                  {adminLevel === 'ADMINISTRATIVE_WARD' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <SearchableCombobox
                          label="State / Union Territory"
                          options={stateOptions}
                          value={selectedStateId}
                          onChange={(val) => setSelectedStateId(val)}
                          required
                          disabled
                        />

                        <SearchableCombobox
                          label="Municipal Body"
                          options={municipalOptions}
                          value={selectedMunicipalId}
                          onChange={(val) => setSelectedMunicipalId(val)}
                          required
                          disabled
                        />
                      </div>

                      <SearchableCombobox
                        label="Administrative Ward (24 BMC Wards)"
                        placeholder="Select Ward..."
                        searchPlaceholder="Type to search (e.g. Ward K/East, Ward F/South)..."
                        options={wardOptions}
                        value={selectedWardId}
                        onChange={(val) => setSelectedWardId(val)}
                        required
                      />
                    </div>
                  )}
                </div>

                {/* 3. REQUESTED ACCESS SECTION (Item 10 & 12) */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b ts-border pb-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Requested Access</span>
                  </div>

                  <SearchableCombobox
                    label="Requested Functional Role"
                    placeholder="Select requested role..."
                    searchPlaceholder="Search role (e.g. Heat Action Plan Officer)..."
                    options={functionalRoleOptions}
                    value={selectedFunctionalRole}
                    onChange={(val) => setSelectedFunctionalRole(val)}
                    required
                    helpText="Desired ThermoShield responsibility. This request does not grant permissions until verified by an administrator."
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Review Authority Access Request</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Collapsible Demo Personas Accordion (Item 13: Secondary, collapsed by default) */}
          <div className="pt-4 mt-4 border-t ts-border">
            <button
              type="button"
              onClick={() => setIsDemoAccordionOpen(!isDemoAccordionOpen)}
              className="w-full py-2 px-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border ts-border text-xs font-bold ts-text-muted hover:ts-text-primary flex items-center justify-between transition-all cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo Accounts for Evaluation ({AUTHORITY_DEMO_ACCOUNTS.length} Personas)</span>
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isDemoAccordionOpen ? 'rotate-180 text-amber-400' : ''
                }`}
              />
            </button>

            {isDemoAccordionOpen && (
              <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin animate-fadeIn">
                {AUTHORITY_DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleDemoSignIn(acc)}
                    disabled={isSubmitting}
                    className="w-full text-left p-2 rounded-xl ts-card-subtle hover:bg-amber-500/10 border ts-border hover:border-amber-500/30 transition-all flex items-center justify-between text-xs cursor-pointer group"
                  >
                    <div className="truncate flex-1 pr-2">
                      <div className="font-bold ts-text-primary truncate flex items-center gap-1.5">
                        <span>{acc.name}</span>
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                          {acc.badge}
                        </span>
                      </div>
                      <div className="text-[10px] ts-text-muted truncate">
                        {acc.organization} • {acc.jurisdiction}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0">
                      Sign In →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REVIEW STEP MODAL (Item 14) */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <Card variant="elevated" className="max-w-lg w-full p-6 space-y-5 border border-amber-500/40 shadow-2xl">
            <div className="flex items-center justify-between border-b ts-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm uppercase tracking-wider ts-text-primary font-sans">
                  Authority Access Request
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                CONFIRMATION
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b ts-border">
                <span className="ts-text-subtle font-medium">Name:</span>
                <span className="font-bold ts-text-primary">{fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b ts-border">
                <span className="ts-text-subtle font-medium">Official Email:</span>
                <span className="font-bold ts-text-primary font-mono">{officialEmail}</span>
              </div>
              <div className="flex justify-between py-1 border-b ts-border">
                <span className="ts-text-subtle font-medium">Official Phone:</span>
                <span className="font-bold ts-text-primary">{phoneNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b ts-border">
                <span className="ts-text-subtle font-medium">Organization:</span>
                <span className="font-bold ts-text-primary">{currentOrg.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b ts-border">
                <span className="ts-text-subtle font-medium">Department:</span>
                <span className="font-bold ts-text-primary">{selectedDept}</span>
              </div>
              <div className="flex justify-between py-1 border-b ts-border">
                <span className="ts-text-subtle font-medium">Official Designation:</span>
                <span className="font-bold ts-text-primary">{selectedDesignation}</span>
              </div>
              <div className="flex justify-between py-1 border-b ts-border">
                <span className="ts-text-subtle font-medium">Employee / Service ID:</span>
                <span className="font-mono text-slate-300">{officialId || 'Not provided (Optional)'}</span>
              </div>
              <div className="flex justify-between py-1 border-b ts-border">
                <span className="ts-text-subtle font-medium">Requested Jurisdiction:</span>
                <span className="font-bold text-amber-400 text-right">
                  {effectiveJurisdictionName} ({effectiveJurisdictionId})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b ts-border">
                <span className="ts-text-subtle font-medium">Requested Role:</span>
                <span className="font-bold text-amber-400">{selectedFunctionalRole}</span>
              </div>
            </div>

            {/* Mandatory Governance Notice (Item 14) */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11.5px] leading-relaxed text-amber-200">
              Submitting this request does not grant operational authority. The account remains pending until approved.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border ts-border text-xs font-bold ts-text-muted hover:ts-text-primary transition-all cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleFinalRegister}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Submit Access Request</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
