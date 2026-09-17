import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Building2, ArrowRight, ShieldCheck, HeartPulse, Layers } from 'lucide-react';
import { Card } from '../../components/ui';

export const PortalLanding: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-4xl w-full space-y-8 animate-fadeIn">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-bold tracking-wider uppercase font-mono">
            <span>ThermoShield Portals</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black ts-text-primary tracking-tight font-sans">
            Select Your Destination Portal
          </h1>
          <p className="text-sm sm:text-base ts-text-muted max-w-xl mx-auto leading-relaxed">
            ThermoShield operates two dedicated, secure portals for public heat protection and administrative heat response coordination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Portal 1: Citizen Safety Portal */}
          <Link
            to="/auth/citizen/login"
            className="group block rounded-2xl ts-card-elevated hover:border-orange-500/50 border ts-border p-6 sm:p-8 transition-all hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-500 dark:text-orange-400 font-mono">
                Public & Community
              </span>
              <h2 className="text-xl sm:text-2xl font-black ts-text-primary group-hover:text-orange-500 transition-colors">
                Citizen Safety Portal
              </h2>
              <p className="text-xs sm:text-sm ts-text-muted leading-relaxed">
                For individuals, families, and outdoor workers seeking localized heat hazard warnings, personalized biometeorological guidance, and cooling center locations.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t ts-border space-y-2 text-xs ts-text-subtle">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Local Heat Stress & Wet-Bulb Monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <span>Personalized Hydration & Work-Rest Directives</span>
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-bold text-orange-500 group-hover:text-orange-400 transition-colors">
              <span>Sign In to Citizen Portal</span>
              <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Portal 2: Government & Authority Command Portal */}
          <Link
            to="/auth/authority/login"
            className="group block rounded-2xl ts-card-elevated hover:border-amber-500/60 border ts-border p-6 sm:p-8 transition-all hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6 group-hover:scale-105 transition-transform">
              <Building2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 font-mono">
                Official Administration
              </span>
              <h2 className="text-xl sm:text-2xl font-black ts-text-primary group-hover:text-amber-500 transition-colors">
                Government / Authority Portal
              </h2>
              <p className="text-xs sm:text-sm ts-text-muted leading-relaxed">
                For Municipal Corporations, District Authorities (DDMA), State Disaster Management (SDMA), and Public Health teams to coordinate Heat Action Plans.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t ts-border space-y-2 text-xs ts-text-subtle">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Jurisdiction-Scoped Thermal Surveillance</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-500" />
                <span>Heat Action Plan Decisions & Audit Trails</span>
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-bold text-amber-500 group-hover:text-amber-400 transition-colors">
              <span>Sign In to Authority Portal</span>
              <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        <div className="text-center pt-4 text-xs ts-text-subtle">
          <span>Need to create a new account? Choose </span>
          <Link to="/auth/citizen/register" className="text-orange-500 hover:underline font-semibold">
            Citizen Registration
          </Link>
          <span> or </span>
          <Link to="/auth/authority/register" className="text-amber-500 hover:underline font-semibold">
            Official Access Request
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PortalLanding;
