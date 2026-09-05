import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  Calendar,
  Layers,
  Sliders,
  Bell,
  Radio,
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const [time, setTime] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Activity },
    { to: '/personal-risk', label: 'Personal Risk', icon: HeartPulse, isPersonal: true },
    { to: '/forecast', label: 'Forecast', icon: Calendar },
    { to: '/risk-details', label: 'Risk Analysis', icon: Layers },
    { to: '/alerts', label: 'Alerts & Guidance', icon: Bell },
    { to: '/interventions', label: 'Interventions', icon: Sliders },
  ];

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

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <NavLink to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-white font-sans">
                  Thermo<span className="text-orange-400">Shield</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded">
                  SIH26083
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Extreme Heat Early Warning System</p>
            </div>
          </NavLink>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                        : item.isPersonal && isAuthenticated
                        ? 'text-orange-300 hover:text-white hover:bg-orange-500/10'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className={`w-4 h-4 ${item.isPersonal ? (isAuthenticated ? 'text-orange-400' : 'text-slate-400') : ''}`} />
                  <span>{item.label}</span>
                  {item.isPersonal && isAuthenticated && (
                    <span className="ml-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      My Risk
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Section: Status & User Auth */}
          <div className="flex items-center space-x-3">
            {/* Live Clock */}
            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-mono">{time || 'Live'}</span>
            </div>

            {/* Auth Buttons or User Profile Dropdown */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 pl-2.5 pr-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  {/* User Initial Avatar */}
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold leading-tight max-w-[120px] truncate text-slate-100">
                      {user.name}
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={`text-[10px] px-1 py-0.2 rounded border font-medium ${roleInfo.classes}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-slate-800">
                      <div className="text-sm font-bold text-white">{user.name}</div>
                      <div className="text-xs text-slate-400 truncate">{user.email}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{user.phone_number}</div>
                      <div className="mt-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] border font-semibold bg-slate-950/80 text-slate-300 border-slate-700">
                        <RoleIcon className="w-3 h-3 text-orange-400" />
                        <span>Role: {roleInfo.label}</span>
                      </div>
                    </div>

                    <div className="p-1">
                      <NavLink
                        to="/personal-risk"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3 py-2 text-xs text-orange-300 hover:text-white hover:bg-orange-500/10 rounded-xl transition-colors font-semibold"
                      >
                        <HeartPulse className="w-4 h-4 text-orange-400" />
                        <span>My Personal Risk Calculator</span>
                      </NavLink>
                      <NavLink
                        to="/alerts"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
                      >
                        <Bell className="w-4 h-4 text-cyan-400" />
                        <span>My Alert Notifications</span>
                      </NavLink>
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                          navigate('/login');
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md shadow-orange-500/20 transition-all hover:scale-105"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex items-center justify-around py-2 px-2 border-t border-slate-800/80 bg-slate-900/95 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center px-2 py-1 text-xs font-medium ${
                  isActive ? 'text-cyan-400' : 'text-slate-400'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}
        {/* Mobile Auth Button */}
        <NavLink
          to={isAuthenticated ? '/alerts' : '/login'}
          className={({ isActive }) =>
            `flex flex-col items-center px-2 py-1 text-xs font-medium ${
              isActive ? 'text-orange-400' : 'text-slate-400'
            }`
          }
        >
          {isAuthenticated ? <UserIcon className="w-4 h-4 text-orange-400" /> : <LogIn className="w-4 h-4" />}
          <span className="text-[10px] mt-0.5">{isAuthenticated ? 'Account' : 'Login'}</span>
        </NavLink>
      </div>
    </header>
  );
};
