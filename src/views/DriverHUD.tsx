import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import {
  useFaceTracker,
  useRestStopSuggestion,
} from '../lib/useFaceTracker';
import { useVoiceAlert } from '../lib/useVoiceAlert';
import { Badge, Panel, Stat } from '../components/ui';
import { EAR_OPEN } from '../lib/eyeMetrics';

export default function DriverHUD() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { start, stop } = useFaceTracker(videoRef, canvasRef);

  const tracking = useStore((s) => s.tracking);
  const faceDetected = useStore((s) => s.faceDetected);
  const ear = useStore((s) => s.ear);
  const glare = useStore((s) => s.glare);
  const strain = useStore((s) => s.strain);
  const alert = useStore((s) => s.alert);
  const startTrip = useStore((s) => s.startTrip);
  const stopTrip = useStore((s) => s.stopTrip);

  const [voiceOn, setVoiceOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  useVoiceAlert(voiceOn);

  const { restStop } = useRestStopSuggestion();

  const handleStart = async () => {
    setError(null);
    setStarting(true);
    try {
      await start();
      startTrip();
    } catch (e) {
      setError(
        e instanceof Error
          ? `Could not start camera: ${e.message}`
          : 'Could not start camera.'
      );
    } finally {
      setStarting(false);
    }
  };

  const handleStop = () => {
    stop();
    stopTrip();
  };

  useEffect(() => () => stop(), [stop]);

  const alertCfg = {
    ok: { label: 'Eyes OK', tone: 'safe' as const, ring: 'ring-safe/40' },
    caution: {
      label: 'Mild strain',
      tone: 'warn' as const,
      ring: 'ring-warn/50',
    },
    alert: {
      label: 'Take a break',
      tone: 'danger' as const,
      ring: 'ring-danger/70',
    },
  }[alert];

  const earPct = Math.min(100, Math.round((ear / EAR_OPEN) * 100));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Camera + overlay */}
      <div className="lg:col-span-2 space-y-5">
        <Panel
          title="Live Eye Tracking"
          subtitle="On-device webcam analysis · video never leaves this browser"
          className={alert === 'alert' ? 'ring-2 ring-danger/70' : ''}
        >
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
            <canvas ref={canvasRef} className="hidden" />

            {!tracking && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-night/80 text-center p-6">
                <div className="text-5xl mb-3">👁️</div>
                <p className="text-slate-300 max-w-sm">
                  Start a drive to begin on-device eye-strain monitoring.
                  We&rsquo;ll ask for camera permission. Nothing is recorded or
                  uploaded.
                </p>
              </div>
            )}

            {tracking && (
              <>
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge tone={faceDetected ? 'safe' : 'warn'}>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        faceDetected ? 'bg-safe' : 'bg-warn animate-pulseGlow'
                      }`}
                    />
                    {faceDetected ? 'Face locked' : 'Searching…'}
                  </Badge>
                  <Badge tone="accent">● REC on-device</Badge>
                </div>

                {alert === 'alert' && (
                  <div className="absolute inset-0 ring-4 ring-inset ring-danger/70 animate-pulseGlow pointer-events-none rounded-xl" />
                )}

                <div
                  className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm font-semibold backdrop-blur bg-night/70 ring-1 ${alertCfg.ring}`}
                >
                  <span
                    className={
                      alert === 'alert'
                        ? 'text-danger'
                        : alert === 'caution'
                          ? 'text-warn'
                          : 'text-safe'
                    }
                  >
                    {alertCfg.label}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            {!tracking ? (
              <button
                onClick={handleStart}
                disabled={starting}
                className="px-5 py-2.5 rounded-xl bg-accent text-night font-semibold hover:brightness-110 disabled:opacity-60 transition"
              >
                {starting ? 'Starting camera…' : '▶ Start Drive'}
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="px-5 py-2.5 rounded-xl bg-danger/90 text-white font-semibold hover:brightness-110 transition"
              >
                ■ End Drive
              </button>
            )}

            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={voiceOn}
                onChange={(e) => setVoiceOn(e.target.checked)}
                className="accent-accent w-4 h-4"
              />
              Voice warnings
            </label>
          </div>

          {error && (
            <p className="mt-3 text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </Panel>
      </div>

      {/* Metrics + rest stop */}
      <div className="space-y-5">
        <Panel title="Live Metrics">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Eye Openness"
              value={earPct}
              unit="%"
              tone={earPct < 60 ? 'warn' : 'safe'}
            />
            <Stat
              label="Glare"
              value={Math.round(glare * 100)}
              unit="%"
              tone={glare > 0.62 ? 'danger' : glare > 0.45 ? 'warn' : 'safe'}
            />
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Eye-Strain Index</span>
              <span className="font-mono">{strain}/100</span>
            </div>
            <div className="h-3 rounded-full bg-panel2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  strain >= 70
                    ? 'bg-danger'
                    : strain >= 45
                      ? 'bg-warn'
                      : 'bg-safe'
                }`}
                style={{ width: `${strain}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            EAR = Eye Aspect Ratio. We flag <em>acute squinting + glare</em>,
            not just slow drowsy closure.
          </p>
        </Panel>

        <Panel
          title="Nearest Safe Stop"
          subtitle="Suggested when strain is elevated"
          className={alert === 'alert' ? 'ring-2 ring-danger/50' : ''}
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">🅿️</div>
            <div className="flex-1">
              <div className="font-semibold text-slate-100">
                {restStop.name}
              </div>
              <div className="text-sm text-slate-400 mt-0.5 capitalize">
                {restStop.type.replace('-', ' ')}
              </div>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="font-mono text-accent">
                  {restStop.distanceMi} mi
                </span>
                <span className="font-mono text-slate-300">
                  ~{restStop.etaMin} min
                </span>
              </div>
            </div>
          </div>
          {alert === 'alert' && (
            <div className="mt-3 text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
              ⚠ Your eyes need a break — consider pulling off here.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
