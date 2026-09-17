import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Home,
  HeartPulse,
  Bell,
  Calendar,
  Building2,
  Map,
  Activity,
  Send,
  Sliders,
  FileText,
  Layers,
  ChevronDown,
  ShieldCheck,
  Flame,
  ActivitySquare,
  Sun,
  Moon,
  MapPin,
  MoreHorizontal,
  X,
  Lock,
  LogOut,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import { useTranslation } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { useNotificationDecision } from '../context/NotificationDecisionContext';
import { MethodologyDisclosureModal } from './provenance';
import { getEffectiveIdentity } from '../utils/identity';
import { useResponsiveTier } from '../hooks/useResponsiveTier';
import {
  getCitizenNavConfig,
  getAuthorityNavConfig,
  partitionNavItems,
  getNavLabel,
  NavItemConfig,
} from '../utils/navigationConfig';

const AUTHORIZED_GOV_ROLES = ['official', 'responder', 'analyst', 'admin'];

export const Navbar: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState<boolean>(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [methodologyOpen, setMethodologyOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, logout } = useAuth();
  const { profile } = useProfile();
  const effectiveIdentity = getEffectiveIdentity(profile, user);
  const { theme, setTheme } = useTheme();
  const { locationName } = useLocation();
  const { t } = useTranslation();
  const { eligibleEvents } = useNotificationDecision();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
  }, [routerLocation.pathname]);

  const userRole = (user?.role || effectiveIdentity.role || '').toLowerCase();
  const isGovRole =
    isAuthenticated &&
    (user?.portal_type === 'AUTHORITY' ||
      AUTHORIZED_GOV_ROLES.includes(userRole) ||
      Boolean(user?.organization || user?.jurisdiction_id));
  const isGovPortal = routerLocation.pathname.startsWith('/gov');

  const getRoleBadge = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'state_coordinator':
        return {
          label: 'State Coordinator',
          icon: Building2,
          classes: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        };
      case 'municipal_hap_officer':
        return {
          label: 'Municipal HAP Officer',
          icon: Building2,
          classes: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
        };
      case 'district_authority':
        return {
          label: 'District Magistrate',
          icon: ShieldAlert,
          classes: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        };
      case 'ward_officer':
        return {
          label: 'Ward Officer',
          icon: Building2,
          classes: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
        };
      case 'national_analyst':
        return {
          label: 'National Analyst',
          icon: ActivitySquare,
          classes: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
        };
      case 'system_admin':
      case 'admin':
        return {
          label: 'System Administrator',
          icon: ShieldCheck,
          classes: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
        };
      case 'official':
        return {
          label: t('role.healthOfficial', 'Health Official'),
          icon: Building2,
          classes: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
        };
      case 'responder':
        return {
          label: t('role.responder', 'NDRF Responder'),
          icon: Flame,
          classes: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
        };
      case 'analyst':
        return {
          label: t('role.analyst', 'IMD Analyst'),
          icon: ActivitySquare,
          classes: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
        };
      default:
        return {
          label: t('role.citizen', 'Citizen'),
          icon: ShieldCheck,
          classes: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        };
    }
  };

  const tier = useResponsiveTier();

  const canonicalNavItems = isGovPortal
    ? getAuthorityNavConfig()
    : getCitizenNavConfig(t);

  const { directItems, moreItems } = partitionNavItems(canonicalNavItems, tier, isGovPortal);
  const moreLabel = t('nav.more', 'More');
  const isMoreActive = moreItems.some(
    (item) => item.to === routerLocation.pathname || (item.to !== '/' && routerLocation.pathname.startsWith(item.to))
  );

  const roleInfo = getRoleBadge(effectiveIdentity.role);
  const RoleIcon = roleInfo.icon;

  const renderThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-4 text-amber-500" />;
    return <Moon className="w-4 h-4 text-slate-300" />;
  };

  return (
    <header className="sticky top-0 z-50 ts-card-elevated border-b ts-border backdrop-blur-md">
      <div className="w-full max-w-7xl 2xl:max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3 min-w-0">

          {/* Brand Logo & Current Portal Indicator */}
          <NavLink
            to={isGovPortal ? '/gov/dashboard' : '/'}
            className="flex items-center space-x-2 sm:space-x-2.5 group flex-shrink-0"
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform flex-shrink-0 ${
                isGovPortal
                  ? 'bg-gradient-to-tr from-amber-600 to-orange-600 shadow-orange-500/20'
                  : 'bg-gradient-to-tr from-orange-500 to-amber-600 shadow-orange-500/20'
              }`}
            >
              {isGovPortal ? (
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              ) : (
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-base sm:text-lg font-bold tracking-tight ts-text-primary font-sans">
                  Thermo<span className="text-orange-500">Shield</span>
                </span>
                {isGovPortal ? (
                  <span
                    className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-300 rounded font-mono"
                    title="Authority Command Portal"
                  >
                    AUTHORITY
                  </span>
                ) : (
                  <span className="px-1 py-0.2 text-[9px] font-bold bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded hidden min-[360px]:inline-block font-mono">
                    SIH26083
                  </span>
                )}
              </div>
              <p className="text-[10.5px] ts-text-muted font-medium hidden lg:block leading-none mt-0.5">
                {isGovPortal ? 'Authority Command Portal' : 'Citizen Heat Safety & Early Warning'}
              </p>
            </div>
          </NavLink>

          {/* Desktop Nav Links - Responsive Single-Source Partition */}
          <nav className="hidden md:flex items-center space-x-1 flex-1 min-w-0 justify-start pl-1 sm:pl-2">
            {directItems.map((item) => {
              const Icon = item.icon;
              const displayLabel = getNavLabel(item, tier);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.isIndex || item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? isGovPortal
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/35 font-bold shadow-sm'
                          : 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-bold'
                        : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/30'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{displayLabel}</span>
                  {item.to === '/alerts' && eligibleEvents.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                      {eligibleEvents.length}
                    </span>
                  )}
                  {item.to === '/personal-risk' && !isAuthenticated && (
                    <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400 ml-0.5 opacity-80" />
                  )}
                </NavLink>
              );
            })}

            {/* "More" Secondary Navigation Dropdown: Only renders when moreItems has entries */}
            {moreItems.length > 0 && (
              <div className="relative flex-shrink-0" ref={moreDropdownRef}>
                <button
                  type="button"
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                    isMoreActive
                      ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30'
                      : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/30'
                  }`}
                >
                  <span>{moreLabel}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {moreDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-64 ts-card-elevated border ts-border rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold ts-text-subtle tracking-wider border-b ts-border mb-1">
                      {isGovPortal ? 'Authority Utilities & Tools' : 'Additional Tools & Settings'}
                    </div>
                    {moreItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMoreDropdownOpen(false)}
                          className={({ isActive }) =>
                            `flex items-start space-x-2.5 px-3 py-2 text-xs transition-colors ${
                              isActive
                                ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 font-bold'
                                : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/40'
                            }`
                          }
                        >
                          <Icon className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-semibold text-xs flex items-center gap-1">
                              <span>{item.label}</span>
                              {item.to === '/alerts' && eligibleEvents.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white animate-pulse">
                                  {eligibleEvents.length}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <div className="text-[10.5px] ts-text-subtle leading-tight">{item.description}</div>
                            )}
                          </div>
                        </NavLink>
                      );
                    })}
                    <div className="pt-1 border-t ts-border mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMoreDropdownOpen(false);
                          setMethodologyOpen(true);
                        }}
                        className="w-full flex items-start space-x-2.5 px-3 py-2 text-xs transition-colors ts-text-muted hover:ts-text-primary hover:bg-slate-800/40 text-left cursor-pointer"
                      >
                        <Info className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-xs ts-text-primary">How Calculations Work</div>
                          <div className="text-[10.5px] ts-text-subtle leading-tight">WBGT, Heat Index, data sources & standards</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Right Section: Portal Switcher (For Authorized Roles) + Utilities */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">
            {/* PORTAL SWITCHER: Clean, professional toggle for authorized roles */}
            {isGovRole && (
              <div className="hidden sm:flex items-center mr-0.5">
                {isGovPortal ? (
                  <Link
                    to="/"
                    className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 border ts-border text-xs font-semibold ts-text-primary transition-all flex-shrink-0"
                    title="Switch to Citizen Safety Portal"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="hidden xl:inline text-[11px] whitespace-nowrap">Citizen View</span>
                  </Link>
                ) : (
                  <Link
                    to="/gov/dashboard"
                    className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/35 text-xs font-bold text-orange-600 dark:text-orange-400 shadow-sm transition-all flex-shrink-0"
                    title="Switch to Authority Command Portal"
                  >
                    <Building2 className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                    <span className="hidden xl:inline text-[11px] whitespace-nowrap">Authority View</span>
                  </Link>
                )}
              </div>
            )}

            {/* Location / Jurisdiction Indicator (Item 9 & 22) */}
            {isGovPortal ? (
              <div
                className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border ts-border text-xs ts-text-muted flex-shrink-0"
                title={`Operational Scope: ${(user as any)?.jurisdiction_id === 'IN-MH-MCGM' ? 'Greater Mumbai' : (user as any)?.jurisdiction_name || (user as any)?.jurisdiction_id || 'Greater Mumbai'}`}
              >
                <Building2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span className="text-[11px] font-bold text-orange-400 whitespace-nowrap">
                  Operational Scope: {(user as any)?.jurisdiction_id === 'IN-MH-MCGM' ? 'Greater Mumbai' : (user as any)?.jurisdiction_name || (user as any)?.jurisdiction_id || 'Greater Mumbai'}
                </span>
              </div>
            ) : locationName ? (
              <div
                className="hidden 2xl:flex items-center space-x-1 px-2 py-1 rounded-lg ts-card-subtle border ts-border text-xs ts-text-muted max-w-[110px] truncate flex-shrink-0"
                title={`${t('nav.activeZone', 'Active Zone')}: ${locationName}`}
              >
                <MapPin className="w-3 h-3 text-orange-400 flex-shrink-0" />
                <span className="truncate text-[11px] font-medium">{locationName.split(',')[0]}</span>
              </div>
            ) : null}

            {/* Language Selector Dropdown */}
            <LanguageSelector variant="navbar" />

            {/* Theme Switcher */}
            <div className="relative flex-shrink-0" ref={themeDropdownRef}>
              <button
                type="button"
                aria-label={t('theme.displayTheme', 'Display Theme')}
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-lg ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary transition-all focus:outline-none flex-shrink-0 cursor-pointer"
                title={`${t('theme.displayTheme', 'Display Theme')}: ${theme.toUpperCase()}`}
              >
                {renderThemeIcon()}
              </button>

              {themeDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 ts-card-elevated border ts-border rounded-xl shadow-2xl py-1.5 z-50">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold ts-text-subtle tracking-wider border-b ts-border mb-1">
                    {t('theme.displayTheme', 'Display Theme')}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('dark');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-orange-500/15 text-orange-400 font-bold'
                        : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/40'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>{t('theme.darkMode', 'Dark')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('light');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                      theme === 'light'
                        ? 'bg-orange-500/15 text-orange-400 font-bold'
                        : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/40'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{t('theme.lightMode', 'Light')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Auth Profile Button */}
            {isAuthenticated && (user || profile) ? (
              <div className="relative flex-shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-1.5 p-1.5 pl-2 pr-2 rounded-xl ts-card-subtle hover:bg-slate-800/60 border ts-border ts-text-primary transition-all flex-shrink-0 cursor-pointer max-w-[170px]"
                  title={`${effectiveIdentity.displayName} (${roleInfo.label})`}
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0 tracking-tight">
                    {effectiveIdentity.initials}
                  </div>
                  <div className="text-left hidden lg:block min-w-0 flex-1">
                    <div className="text-xs font-bold leading-tight max-w-[75px] xl:max-w-[105px] truncate whitespace-nowrap ts-text-primary">
                      {effectiveIdentity.displayName}
                    </div>
                    <div className="text-[10px] text-orange-700 dark:text-orange-300 font-medium leading-none mt-0.5 truncate whitespace-nowrap max-w-[75px] xl:max-w-[105px]">
                      {roleInfo.label}
                    </div>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
                </button>

                {/* User Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-68 max-w-[calc(100vw-2rem)] ts-card-elevated border ts-border rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {isGovRole ? (
                      /* ======================================================== */
                      /* AUTHORITY PROFILE DROPDOWN (Item 10)                     */
                      /* ======================================================== */
                      <div>
                        <div className="px-4 py-3 border-b ts-border space-y-2">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                              {effectiveIdentity.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-black ts-text-primary truncate" title={effectiveIdentity.displayName}>
                                {effectiveIdentity.displayName}
                              </div>
                              <div className="text-[11px] text-orange-500 dark:text-orange-400 font-bold truncate">
                                Authority Account
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <div className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] border font-semibold ${roleInfo.classes}`}>
                              <RoleIcon className="w-3 h-3" />
                              <span>{roleInfo.label}</span>
                            </div>
                            {user?.organization && (
                              <div className="text-[11px] ts-text-muted truncate font-medium" title={user.organization}>
                                {user.organization}
                              </div>
                            )}
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold truncate flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate">
                                Operational Scope: {user?.jurisdiction_name || user?.jurisdiction_id || 'Operational Jurisdiction'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-1 space-y-0.5">
                          <NavLink
                            to="/gov/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center space-x-2.5 px-3 py-2 text-xs text-orange-700 dark:text-orange-300 hover:bg-orange-500/10 rounded-xl transition-colors font-semibold"
                          >
                            <LayoutDashboard className="w-4 h-4 text-orange-500" />
                            <span>My Authority Profile</span>
                          </NavLink>

                          <NavLink
                            to="/gov/map"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center space-x-2.5 px-3 py-2 text-xs ts-text-muted hover:ts-text-primary hover:bg-slate-800/60 rounded-xl transition-colors font-medium"
                          >
                            <Map className="w-4 h-4 text-amber-400" />
                            <span>Operational Jurisdictions</span>
                          </NavLink>

                          <div className="p-1.5 rounded-xl bg-slate-800/40 border ts-border my-1">
                            <Link
                              to="/"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white"
                            >
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Open Citizen Portal</span>
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            </Link>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setDropdownOpen(false);
                              logout();
                              navigate('/auth/authority/login');
                            }}
                            className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left font-semibold cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>{t('auth.signOut', 'Sign Out')}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ======================================================== */
                      /* CITIZEN PROFILE DROPDOWN (Item 11)                       */
                      /* ======================================================== */
                      <div>
                        <div className="px-4 py-3 border-b ts-border">
                          <div className="flex items-center space-x-2.5 mb-1.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                              {effectiveIdentity.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold ts-text-primary truncate" title={effectiveIdentity.displayName}>
                                {effectiveIdentity.displayName}
                              </div>
                              <div className="text-xs ts-text-muted truncate" title={effectiveIdentity.email}>
                                {effectiveIdentity.email}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1 mt-2">
                            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] border font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Citizen</span>
                            </div>
                            {(effectiveIdentity.homeLocation || locationName) && (
                              <div className="text-[10.5px] ts-text-subtle truncate max-w-[110px] flex items-center gap-0.5" title={`Location: ${effectiveIdentity.homeLocation || locationName}`}>
                                <MapPin className="w-2.5 h-2.5 text-orange-400 shrink-0" />
                                <span className="truncate">{(effectiveIdentity.homeLocation || locationName)?.split(',')[0]}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-1 space-y-0.5">
                          <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-1">
                            <Link
                              to="/auth/authority/login"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                            >
                              <span className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                                <span>Authority Portal Sign In</span>
                              </span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>

                          <NavLink
                            to="/profile"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center space-x-2.5 px-3 py-2 text-xs text-orange-700 dark:text-orange-300 hover:bg-orange-500/10 rounded-xl transition-colors font-semibold"
                          >
                            <UserIcon className="w-4 h-4" />
                            <span>{t('nav.myProfile', 'My Profile')}</span>
                          </NavLink>

                          <NavLink
                            to="/personal-risk"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center space-x-2.5 px-3 py-2 text-xs ts-text-muted hover:ts-text-primary hover:bg-slate-800/60 rounded-xl transition-colors font-medium"
                          >
                            <HeartPulse className="w-4 h-4 text-rose-400" />
                            <span>{t('nav.myHeatRisk', 'My Heat Risk')}</span>
                          </NavLink>

                          <NavLink
                            to="/notification-settings"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center space-x-2.5 px-3 py-2 text-xs ts-text-muted hover:ts-text-primary hover:bg-slate-800/60 rounded-xl transition-colors font-medium"
                          >
                            <Sliders className="w-4 h-4 text-amber-500" />
                            <span>{t('notif.title', 'Notification & Safety Preferences')}</span>
                          </NavLink>

                          <button
                            type="button"
                            onClick={() => {
                              setDropdownOpen(false);
                              logout();
                              navigate('/login');
                            }}
                            className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left font-semibold cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>{t('auth.signOut', 'Sign Out')}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">
                <Link
                  to="/login"
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold ts-text-muted hover:ts-text-primary hover:bg-slate-800/60 transition-colors border border-transparent whitespace-nowrap"
                >
                  <span>{t('auth.signIn', 'Sign In')}</span>
                </Link>
                <Link
                  to="/register"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-sm transition-all whitespace-nowrap"
                >
                  <span className="hidden min-[360px]:inline">{t('auth.register', 'Register')}</span>
                  <span className="min-[360px]:hidden">{t('auth.join', 'Join')}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar: portal aware, no horizontal overflow */}
      <div className="md:hidden border-t ts-border ts-card-elevated px-1.5 py-1.5 flex items-center justify-around">
        {canonicalNavItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const displayLabel = item.compactLabel || item.label;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.isIndex || item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center p-1 rounded-lg text-xs transition-colors min-w-[48px] max-w-[64px] ${
                  isActive ? 'text-orange-600 dark:text-orange-400 font-bold' : 'ts-text-muted hover:ts-text-primary'
                }`
              }
            >
              <div className="relative">
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.to === '/alerts' && eligibleEvents.length > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] mt-0.5 truncate text-center w-full flex items-center justify-center gap-0.5">
                <span>{displayLabel}</span>
                {item.to === '/personal-risk' && !isAuthenticated && (
                  <Lock className="w-2.5 h-2.5 text-amber-500 opacity-80" />
                )}
              </span>
            </NavLink>
          );
        })}

        {/* Mobile "More" Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center justify-center p-1 rounded-lg text-xs transition-colors min-w-[48px] max-w-[64px] ${
            isMoreActive || mobileMenuOpen ? 'text-orange-600 dark:text-orange-400 font-bold' : 'ts-text-muted hover:ts-text-primary'
          }`}
        >
          <MoreHorizontal className="w-4 h-4 flex-shrink-0" />
          <span className="text-[10px] mt-0.5 truncate text-center w-full">{moreLabel}</span>
        </button>
      </div>

      {/* Mobile Modal Drawer for Secondary Links */}
      {mobileMenuOpen && (
        <div className="md:hidden ts-card-elevated border-t ts-border p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-150 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between text-xs font-bold ts-text-subtle uppercase pb-2 border-b ts-border">
            <span>{isGovPortal ? 'Authority Menu & Tools' : t('nav.additionalFeatures', 'Additional Features')}</span>
            <button type="button" onClick={() => setMobileMenuOpen(false)} className="ts-text-muted" aria-label={t('common.close', 'Close')}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Portal Switcher Button */}
          {isGovRole && (
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold ts-text-primary block">
                  {isGovPortal ? 'Authority Command Portal' : 'Citizen Safety View'}
                </span>
                <span className="text-[10px] ts-text-muted">
                  {isGovPortal ? 'Switch back to citizen protection view' : 'Authorized access for municipal officials'}
                </span>
              </div>
              <Link
                to={isGovPortal ? '/' : '/gov/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition-all"
              >
                {isGovPortal ? 'Citizen View' : 'Gov Portal'}
              </Link>
            </div>
          )}

          {/* Secondary links list */}
          <div className="space-y-1.5">
            {canonicalNavItems.slice(4).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 p-2.5 rounded-xl text-xs transition-colors ${
                      isActive
                        ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 font-bold border border-orange-500/30'
                        : 'ts-card-subtle border ts-border ts-text-primary'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-xs flex items-center gap-1">
                      <span>{item.label}</span>
                    </div>
                    <div className="text-[10px] ts-text-subtle">{item.description}</div>
                  </div>
                </NavLink>
              );
            })}

            {/* Mobile Data Reality & Methodology Button */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setMethodologyOpen(true);
              }}
              className="w-full flex items-center space-x-3 p-2.5 rounded-xl text-xs transition-colors ts-card-subtle border ts-border ts-text-primary text-left cursor-pointer"
            >
              <Info className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <div>
                <div className="font-semibold text-xs flex items-center gap-1">
                  <span>How This Works & Data Reality</span>
                </div>
                <div className="text-[10px] ts-text-subtle">
                  Inspect calculations, data sources & fallback tiers
                </div>
              </div>
            </button>
          </div>

          {/* Mobile Drawer Language Selector */}
          <LanguageSelector variant="drawer" className="pt-2 border-t ts-border" />

          {/* Mobile Drawer Theme Selector */}
          <div className="pt-3 mt-2 border-t ts-border flex items-center justify-between px-1">
            <span className="text-xs font-semibold ts-text-muted">{t('theme.displayTheme', 'Display Theme')}:</span>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  theme === 'dark'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'ts-card-subtle border ts-border ts-text-muted'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{t('theme.dark', 'Dark')}</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  theme === 'light'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'ts-card-subtle border ts-border ts-text-muted'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{t('theme.light', 'Light')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Data Reality & Methodology Modal */}
      <MethodologyDisclosureModal
        isOpen={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
      />
    </header>
  );
};

export default Navbar;
