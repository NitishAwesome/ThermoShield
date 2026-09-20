import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ShieldAlert,
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
  Thermometer,
  HeartPulse,
  Bell,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card, Button } from '../../components/ui';

// Strictly Citizen Demo Persona (Item 5)
const CITIZEN_DEMO_ACCOUNT = {
  name: 'Siddharth Patel',
  email: 'siddharth.patel@gmail.com',
  role: 'user',
  label: 'Citizen / Heat Alert Subscriber',
  location: 'Andheri East, Mumbai',
  avatarText: 'SP',
};

export const CitizenAuth: React.FC<{ initialMode?: 'login' | 'register' }> = ({
  initialMode = 'login',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, error: authError, clearError } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(() => {
    if (location.pathname.includes('register') || location.pathname.includes('signup')) {
      return 'register';
    }
    return initialMode;
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isDemoAccordionOpen, setIsDemoAccordionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>((location.state as any)?.error || null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state error if redirected with new authorization error
  useEffect(() => {
    if ((location.state as any)?.error) {
      setLocalError((location.state as any).error);
    }
  }, [location.state]);

  // Sync mode with route
  useEffect(() => {
    if (location.pathname.includes('register') || location.pathname.includes('signup')) {
      setMode('register');
    } else {
      setMode('login');
    }
    clearError();
  }, [location.pathname, clearError]);

  // If already authenticated, redirect to citizen home
  useEffect(() => {
    // NEVER auto-redirect if there was an error in location.state
    if ((location.state as any)?.error) {
      return;
    }

    if (isAuthenticated) {
      const stateFrom = (location.state as any)?.from;
      // Citizen must never be redirected to /gov/* or /auth/*
      const dest = stateFrom && !stateFrom.startsWith('/gov') && !stateFrom.startsWith('/auth')
        ? stateFrom
        : '/';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);
    clearError();

    if (mode === 'login') {
      if (!email.trim()) {
        setLocalError('Please enter your email or registered phone number.');
        return;
      }
      if (!password.trim()) {
        setLocalError('Please enter your password.');
        return;
      }

      setIsSubmitting(true);
      try {
        await login({ email: email.trim(), password });
        setSuccessMsg('Signed in successfully! Redirecting...');
        setTimeout(() => navigate('/'), 500);
      } catch (err: any) {
        setLocalError(err.message || 'Authentication failed. Please verify your credentials.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Citizen Registration: simple fields only (Item 3)
      if (!name.trim()) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setLocalError('Please provide a valid email address.');
        return;
      }
      if (!phoneNumber.trim()) {
        setLocalError('Please provide a contact phone number.');
        return;
      }
      if (!password || password.length < 8) {
        setLocalError('Password must be at least 8 characters long.');
        return;
      }

      setIsSubmitting(true);
      try {
        await register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone_number: phoneNumber.trim(),
          password,
          role: 'user',
        });
        setSuccessMsg('Account registered successfully! Welcome to ThermoShield.');
        setTimeout(() => navigate('/'), 500);
      } catch (err: any) {
        setLocalError(err.message || 'Failed to create account. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDemoSignIn = async () => {
    setIsSubmitting(true);
    setLocalError(null);
    clearError();
    try {
      await login({
        email: CITIZEN_DEMO_ACCOUNT.email,
        password: 'password123',
      });
      setSuccessMsg('Signed in as Demo Citizen Persona. Redirecting...');
      setTimeout(() => navigate('/'), 500);
    } catch (err: any) {
      setLocalError('Failed to sign in with demo account. Ensure demo accounts are enabled.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-fadeIn">
        {/* Left Informational Panel: Simplified Plain Language (Item 18) */}
        <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 text-white p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-orange-500/10">
          <div className="space-y-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-amber-200">
                  Citizen Portal
                </span>
                <h2 className="text-xl font-black leading-none text-white font-sans">
                  ThermoShield
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight font-sans">
                Stay Safe During Extreme Heat
              </h1>
              <p className="text-xs sm:text-sm text-orange-100 leading-relaxed">
                Protect yourself and your family with timely, hyper-local thermal risk forecasts and practical health safety directives.
              </p>
            </div>

            {/* Plain Language Value Propositions (Item 18) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Thermometer className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Know your local heat risk</div>
                  <div className="text-[11px] text-orange-100 leading-snug">
                    See current conditions and upcoming peak heat levels in your neighborhood.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <HeartPulse className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Get personalized guidance</div>
                  <div className="text-[11px] text-orange-100 leading-snug">
                    Understand how ambient heat affects your health based on activity and age.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Receive timely alerts</div>
                  <div className="text-[11px] text-orange-100 leading-snug">
                    Get practical hydration reminders and safety recommendations when risk rises.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/20 text-[11px] text-orange-100 flex items-center justify-between">
            <span>Community Heat Resilience</span>
            <Link
              to="/auth/authority/login"
              className="font-bold text-white underline hover:text-amber-200 flex items-center gap-1"
            >
              <span>Authority Login</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Right Authentication Form Panel */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <Card variant="elevated" className="p-6 sm:p-8 ts-card-elevated border ts-border shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b ts-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 font-mono">
                  Citizen Safety Portal
                </span>
                <h2 className="text-xl sm:text-2xl font-black ts-text-primary">
                  {mode === 'login' ? 'Citizen Sign In' : 'Create Citizen Account'}
                </h2>
              </div>

              <div className="flex items-center space-x-1 p-1 rounded-xl ts-card-subtle border ts-border text-xs">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-orange-500 text-white shadow-sm'
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
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'ts-text-muted hover:ts-text-primary'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {/* Error & Success Messages */}
            {(localError || authError) && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{localError || authError}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold ts-text-subtle uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Deshmukh"
                      required
                      className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/60 border ts-border ts-text-primary focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold ts-text-subtle uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/60 border ts-border ts-text-primary focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold ts-text-subtle uppercase tracking-wider mb-1">
                    Mobile Phone (for SMS Heat Alerts)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 98765 43210"
                      required
                      className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/60 border ts-border ts-text-primary focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold ts-text-subtle uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full text-xs font-medium pl-9 pr-10 py-2.5 rounded-xl bg-slate-900/60 border ts-border ts-text-primary focus:outline-none focus:border-orange-500"
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
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In to Citizen Portal' : 'Register Citizen Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Collapsible Secondary Demo Persona Section (Item 5 & 23) */}
            <div className="pt-2 border-t ts-border">
              <button
                type="button"
                onClick={() => setIsDemoAccordionOpen(!isDemoAccordionOpen)}
                className="w-full flex items-center justify-between text-xs font-bold ts-text-muted hover:ts-text-primary py-1.5 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Demo Accounts for Evaluation</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    isDemoAccordionOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isDemoAccordionOpen && (
                <div className="mt-3 p-3.5 rounded-xl ts-card-subtle border ts-border space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold ts-text-primary">
                        {CITIZEN_DEMO_ACCOUNT.name}
                      </div>
                      <div className="text-[11px] ts-text-muted">
                        {CITIZEN_DEMO_ACCOUNT.label} ({CITIZEN_DEMO_ACCOUNT.location})
                      </div>
                      <div className="text-[10px] font-mono text-amber-500 mt-0.5">
                        Demo Persona · Simulated Workflow Account
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDemoSignIn}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      1-Click Sign In
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Portal Switch Navigation Link */}
            <div className="pt-2 text-center text-xs ts-text-muted">
              <span>Are you a municipal official or disaster responder? </span>
              <Link
                to="/auth/authority/login"
                className="font-bold text-amber-500 hover:underline inline-flex items-center gap-0.5"
              >
                <span>Access Government / Authority Portal</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CitizenAuth;
