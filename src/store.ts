import { create } from 'zustand';
import type { AlertLevel, StrainEvent, TelemetrySample } from './types';
import { positionAlongRoute } from './lib/geo';

const MAX_SAMPLES = 1800; // ~hold a generous window of samples in memory

let eventCounter = 0;

interface ClearDriveState {
  // --- live signals (updated per analysis frame) ---
  tracking: boolean;
  faceDetected: boolean;
  ear: number;
  glare: number;
  strain: number;
  alert: AlertLevel;

  // --- trip ---
  tripStart: number | null;
  routeProgress: number; // 0..1 simulated position along route

  // --- buffers ---
  samples: TelemetrySample[];
  events: StrainEvent[];

  // --- derived counters ---
  squintCount: number;
  glareCount: number;
  alertCount: number;

  // actions
  startTrip: () => void;
  stopTrip: () => void;
  setFaceDetected: (v: boolean) => void;
  pushSample: (s: Omit<TelemetrySample, 't' | 'ts'>) => void;
  pushEvent: (
    e: Omit<StrainEvent, 'id' | 'ts' | 'lat' | 'lng' | 'roadLabel'>
  ) => void;
  setAlert: (a: AlertLevel) => void;
  seedDemoEvents: () => void;
  reset: () => void;
}

export const useStore = create<ClearDriveState>((set) => ({
  tracking: false,
  faceDetected: false,
  ear: 0,
  glare: 0,
  strain: 0,
  alert: 'ok',

  tripStart: null,
  routeProgress: 0,

  samples: [],
  events: [],

  squintCount: 0,
  glareCount: 0,
  alertCount: 0,

  startTrip: () =>
    set({ tracking: true, tripStart: Date.now(), routeProgress: 0 }),

  stopTrip: () => set({ tracking: false, faceDetected: false }),

  setFaceDetected: (v) => set({ faceDetected: v }),

  pushSample: (s) =>
    set((state) => {
      const now = Date.now();
      const t = state.tripStart ? now - state.tripStart : 0;
      // advance the simulated drive ~ over ~8 minutes of real time
      const progress = Math.min(1, state.routeProgress + 1 / (8 * 60 * 10));
      const sample: TelemetrySample = { ...s, t, ts: now };
      const samples = [...state.samples, sample];
      if (samples.length > MAX_SAMPLES) samples.shift();
      return { samples, routeProgress: progress };
    }),

  pushEvent: (e) =>
    set((state) => {
      const now = Date.now();
      const pos = positionAlongRoute(state.routeProgress);
      const event: StrainEvent = {
        ...e,
        id: `evt-${now}-${eventCounter++}`,
        ts: now,
        lat: pos.lat,
        lng: pos.lng,
        roadLabel: pos.label,
      };
      return {
        events: [...state.events, event],
        squintCount: state.squintCount + (e.type === 'squint' ? 1 : 0),
        glareCount: state.glareCount + (e.type === 'glare' ? 1 : 0),
      };
    }),

  setAlert: (a) =>
    set((state) => ({
      alert: a,
      alertCount: a === 'alert' && state.alert !== 'alert'
        ? state.alertCount + 1
        : state.alertCount,
    })),

  // Pre-populate the civic map with anonymized historical hotspots so the
  // heatmap is meaningful before a live trip generates data.
  seedDemoEvents: () => {
    const hotspots: { lat: number; lng: number; label: string; n: number }[] = [
      { lat: 42.16, lng: -72.0, label: 'I-90 E · Sturbridge', n: 14 },
      { lat: 42.27, lng: -71.7, label: 'I-90 E · Worcester', n: 22 },
      { lat: 42.34, lng: -71.25, label: 'I-90 E · Natick', n: 9 },
      { lat: 42.2, lng: -71.85, label: 'I-90 E · Charlton', n: 17 },
      { lat: 42.12, lng: -72.4, label: 'I-90 E · Wilbraham', n: 6 },
      { lat: 42.35, lng: -71.1, label: 'I-90 E · Newton', n: 11 },
    ];
    const events: StrainEvent[] = [];
    const now = Date.now();
    for (const h of hotspots) {
      for (let i = 0; i < h.n; i++) {
        const jitter = () => (Math.random() - 0.5) * 0.015;
        const glare = 0.55 + Math.random() * 0.4;
        const ear = 0.15 + Math.random() * 0.07;
        events.push({
          id: `seed-${h.label}-${i}`,
          type: Math.random() > 0.4 ? 'glare' : 'squint',
          ts: now - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 14),
          glare,
          ear,
          strain: 55 + Math.floor(Math.random() * 45),
          lat: h.lat + jitter(),
          lng: h.lng + jitter(),
          roadLabel: h.label,
        });
      }
    }
    set({ events });
  },

  reset: () =>
    set({
      samples: [],
      squintCount: 0,
      glareCount: 0,
      alertCount: 0,
      ear: 0,
      glare: 0,
      strain: 0,
      alert: 'ok',
      routeProgress: 0,
    }),
}));

/** Narrow selector to update live metrics without triggering counter churn. */
export function setLiveMetrics(ear: number, glare: number, strain: number) {
  useStore.setState({ ear, glare, strain });
}
