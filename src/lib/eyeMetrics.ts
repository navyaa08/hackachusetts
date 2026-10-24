// Eye-strain detection math. Pure functions, no DOM, so it stays testable
// and framework-agnostic.
//
// Core idea (what makes ClearDrive different from a drowsiness detector):
//   - Drowsiness  = sustained, slow eye *closure* (EAR low for a long time).
//   - Eye strain  = acute *squinting* (EAR partially reduced) that spikes,
//                   often correlated with high ambient brightness (glare).
// We score both, but the primary signal we surface is acute strain/glare.

/**
 * MediaPipe FaceMesh landmark indices for the eyes (468-point model).
 * Each eye uses 6 canonical points to compute the Eye Aspect Ratio.
 * Order: [p1 (outer corner), p2, p3 (upper lid), p4 (inner corner), p5, p6 (lower lid)]
 */
export const LEFT_EYE = [33, 160, 158, 133, 153, 144];
export const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

export interface Point {
  x: number;
  y: number;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Eye Aspect Ratio (Soukupová & Čech, 2016):
 *   EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 * Returns ~0.0 when closed, ~0.3-0.4 when wide open.
 */
export function eyeAspectRatio(pts: Point[]): number {
  if (pts.length !== 6) return 0;
  const [p1, p2, p3, p4, p5, p6] = pts;
  const vertical = dist(p2, p6) + dist(p3, p5);
  const horizontal = 2 * dist(p1, p4);
  if (horizontal === 0) return 0;
  return vertical / horizontal;
}

/** Average EAR across both eyes given the full landmark array. */
export function computeEAR(landmarks: Point[]): number {
  const left = LEFT_EYE.map((i) => landmarks[i]).filter(Boolean);
  const right = RIGHT_EYE.map((i) => landmarks[i]).filter(Boolean);
  if (left.length !== 6 || right.length !== 6) return 0;
  return (eyeAspectRatio(left) + eyeAspectRatio(right)) / 2;
}

// --- Calibration thresholds (tuned for typical webcam distance) ---
export const EAR_OPEN = 0.3; // comfortably open baseline
export const EAR_SQUINT = 0.21; // partially narrowed -> squinting
export const EAR_CLOSED = 0.14; // effectively shut -> blink / closure
export const GLARE_HIGH = 0.62; // normalized frame luminance considered "bright"

/**
 * Sample mean luminance of a region of a frame as a 0..1 glare proxy.
 * We bias toward the *upper-center* of the frame (where windshield glare and
 * oncoming headlights land) and toward the brightest pixels.
 */
export function computeGlare(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number {
  // Region of interest: top 60% vertically, central 70% horizontally.
  const x0 = Math.floor(width * 0.15);
  const x1 = Math.floor(width * 0.85);
  const y0 = 0;
  const y1 = Math.floor(height * 0.6);
  const step = 4 * 3; // subsample every 3rd pixel for performance

  let sum = 0;
  let peak = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * width + x) * 4;
      if (idx % step !== 0) continue;
      // Rec. 601 luma
      const lum =
        (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) /
        255;
      sum += lum;
      if (lum > peak) peak = lum;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  // Blend mean brightness with peak to catch concentrated glare sources.
  return Math.min(1, mean * 0.6 + peak * 0.4);
}

/**
 * Composite strain score 0..100.
 * Rewards squinting (EAR below the open baseline but not fully closed) and
 * high glare, while NOT treating a normal full blink as strain.
 */
export function strainScore(ear: number, glare: number): number {
  // Squint component: how far EAR has narrowed from open baseline,
  // clamped so a full closure (blink) doesn't dominate the score.
  const narrowed = Math.max(0, EAR_OPEN - ear);
  const squintRange = EAR_OPEN - EAR_SQUINT; // the "strain" band
  let squintComp = Math.min(1, narrowed / (squintRange * 1.6));

  // De-emphasize momentary full closures (blinks) in the squint component.
  if (ear < EAR_CLOSED) squintComp *= 0.5;

  // Glare component, emphasized above the high-glare threshold.
  const glareComp =
    glare < GLARE_HIGH
      ? (glare / GLARE_HIGH) * 0.5
      : 0.5 + ((glare - GLARE_HIGH) / (1 - GLARE_HIGH)) * 0.5;

  // Weighted blend; glare and squint reinforce each other.
  const base = squintComp * 55 + glareComp * 35;
  const synergy = squintComp * glareComp * 10;
  return Math.round(Math.min(100, base + synergy));
}

/** Exponential moving average helper for smoothing noisy per-frame signals. */
export function ema(prev: number, next: number, alpha = 0.3): number {
  return prev + alpha * (next - prev);
}
