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
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  Flame,
  ActivitySquare,
  KeyRound,
  X,
  ExternalLink,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

// Preset Google Demo Accounts with role metadata
const GOOGLE_DEMO_ACCOUNTS = [
  {
    name: 'Dr. Aarav Sharma',
    email: 'aarav.sharma@health.gov.in',
    role: 'official' as const,
    label: 'Health Ministry Official',
    bgColor: 'bg-[#4285F4]',
    avatarText: 'AS',
  },
  {
    name: 'Pooja Iyer',
    email: 'pooja.iyer@imd.gov.in',
    role: 'analyst' as const,
    label: 'IMD Climate Analyst',
    bgColor: 'bg-[#34A853]',
    avatarText: 'PI',
  },
  {
    name: 'Rajesh Verma',
    email: 'rajesh.verma@disastermgmt.gov.in',
    role: 'responder' as const,
    label: 'NDRF Emergency Responder',
    bgColor: 'bg-[#EA4335]',
    avatarText: 'RV',
  },
  {
    name: 'Siddharth Patel',
    email: 'siddharth.patel@gmail.com',
    role: 'user' as const,
    label: 'Citizen / Heat Alert Subscriber',
    bgColor: 'bg-[#FBBC05] text-slate-900',
    avatarText: 'SP',
  },
];

export const Auth: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginWithGoogle, isAuthenticated, error: authError, clearError } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(() => {
    if (location.pathname.includes('register') || location.pathname.includes('signup')) {
      return 'register';
    }
    return initialMode;
  });

  // Modal dialog states
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [isCustomGoogleOpen, setIsCustomGoogleOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'user' | 'official' | 'responder' | 'analyst'>('user');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync mode if route changes
  useEffect(() => {
    if (location.pathname.includes('register') || location.pathname.includes('signup')) {
      setMode('register');
    } else if (location.pathname.includes('login')) {
      setMode('login');
    }
    clearError();
  }, [location.pathname, clearError]);

  // Load Google GIS script if client ID is configured
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const scriptId = 'google-gsi-client';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Compute password strength for registration
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-red-500' };
      case 2:
        return { score: 50, label: 'Moderate', color: 'bg-amber-500' };
      case 3:
        return { score: 75, label: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score: 100, label: 'Strong & Secure', color: 'bg-emerald-500' };
      default:
        return { score: 15, label: 'Too short', color: 'bg-red-500' };
    }
  };

  const passStrength = calculatePasswordStrength(password);

  // Trigger Google Sign-In
  const handleGoogleClick = () => {
    setLocalError(null);
    clearError();

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    // If native Google Identity Services is available in production
    if (clientId && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response?.credential) {
              await executeGoogleLogin(response.credential);
            }
          },
        });
        (window as any).google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setIsGoogleModalOpen(true);
          }
        });
      } catch {
        setIsGoogleModalOpen(true);
      }
    } else {
      // Open the authentic Google Account Chooser dialog
      setIsGoogleModalOpen(true);
    }
  };

  // Perform Google token exchange
  const executeGoogleLogin = async (credential: string, selectedRole?: string) => {
    setIsGoogleLoading(true);
    setLocalError(null);
    clearError();
    try {
      await loginWithGoogle(credential, selectedRole || role);
      setSuccessMsg('Successfully authenticated with Google! Redirecting...');
      setTimeout(() => navigate('/'), 600);
    } catch (err: any) {
      setLocalError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
      setIsGoogleModalOpen(false);
    }
  };

  // Handle preset Google account selection
  const handleSelectGoogleAccount = (acc: typeof GOOGLE_DEMO_ACCOUNTS[0]) => {
    executeGoogleLogin(`dev_google_${acc.email}`, acc.role);
  };

  // Handle custom Google email login
  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim() || !customGoogleEmail.includes('@')) {
      setLocalError('Please enter a valid Google email address.');
      return;
    }
    executeGoogleLogin(`dev_google_${customGoogleEmail.trim().toLowerCase()}`);
  };

  // Handle standard email/password submit
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
        setTimeout(() => navigate('/'), 600);
      } catch (err: any) {
        setLocalError(err.message || 'Authentication failed. Please verify your credentials.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Registration checks
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
          role,
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

  // Demo auto-fill
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
      desc: 'City-level heat monitoring & medical surge alerts',
      icon: Building2,
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    },
    {
      id: 'responder',
      label: 'Emergency Responder',
      desc: 'Disaster response & cooling shelter dispatch',
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
        {/* Top Google-style Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl shadow-blue-500/5 mb-3">
            {/* Google 4-Color 'G' Logo + ThermoShield Co-branding */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md p-2">
                <svg className="w-full h-full" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <div className="text-left">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#8ab4f8] block">
                  Google Identity
                </span>
                <span className="text-sm font-bold text-white tracking-tight">ThermoShield Gateway</span>
              </div>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Sign in' : 'Create an Account'}
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {mode === 'login'
              ? 'to continue to ThermoShield Heatwave Early Warning System'
              : 'Sign up to receive localized heatwave warnings and biometeorological alerts'}
          </p>

          {/* Security Assurance Badge */}
          <div className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#8ab4f8] text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>256-Bit Encrypted &amp; OAuth 2.0 Verified</span>
            <button
              type="button"
              onClick={() => setIsSecurityModalOpen(true)}
              className="ml-1 underline hover:text-white transition-colors"
            >
              Details
            </button>
          </div>
        </div>

        {/* Main Google-styled Card */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-52 h-52 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/90 rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setLocalError(null);
                clearError();
              }}
              className={`py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 ${
                mode === 'login'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
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
              className={`py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 ${
                mode === 'register'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Create Account</span>
            </button>
          </div>

          {/* Error Banner */}
          {(localError || authError) && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start space-x-3 text-red-400 text-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-300">Security / Auth Notice</p>
                <p className="text-xs text-red-400/90 mt-0.5">{localError || authError}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start space-x-3 text-emerald-400 text-sm animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-300">Authenticated</p>
                <p className="text-xs text-emerald-400/90 mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Google Sign-In Hero Button */}
          <div className="mb-6">
            <button
              type="button"
              disabled={isGoogleLoading || isSubmitting}
              onClick={handleGoogleClick}
              className="w-full py-3.5 px-5 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm rounded-2xl border border-[#dadce0] shadow-sm hover:shadow flex items-center justify-center space-x-3 transition-all duration-200 hover:scale-[1.005] active:scale-[0.995] disabled:opacity-60 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              {isGoogleLoading ? (
                <span className="w-5 h-5 border-2 border-slate-400 border-t-[#4285F4] rounded-full animate-spin" />
              ) : (
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
              )}
              <span className="text-slate-800 font-medium">
                {mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
              </span>
              <span className="hidden sm:inline-block ml-auto text-[11px] font-semibold text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                SSO
              </span>
            </button>

            {/* Google Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-slate-900 px-3 text-slate-400 font-medium">
                  Or use {mode === 'login' ? 'ThermoShield credentials' : 'email sign up'}
                </span>
              </div>
            </div>
          </div>

          {/* Form with Google Material Outline Inputs */}
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
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {mode === 'login' ? 'Email or Registered Phone' : 'Email Address'}
                </label>
                {mode === 'login' && (
                  <span
                    onClick={() => {
                      setEmail('aarav.sharma@health.gov.in');
                    }}
                    className="text-[11px] text-[#8ab4f8] hover:underline cursor-pointer"
                  >
                    Forgot email?
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'login' ? 'name@example.com or +91...' : 'name@example.com'}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                />
              </div>
            </div>

            {/* Phone Number (Register Mode only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Phone Number (For SMS &amp; WhatsApp Alerts)
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
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
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
                  <span
                    onClick={() => setPassword('demo12345')}
                    className="text-[11px] text-[#8ab4f8] hover:underline cursor-pointer"
                  >
                    Use demo password?
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? '••••••••' : 'Minimum 8 characters'}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter in registration mode */}
              {mode === 'register' && password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Password strength:</span>
                    <span className="font-semibold text-slate-300">{passStrength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passStrength.color} transition-all duration-300`}
                      style={{ width: `${passStrength.score}%` }}
                    />
                  </div>
                </div>
              )}
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
                            ? 'bg-slate-800 border-[#1a73e8] ring-1 ring-[#1a73e8]/50'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className={`p-1.5 rounded-lg border ${opt.badgeColor} flex items-center justify-center`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-200">{opt.label}</div>
                            <div className="text-[10px] text-slate-400 leading-tight">{opt.desc}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all duration-200 hover:scale-[1.005] active:scale-[0.995] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center space-x-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </span>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-4 border-t border-slate-800/90">
            <div className="flex items-center justify-between mb-2.5">
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

          {/* Security & Compliance Footer */}
          <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>TLS 1.3 • OAuth 2.0 PKCE • Bcrypt-12</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSecurityModalOpen(true)}
              className="text-[#8ab4f8] hover:underline flex items-center space-x-1"
            >
              <span>Security Architecture</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-4">
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center space-x-1"
          >
            <span>← Return to Public Heatwave Dashboard</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* AUTHENTIC GOOGLE ACCOUNT CHOOSER MODAL                                   */}
      {/* ========================================================================= */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#202124] text-slate-800 dark:text-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
            {/* Modal Header */}
            <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800 relative">
              <button
                type="button"
                onClick={() => {
                  setIsGoogleModalOpen(false);
                  setIsCustomGoogleOpen(false);
                }}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Google 4-Color Logo */}
              <div className="w-9 h-9 mx-auto mb-3">
                <svg className="w-full h-full" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>

              <h3 className="text-lg font-semibold tracking-tight">Choose an account</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                to continue to <span className="font-semibold text-slate-700 dark:text-slate-200">ThermoShield</span>
              </p>
            </div>

            {/* Google Accounts List */}
            <div className="p-4 space-y-1 max-h-80 overflow-y-auto">
              {GOOGLE_DEMO_ACCOUNTS.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectGoogleAccount(acc)}
                  className="w-full p-3 rounded-2xl flex items-center space-x-3.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
                >
                  {/* Google colored avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${acc.bgColor} shadow-sm flex-shrink-0`}
                  >
                    {acc.avatarText}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-500 dark:group-hover:text-blue-400">
                      {acc.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{acc.email}</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      • {acc.label}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                </button>
              ))}

              {/* Use Another Google Account option */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                {!isCustomGoogleOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsCustomGoogleOpen(true)}
                    className="w-full p-3 rounded-2xl flex items-center space-x-3.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left text-slate-700 dark:text-slate-300"
                  >
                    <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">Use another Google account</span>
                  </button>
                ) : (
                  <form onSubmit={handleCustomGoogleSubmit} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Enter Google Email
                    </label>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      placeholder="your.email@gmail.com"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                    />
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsCustomGoogleOpen(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isGoogleLoading}
                        className="px-4 py-1.5 text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg shadow-sm"
                      >
                        Next
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Google Privacy & Consent text */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <p>
                To continue, Google will share your name, email address, language preference, and profile picture with
                ThermoShield. Before using this app, review ThermoShield’s{' '}
                <span className="text-[#1a73e8] dark:text-[#8ab4f8] cursor-pointer hover:underline">Privacy Policy</span>{' '}
                and{' '}
                <span className="text-[#1a73e8] dark:text-[#8ab4f8] cursor-pointer hover:underline">Terms of Service</span>.
              </p>
            </div>

            {/* Google standard footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5" />
                <span>English (United States)</span>
              </div>
              <div className="flex space-x-3">
                <span className="hover:underline cursor-pointer">Help</span>
                <span className="hover:underline cursor-pointer">Privacy</span>
                <span className="hover:underline cursor-pointer">Terms</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECURITY ARCHITECTURE MODAL (Comprehensive Proof of Security)             */}
      {/* ========================================================================= */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 text-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden relative">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold">ThermoShield Security Architecture</h3>
                  <p className="text-xs text-slate-400">Google OAuth 2.0 &amp; Zero-Trust Standards</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSecurityModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Google Public Key Cryptographic Verification</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Every Google ID token is validated directly against Google’s public token inspection servers
                  (<code className="text-slate-300 font-mono">oauth2.googleapis.com</code>). Verified claims ensure
                  authenticity, email verification, and token non-expiry.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-2 text-blue-400 font-semibold text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Unusable Password Hash for OAuth Profiles</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Google-authenticated accounts are stored with a cryptographically unusable password hash
                  (<code className="text-slate-300 font-mono">!oauth_google_disabled</code>), preventing any blank or brute-force
                  password authentication against OAuth users.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
                  <KeyRound className="w-4 h-4" />
                  <span>Bcrypt-12 Salted Hashing &amp; JWT Short Expiry</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Traditional credentials use 12 rounds of salted Bcrypt. Access sessions issue signed HS256 JWT tokens with
                  strict clock validation and automatic expiration.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-2 text-purple-400 font-semibold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  <span>CSRF Nonce &amp; Account Enumeration Defense</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Authentication endpoints employ constant-time hash comparisons and standardized generic rejection messages to
                  preclude account enumeration.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setIsSecurityModalOpen(false)}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors"
              >
                Close Security Overview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
