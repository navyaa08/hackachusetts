# ClearDrive 🚗👁️

**Hackachusetts @ UMass Amherst · Oct 2026**

A privacy-first smart driving assistant that detects **acute eye strain and glare** —
not just drowsiness — warns the driver in real time, and anonymously maps where
strain happens so cities can build safer roads.

> 🔒 **All video processing runs on-device.** Your face video is never recorded,
> stored, or uploaded. Only derived numbers (a strain score, a coarse ~1 km
> location, an event type) ever leave the browser — and only to power the civic map.

---

## Why it's different

Most "driver monitoring" only catches one thing: falling asleep (slow, sustained
eye closure). ClearDrive also catches **acute strain** — squinting against
high-beam glare, low sun, or bad signage — by combining the **Eye Aspect Ratio
(EAR)** with a **frame-luminance glare index**. Then it turns those events into a
**civic heatmap** for the DOT, so the outcome isn't just "blame the driver" — it's
"fix the road."

| | Typical drowsiness detector | ClearDrive |
|---|---|---|
| Primary signal | Slow eye closure only | Acute squint + glare + closure |
| Glare awareness | None | Frame-luminance glare index |
| Civic value | None | Maps strain hotspots for DOT |
| Privacy | Often cloud video | 100% on-device |

---

## The four components

1. **Driver HUD** (`/hud`) — Webcam-based live eye tracking. Computes EAR + glare
   per frame, shows an eye-strain index, raises visual + spoken alerts
   ("Your eyes need a break"), and suggests the nearest safe rest stop.
2. **Civic Road-Safety Heatmap** (`/map`) — Leaflet map for city planners / DOT.
   Anonymized strain events become a heatmap + ranked hotspots with suggested
   interventions (e.g., add glare-reducing lighting).
3. **Trip Telemetry & Event Logger** (`/telemetry`) — Recharts dashboards:
   strain over time, glare-vs-squint correlation, events by time of day, and a
   live event log.
4. **Pitch & Architecture Deck** (`/pitch`) — A judge-facing slide deck explaining
   the problem, privacy model, differentiation, and system architecture.

---

## How the detection works

- **Eye Aspect Ratio (EAR)** — from MediaPipe FaceMesh landmarks, using the
  Soukupová & Čech formula: `EAR = (|p2-p6| + |p3-p5|) / (2·|p1-p4|)`.
  ~0.3–0.4 open, ~0.0 closed.
- **Glare index** — mean + peak luminance (Rec. 601 luma) of the upper-center
  region of the frame, where windshield glare / oncoming headlights land.
- **Strain score (0–100)** — blends *squinting* (EAR narrowed but not a full
  blink) with *glare*, with a synergy term so the two reinforce each other.
  Full blinks and sustained closures are handled separately (the latter is
  flagged as drowsiness, a distinct event type).

All of this is in [`src/lib/eyeMetrics.ts`](src/lib/eyeMetrics.ts) as pure,
testable functions.

---

## Tech stack

- **React 18 + TypeScript + Vite**
- **MediaPipe `tasks-vision`** — in-browser FaceMesh (WebGL/WASM), on-device
- **Leaflet + leaflet.heat** — civic heatmap on OpenStreetMap tiles (no API key)
- **Recharts** — telemetry charts
- **Zustand** — shared state across the four views
- **Web Speech API** — spoken driver warning
- **Tailwind CSS** — styling

---

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Build / preview a production bundle:

```bash
npm run build
npm run preview
```

> **Camera note:** `getUserMedia` requires a secure context. `localhost` is
> treated as secure, so local dev works out of the box. If you deploy, serve over
> HTTPS. Grant camera permission when the Driver HUD asks, then press
> **Start Drive**. The MediaPipe model + WASM load from the official CDN on first
> run, so the first start needs a network connection.

---

## Privacy architecture

| Stays local (never leaves device) | Optionally leaves — anonymized |
|---|---|
| Webcam video stream | Strain score (a number) |
| Face landmarks | Coarse ~1 km location |
| EAR computation | Event type & timestamp |
| Glare sampling | **No identity, no video** |

Locations are coarsened to a ~1 km grid (`coarsen()` in
[`src/lib/geo.ts`](src/lib/geo.ts)) before an event is ever stored or mapped.

---

## Project structure

```
src/
  lib/
    eyeMetrics.ts      # EAR, glare, strain math (pure functions)
    geo.ts             # route sim, coarse geolocation, rest-stop lookup
    useFaceTracker.ts  # MediaPipe + per-frame analysis loop
    useVoiceAlert.ts   # Web Speech API warning
  views/
    DriverHUD.tsx      # Component 1
    CivicHeatmap.tsx   # Component 2
    TripTelemetry.tsx  # Component 3
    PitchDeck.tsx      # Component 4
  components/ui.tsx    # shared UI primitives
  store.ts             # Zustand store (shared state)
  types.ts             # domain types
  App.tsx              # shell + nav + routes
  main.tsx             # entry
```

---

*ClearDrive — safer drivers today, safer roads tomorrow.*
