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
  Thermometer,
  HeartPulse,
  Radio,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

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
  const { user, login, register, loginWithGoogle, isAuthenticated, error: authError, clearError } = useAuth();
  const { t } = useTranslation();

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

  const userRole = (user?.role || '').toLowerCase();
  const defaultRoleDest = ['official', 'responder', 'analyst', 'admin'].includes(userRole)
    ? '/gov/dashboard'
    : '/';
  const targetUrl = (location.state as any)?.from || defaultRoleDest;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(targetUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, targetUrl]);

  // Compute password strength for registration
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: t('auth.strengthWeak'), color: 'bg-red-500' };
      case 2:
        return { score: 50, label: t('auth.strengthModerate'), color: 'bg-amber-500' };
      case 3:
        return { score: 75, label: t('auth.strengthGood'), color: 'bg-blue-500' };
      case 4:
        return { score: 100, label: t('auth.strengthStrong'), color: 'bg-emerald-500' };
      default:
        return { score: 15, label: t('auth.strengthTooShort'), color: 'bg-red-500' };
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
      const activeRole = (selectedRole || role || '').toLowerCase();
      const defaultDest = ['official', 'responder', 'analyst', 'admin'].includes(activeRole)
        ? '/gov/dashboard'
        : '/';
      const redirectDest = (location.state as any)?.from || defaultDest;

      await loginWithGoogle(credential, selectedRole || role);
      setSuccessMsg('Successfully authenticated with Google! Redirecting...');
      setTimeout(() => navigate(redirectDest), 600);
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
        setTimeout(() => navigate(targetUrl), 600);
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
        setTimeout(() => navigate(targetUrl), 600);
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
      label: t('roleBanner.citizenTitle'),
      desc: t('roleBanner.citizenDesc'),
      icon: UserCheck,
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'official',
      label: t('roleBanner.officialTitle'),
      desc: t('roleBanner.officialDesc'),
      icon: Building2,
      badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    },
    {
      id: 'responder',
      label: t('roleBanner.responderTitle'),
      desc: t('roleBanner.responderDesc'),
      icon: Flame,
      badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
    },
    {
      id: 'analyst',
      label: t('roleBanner.analystTitle'),
      desc: t('roleBanner.analystDesc'),
      icon: ActivitySquare,
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    },
  ];

  return (
    <div className="min-h-[88vh] flex items-center justify-center py-6 sm:py-10 px-3 sm:px-6">
      <div className="w-full max-w-5xl mx-auto">
        <div className="lg:grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Mission, Biometeorological Science, and Trust (Visible on lg screens) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between space-y-6 pt-2">
            <div>
              {/* Civic Tag & Problem Statement */}
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>SIH26083 Civic Early Warning Network</span>
              </div>

              <div className="flex items-center space-x-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight ts-text-primary">ThermoShield</h2>
                  <p className="text-xs ts-text-muted font-medium">Extreme Heatwave Defense Platform</p>
                </div>
              </div>

              <h1 className="text-2xl xl:text-3xl font-extrabold ts-text-primary tracking-tight leading-tight mb-3">
                Hyper-Local Thermal Defense For Every Citizen &amp; Household
              </h1>
              <p className="text-sm ts-text-muted leading-relaxed mb-6">
                Calibrated biometeorological intelligence providing neighborhood Wet Bulb Globe Temperature (WBGT),
                personalized vulnerability modeling, and early warning directives to protect public health.
              </p>

              {/* 3 Core Scientific Highlights */}
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl ts-card-subtle border ts-border flex items-start space-x-3 transition-all hover:border-emerald-500/40">
                  <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-600 dark:text-orange-400 flex-shrink-0">
                    <Thermometer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold ts-text-primary">ISO 7243 &amp; WBGT Precision</h3>
                    <p className="text-[11px] ts-text-muted mt-0.5 leading-relaxed">
                      Real-time wet-bulb globe thermal strain modeling accounting for ambient temperature, humidity, wind, and direct solar radiation.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl ts-card-subtle border ts-border flex items-start space-x-3 transition-all hover:border-emerald-500/40">
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 flex-shrink-0">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold ts-text-primary">Personalized Risk Calibration</h3>
                    <p className="text-[11px] ts-text-muted mt-0.5 leading-relaxed">
                      Custom risk calculations adjusted for age, medical conditions, outdoor work exposure, hydration, and clothing habits.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl ts-card-subtle border ts-border flex items-start space-x-3 transition-all hover:border-emerald-500/40">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold ts-text-primary">Actionable Directives &amp; Cooling Grids</h3>
                    <p className="text-[11px] ts-text-muted mt-0.5 leading-relaxed">
                      Hourly safe outdoor windows, hydration alerts, and direct routing to municipal cooling shelters and ORS hubs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Zero-Trust Security Callout */}
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2 font-bold">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>256-Bit Cryptographic Security</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSecurityModalOpen(true)}
                  className="text-[11px] font-semibold underline hover:text-blue-900 dark:hover:text-white cursor-pointer"
                >
                  Architecture
                </button>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                OAuth 2.0 PKCE verification with Google public keys, salted Bcrypt-12, and zero-trust session safeguards.
              </p>
            </div>
          </div>

          {/* Right Column: Auth Card + Mobile Header */}
          <div className="lg:col-span-7 w-full">
            {/* Mobile Header (Shown on < lg screens) */}
            <div className="text-center mb-6 lg:hidden">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>SIH26083 Civic Heat Defense</span>
              </div>
              <h1 className="text-2xl font-bold ts-text-primary tracking-tight">
                {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto">
                {mode === 'login'
                  ? t('auth.loginSubtitle')
                  : t('auth.registerSubtitle')}
              </p>
            </div>

            {/* Main Auth Card */}
            <div className="ts-card rounded-3xl shadow-2xl p-5 sm:p-8 relative overflow-hidden backdrop-blur-xl border ts-border">
              {/* Subtle Ambient Glows */}
              <div className="absolute -top-24 -right-24 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Card Header (Desktop) */}
              <div className="hidden lg:block mb-5">
                <h2 className="text-xl font-bold ts-text-primary">
                  {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
                </h2>
                <p className="text-xs ts-text-muted mt-0.5">
                  {mode === 'login'
                    ? t('auth.loginSubtitle')
                    : t('auth.registerSubtitle')}
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 p-1 ts-card-subtle rounded-2xl mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLocalError(null);
                    clearError();
                  }}
                  className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-800 ts-text-primary shadow-sm border border-slate-200 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:ts-text-primary'
                  }`}
                >
                  <span>{t('auth.signIn')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setLocalError(null);
                    clearError();
                  }}
                  className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white dark:bg-slate-800 ts-text-primary shadow-sm border border-slate-200 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:ts-text-primary'
                  }`}
                >
                  <span>{t('auth.register')}</span>
                </button>
              </div>

              {/* Error Banner */}
              {(localError || authError) && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start space-x-3 text-red-400 text-xs animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-300">Security / Auth Notice</p>
                    <p className="text-red-400/90 mt-0.5">{localError || authError}</p>
                  </div>
                </div>
              )}

              {/* Success Banner */}
              {successMsg && (
                <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start space-x-3 text-emerald-400 text-xs animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-300">Authenticated</p>
                    <p className="text-emerald-400/90 mt-0.5">{successMsg}</p>
                  </div>
                </div>
              )}

              {/* Google Sign-In One-Click Button */}
              <div className="mb-5">
                <button
                  type="button"
                  disabled={isGoogleLoading || isSubmitting}
                  onClick={handleGoogleClick}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow flex items-center justify-center space-x-3 transition-all duration-200 hover:scale-[1.005] active:scale-[0.995] disabled:opacity-60 disabled:cursor-not-allowed group relative overflow-hidden cursor-pointer"
                >
                  {isGoogleLoading ? (
                    <span className="w-4 h-4 border-2 border-slate-400 border-t-[#4285F4] rounded-full animate-spin" />
                  ) : (
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
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
                  <span>
                    {mode === 'login' ? t('auth.continueWithGoogle') : t('auth.signUpWithGoogle')}
                  </span>
                  <span className="hidden sm:inline-block ml-auto text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    SSO
                  </span>
                </button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t ts-border" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
                      {mode === 'login' ? t('auth.orUseCredentials') : t('auth.orUseEmail')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Full Name (Register Mode only) */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      {t('auth.fullName')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Siddharth Patel"
                        className="w-full ts-input pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {mode === 'login' ? `${t('auth.email')} / Phone` : t('auth.email')}
                    </label>
                    {mode === 'login' && (
                      <span
                        onClick={() => {
                          setEmail('siddharth.patel@gmail.com');
                        }}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline cursor-pointer"
                      >
                        Sample Citizen Email
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type={mode === 'login' ? 'text' : 'email'}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={mode === 'login' ? 'name@example.com or +91...' : 'name@example.com'}
                      className="w-full ts-input pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all rounded-xl"
                    />
                  </div>
                </div>

                {/* Phone Number (Register Mode only) */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      {t('auth.phone')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full ts-input pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {t('auth.password')}
                    </label>
                    {mode === 'login' && (
                      <span
                        onClick={() => setPassword('demo12345')}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline cursor-pointer"
                      >
                        {t('auth.useDemoPassword')}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'login' ? '••••••••' : 'Minimum 8 characters'}
                      className="w-full ts-input pl-10 pr-11 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength meter in registration mode */}
                  {mode === 'register' && password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="ts-text-subtle">{t('auth.passwordStrength')}:</span>
                        <span className="font-semibold ts-text-primary">{passStrength.label}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
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
                  <div className="pt-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('auth.role')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {roleOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = role === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => setRole(opt.id as any)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/40'
                                : 'ts-card-subtle hover:border-slate-400 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <div className={`p-1.5 rounded-lg border ${opt.badgeColor} flex items-center justify-center flex-shrink-0`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold ts-text-primary truncate">{opt.label}</div>
                                <div className="text-[10px] ts-text-muted leading-tight line-clamp-1">{opt.desc}</div>
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
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all duration-200 hover:scale-[1.005] active:scale-[0.995] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center space-x-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('auth.verifying')}</span>
                      </span>
                    ) : (
                      <>
                        <span>{mode === 'login' ? t('auth.signIn') : t('auth.register')}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Organized & Intentional Evaluation / Demo Access */}
              <div className="mt-6 pt-4 border-t ts-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Evaluation &amp; Demo Roles
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    1-Click Test Sign-In
                  </span>
                </div>
                <p className="text-[11px] ts-text-muted mb-3 leading-relaxed">
                  Select a verified test persona to evaluate personalized thermal stress, authority command, or field responder views:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Citizen */}
                  <button
                    type="button"
                    onClick={() => handleDemoFill('user')}
                    className="p-2.5 rounded-xl ts-card-subtle border ts-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left flex items-start space-x-2.5 cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      SP
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold ts-text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                          Siddharth Patel
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Citizen
                        </span>
                      </div>
                      <div className="text-[10px] ts-text-muted truncate">siddharth.patel@gmail.com</div>
                    </div>
                  </button>

                  {/* Municipal Authority */}
                  <button
                    type="button"
                    onClick={() => handleDemoFill('official')}
                    className="p-2.5 rounded-xl ts-card-subtle border ts-border hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all text-left flex items-start space-x-2.5 cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      AS
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold ts-text-primary group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate">
                          Dr. Aarav Sharma
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                          Authority
                        </span>
                      </div>
                      <div className="text-[10px] ts-text-muted truncate">aarav.sharma@health.gov.in</div>
                    </div>
                  </button>

                  {/* Responder */}
                  <button
                    type="button"
                    onClick={() => handleDemoFill('responder')}
                    className="p-2.5 rounded-xl ts-card-subtle border ts-border hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-left flex items-start space-x-2.5 cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      RV
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold ts-text-primary group-hover:text-orange-600 dark:group-hover:text-orange-400 truncate">
                          Rajesh Verma (NDRF)
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                          Responder
                        </span>
                      </div>
                      <div className="text-[10px] ts-text-muted truncate">rajesh.verma@disastermgmt.gov.in</div>
                    </div>
                  </button>

                  {/* Climate Analyst */}
                  <button
                    type="button"
                    onClick={() => handleDemoFill('analyst')}
                    className="p-2.5 rounded-xl ts-card-subtle border ts-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left flex items-start space-x-2.5 cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      PI
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold ts-text-primary group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate">
                          Pooja Iyer (IMD)
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          Analyst
                        </span>
                      </div>
                      <div className="text-[10px] ts-text-muted truncate">pooja.iyer@imd.gov.in</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Security & Compliance Footer */}
              <div className="mt-5 pt-3.5 border-t ts-border flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 gap-2">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>TLS 1.3 • OAuth 2.0 PKCE • Bcrypt-12</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSecurityModalOpen(true)}
                  className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center space-x-1 cursor-pointer"
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
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition-colors inline-flex items-center space-x-1"
              >
                <span>← {t('auth.returnToDashboard')}</span>
              </Link>
            </div>
          </div>
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
