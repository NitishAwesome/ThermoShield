import React, { useState, useEffect } from 'react';
import { Outlet, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { isGovUser } from '../utils/authRoles';
import { AuthorityProvider, useAuthority } from '../context/AuthorityContext';
import {
  Building2,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Lock,
  Eye,
  Clock,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { api } from '../services/api';

/**
 * GovernmentLayoutInner
 * Consumes persistent AuthorityContext to render simplified header,
 * accessible read-only inspection banner, and pending status card.
 */
const GovernmentLayoutInner: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const {
    authority,
    isLoading,
    operationalScope,
    viewingScope,
    isReadOnly,
    resetToOperationalScope,
    refreshAuthority,
  } = useAuthority();

  const [isVerifyingAutoApprove, setIsVerifyingAutoApprove] = useState(false);
  const [isReadyTransition, setIsReadyTransition] = useState(false);
  const [autoApproveChecked, setAutoApproveChecked] = useState(false);

  // Auto-approve check in development/demo mode if user lands on /gov with PENDING_VERIFICATION (Section 5 & 6)
  useEffect(() => {
    if (authority?.accountStatus === 'PENDING_VERIFICATION' && !autoApproveChecked) {
      setIsVerifyingAutoApprove(true);
      const timer = setTimeout(async () => {
        try {
          await api.autoApproveAuthority();
          setIsReadyTransition(true);
          await refreshUser();
          await refreshAuthority();
        } catch {
          setAutoApproveChecked(true);
        } finally {
          setIsVerifyingAutoApprove(false);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [authority?.accountStatus, autoApproveChecked, refreshUser, refreshAuthority]);

  // If authority context is loading, show concise spinner
  if (isLoading && !authority) {
    return (
      <div className="py-24 text-center space-y-3 animate-fadeIn">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider ts-text-muted">
          Loading Authority Command Context...
        </p>
      </div>
    );
  }

  // Active Auto-Approval Transition Screen (Section 5 & 6)
  if (isVerifyingAutoApprove || isReadyTransition) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 animate-fadeIn">
        <Card variant="elevated" className="max-w-md w-full p-8 border border-amber-500/40 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10 transition-all duration-300">
            {isReadyTransition ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-scaleIn" />
            ) : (
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black ts-text-primary">
              {isReadyTransition ? '✓ Authority Access Ready' : 'Verifying Authority Access...'}
            </h2>
            <p className="text-xs sm:text-sm ts-text-muted max-w-sm mx-auto leading-relaxed">
              Checking your organization, role and operational jurisdiction...
            </p>
          </div>

          <div className="p-4 rounded-xl ts-card-subtle border ts-border text-left text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="ts-text-subtle">Organization:</span>
              <span className="font-bold ts-text-primary truncate max-w-[200px]">
                {authority?.organization || 'Government Authority'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="ts-text-subtle">Operational Scope:</span>
              <span className="font-bold text-amber-500 dark:text-amber-400 truncate max-w-[200px]">
                {authority?.jurisdictionName || 'Operational Jurisdiction'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="ts-text-subtle">Role:</span>
              <span className="font-bold ts-text-primary">
                {authority?.role ? authority.role.replace(/_/g, ' ') : 'Official'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-amber-500/80 font-medium">
            {isReadyTransition ? 'Entering Authority Command Portal...' : 'This normally takes only a moment.'}
          </p>
        </Card>
      </div>
    );
  }

  // If authority account is PENDING_VERIFICATION (in production mode where auto-approval is disabled)
  if (authority?.accountStatus === 'PENDING_VERIFICATION') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-fadeIn">
        <Card variant="elevated" className="p-6 sm:p-8 border border-amber-500/40 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
              Authorization Pending
            </span>
            <h2 className="text-xl sm:text-2xl font-black ts-text-primary font-sans">
              Authority Access Pending Verification
            </h2>
            <p className="text-xs sm:text-sm ts-text-muted max-w-lg mx-auto leading-relaxed">
              Your official credentials for <strong className="ts-text-primary">{authority.designation || 'Operational Official'}</strong> at <strong className="ts-text-primary">{authority.organization || 'Government Department'}</strong> have been submitted for verification.
            </p>
          </div>

          <div className="p-4 rounded-xl ts-card-subtle border ts-border text-left text-xs space-y-2">
            <div className="font-bold ts-text-primary flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Requested Operational Scope: {authority.jurisdictionName} ({authority.jurisdictionId})</span>
            </div>
            <p className="ts-text-muted leading-relaxed">
              In accordance with national thermal governance protocols, Heat Action Plan operational controls, responder dispatches, and public advisories remain restricted until your official jurisdiction assignment is authorized.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border ts-border ts-card-subtle hover:bg-slate-500/10 text-xs font-bold ts-text-primary transition-all flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Open Citizen Safety View</span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-400 font-bold text-xs border border-red-500/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="government-portal-viewport w-full max-w-7xl 2xl:max-w-screen-2xl mx-auto animate-fadeIn">
      {/* High-Contrast Accessible Read-Only Banner (Item 17) */}
      {isReadOnly && (
        <div className="mb-4 p-3.5 rounded-xl bg-slate-900 border-2 border-amber-500/80 text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-xs uppercase tracking-wider text-amber-300">
                READ-ONLY CONTEXT
              </div>
              <div className="text-xs text-slate-200 mt-0.5">
                You are viewing outside your operational scope. Operational actions remain available only for <strong className="text-white">{operationalScope.name}</strong>.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={resetToOperationalScope}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap transition-all shadow-md cursor-pointer shrink-0"
          >
            Return to {operationalScope.name}
          </button>
        </div>
      )}

      {/* Simplified High-Contrast Authority Header (Item 16) */}
      <div className="mb-5 p-3.5 rounded-xl ts-card-elevated border ts-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-black ts-text-primary leading-tight">
              {authority?.name || user?.name || 'Authority Official'}
            </div>
            <div className="text-xs ts-text-muted mt-0.5">
              {authority?.designation || 'Operational Officer'} · {authority?.organization || 'Government Authority'}
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
          <div className="px-2.5 py-1 rounded-lg ts-card-subtle border ts-border flex items-center gap-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold ts-text-subtle tracking-wider">Operational Scope:</span>
            <span className="font-bold text-orange-500 dark:text-orange-400">{operationalScope.name}</span>
          </div>

          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            APPROVED AUTHORITY
          </span>

          <Link
            to="/"
            className="ml-1 px-2.5 py-1 rounded-lg ts-card-subtle hover:bg-slate-500/10 border ts-border text-[11px] font-semibold ts-text-muted hover:ts-text-primary transition-colors flex items-center gap-1 shrink-0"
            title="Open Citizen Safety Portal in read-only view"
          >
            <span>Citizen Portal</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      <Outlet />
    </div>
  );
};

/**
 * GovernmentLayout
 * Role & Status Protected Root for all /gov/* routes.
 * Redirects unauthorized visitors to Authority Login.
 */
export const GovernmentLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();

  // If still loading session from token/localStorage, display loading screen instead of premature redirect
  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-4 animate-fadeIn">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider ts-text-muted">
          Verifying Authority Authorization...
        </p>
      </div>
    );
  }

  const isAuthorized = isAuthenticated && isGovUser(user, profile);
  const targetPath = location.pathname + location.search;

  // If user is unauthenticated, redirect directly to Authority Login
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/authority/login"
        state={{
          from: targetPath,
          error: 'An approved Authority account is required to access this portal.',
        }}
        replace
      />
    );
  }

  // If authenticated as citizen without authority credentials, redirect with clear message
  if (!isAuthorized) {
    return (
      <Navigate
        to="/auth/authority/login"
        state={{
          from: targetPath,
          error: 'Citizen accounts cannot access the Authority Command Portal. Please sign in with an approved Authority account.',
        }}
        replace
      />
    );
  }

  return (
    <AuthorityProvider>
      <GovernmentLayoutInner />
    </AuthorityProvider>
  );
};

export default GovernmentLayout;
