import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import DriverHUD from './views/DriverHUD';
import CivicHeatmap from './views/CivicHeatmap';
import TripTelemetry from './views/TripTelemetry';
import PitchDeck from './views/PitchDeck';
import { useStore } from './store';

const TABS = [
  { to: '/hud', label: 'Driver HUD', icon: '👁️' },
  { to: '/map', label: 'Civic Heatmap', icon: '🗺️' },
  { to: '/telemetry', label: 'Trip Telemetry', icon: '📈' },
  { to: '/pitch', label: 'Pitch & Architecture', icon: '🎤' },
];

export default function App() {
  const seedDemoEvents = useStore((s) => s.seedDemoEvents);
  const eventsLen = useStore((s) => s.events.length);
  const tracking = useStore((s) => s.tracking);
  const alert = useStore((s) => s.alert);

  // seed historical civic data once on first load
  useEffect(() => {
    if (eventsLen === 0) seedDemoEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-[500] backdrop-blur bg-night/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent/20 grid place-items-center text-lg">
              🚗
            </div>
            <div>
              <div className="font-bold text-slate-100 leading-tight">
                ClearDrive
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                strain-aware · privacy-first
              </div>
            </div>
          </div>

          <nav className="ml-auto flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-accent/15 text-accent'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`
                }
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </NavLink>
            ))}
          </nav>

          {tracking && (
            <span
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                alert === 'alert'
                  ? 'bg-danger/20 text-danger'
                  : alert === 'caution'
                    ? 'bg-warn/20 text-warn'
                    : 'bg-safe/20 text-safe'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulseGlow" />
              Live
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/hud" replace />} />
          <Route path="/hud" element={<DriverHUD />} />
          <Route path="/map" element={<CivicHeatmap />} />
          <Route path="/telemetry" element={<TripTelemetry />} />
          <Route path="/pitch" element={<PitchDeck />} />
          <Route path="*" element={<Navigate to="/hud" replace />} />
        </Routes>
      </main>

      <footer className="border-t border-white/5 py-3">
        <div className="max-w-7xl mx-auto px-4 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
          <span>🔒 All video processing runs on-device — nothing is uploaded.</span>
          <span className="ml-auto">ClearDrive · Hackachusetts 2026</span>
        </div>
      </footer>
    </div>
  );
}
