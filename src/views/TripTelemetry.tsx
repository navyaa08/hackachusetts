import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useStore } from '../store';
import { Badge, Panel, Stat } from '../components/ui';
import type { EventType } from '../types';

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

const EVENT_META: Record<EventType, { label: string; tone: 'warn' | 'danger' | 'accent' | 'default'; icon: string }> = {
  squint: { label: 'Squint', tone: 'warn', icon: '😣' },
  glare: { label: 'Glare', tone: 'danger', icon: '☀️' },
  'blink-burst': { label: 'Blink burst', tone: 'accent', icon: '👁️' },
  closure: { label: 'Eye closure', tone: 'danger', icon: '😴' },
};

export default function TripTelemetry() {
  const samples = useStore((s) => s.samples);
  const events = useStore((s) => s.events);
  const tripStart = useStore((s) => s.tripStart);

  // downsample for charts (keep ~240 points)
  const series = useMemo(() => {
    if (samples.length === 0) return [];
    const stride = Math.max(1, Math.floor(samples.length / 240));
    const out = [];
    for (let i = 0; i < samples.length; i += stride) {
      const s = samples[i];
      out.push({
        t: s.t,
        tLabel: fmtTime(s.t),
        strain: s.strain,
        glare: Math.round(s.glare * 100),
        openness: Math.round((s.ear / 0.3) * 100),
      });
    }
    return out;
  }, [samples]);

  // glare vs squint correlation
  const scatter = useMemo(
    () =>
      series.map((s) => ({
        glare: s.glare,
        squint: Math.max(0, 100 - s.openness),
        strain: s.strain,
      })),
    [series]
  );

  // events by hour of day
  const byHour = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${h}:00`,
      count: 0,
    }));
    for (const e of events) {
      buckets[new Date(e.ts).getHours()].count++;
    }
    return buckets;
  }, [events]);

  const peakStrain = samples.reduce((m, s) => Math.max(m, s.strain), 0);
  const avgGlare =
    samples.length > 0
      ? Math.round(
          (samples.reduce((s, x) => s + x.glare, 0) / samples.length) * 100
        )
      : 0;
  const tripMin = tripStart
    ? Math.round((Date.now() - tripStart) / 60000)
    : 0;

  const tripEvents = [...events].filter((e) => !e.id.startsWith('seed')).reverse();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Samples" value={samples.length} tone="accent" />
        <Stat label="Peak strain" value={peakStrain} unit="/100" tone={peakStrain >= 70 ? 'danger' : 'warn'} />
        <Stat label="Avg glare" value={avgGlare} unit="%" tone={avgGlare > 55 ? 'danger' : 'safe'} />
        <Stat label="Trip length" value={tripMin} unit="min" />
      </div>

      <Panel
        title="Eye-Strain Over Time"
        subtitle="Second-by-second strain index during the trip"
      >
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={series} margin={{ left: -20, right: 10, top: 5 }}>
            <defs>
              <linearGradient id="strainFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2a44" />
            <XAxis dataKey="tLabel" stroke="#64748b" fontSize={11} minTickGap={40} />
            <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                background: '#121829',
                border: '1px solid #1e2a44',
                borderRadius: 12,
                color: '#e2e8f0',
              }}
            />
            <Area
              type="monotone"
              dataKey="strain"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#strainFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel
          title="Glare vs. Eye Openness"
          subtitle="How glare tracked against squinting"
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series} margin={{ left: -20, right: 10, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a44" />
              <XAxis dataKey="tLabel" stroke="#64748b" fontSize={11} minTickGap={40} />
              <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: '#121829',
                  border: '1px solid #1e2a44',
                  borderRadius: 12,
                }}
              />
              <Line type="monotone" dataKey="glare" stroke="#f59e0b" dot={false} strokeWidth={2} name="Glare %" />
              <Line type="monotone" dataKey="openness" stroke="#38bdf8" dot={false} strokeWidth={2} name="Eye openness %" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-warn inline-block" /> Glare</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-accent inline-block" /> Eye openness</span>
          </div>
        </Panel>

        <Panel
          title="Strain Correlation"
          subtitle="Each point: glare level vs. squint intensity"
        >
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ left: -20, right: 10, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a44" />
              <XAxis type="number" dataKey="glare" name="Glare" unit="%" stroke="#64748b" fontSize={11} domain={[0, 100]} />
              <YAxis type="number" dataKey="squint" name="Squint" unit="%" stroke="#64748b" fontSize={11} domain={[0, 100]} />
              <ZAxis type="number" dataKey="strain" range={[20, 180]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  background: '#121829',
                  border: '1px solid #1e2a44',
                  borderRadius: 12,
                }}
              />
              <Scatter data={scatter} fill="#38bdf8" fillOpacity={0.5} />
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Events by Time of Day" subtitle="When strain happened most">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={byHour} margin={{ left: -20, right: 10, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a44" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={11} interval={2} />
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#121829',
                  border: '1px solid #1e2a44',
                  borderRadius: 12,
                }}
              />
              <Area type="step" dataKey="count" stroke="#38bdf8" fill="#38bdf833" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Event Log" subtitle={`${tripEvents.length} events this trip`}>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {tripEvents.map((e) => {
              const meta = EVENT_META[e.type];
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg bg-panel2 px-3 py-2"
                >
                  <span className="text-lg">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span className="text-xs text-slate-400 truncate">
                        {e.roadLabel}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-slate-200">
                      {e.strain}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(e.ts).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })}
            {tripEvents.length === 0 && (
              <p className="text-sm text-slate-500">
                No events logged yet. Start a drive on the HUD tab.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
