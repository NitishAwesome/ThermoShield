import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  LogIn,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';

const AUTHORIZED_GOV_ROLES = ['official', 'responder', 'analyst', 'admin'];

/**
 * GovernmentLayout
 * Role-protected layout for municipal corporations, disaster management authorities,
 * health officials, emergency responders, and climate/data analysts.
 */
export const GovernmentLayout: React.FC = () => {
  const { user, isAuthenticated, switchRole } = useAuth();
  const navigate = useNavigate();

  const userRole = (user?.role || '').toLowerCase();
  const isAuthorized = isAuthenticated && AUTHORIZED_GOV_ROLES.includes(userRole);

  // If unauthorized (ordinary citizen or unauthenticated), show clear role guidance
  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-fadeIn">
        <Card variant="elevated" className="p-6 sm:p-8 border border-orange-500/30 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/10">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30">
                Authorized Access Area
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black ts-text-primary font-sans">
              Government & Authority Command Portal
            </h2>
            <p className="text-xs sm:text-sm ts-text-muted max-w-lg mx-auto leading-relaxed">
              This portal is designated for Municipal Corporations, Disaster Management Authorities (NDRF/SDMA), and Public Health Officials to coordinate heat action plans and monitor regional risk.
            </p>
          </div>

          <div className="p-4 rounded-xl ts-card-subtle border ts-border text-left text-xs space-y-2.5">
            <div className="font-bold ts-text-primary flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Current Session: {isAuthenticated ? `Signed in as Citizen (${user?.name || user?.email})` : 'Public Visitor (Guest)'}</span>
            </div>
            <p className="ts-text-muted leading-relaxed">
              To inspect authority tools (Municipal Matrix, Regional Risk Map, Dispatch Daemon, and Policy Simulator), please sign in with an authority account or use 1-click demo access below.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border ts-border ts-card-subtle hover:bg-slate-500/10 text-xs font-bold ts-text-primary transition-all flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Citizen Safety View</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                switchRole('official');
                navigate('/gov/dashboard');
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>1-Click Switch to Official (Dr. Aarav Sharma)</span>
            </button>
          </div>

          <div className="pt-4 border-t ts-border text-xs ts-text-muted flex items-center justify-center gap-2">
            <span>Have registered credentials?</span>
            <Link to="/login" state={{ from: '/gov/dashboard' }} className="text-orange-500 hover:underline font-bold">
              Sign In Here
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="government-portal-viewport w-full max-w-7xl mx-auto animate-fadeIn">
      {/* Authority Portal Subheader Badge */}
      <div className="mb-5 px-3.5 py-2 rounded-xl bg-orange-500/10 border border-orange-500/25 flex flex-wrap items-center justify-between gap-2 text-xs shadow-sm">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span className="font-bold ts-text-primary">
            Authority Command Portal: <span className="text-orange-600 dark:text-orange-400 uppercase tracking-wide">{userRole}</span>
          </span>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="ts-text-muted hidden sm:inline">City Administration & Disaster Management (SIH26083)</span>
        </div>

        <Link
          to="/"
          className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
        >
          <span>Switch to Citizen Safety Portal</span>
          <ArrowLeft className="w-3 h-3 rotate-180" />
        </Link>
      </div>

      <Outlet />
    </div>
  );
};

export default GovernmentLayout;
