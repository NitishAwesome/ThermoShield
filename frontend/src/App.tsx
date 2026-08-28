import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { LoadingState } from './components/LoadingState';

// Code-split route components for instant initial bundle loading
const Forecast = lazy(() => import('./pages/Forecast').then((m) => ({ default: m.Forecast })));
const RiskDetails = lazy(() => import('./pages/RiskDetails').then((m) => ({ default: m.RiskDetails })));
const Alerts = lazy(() => import('./pages/Alerts').then((m) => ({ default: m.Alerts })));
const Intervention = lazy(() => import('./pages/Intervention').then((m) => ({ default: m.Intervention })));

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
        {/* Top Navigation */}
        <Navbar />

        {/* Main Content Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Suspense fallback={<LoadingState message="Loading module..." />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/forecast" element={<Forecast />} />
              <Route path="/risk-details" element={<RiskDetails />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/interventions" element={<Intervention />} />
            </Routes>
          </Suspense>
        </main>

        {/* Footer */}
        <footer className="bg-slate-900/90 border-t border-slate-800/80 py-6 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-200">ThermoShield</span>
              <span>— Smart India Hackathon 2026 Prototype (SIH26083)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Extreme Heatwave Early Warning & Biometeorological Thermal Stress Engine
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
