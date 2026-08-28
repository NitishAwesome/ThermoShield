import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  Calendar,
  Layers,
  Sliders,
  Bell,
  Radio,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Activity },
    { to: '/forecast', label: 'Forecast', icon: Calendar },
    { to: '/risk-details', label: 'Risk Analysis', icon: Layers },
    { to: '/alerts', label: 'Alerts & Guidance', icon: Bell },
    { to: '/interventions', label: 'Interventions', icon: Sliders },
  ];

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
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Live Clock & Status */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-mono">{time || 'Live'}</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>API Online</span>
            </div>
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
      </div>
    </header>
  );
};
