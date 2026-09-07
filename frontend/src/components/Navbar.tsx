import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  Calendar,
  Layers,
  Sliders,
  Bell,
  User as UserIcon,
  LogIn,
  LogOut,
  UserPlus,
  ChevronDown,
  ShieldCheck,
  Building2,
  Flame,
  ActivitySquare,
  HeartPulse,
  Sun,
  Moon,
  Eye,
  MapPin,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';

export const Navbar: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState<boolean>(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locationName } = useLocation();
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

  // Primary navigation (always visible on desktop)
  const primaryNavItems = [
    { to: '/', label: 'Dashboard', icon: Activity },
    { to: '/risk-details', label: 'Risk Analysis', icon: Layers },
    { to: '/forecast', label: 'Forecast', icon: Calendar },
    { to: '/personal-risk', label: 'Personal Risk', icon: HeartPulse, isPersonal: true },
  ];

  // Secondary navigation (accessible via clean "More" dropdown on desktop)
  const secondaryNavItems = [
    { to: '/matrix', label: 'Municipal Matrix', icon: Building2, description: 'Surveillance of all monitored municipal zones' },
    { to: '/alerts', label: 'Alerts & Guidance', icon: Bell, description: 'Civic heatwave warnings & protection' },
    { to: '/interventions', label: 'Intervention Simulator', icon: Sliders, description: 'Simulate cooling centers & work pacing' },
  ];

  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  const isMoreActive = secondaryNavItems.some((item) => item.to === routerLocation.pathname);

  const getRoleBadge = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'official':
        return {
          label: 'Health Official',
          icon: Building2,
          classes: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        };
      case 'responder':
        return {
          label: 'Responder',
          icon: Flame,
          classes: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        };
      case 'analyst':
        return {
          label: 'Analyst',
          icon: ActivitySquare,
          classes: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        };
      default:
        return {
          label: 'Citizen',
          icon: ShieldCheck,
          classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const RoleIcon = roleInfo.icon;

  const renderThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-4 text-amber-500" />;
    return <Moon className="w-4 h-4 text-slate-300" />;
  };

  return (
    <header className="sticky top-0 z-50 ts-card-elevated border-b ts-border backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo */}
          <NavLink to="/" className="flex items-center space-x-2.5 group flex-shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-base sm:text-lg font-bold tracking-tight ts-text-primary font-sans">
                  Thermo<span className="text-orange-500">Shield</span>
                </span>
                <span className="px-1 py-0.2 text-[9px] font-bold bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded">
                  SIH26083
                </span>
              </div>
              <p className="text-[10.5px] ts-text-muted font-medium hidden sm:block leading-none mt-0.5">
                Heat & Health Decision Support
              </p>
            </div>
          </NavLink>

          {/* Desktop Nav Links (Primary + More Dropdown) */}
          <nav className="hidden md:flex items-center space-x-1 flex-shrink">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/30'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            {/* "More" Secondary Navigation Dropdown */}
            <div className="relative" ref={moreDropdownRef}>
              <button
                type="button"
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isMoreActive
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                    : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/30'
                }`}
              >
                <span>More</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreDropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 ts-card-elevated border ts-border rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold ts-text-subtle tracking-wider border-b ts-border mb-1">
                    Civic Tools & Action
                  </div>
                  {secondaryNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreDropdownOpen(false)}
                        className={({ isActive }) =>
                          `flex items-start space-x-2.5 px-3 py-2 text-xs transition-colors ${
                            isActive
                              ? 'bg-orange-500/15 text-orange-400 font-bold'
                              : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/40'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-xs">{item.label}</div>
                          <div className="text-[10.5px] ts-text-subtle leading-tight">{item.description}</div>
                        </div>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Right Section: Compact Location, Theme Selector & User Auth (Unclipped) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 flex-shrink-0">
            {/* Active Location Indicator (Only on extra wide screens to avoid crowding) */}
            {locationName && (
              <div
                className="hidden xl:flex items-center space-x-1 px-2.5 py-1 rounded-lg ts-card-subtle border ts-border text-xs ts-text-muted max-w-[150px] truncate flex-shrink-0"
                title={`Active Zone: ${locationName}`}
              >
                <MapPin className="w-3 h-3 text-orange-400 flex-shrink-0" />
                <span className="truncate text-[11px] font-medium">{locationName.split(',')[0]}</span>
              </div>
            )}

            {/* Theme Switcher Button / Dropdown */}
            <div className="relative flex-shrink-0" ref={themeDropdownRef}>
              <button
                type="button"
                aria-label="Select theme mode"
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className="flex items-center space-x-1.5 p-2 rounded-lg ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary transition-all focus:outline-none"
                title={`Theme: ${theme.toUpperCase()}`}
              >
                {renderThemeIcon()}
                <span className="text-xs font-semibold capitalize hidden lg:inline">{theme}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
              </button>

              {themeDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 ts-card-elevated border ts-border rounded-xl shadow-2xl py-1.5 z-50">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold ts-text-subtle tracking-wider border-b ts-border mb-1">
                    Display Theme
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('dark');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-left transition-colors ${
                      theme === 'dark'
                        ? 'bg-orange-500/15 text-orange-400 font-bold'
                        : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/40'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('light');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-left transition-colors ${
                      theme === 'light'
                        ? 'bg-orange-500/15 text-orange-400 font-bold'
                        : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/40'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Mode</span>
                  </button>
                </div>
              )}
            </div>

            {/* Auth Profile Button (Fully protected from clipping with flex-shrink-0) */}
            {isAuthenticated && user ? (
              <div className="relative flex-shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 pl-2 pr-2 rounded-xl ts-card-subtle hover:bg-slate-800/60 border ts-border ts-text-primary transition-all flex-shrink-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold leading-tight max-w-[85px] lg:max-w-[110px] truncate ts-text-primary">
                      {user.name}
                    </div>
                    <div className="text-[9px] ts-text-muted leading-none">
                      {roleInfo.label}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* User Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 ts-card-elevated border ts-border rounded-2xl shadow-2xl py-2 z-50">
                    <div className="px-4 py-3 border-b ts-border">
                      <div className="text-sm font-bold ts-text-primary">{user.name}</div>
                      <div className="text-xs ts-text-muted truncate">{user.email}</div>
                      <div className="mt-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] border font-semibold ts-card-subtle border-slate-700">
                        <RoleIcon className="w-3 h-3 text-orange-400" />
                        <span>{roleInfo.label}</span>
                      </div>
                    </div>

                    <div className="p-1">
                      <NavLink
                        to="/personal-risk"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3 py-2 text-xs text-orange-400 hover:bg-orange-500/10 rounded-xl transition-colors font-semibold"
                      >
                        <HeartPulse className="w-4 h-4" />
                        <span>My Personal Heat Risk</span>
                      </NavLink>
                      <NavLink
                        to="/alerts"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3 py-2 text-xs ts-text-muted hover:ts-text-primary hover:bg-slate-800/60 rounded-xl transition-colors"
                      >
                        <Bell className="w-4 h-4 text-sky-400" />
                        <span>Active Heat Alerts</span>
                      </NavLink>
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                          navigate('/login');
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                <Link
                  to="/login"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold ts-text-muted hover:ts-text-primary hover:bg-slate-800/60 transition-colors border border-transparent"
                >
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-sm transition-all"
                >
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar: No horizontal scroll, touch-friendly, complete route access */}
      <div className="md:hidden border-t ts-border ts-card-elevated px-2 py-1.5 flex items-center justify-around">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center p-1 rounded-lg text-xs transition-colors min-w-[54px] ${
                  isActive ? 'text-orange-400 font-bold' : 'ts-text-muted hover:ts-text-primary'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}

        {/* Mobile "More" Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center justify-center p-1 rounded-lg text-xs transition-colors min-w-[54px] ${
            isMoreActive || mobileMenuOpen ? 'text-orange-400 font-bold' : 'ts-text-muted hover:ts-text-primary'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </div>

      {/* Mobile Modal Drawer for Secondary Links when "More" is tapped */}
      {mobileMenuOpen && (
        <div className="md:hidden ts-card-elevated border-t ts-border p-4 space-y-2 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between text-xs font-bold ts-text-subtle uppercase pb-2 border-b ts-border">
            <span>Additional Civic Features</span>
            <button type="button" onClick={() => setMobileMenuOpen(false)} className="ts-text-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 p-2.5 rounded-xl text-xs transition-colors ${
                    isActive
                      ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30'
                      : 'ts-card-subtle border ts-border ts-text-primary'
                  }`
                }
              >
                <Icon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-xs">{item.label}</div>
                  <div className="text-[10px] ts-text-subtle">{item.description}</div>
                </div>
              </NavLink>
            );
          })}

          {/* Mobile Drawer Theme Selector */}
          <div className="pt-3 mt-2 border-t ts-border flex items-center justify-between px-1">
            <span className="text-xs font-semibold ts-text-muted">Display Theme:</span>
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
                <span>Dark</span>
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
                <span>Light</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
