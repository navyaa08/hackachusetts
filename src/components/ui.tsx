import type { ReactNode } from 'react';

export function Panel({
  children,
  className = '',
  title,
  subtitle,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-panel border border-white/5 shadow-lg ${className}`}
    >
      {(title || subtitle) && (
        <div className="px-5 pt-4 pb-2">
          {title && (
            <h3 className="text-sm font-semibold tracking-wide text-slate-200">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
      <div className={title || subtitle ? 'px-5 pb-5' : 'p-5'}>{children}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: 'default' | 'warn' | 'danger' | 'safe' | 'accent';
}) {
  const toneClass =
    tone === 'warn'
      ? 'text-warn'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'safe'
          ? 'text-safe'
          : tone === 'accent'
            ? 'text-accent'
            : 'text-slate-100';
  return (
    <div className="rounded-xl bg-panel2 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className={`text-2xl font-semibold font-mono mt-1 ${toneClass}`}>
        {value}
        {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'warn' | 'danger' | 'safe' | 'accent';
}) {
  const map: Record<string, string> = {
    default: 'bg-slate-700/40 text-slate-300',
    warn: 'bg-warn/20 text-warn',
    danger: 'bg-danger/20 text-danger',
    safe: 'bg-safe/20 text-safe',
    accent: 'bg-accent/20 text-accent',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}
