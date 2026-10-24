// Shared domain types for ClearDrive.

/** A single telemetry sample captured per analysis frame. */
export interface TelemetrySample {
  /** ms since trip start */
  t: number;
  /** wall-clock timestamp (ms epoch) */
  ts: number;
  /** Eye Aspect Ratio, ~0 (closed) to ~0.4 (wide open) */
  ear: number;
  /** Ambient/glare brightness proxy, 0..1 derived from frame luminance */
  glare: number;
  /** Composite eye-strain score, 0..100 */
  strain: number;
}

export type EventType = 'squint' | 'glare' | 'blink-burst' | 'closure';

/** A discrete strain event, anonymously geotagged for the civic map. */
export interface StrainEvent {
  id: string;
  type: EventType;
  /** wall-clock timestamp (ms epoch) */
  ts: number;
  strain: number;
  glare: number;
  ear: number;
  lat: number;
  lng: number;
  /** human-readable location label (coarse, privacy-safe) */
  roadLabel: string;
}

/** Driver-facing alert state. */
export type AlertLevel = 'ok' | 'caution' | 'alert';

export interface RestStop {
  name: string;
  distanceMi: number;
  etaMin: number;
  type: 'rest-area' | 'pull-off' | 'service-plaza';
}
