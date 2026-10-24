import { useState } from 'react';
import { Panel } from '../components/ui';

interface Slide {
  title: string;
  render: () => JSX.Element;
}

export default function PitchDeck() {
  const [i, setI] = useState(0);
  const slides = SLIDES;
  const slide = slides[i];

  return (
    <div className="max-w-4xl mx-auto">
      <Panel>
        <div className="min-h-[460px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-widest text-accent">
              ClearDrive · Pitch
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {i + 1} / {slides.length}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-5">
            {slide.title}
          </h2>
          <div className="flex-1">{slide.render()}</div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
            <button
              onClick={() => setI((v) => Math.max(0, v - 1))}
              disabled={i === 0}
              className="px-4 py-2 rounded-lg bg-panel2 text-slate-300 disabled:opacity-40 hover:bg-panel2/70 transition"
            >
              ← Back
            </button>
            <div className="flex gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  className={`w-2 h-2 rounded-full transition ${
                    idx === i ? 'bg-accent w-5' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setI((v) => Math.min(slides.length - 1, v + 1))}
              disabled={i === slides.length - 1}
              className="px-4 py-2 rounded-lg bg-accent text-night font-semibold disabled:opacity-40 hover:brightness-110 transition"
            >
              Next →
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-accent mt-1">▸</span>
      <span className="text-slate-300">{children}</span>
    </li>
  );
}

const SLIDES: Slide[] = [
  {
    title: 'The Problem: Acute Eye Strain, Not Just Drowsiness',
    render: () => (
      <div className="space-y-5">
        <p className="text-slate-300 leading-relaxed">
          Most &ldquo;driver monitoring&rdquo; only catches one failure mode:
          falling asleep. But a huge share of near-misses come from{' '}
          <span className="text-accent font-medium">acute eye strain</span> —
          blinding high-beam glare, low sun, poorly lit interchanges, and
          squinting to read bad signage.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <StatCard big="~50%" small="of serious crashes happen after dark" />
          <StatCard big="3,800+" small="deaths/yr linked to drowsy & distracted driving (NHTSA est.)" />
          <StatCard big="0" small="tools that map WHERE strain happens" />
        </div>
        <p className="text-xs text-slate-500">
          Figures illustrative for pitch context.
        </p>
      </div>
    ),
  },
  {
    title: 'The Solution: ClearDrive',
    render: () => (
      <ul className="space-y-3">
        <Bullet>
          A webcam-based assistant that measures your{' '}
          <span className="text-accent">Eye Aspect Ratio</span> and ambient
          glare in real time.
        </Bullet>
        <Bullet>
          Detects acute squinting + glare (strain), <em>and</em> sustained
          closure (drowsiness) — two different problems.
        </Bullet>
        <Bullet>
          Warns the driver instantly (visual + voice: &ldquo;Your eyes need a
          break&rdquo;) and suggests the nearest safe pull-off.
        </Bullet>
        <Bullet>
          Anonymously pins <em>where</em> strain happened so cities can fix the
          road, not just blame the driver.
        </Bullet>
      </ul>
    ),
  },
  {
    title: 'Privacy by Architecture',
    render: () => (
      <div className="space-y-5">
        <div className="rounded-xl bg-safe/10 ring-1 ring-safe/30 p-4">
          <div className="font-semibold text-safe mb-1">
            🔒 Your face never leaves this device
          </div>
          <p className="text-sm text-slate-300">
            All video and landmark processing runs in-browser via MediaPipe
            FaceMesh (WebGL/WASM). We never record, store, or upload a single
            frame.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FlowCard
            title="What stays local"
            items={['Webcam video stream', 'Face landmarks', 'EAR computation', 'Glare sampling']}
            tone="safe"
          />
          <FlowCard
            title="What (optionally) leaves — anonymized"
            items={['Strain score (a number)', 'Coarse ~1km location', 'Event type & timestamp', 'NO identity, NO video']}
            tone="accent"
          />
        </div>
      </div>
    ),
  },
  {
    title: 'Why We&rsquo;re Different',
    render: () => (
      <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel2 text-slate-300">
              <th className="text-left px-4 py-3"></th>
              <th className="text-left px-4 py-3">Typical drowsiness detector</th>
              <th className="text-left px-4 py-3 text-accent">ClearDrive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <CompareRow label="Primary signal" a="Slow eye closure only" b="Acute squint + glare + closure" />
            <CompareRow label="Glare awareness" a="None" b="Frame-luminance glare index" />
            <CompareRow label="Civic value" a="None" b="Maps strain hotspots for DOT" />
            <CompareRow label="Privacy" a="Often cloud video" b="100% on-device" />
            <CompareRow label="Outcome" a="Blames the driver" b="Fixes the road too" />
          </tbody>
        </table>
      </div>
    ),
  },
  {
    title: 'System Architecture',
    render: () => (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ArchBox
            step="1 · Capture"
            color="accent"
            lines={['Webcam → <video>', 'getUserMedia', 'On-device only']}
          />
          <ArchBox
            step="2 · Analyze"
            color="warn"
            lines={['MediaPipe FaceMesh', 'EAR + glare math', 'Strain scoring (WASM/GPU)']}
          />
          <ArchBox
            step="3 · Act & Aggregate"
            color="safe"
            lines={['HUD alert + voice', 'Rest-stop suggest', 'Anon event → heatmap']}
          />
        </div>
        <div className="rounded-xl bg-panel2 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">
            Stack
          </div>
          <div className="flex flex-wrap gap-2">
            {['React', 'TypeScript', 'Vite', 'MediaPipe tasks-vision', 'Leaflet + heat', 'Recharts', 'Zustand', 'Web Speech API'].map(
              (t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-lg bg-night text-xs text-slate-300 ring-1 ring-white/10"
                >
                  {t}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'The Ask & Roadmap',
    render: () => (
      <div className="space-y-5">
        <ul className="space-y-3">
          <Bullet>
            <span className="text-accent">Now:</span> working on-device HUD,
            telemetry, and civic heatmap (this demo).
          </Bullet>
          <Bullet>
            <span className="text-accent">Next:</span> real GPS + OBD-II tie-in,
            partner with a DOT for a pilot corridor.
          </Bullet>
          <Bullet>
            <span className="text-accent">Later:</span> dashcam-integrated
            edge device; open civic strain-data API for planners.
          </Bullet>
        </ul>
        <div className="rounded-xl bg-accent/10 ring-1 ring-accent/30 p-5 text-center">
          <div className="text-lg font-semibold text-slate-100">
            Safer drivers today. Safer roads tomorrow.
          </div>
          <div className="text-sm text-accent mt-1">ClearDrive</div>
        </div>
      </div>
    ),
  },
];

function StatCard({ big, small }: { big: string; small: string }) {
  return (
    <div className="rounded-xl bg-panel2 p-4 text-center">
      <div className="text-2xl font-bold text-accent font-mono">{big}</div>
      <div className="text-xs text-slate-400 mt-1">{small}</div>
    </div>
  );
}

function FlowCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'safe' | 'accent';
}) {
  return (
    <div
      className={`rounded-xl p-4 ring-1 ${
        tone === 'safe' ? 'bg-safe/5 ring-safe/20' : 'bg-accent/5 ring-accent/20'
      }`}
    >
      <div
        className={`text-sm font-semibold mb-2 ${
          tone === 'safe' ? 'text-safe' : 'text-accent'
        }`}
      >
        {title}
      </div>
      <ul className="space-y-1 text-sm text-slate-300">
        {items.map((it) => (
          <li key={it}>• {it}</li>
        ))}
      </ul>
    </div>
  );
}

function CompareRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr>
      <td className="px-4 py-3 text-slate-400">{label}</td>
      <td className="px-4 py-3 text-slate-400">{a}</td>
      <td className="px-4 py-3 text-slate-100 font-medium">{b}</td>
    </tr>
  );
}

function ArchBox({
  step,
  lines,
  color,
}: {
  step: string;
  lines: string[];
  color: 'accent' | 'warn' | 'safe';
}) {
  const ring =
    color === 'accent'
      ? 'ring-accent/30'
      : color === 'warn'
        ? 'ring-warn/30'
        : 'ring-safe/30';
  const text =
    color === 'accent'
      ? 'text-accent'
      : color === 'warn'
        ? 'text-warn'
        : 'text-safe';
  return (
    <div className={`rounded-xl bg-panel2 p-4 ring-1 ${ring}`}>
      <div className={`text-sm font-semibold mb-2 ${text}`}>{step}</div>
      <ul className="space-y-1 text-xs text-slate-300 font-mono">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
