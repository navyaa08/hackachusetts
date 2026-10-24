// Geolocation + road-labeling helpers.
//
// Privacy note: we only ever keep COARSE locations. Even if the browser gives
// us precise GPS, we snap events to a coarse grid before storing/mapping them,
// and we never persist the raw video frame — only derived numbers.

import type { RestStop } from '../types';

/** A simulated drive route through western/central Massachusetts along I-90. */
export const ROUTE: { lat: number; lng: number; label: string }[] = [
  { lat: 42.1, lng: -72.59, label: 'I-90 E · Springfield' },
  { lat: 42.12, lng: -72.4, label: 'I-90 E · Wilbraham' },
  { lat: 42.14, lng: -72.2, label: 'I-90 E · Palmer' },
  { lat: 42.16, lng: -72.0, label: 'I-90 E · Sturbridge' },
  { lat: 42.2, lng: -71.85, label: 'I-90 E · Charlton' },
  { lat: 42.25, lng: -71.8, label: 'I-90 E · Auburn' },
  { lat: 42.27, lng: -71.7, label: 'I-90 E · Worcester' },
  { lat: 42.3, lng: -71.55, label: 'I-90 E · Westborough' },
  { lat: 42.32, lng: -71.45, label: 'I-90 E · Framingham' },
  { lat: 42.34, lng: -71.25, label: 'I-90 E · Natick' },
  { lat: 42.35, lng: -71.1, label: 'I-90 E · Newton' },
  { lat: 42.351, lng: -71.06, label: 'I-90 E · Boston' },
];

/** Snap a coordinate to a coarse ~1.1km grid for privacy. */
export function coarsen(lat: number, lng: number): { lat: number; lng: number } {
  const grid = 0.01; // ~1.1 km
  return {
    lat: Math.round(lat / grid) * grid,
    lng: Math.round(lng / grid) * grid,
  };
}

/** Interpolate a position along ROUTE given progress 0..1. Returns coarse loc + label. */
export function positionAlongRoute(progress: number): {
  lat: number;
  lng: number;
  label: string;
} {
  const p = Math.min(0.9999, Math.max(0, progress));
  const seg = p * (ROUTE.length - 1);
  const i = Math.floor(seg);
  const frac = seg - i;
  const a = ROUTE[i];
  const b = ROUTE[Math.min(ROUTE.length - 1, i + 1)];
  const lat = a.lat + (b.lat - a.lat) * frac;
  const lng = a.lng + (b.lng - a.lng) * frac;
  const { lat: clat, lng: clng } = coarsen(lat, lng);
  return { lat: clat, lng: clng, label: a.label };
}

const REST_STOPS: { name: string; lat: number; lng: number; type: RestStop['type'] }[] =
  [
    { name: 'Charlton Service Plaza (Eastbound)', lat: 42.2, lng: -71.85, type: 'service-plaza' },
    { name: 'Lee Travel Plaza', lat: 42.3, lng: -73.23, type: 'service-plaza' },
    { name: 'Blandford Service Area', lat: 42.18, lng: -72.95, type: 'service-plaza' },
    { name: 'Natick Rest Area', lat: 42.34, lng: -71.25, type: 'rest-area' },
    { name: 'Framingham Pull-off', lat: 42.32, lng: -71.45, type: 'pull-off' },
    { name: 'Westborough Rest Area', lat: 42.3, lng: -71.55, type: 'rest-area' },
  ];

function haversineMi(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 3958.8; // miles
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Find the nearest rest stop ahead of the current position. */
export function nearestRestStop(lat: number, lng: number): RestStop {
  let best = REST_STOPS[0];
  let bestD = Infinity;
  for (const s of REST_STOPS) {
    const d = haversineMi(lat, lng, s.lat, s.lng);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  const avgSpeedMph = 62;
  return {
    name: best.name,
    distanceMi: Math.round(bestD * 10) / 10,
    etaMin: Math.max(1, Math.round((bestD / avgSpeedMph) * 60)),
    type: best.type,
  };
}
