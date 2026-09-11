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

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ProfileProvider>
            <LocationProvider>
              <Router
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <div className="min-h-screen flex flex-col font-sans selection:bg-orange-500 selection:text-white transition-colors duration-200">

                  {/* Top Navigation */}
                  <Navbar />

                  {/* Main Content Viewport */}
                  <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                    <Suspense
                      fallback={<LoadingState message="Loading module..." />}
                    >
                      <Routes>
                        <Route path="/" element={<Dashboard />} />

                        <Route path="/profile" element={<Profile />} />
                        <Route path="/my-profile" element={<Profile />} />

                        <Route
                          path="/personal-risk"
                          element={<PersonalRisk />}
                        />
                        <Route
                          path="/individual-risk"
                          element={<PersonalRisk />}
                        />

                        <Route path="/forecast" element={<Forecast />} />
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

                        <Route path="/alerts" element={<Alerts />} />
                        <Route
                          path="/interventions"
                          element={<Intervention />}
                        />

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

                        <Route
                          path="*"
                          element={<Navigate to="/" replace />}
                        />
                      </Routes>
                    </Suspense>
                  </main>

                  {/* Footer */}
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

                  {/* Global AI Heatwave Copilot Drawer */}
                  <HeatCopilot />
                </div>
              </Router>
            </LocationProvider>
          </ProfileProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;