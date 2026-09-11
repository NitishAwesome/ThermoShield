import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  Flame,
  BarChart2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sliders,
  Bell,
  HeartPulse,
  Layers,
  Calendar,
  Eye,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

interface RoleWelcomeBannerProps {
  user?: User | null;
  initialMode?: BannerMode;
}

export type BannerMode = 'full' | 'compact' | 'collapsed';

interface QuickAction {
  to: string;
  label: string;
  icon?: React.ElementType;
  primary?: boolean;
}

interface RoleConfig {
  roleKey: string;
  roleBadge: string;
  icon: React.ElementType;
  iconColor: string;
  bgGradient: string;
  borderColor: string;
  accentColor: string;
  title: string;
  compactTitle: string;
  description: string;
  compactDescription: string;
  quickActions: QuickAction[];
  features: string[];
}

const BANNER_MODE_KEY = 'ts_role_banner_mode';

const getRoleConfig = (role?: string, t?: (key: any, fallback?: any) => string): RoleConfig => {
  const norm = (role || '').toLowerCase();
  const tr = t || ((_k: any, fb?: any) => fb || '');
  switch (norm) {
    case 'official':
      return {
        roleKey: 'official',
        roleBadge: tr('role.healthOfficial', 'Municipal Health Authority'),
        icon: Building2,
        iconColor: 'text-cyan-600 dark:text-cyan-400',
        bgGradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent dark:from-cyan-500/15 dark:via-slate-900/40 dark:to-slate-900/60',
        borderColor: 'border-cyan-500/30',
        accentColor: 'text-cyan-600 dark:text-cyan-400',
        title: tr('roleBanner.officialTitle', 'Municipal Health & Civic Command View'),
        compactTitle: tr('role.healthOfficial', 'Municipal Health View'),
        description: tr(
          'roleBanner.officialDesc',
          'Monitor area-level heat risk across municipal wards, evaluate vulnerable populations, and simulate proactive response actions.'
        ),
        compactDescription: tr(
          'roleBanner.officialDesc',
          'Monitor area-level heat risk and evaluate municipal response actions.'
        ),
        quickActions: [
          { to: '/matrix', label: tr('nav.municipalMatrix', 'Open Municipal Matrix'), icon: Building2, primary: true },
          { to: '/risk-details', label: tr('nav.riskAnalysis', 'Understand Risk'), icon: Layers },
          { to: '/interventions', label: tr('nav.interventions', 'Simulate Actions'), icon: Sliders },
        ],
        features: [
          tr('roleBanner.featureOfficial1', 'Multi-zone surveillance across all monitored municipal wards'),
          tr('roleBanner.featureOfficial2', 'Intervention simulator to model cooling centers & work-pause impact'),
          tr('roleBanner.featureOfficial3', 'ML-driven civic health impact scoring for hospital preparedness'),
        ],
      };

    case 'responder':
      return {
        roleKey: 'responder',
        roleBadge: tr('role.responder', 'Emergency Field Responder'),
        icon: Flame,
        iconColor: 'text-orange-600 dark:text-orange-400',
        bgGradient: 'from-orange-500/10 via-orange-500/5 to-transparent dark:from-orange-500/15 dark:via-slate-900/40 dark:to-slate-900/60',
        borderColor: 'border-orange-500/30',
        accentColor: 'text-orange-600 dark:text-orange-400',
        title: tr('roleBanner.responderTitle', 'Emergency Field Response Command'),
        compactTitle: tr('role.responder', 'Field Responder View'),
        description: tr(
          'roleBanner.responderDesc',
          'Active alerts, areas needing urgent attention, and vulnerable people needing extra protection during peak heat windows.'
        ),
        compactDescription: tr(
          'roleBanner.responderDesc',
          'Operational view: monitor active alerts, vulnerable groups, and response measures.'
        ),
        quickActions: [
          { to: '/alerts', label: tr('nav.alerts', 'View Active Alerts'), icon: Bell, primary: true },
          { to: '/interventions', label: tr('nav.interventions', 'Response Measures'), icon: Sliders },
          { to: '/personal-risk', label: tr('nav.personalRisk', 'Field Worker Safety'), icon: HeartPulse },
        ],
        features: [
          tr('roleBanner.featureResponder1', 'Live heatwave warnings with actionable public protection directives'),
          tr('roleBanner.featureResponder2', 'Intervention planning for hydration and cooling station deployments'),
          tr('roleBanner.featureResponder3', 'Personal heat risk calculator for occupational and field worker safety'),
        ],
      };

    case 'analyst':
      return {
        roleKey: 'analyst',
        roleBadge: tr('role.analyst', 'Climate & Data Analyst'),
        icon: BarChart2,
        iconColor: 'text-purple-600 dark:text-purple-400',
        bgGradient: 'from-purple-500/10 via-purple-500/5 to-transparent dark:from-purple-500/15 dark:via-slate-900/40 dark:to-slate-900/60',
        borderColor: 'border-purple-500/30',
        accentColor: 'text-purple-600 dark:text-purple-400',
        title: tr('roleBanner.analystTitle', 'Climate Intelligence & Risk Modeling'),
        compactTitle: tr('role.analyst', 'Climate Analyst View'),
        description: tr(
          'roleBanner.analystDesc',
          'Biometeorological modeling: analyze WBGT, multi-index heat stress, and cross-zone historical/current observations.'
        ),
        compactDescription: tr(
          'roleBanner.analystDesc',
          'Risk modeling & telemetry: analyze WBGT, multi-index heat stress, and cross-zone patterns.'
        ),
        quickActions: [
          { to: '/risk-details', label: tr('nav.riskAnalysis', 'Open Risk Analysis'), icon: Layers, primary: true },
          { to: '/matrix', label: tr('nav.municipalMatrix', 'Municipal Matrix'), icon: Building2 },
          { to: '/forecast', label: tr('nav.forecast', '5-Day Forecast'), icon: Calendar },
        ],
        features: [
          tr('roleBanner.featureAnalyst1', 'Multi-factor biometeorological decomposition (WBGT, Heat Index, Apparent Temp)'),
          tr('roleBanner.featureAnalyst2', 'Predictive health risk regression proxy and environmental driver weighting'),
          tr('roleBanner.featureAnalyst3', 'Cross-zone thermal variance comparison across national monitoring stations'),
        ],
      };

    default: // Citizen / Public User
      return {
        roleKey: 'user',
        roleBadge: tr('role.citizen', 'Citizen Safety View'),
        icon: ShieldCheck,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        bgGradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/15 dark:via-slate-900/40 dark:to-slate-900/60',
        borderColor: 'border-emerald-500/30',
        accentColor: 'text-emerald-600 dark:text-emerald-400',
        title: tr('roleBanner.citizenTitle', 'Welcome to ThermoShield — Citizen Heat Safety'),
        compactTitle: tr('role.citizen', 'Citizen View'),
        description: tr(
          'roleBanner.citizenDesc',
          "Your dashboard is personalized for your location and health profile. Check today's heat conditions, your personal risk, and what to do now."
        ),
        compactDescription: tr(
          'roleBanner.citizenDesc',
          'Your dashboard is personalized for your location and health profile.'
        ),
        quickActions: [
          { to: '/personal-risk', label: tr('nav.personalRisk', 'My Heat Risk'), icon: HeartPulse, primary: true },
          { to: '/alerts', label: tr('nav.alerts', 'View Alerts'), icon: Bell },
        ],
        features: [
          tr('roleBanner.featureCitizen1', 'Personal heat risk calculator tuned to your health profile and routine'),
          tr('roleBanner.featureCitizen2', 'Real-time city-specific temperature & WBGT physiological strain'),
          tr('roleBanner.featureCitizen3', 'Clear, jargon-free protective advice for you and your family'),
        ],
      };
  }
};

const ALL_ROLES = [
  { id: 'user', label: 'Citizen / Public User', icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'responder', label: 'Health / Field Responder', icon: Flame, color: 'text-orange-600 dark:text-orange-400' },
  { id: 'official', label: 'Municipal / Government Authority', icon: Building2, color: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'analyst', label: 'Climate / Data Analyst', icon: BarChart2, color: 'text-purple-600 dark:text-purple-400' },
];

export const RoleWelcomeBanner: React.FC<RoleWelcomeBannerProps> = ({
  user,
  initialMode,
}) => {
  const { t } = useTranslation();
  const { switchRole } = useAuth();
  const [mode, setMode] = useState<BannerMode>('full');
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close persona menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false);
      }
    };
    if (isRoleMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRoleMenuOpen]);

  // Keep details open by default when on the landing page
  useEffect(() => {
    try {
      if (initialMode === 'full') {
        setMode('full');
        localStorage.setItem(BANNER_MODE_KEY, 'full');
      } else {
        const savedMode = localStorage.getItem(BANNER_MODE_KEY) as BannerMode | null;
        if (savedMode === 'full' || savedMode === 'compact' || savedMode === 'collapsed') {
          setMode(savedMode);
        } else {
          setMode('full');
        }
      }
    } catch {
      setMode('full');
    }
  }, [initialMode]);

  const updateMode = (newMode: BannerMode) => {
    setMode(newMode);
    try {
      localStorage.setItem(BANNER_MODE_KEY, newMode);
    } catch {}
  };

  const handleRoleSelect = (roleId: string) => {
    switchRole(roleId);
    setIsRoleMenuOpen(false);
  };  const config = getRoleConfig(user?.role, t);
  const Icon = config.icon;

  const getLocalizedRoleLabel = (id: string, fallback: string) => {
    if (id === 'user') return t('role.citizen', fallback);
    if (id === 'official') return t('role.healthOfficial', fallback);
    if (id === 'responder') return t('role.responder', fallback);
    if (id === 'analyst') return t('role.analyst', fallback);
    return fallback;
  };

  // 1. COLLAPSED VIEW (Small expandable context bar - never destroyed)
  if (mode === 'collapsed') {
    return (
      <div className={`relative ${isRoleMenuOpen ? 'z-40' : 'z-30'}`}>
        <div
          className={`flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-4 py-2.5 rounded-2xl border ${config.borderColor} ts-card-subtle transition-all shadow-sm`}
        >
          <div
            onClick={() => updateMode('compact')}
            className="flex items-center space-x-2.5 cursor-pointer flex-1 min-w-0"
            title="Click to expand quick actions"
          >
            <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border ts-border ${config.iconColor} flex-shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2 flex-wrap text-xs">
              <span className="ts-text-muted hidden sm:inline">{t('roleBanner.viewingAs', 'Currently viewing as:')}</span>
              <span className={`font-bold ${config.accentColor}`}>
                {getLocalizedRoleLabel(config.roleKey, config.roleBadge)}
              </span>
              <span className="text-[11px] ts-text-subtle font-medium flex items-center gap-0.5 hover:ts-text-primary">
                <span>{config.compactTitle} ▼</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => updateMode('compact')}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg ts-card border ts-border ts-text-muted hover:ts-text-primary transition-all flex items-center space-x-1"
            >
              <span>{t('roleBanner.quickActions', 'Quick Actions')}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 transition-all"
              >
                {t('roleBanner.changeView', 'Change View')}
              </button>

              {isRoleMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 ts-card-elevated border ts-border rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold ts-text-subtle tracking-wider border-b ts-border">
                    {t('roleBanner.switchPersona', 'Switch Active Persona')}
                  </div>
                  {ALL_ROLES.map((r) => {
                    const RIcon = r.icon;
                    const isCurrent =
                      (user?.role?.toLowerCase() === r.id) ||
                      (!user?.role && r.id === 'user');
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRoleSelect(r.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                          isCurrent
                            ? 'bg-orange-500/15 font-bold text-orange-400'
                            : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <RIcon className={`w-3.5 h-3.5 ${r.color}`} />
                          <span>{getLocalizedRoleLabel(r.id, r.label)}</span>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-orange-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. COMPACT VIEW (Default persistent state on returning to Dashboard)
  if (mode === 'compact') {
    return (
      <div className={`relative ${isRoleMenuOpen ? 'z-40' : 'z-30'}`}>
        <div
          className={`rounded-2xl border ts-card bg-gradient-to-r ${config.bgGradient} ${config.borderColor} p-4 sm:p-5 shadow-md transition-all`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            {/* Context identity */}
            <div className="flex items-start sm:items-center space-x-3.5 flex-1 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white dark:bg-slate-900/90 border ${config.borderColor} shadow-inner mt-0.5 sm:mt-0`}
              >
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h3 className="text-sm sm:text-base font-bold ts-text-primary">
                    {config.compactTitle}
                  </h3>
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-white/90 dark:bg-slate-900/80 border ts-border shadow-xs">
                    <Sparkles className="w-2.5 h-2.5 text-orange-400" />
                    <span className={config.accentColor}>{config.roleBadge}</span>
                  </span>
                </div>
                <p className="text-xs ts-text-muted mt-0.5 leading-relaxed truncate max-w-2xl">
                  {config.compactDescription}
                </p>
              </div>
            </div>

            {/* Quick Actions & View Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 ts-border">
              {config.quickActions.map((qa) => {
                const QAIcon = qa.icon;
                return (
                  <Link
                    key={qa.to + qa.label}
                    to={qa.to}
                    className={`inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      qa.primary
                        ? config.roleKey === 'official'
                          ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm font-bold'
                          : config.roleKey === 'responder'
                          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm font-bold'
                          : config.roleKey === 'analyst'
                          ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm font-bold'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    {QAIcon && <QAIcon className="w-3.5 h-3.5" />}
                    <span>{qa.label}</span>
                  </Link>
                );
              })}

              <div className="flex items-center space-x-1 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => updateMode('full')}
                  className="p-1.5 rounded-lg ts-text-muted hover:ts-text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800/50 text-xs font-medium transition-colors"
                  title="Expand full role guide"
                >
                  <span className="text-[11px] hidden sm:inline mr-1">{t('roleBanner.details', 'Details')}</span>
                  <ChevronDown className="w-3.5 h-3.5 inline" />
                </button>

                <button
                  type="button"
                  onClick={() => updateMode('collapsed')}
                  className="p-1.5 rounded-lg ts-text-subtle hover:ts-text-muted hover:bg-slate-200/60 dark:hover:bg-slate-800/50 text-xs transition-colors"
                  title={t('roleBanner.minimize', 'Minimize')}
                >
                  <span className="text-sm leading-none font-bold">—</span>
                </button>

                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-white/90 dark:bg-slate-800/70 border ts-border text-slate-700 dark:text-slate-300 hover:ts-text-primary transition-all"
                  >
                    {t('roleBanner.changeView', 'Change View')}
                  </button>

                  {isRoleMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 ts-card-elevated border ts-border rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3 py-1.5 text-[10px] uppercase font-bold ts-text-subtle tracking-wider border-b ts-border">
                        {t('roleBanner.switchPersona', 'Switch Active Persona')}
                      </div>
                      {ALL_ROLES.map((r) => {
                        const RIcon = r.icon;
                        const isCurrent =
                          (user?.role?.toLowerCase() === r.id) ||
                          (!user?.role && r.id === 'user');
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleRoleSelect(r.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                              isCurrent
                                ? 'bg-orange-500/15 font-bold text-orange-400'
                                : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <RIcon className={`w-3.5 h-3.5 ${r.color}`} />
                              <span>{getLocalizedRoleLabel(r.id, r.label)}</span>
                            </div>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-orange-400" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. FULL EXPANDED VIEW (First visit or explicitly expanded)
  return (
    <div className={`relative ${isRoleMenuOpen ? 'z-40' : 'z-30'}`}>
      <div
        className={`relative rounded-2xl border ts-card bg-gradient-to-br ${config.bgGradient} ${config.borderColor} p-4 sm:p-6 shadow-lg animate-in fade-in slide-in-from-top-1 duration-300`}
      >
        {/* Collapse / Dismiss control */}
        <div className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 flex items-center space-x-1">
          <button
            type="button"
            onClick={() => updateMode('compact')}
            aria-label="Collapse to compact view"
            className="p-1.5 rounded-lg ts-text-muted hover:ts-text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800/50 transition-colors flex items-center space-x-1 text-xs"
            title="Switch to compact banner"
          >
            <ChevronUp className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">{t('roleBanner.compact', 'Compact')}</span>
          </button>
          <button
            type="button"
            onClick={() => updateMode('collapsed')}
            aria-label={t('roleBanner.minimize', 'Minimize role context')}
            className="p-1.5 rounded-lg ts-text-subtle hover:ts-text-muted hover:bg-slate-200/60 dark:hover:bg-slate-800/50 transition-colors"
            title={t('roleBanner.minimize', 'Minimize')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start gap-3.5 sm:gap-4 pr-12 sm:pr-20">
          {/* Role Icon */}
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-tr ${
              config.roleKey === 'official'
                ? 'from-cyan-600 to-sky-700'
                : config.roleKey === 'responder'
                ? 'from-orange-500 to-amber-600'
                : config.roleKey === 'analyst'
                ? 'from-purple-600 to-indigo-700'
                : 'from-emerald-600 to-teal-700'
            } shadow-md`}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title & Badge */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 className="text-sm sm:text-base md:text-lg font-bold ts-text-primary break-words">{config.title}</h3>
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-white/90 dark:bg-slate-900/80 ts-border border ts-text-muted shadow-xs">
                <Sparkles className="w-2.5 h-2.5 text-orange-400" />
                <span className={config.accentColor}>{config.roleBadge}</span>
              </span>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm ts-text-muted mt-1.5 max-w-2xl leading-relaxed">
              {config.description}
            </p>

            {/* Feature bullets */}
            <ul className="mt-3 space-y-1.5">
              {config.features.map((f, i) => (
                <li key={i} className="flex items-start space-x-2 text-xs ts-text-muted">
                  <span className={`mt-0.5 text-[8px] font-black ${config.accentColor}`}>▶</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* CTAs & Role Switcher */}
            <div className="mt-4 flex items-center space-x-2 flex-wrap gap-y-2 w-full sm:w-auto">
              {config.quickActions.map((qa) => {
                const QAIcon = qa.icon;
                return (
                  <Link
                    key={qa.to + qa.label}
                    to={qa.to}
                    className={`inline-flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      qa.primary
                        ? config.roleKey === 'official'
                          ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                          : config.roleKey === 'responder'
                          ? 'bg-orange-500 hover:bg-orange-600 text-white'
                          : config.roleKey === 'analyst'
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary'
                    }`}
                  >
                    {QAIcon && <QAIcon className="w-3.5 h-3.5" />}
                    <span>{qa.label}</span>
                    {qa.primary && <ArrowRight className="w-3.5 h-3.5" />}
                  </Link>
                );
              })}

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold ts-card-subtle border ts-border text-slate-700 dark:text-slate-300 hover:ts-text-primary transition-all flex items-center space-x-1"
                >
                  <span>{t('roleBanner.changeView', 'Change View')}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isRoleMenuOpen && (
                  <div className="absolute left-0 mt-2 w-64 ts-card-elevated border ts-border rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold ts-text-subtle tracking-wider border-b ts-border">
                      {t('roleBanner.switchPersona', 'Switch Active Persona')}
                    </div>
                    {ALL_ROLES.map((r) => {
                      const RIcon = r.icon;
                      const isCurrent =
                        (user?.role?.toLowerCase() === r.id) ||
                        (!user?.role && r.id === 'user');
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleRoleSelect(r.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                            isCurrent
                              ? 'bg-orange-500/15 font-bold text-orange-400'
                              : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <RIcon className={`w-3.5 h-3.5 ${r.color}`} />
                            <span>{getLocalizedRoleLabel(r.id, r.label)}</span>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-orange-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => updateMode('compact')}
                className="text-xs ts-text-subtle hover:ts-text-muted transition-colors ml-2"
              >
                {t('roleBanner.showLessDetails', 'Switch to compact')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleWelcomeBanner;
