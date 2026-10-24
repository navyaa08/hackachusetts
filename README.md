# 🛡️ SafeStop V2X

**Hackathon:** Hackachusetts 2026 · UMass Amherst  
**Challenge Track:** Civic Action  
**Team members:** [Add all team member names — maximum 4]  
**Demo video:** [Add public YouTube/Vimeo/Facebook Video/Youku URL after uploading]  

---

An interactive, browser-based **digital twin** for highway emergency warning and
cooperative traffic response.

**The problem.** When a driver has to slow or stop suddenly on a highway (a medical
event, an eye emergency, a mechanical failure), hazard lights can only warn drivers who are close enough to see them. At
highway speed, drivers further back and in other lanes have no information and keep
their speed, which is how rear-end collisions and pileups happen.

**The idea.** With Vehicle-to-Everything (V2X) communication, a stopping vehicle can
broadcast a digital hazard advisory to nearby connected vehicles within communication range and to
roadside signs — including traffic that is still too far away to see the hazard.
Those drivers can receive earlier warnings and begin a coordinated slowdown,
subject to network conditions and traffic dynamics.

SafeStop V2X simulates this and shows it side by side against today's
"hazard-lights-only" reality, from **identical initial conditions**.

> ⚠️ **This is a simulation for demonstration and education only.** It is **not** a
> production vehicle safety controller, it performs **no medical diagnosis**, and it
> makes **no validated collision-prevention claim**. All parameters are plausible
> modeling assumptions, not calibrated real-world values.

---

## Run it

Clone the public repository (or download and extract its ZIP), then run:

```bash
git clone https://github.com/moonmoonmoonmoon/SafeStop-V2X.git
cd SafeStop-V2X
npm install
npm run dev      # start the dev server (Vite) → open the printed localhost URL
```

Other scripts:

```bash
npm test         # run the unit tests (Vitest)
npm run build    # typecheck + production build
npm run preview  # preview the production build
```

Requires Node 18+ (developed on Node 24).

---

## What you see

Two highways run in lockstep from the same seed and the same starting traffic:

- **Scenario A — Hazard lights only (today):** drivers only react once they can
  *visually* perceive the slowed/stopped hazard ahead, after a human reaction delay.
- **Scenario B — SafeStop V2X assisted:** connected vehicles also receive an early
  radio advisory — before they could see the hazard — and begin a smooth, graduated
  slowdown. Roadside variable-message signs light up to warn everyone, including
  unconnected cars.

A live **metrics dashboard** compares the two: collisions, minimum time-to-collision
(TTC), maximum braking deceleration, harsh-braking events, warning lead time,
pull-over completion time, and message delivery rate.

**Controls** let you change traffic density, mean speed, emergency timing, V2X
penetration, network latency, packet loss, communication range, and the random
seed, then **Apply & Replay** to rerun both scenarios deterministically. There is
also a manual **Driver SOS** button.

### Presentation mode

For a live pitch, use the two buttons in the blue **Presentation mode** bar:

- **🎬 Demo Preset** — loads the curated stress scenario (`DEMO_PRESET_CONFIG`) and
  starts the simulation. The two scenarios use the same seed and initial traffic.
  The following values were observed in the October 24, 2026 demo screenshot;
  **verify them again before recording**, since results may change if the code
  or configuration changes:

  | Metric | Hazard lights only | SafeStop V2X |
  | --- | ---: | ---: |
  | Collisions | **2** | **0** |
  | Minimum time-to-collision | **0.0 s** | **1.9 s** |
  | Maximum braking | 8.0 m/s² | 8.0 m/s² |
  | Harsh-braking events | 3 | 3 |
  | Warning lead time | 0.0 s (no V2X warning) | **13.3 s** |
  | Pull-over completion | Not completed in the observed run | **13.5 s** |
  | Message delivery | N/A — no V2X messages | **95%** |

  **How to read these results:** In this simulated stress test, the V2X-assisted
  scenario had fewer collisions, a higher minimum TTC, and a completed shoulder
  pull-over. The two scenarios did **not** differ in maximum braking or the
  number of harsh-braking events. The baseline UI may display 100% message
  delivery, but that is not a meaningful delivery success rate when no V2X
  messages are sent; it should be treated as **N/A**, not as a baseline advantage.
  Warning lead time is measured from the first V2X warning to the emergency
  vehicle reaching near-stop; it does not mean every vehicle receives the warning
  13.3 seconds in advance. These are **simulation outcomes, not real-world safety
  validation**.

- **🔁 Reset Demo** — replays the current scenario from t=0 so you can run it again
  on stage. Because the sim is deterministic, every replay is identical.

These numbers are produced by the simulation each run (read from
`MetricsAccumulator`), not hardcoded. The `DEMO_PRESET_CONFIG` behavior is covered by
`src/sim/__tests__/simulation.test.ts` as described in the existing project
tests. Re-run `npm test` to confirm the checked-in implementation and its
assertions match the final demo.

---

## How it works (architecture)

The code is split into a framework-free, deterministic **simulation core** and a
thin **React visualization** layer. The four concerns are kept modular:

| Concern            | Where                                   |
| ------------------ | --------------------------------------- |
| Detection          | `src/sim/driverState.ts`                |
| Communication      | `src/sim/v2x.ts`, `src/sim/rsu.ts`      |
| Vehicle dynamics   | `src/sim/idm.ts`, `src/sim/vehicle.ts`  |
| Visualization      | `src/render/`, `src/ui/`                |
| Orchestration      | `src/sim/world.ts`, `src/sim/simulation.ts` |

```
src/
  sim/
    types.ts         shared domain types + disclaimer
    constants.ts     ALL documented modeling assumptions (see below)
    rng.ts           seeded RNG (deterministic replay)
    idm.ts           Intelligent Driver Model car-following
    vehicle.ts       longitudinal dynamics, bounded braking
    driverState.ts   Normal → Suspected → Confirmed state machine
    v2x.ts           message bus: range, latency, packet loss, expiration
    rsu.ts           roadside units + variable message signs (V2I)
    metrics.ts       collisions, TTC, braking, lead time, delivery rate
    scenario.ts      deterministic initial fleet (identical for both worlds)
    world.ts         one scenario's per-tick orchestration
    simulation.ts    runs both worlds in lockstep + DEFAULT_CONFIG
    __tests__/       Vitest unit tests
  render/HighwayCanvas.tsx   Canvas renderer for one scenario
  ui/                controls + metrics dashboard
  App.tsx            fixed-timestep loop, side-by-side layout
```

### Driver-state machine (safety-honest detection)

`Normal → Suspected → Confirmed`. Key guarantees, covered by unit tests:

- Ordinary **brief signals (a blink, a quick eye rub) never leave Normal** — they
  are filtered by an ignore threshold.
- **`Suspected` never triggers an external broadcast.** It is an internal state.
- Only **`Confirmed`** broadcasts a hazard.
- The **manual SOS** button forces `Confirmed` immediately and latches (the driver
  is the authority).

Detection is an abstract boolean input, so an optional webcam/MediaPipe eye monitor
can later feed the same state machine without changing any downstream logic.

### Cooperative response (safety-honest dynamics)

- Following vehicles use the **IDM** car-following model.
- Connected vehicles that receive a V2X advisory react **earlier** (shorter
  reaction delay) and ease into a **graduated** slowdown — they do **not** teleport
  and do **not** brake beyond physical limits.
- All braking is bounded by a hard physical limit (`MAX_EMERGENCY_DECEL`).
- The honest mechanism behind the contrast: V2X reaches vehicles **beyond visual
  range**, so they start slowing before they could ever see the hazard. In the
  hazard-only world those same vehicles keep full speed until the last moment.

### Emergency pull-over maneuver

The impaired driver does not just stop dead in a travel lane — they attempt to
**pull over to the shoulder**, which is the realistic and safer behavior:

- The emergency vehicle eases to a **request speed** and seeks to move one lane
  right at a time toward a clearly marked **shoulder**.
- It changes lanes **only when a safe gap exists** in the target lane (both a
  front gap and a larger rear gap, `SAFE_MERGE_GAP`). If no safe gap exists, the
  maneuver **waits** — it is never forced. A lane change already in progress is
  **aborted** back to waiting if the target gap stops being safe.
- Lateral motion is continuous (`laneF`) at a bounded `LANE_CHANGE_RATE`, so the
  car visibly slides across lanes rather than teleporting.
- It stops on the shoulder, clearing the travel lane.

### Cooperative gap-creation (V2X only)

When a connected vehicle in the target lane receives the advisory and is the
emergency car's intended rear neighbor, it **yields**: it eases below the
emergency car's speed to open the required merge gap (`YIELD_DECEL`). This is a
mild, bounded speed reduction — not hard braking. In the recorded demo, the V2X scenario completes the shoulder pull-over
in **13.5 s**, while the hazard-only scenario does **not complete it during the
observed run**. This comparison is specific to the demo configuration.

### Why max braking reads 8.0 m/s² in both scenarios

`MAX_EMERGENCY_DECEL` (8.0 m/s², ~0.8 g) is a hard physical clamp on braking. In
both scenarios at least one vehicle (a late-reacting follower, or in the stress
preset the car that ultimately crashes) hits that clamp, so the **peak** braking
is identical. The **harsh-braking events** metric counts braking above
`HARSH_BRAKING_THRESHOLD` while time-to-collision is below `NEAR_MISS_TTC`.
In the recorded demo, this count was **3 in both scenarios**, so the result does
not demonstrate an improvement on this metric.

### Deterministic replay

The entire core draws randomness from a single seeded RNG and advances on a fixed
timestep, so the **same config + seed reproduces a run exactly**. Both scenarios are
built from the same initial traffic; the comparison isolates the modeled V2X
communication and the resulting cooperative responses.

---

## Documented assumptions & parameters

All values live in `src/sim/constants.ts` and `DEFAULT_CONFIG` in
`src/sim/simulation.ts`. They are plausible modeling choices, **not** calibrated
real-world data.

| Parameter | Value | Meaning |
| --- | --- | --- |
| `DT` | 0.05 s | fixed physics timestep (20 Hz) |
| IDM max accel | 1.5 m/s² | comfortable acceleration |
| IDM comfort decel | 2.0 m/s² | comfortable braking |
| IDM min gap | 2.0 m | standstill bumper gap |
| IDM time headway | 1.5 s | desired following time |
| `MAX_EMERGENCY_DECEL` | 8.0 m/s² | hard braking limit (~0.8 g) |
| `VEHICLE_LENGTH` | 4.5 m | vehicle length |
| `REACTION.visual` | 1.2 s | reaction to a visual hazard cue |
| `REACTION.v2xAdvisory` | 0.6 s | reaction to an in-cabin V2X alert |
| `ADVISORY_SPEED` | 8.0 m/s | advised crawl speed past hazard |
| `HAZARD_DECEL` | 6.0 m/s² | hazard vehicle's own braking |
| `VISUAL_RANGE` | 120 m | distance a driver can perceive the hazard |
| `HARSH_BRAKING_THRESHOLD` | 4.0 m/s² | braking above this counts toward harsh events |
| `NEAR_MISS_TTC` | 2.5 s | TTC below which a harsh brake counts as a near-miss |
| `PULLOVER_REQUEST_SPEED` | 12.0 m/s | speed the emergency car rolls at while seeking a gap |
| `PULLOVER_DECEL` | 3.0 m/s² | emergency car easing toward request speed |
| `LANE_CHANGE_RATE` | 0.5 lane/s | lateral speed of a lane change (~2 s per lane) |
| `SAFE_MERGE_GAP.front` | 12.0 m | min front gap required to start a lane change |
| `SAFE_MERGE_GAP.rear` | 16.0 m | min rear gap required to start a lane change |
| `YIELD_DECEL` | 3.5 m/s² | gentle easing a connected car uses to open a merge gap |
| `DETECTION.ignoreBelow` | 0.4 s | below this, signals never leave Normal |
| `DETECTION.confirmAfter` | 0.5 s | sustained signal to confirm & broadcast |
| `DETECTION.clearAfter` | 1.5 s | signal-clear time to de-escalate |
| `v2xPenetration` (default) | 0.7 | fraction of connected vehicles |
| `networkLatency` (default) | 0.1 s | one-way V2X delivery delay |
| `packetLoss` (default) | 0.05 | per-message drop probability |
| `commRange` (default) | 400 m | V2X / RSU communication range |
| `messageLifetime` (default) | 10 s | advisory validity window |

Units are SI throughout the core: meters, m/s, m/s², seconds. (31 m/s ≈ 70 mph.)

The V2X layer is an **abstraction** of real standards (the hazard message mirrors
the intent of ETSI DENM / SAE J2735 advisories). It models range, latency, packet
loss, and message expiration — it is **not** an RF propagation model and does not
simulate interference or congestion control.

---

## Tests

```bash
npm test
```

Covers the emergency-state transitions (including that brief signals and `Suspected`
never broadcast, and SOS latches), V2X delivery under latency / loss / expiration,
the traffic/safety metrics (including the near-miss harsh-braking definition and
pull-over completion time), deterministic replay, identical initial conditions
across scenarios, bounded braking, the safety-constrained pull-over (no lane
change without a safe gap; no overlap/teleport during the change; reaches the
shoulder when safe; stays waiting when not), and the intended V2X safety contrast.

### Limitations (educational prototype)

This is a **longitudinal, single-corridor microscopic model** with deliberately
simplified behavior. It is **not** a production vehicle safety system. Known
simplifications: ordinary background traffic does not make discretionary lane
changes (only the emergency vehicle changes lanes); the V2X layer models
range/latency/loss/expiration but not RF propagation, interference, or congestion
control; perception is a simplified same-lane line-of-sight model; and the
pull-over, yielding, and gap-acceptance rules are hand-tuned safety-constrained
heuristics, not validated vehicle-control logic. No medical diagnosis or validated
collision-prevention claim is made.

---

## Roadmap

The core simulation and side-by-side comparison are the deliverable. A planned,
optional next step is a **webcam-based MediaPipe eye monitor** that feeds the same
driver-state machine as an additional detection source — to be added only after the
core demo is stable, and strictly as an *internal* signal subject to the same
"brief signals never broadcast / Suspected never broadcasts" guarantees.

---

## How Kiro was used

We used **Kiro IDE** to build and iteratively refine SafeStop V2X. We provided
project requirements and follow-up feedback to help implement the interactive
traffic simulation, V2X communication, roadside signs, presentation controls,
and comparative safety metrics. We also used Kiro to inspect the existing
code and document the actual architecture and requirements.

The repository includes these project-specific Kiro artifacts:

- `.kiro/steering/project.md` — project context, technical architecture, and
  development conventions for Kiro.
- `.kiro/specs/safestop-v2x/requirements.md` — documented functional
  requirements.
- `.kiro/specs/safestop-v2x/design.md` — documented technical design.

The steering and spec documents were created/refined after the initial
prototype, to accurately capture the implementation and support subsequent
review. We do **not** claim that the entire project was originally built with
a formal spec-driven workflow, or that we used hooks, MCP, property-based
testing, or Kiro Powers unless separately verified.

## Hackathon submission information

- **Track:** Civic Action
- **Team:** [Yanan Zhang, Gauri Kukreti, Navya Arora, Roma Nair]
- **Team representative:** [Yanan Zhang]
- **Public demo video:** [https://youtu.be/jyHVcv5qWn8]
- **Public source repository:** https://github.com/navyaa08/hackachusetts
- **Kiro artifacts:** `.kiro/steering/` and `.kiro/specs/safestop-v2x/`

Before submitting, verify that the **selected public repository** contains
all source files, assets, instructions, and the `.kiro` directory at its root;
that `npm install`, `npm test`, and `npm run build` work; and that the public
video shows the application running. If the team submits a different GitHub
repository, replace the repository URL and clone command above.
