import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HeatCopilot } from './components/HeatCopilot';
import { Dashboard } from './pages/Dashboard';
import { LoadingState } from './components/LoadingState';
import { LocationProvider } from './context/LocationContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProfileProvider } from './context/ProfileContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationDecisionProvider } from './context/NotificationDecisionContext';

// Layout Wrappers
const CitizenLayout = lazy(() =>
  import('./layouts/CitizenLayout').then((m) => ({ default: m.CitizenLayout }))
);
const GovernmentLayout = lazy(() =>
  import('./layouts/GovernmentLayout').then((m) => ({ default: m.GovernmentLayout }))
);

// Code-split route components for instant initial bundle loading
const Forecast = lazy(() =>
  import('./pages/Forecast').then((m) => ({ default: m.Forecast }))
);

const RiskDetails = lazy(() =>
  import('./pages/RiskDetails').then((m) => ({ default: m.RiskDetails }))
);

const Alerts = lazy(() =>
  import('./pages/Alerts').then((m) => ({ default: m.Alerts }))
);

const CitizenHeatMap = lazy(() =>
  import('./pages/CitizenHeatMap').then((m) => ({ default: m.CitizenHeatMap }))
);


const Intervention = lazy(() =>
  import('./pages/Intervention').then((m) => ({ default: m.Intervention }))
);

const PersonalRisk = lazy(() =>
  import('./pages/PersonalRisk').then((m) => ({ default: m.PersonalRisk }))
);

const MunicipalMatrix = lazy(() =>
  import('./pages/MunicipalMatrix').then((m) => ({
    default: m.MunicipalMatrix,
  }))
);

const Auth = lazy(() =>
  import('./pages/Auth').then((m) => ({ default: m.Auth }))
);

const Profile = lazy(() =>
  import('./pages/Profile').then((m) => ({ default: m.Profile }))
);

const NotificationSettings = lazy(() =>
  import('./pages/NotificationSettings').then((m) => ({
    default: m.NotificationSettings,
  }))
);

// Government Portal Pages
const GovernmentDashboard = lazy(() =>
  import('./pages/government/GovernmentDashboard').then((m) => ({
    default: m.GovernmentDashboard,
  }))
);

const GovernmentMap = lazy(() =>
  import('./pages/government/GovernmentMap').then((m) => ({
    default: m.GovernmentMap,
  }))
);

const GovernmentHealthImpact = lazy(() =>
  import('./pages/government/GovernmentHealthImpact').then((m) => ({
    default: m.GovernmentHealthImpact,
  }))
);

const GovernmentDispatch = lazy(() =>
  import('./pages/government/GovernmentDispatch').then((m) => ({
    default: m.GovernmentDispatch,
  }))
);

const GovernmentReports = lazy(() =>
  import('./pages/government/GovernmentReports').then((m) => ({
    default: m.GovernmentReports,
  }))
);

const GovernmentHeatActionPlan = lazy(() =>
  import('./pages/government/GovernmentHeatActionPlan').then((m) => ({
    default: m.GovernmentHeatActionPlan,
  }))
);

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ProfileProvider>
            <LocationProvider>
              <NotificationDecisionProvider>
                <Router
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                  }}
                >
                  <div className="min-h-screen flex flex-col font-sans selection:bg-orange-500 selection:text-white transition-colors duration-200">
                    {/* Top Navigation: Portal & Role Aware */}
                    <Navbar />

                    {/* Main Content Viewport */}
                    <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                      <Suspense
                        fallback={<LoadingState message="Loading module..." />}
                      >
                        <Routes>
                          {/* ========================================================= */}
                          {/* 1. CITIZEN PORTAL ROUTES (Clean citizen experience)       */}
                          {/* ========================================================= */}
                          <Route element={<CitizenLayout />}>
                            {/* Citizen Home */}
                            <Route path="/" element={<Dashboard />} />

                            {/* Personal Heat Stress */}
                            <Route
                              path="/personal-risk"
                              element={<PersonalRisk />}
                            />
                            <Route
                              path="/individual-risk"
                              element={<PersonalRisk />}
                            />

                            {/* Alerts & Safety Directives */}
                            <Route path="/alerts" element={<Alerts />} />

                            {/* Forecast & Planning */}
                            <Route path="/forecast" element={<Forecast />} />

                            {/* Citizen Local Heat Map */}
                            <Route path="/heat-map" element={<CitizenHeatMap />} />
                            <Route path="/map" element={<CitizenHeatMap />} />


                            {/* Personal Profile & Settings */}
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/my-profile" element={<Profile />} />
                            <Route
                              path="/notification-settings"
                              element={<NotificationSettings />}
                            />
                            <Route
                              path="/notifications"
                              element={<NotificationSettings />}
                            />

                            {/* Legacy Aliases kept backward compatible */}
                            <Route
                              path="/risk-details"
                              element={<RiskDetails />}
                            />
                            <Route
                              path="/matrix"
                              element={<MunicipalMatrix />}
                            />
                            <Route
                              path="/municipal-matrix"
                              element={<MunicipalMatrix />}
                            />
                            <Route
                              path="/interventions"
                              element={<Intervention />}
                            />
                          </Route>

                          {/* ========================================================= */}
                          {/* 2. GOVERNMENT / AUTHORITY PORTAL ROUTES                   */}
                          {/* ========================================================= */}
                          <Route path="/gov" element={<GovernmentLayout />}>
                            <Route index element={<GovernmentDashboard />} />
                            <Route
                              path="dashboard"
                              element={<GovernmentDashboard />}
                            />
                            <Route path="map" element={<GovernmentMap />} />
                            <Route
                              path="health-impact"
                              element={<GovernmentHealthImpact />}
                            />
                            <Route
                              path="dispatch"
                              element={<GovernmentDispatch />}
                            />
                            <Route
                              path="action-plan"
                              element={<GovernmentHeatActionPlan />}
                            />
                            <Route
                              path="interventions"
                              element={<Intervention />}
                            />
                            <Route
                              path="matrix"
                              element={<MunicipalMatrix />}
                            />
                            <Route
                              path="reports"
                              element={<GovernmentReports />}
                            />
                          </Route>

                          {/* ========================================================= */}
                          {/* 3. AUTHENTICATION & ACCESS ROUTES                         */}
                          {/* ========================================================= */}
                          <Route
                            path="/login"
                            element={<Auth initialMode="login" />}
                          />
                          <Route
                            path="/register"
                            element={<Auth initialMode="register" />}
                          />
                          <Route
                            path="/signup"
                            element={<Auth initialMode="register" />}
                          />

                          {/* Fallback Catch-All */}
                          <Route
                            path="*"
                            element={<Navigate to="/" replace />}
                          />
                        </Routes>
                      </Suspense>
                    </main>

                    {/* Global Footer */}
                    <footer className="ts-card-elevated border-t ts-border py-6 text-center text-xs ts-text-muted">
                      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold ts-text-primary">
                            ThermoShield
                          </span>
                          <span>
                            — Smart India Hackathon 2026 Prototype (SIH26083)
                          </span>
                        </div>

                        <p className="text-[11px] ts-text-subtle">
                          Extreme Heatwave Early Warning & Biometeorological
                          Thermal Stress Engine
                        </p>
                      </div>
                    </footer>

                    {/* Shared Global Heat Copilot Assistant */}
                    <HeatCopilot />
                  </div>
                </Router>
              </NotificationDecisionProvider>
            </LocationProvider>
          </ProfileProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;