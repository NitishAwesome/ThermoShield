import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ShieldAlert,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  Flame,
  ActivitySquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

export const Auth: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, error: authError, clearError } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(() => {
    if (location.pathname.includes('register') || location.pathname.includes('signup')) {
      return 'register';
    }
    return initialMode;
  });

  // Sync mode if route changes
  useEffect(() => {
    if (location.pathname.includes('register') || location.pathname.includes('signup')) {
      setMode('register');
    } else if (location.pathname.includes('login')) {
      setMode('login');
    }
    clearError();
  }, [location.pathname, clearError]);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'user' | 'official' | 'responder' | 'analyst'>('user');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);
    clearError();

    if (mode === 'login') {
      if (!email.trim()) {
        setLocalError('Please provide your email address or phone number.');
        return;
      }

      setIsSubmitting(true);
      try {
        await login({ email: email.trim(), password: password || undefined });
        setSuccessMsg('Successfully logged in! Redirecting...');
        setTimeout(() => navigate('/'), 600);
      } catch (err: any) {
        setLocalError(err.message || 'Login failed. Please verify your credentials.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Register validation
      if (!name.trim()) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setLocalError('Please provide a valid email address.');
        return;
      }
      if (!phoneNumber.trim()) {
        setLocalError('Please provide a valid contact phone number.');
        return;
      }

      setIsSubmitting(true);
      try {
        await register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone_number: phoneNumber.trim(),
          password: password || undefined,
          role: role,
        });
        setSuccessMsg('Account registered successfully! Welcome to ThermoShield.');
        setTimeout(() => navigate('/'), 600);
      } catch (err: any) {
        setLocalError(err.message || 'Registration failed. Please check your details.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Quick Demo account auto-fill
  const handleDemoFill = async (demoRole: 'user' | 'official' | 'responder' | 'analyst') => {
    setLocalError(null);
    clearError();
    const demoAccounts = {
      official: {
        name: 'Dr. Aarav Sharma',
        email: 'aarav.sharma@health.gov.in',
        phone: '+91 9811223344',
      },
      responder: {
        name: 'Rajesh Verma (NDRF)',
        email: 'rajesh.verma@disastermgmt.gov.in',
        phone: '+91 9822334455',
      },
      analyst: {
        name: 'Pooja Iyer (IMD)',
        email: 'pooja.iyer@imd.gov.in',
        phone: '+91 9833445566',
      },
      user: {
        name: 'Siddharth Patel',
        email: 'siddharth.patel@gmail.com',
        phone: '+91 9844556677',
      },
    };

    const target = demoAccounts[demoRole];
    if (mode === 'login') {
      setEmail(target.email);
      setPassword('demo12345');
    } else {
      setName(target.name);
      setEmail(target.email);
      setPhoneNumber(target.phone);
      setRole(demoRole);
      setPassword('demo12345');
    }
  };

  const roleOptions = [
    {
      id: 'user',
      label: 'Citizen',
      desc: 'Heat alerts, personalized safety & hydration advice',
      icon: UserCheck,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'official',
      label: 'Health Official',
      desc: 'City-level monitoring & medical emergency alerts',
      icon: Building2,
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    },
    {
      id: 'responder',
      label: 'Emergency Responder',
      desc: 'Disaster response & cooling center deployment',
      icon: Flame,
      badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    },
    {
      id: 'analyst',
      label: 'Climate Analyst',
      desc: 'Biometeorological modeling & heatwave simulations',
      icon: ActivitySquare,
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    },
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-xl">
        {/* Top Header Card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-600 shadow-xl shadow-orange-500/20 mb-3 animate-pulse">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Welcome Back to ThermoShield' : 'Join ThermoShield Early Warning'}
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
            {mode === 'login'
              ? 'Access real-time biometeorological heat stress indicators, live forecasts, and early alerts.'
              : 'Register to receive localized heatwave warnings, personalized hydration, and health advisories.'}
          </p>
        </div>

        {/* Main Form Container */}
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setLocalError(null);
                clearError();
              }}
              className={`py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setLocalError(null);
                clearError();
              }}
              className={`py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Register / Signup</span>
            </button>
          </div>

          {/* Error Message Banner */}
          {(localError || authError) && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-3 text-red-400 text-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-300">Authentication Error</p>
                <p className="text-xs text-red-400/90 mt-0.5">{localError || authError}</p>
              </div>
            </div>
          )}

          {/* Success Message Banner */}
          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start space-x-3 text-emerald-400 text-sm animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-300">Success</p>
                <p className="text-xs text-emerald-400/90 mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (Register Mode only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Ronit Sharma"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                {mode === 'login' ? 'Email or Registered Phone' : 'Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    mode === 'login'
                      ? 'name@example.com or +91 9876543210'
                      : 'name@example.com'
                  }
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Phone Number (Register Mode only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Phone Number (For SMS & WhatsApp Alerts)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                {mode === 'login' && (
                  <span className="text-[11px] text-slate-400">
                    (Default/Demo: demo12345)
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? '••••••••' : 'Create a secure password'}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role Selection (Register Mode only) */}
            {mode === 'register' && (
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Select User Role
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roleOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = role === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setRole(opt.id as any)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-slate-800 border-orange-500/60 ring-1 ring-orange-500/40'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`p-1.5 rounded-lg border ${opt.badgeColor} flex items-center justify-center`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-200">{opt.label}</div>
                            <div className="text-[10px] text-slate-400 leading-tight">
                              {opt.desc}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center space-x-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </span>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In to ThermoShield' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials for Reviewers */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick 1-Click Demo Profiles:</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('user')}
                className="px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 text-xs rounded-lg text-center transition-colors"
              >
                👤 Citizen
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('official')}
                className="px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 text-xs rounded-lg text-center transition-colors"
              >
                🏥 Official
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('responder')}
                className="px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-orange-400 text-xs rounded-lg text-center transition-colors"
              >
                🚒 Responder
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('analyst')}
                className="px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-purple-400 text-xs rounded-lg text-center transition-colors"
              >
                📊 Analyst
              </button>
            </div>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-5">
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center space-x-1"
          >
            <span>← Return to Public Heatwave Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
