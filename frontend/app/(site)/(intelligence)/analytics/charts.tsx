'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { CATEGORY_HEX } from '@/lib/constants';
import { cn } from '@/lib/utils';

/* ─── Chart tokens ──────────────────────────────────────────────────────────
 * Colour does one job per chart. Single-series counts use one quiet neutral; the
 * signal orange is reserved for live state; two-series comparisons use slots a/b;
 * ordered stages (funnels) use one blue ramp. Severity and hazard colours come from
 * SEVERITY_META / CATEGORY_HEX so a flood is the same blue here as on the map.
 * a/b and FUNNEL were checked with the dataviz palette validator against the ink-900
 * and ink-800 surfaces (lightness band, chroma floor, CVD ΔE ≥ 23, contrast ≥ 3:1). */

export const AXIS = { fill: '#8d887e', fontSize: 12 };
export const GRID = 'rgba(244,241,234,0.08)';
export const SERIES = {
  neutral: '#a9a398',
  live: '#ff6b00',
  a: '#4a8ad6',
  b: '#d9762e',
} as const;
export const FUNNEL = ['#a9c4ea', '#77a3e0', '#4a8ad6', '#356fb8'] as const;

export function categoryColor(category: string): string {
  if (CATEGORY_HEX[category]) return CATEGORY_HEX[category];
  if (/glof|flash flood|flood/i.test(category)) return CATEGORY_HEX.Flood;
  return SERIES.neutral;
}

/* ─── Formatting ───────────────────────────────────────────────────────── */

export const fmt = (n: number) => n.toLocaleString('en-IN');

/** 12 → "12 min", 135 → "2 h 15 min", 3000 → "2 d 2 h"; null → "—". */
export function formatMinutes(m: number | null | undefined): string {
  if (m == null || Number.isNaN(m)) return '—';
  if (m < 1) return 'under 1 min';
  const total = Math.round(m);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60), mm = total % 60;
  if (h < 24) return mm ? `${h} h ${mm} min` : `${h} h`;
  const d = Math.floor(h / 24), hh = h % 24;
  return hh ? `${d} d ${hh} h` : `${d} d`;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-01" → axis label; the year is shown on the first month and on every January. */
export function monthAxis(ym: string, index: number): string {
  const [y, m] = ym.split('-').map(Number);
  return index === 0 || m === 1 ? `${MON[m - 1]} ’${String(y).slice(2)}` : MON[m - 1];
}
export function monthLong(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH[m - 1]} ${y}`;
}

/** Date part of an ISO string, formatted without the runtime locale so server and browser agree. */
export function formatDay(iso: string | null | undefined, withYear = true): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m) return '—';
  return withYear ? `${d} ${MON[m - 1]} ${y}` : `${d} ${MON[m - 1]}`;
}

/** The last `n` calendar months as "YYYY-MM", oldest first (same convention as the API). */
export function lastMonths(n = 12, now = new Date()): string[] {
  const out: string[] = [];
  let y = now.getUTCFullYear(), m = now.getUTCMonth() + 1;
  for (let i = 0; i < n; i++) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    if (m === 1) { y -= 1; m = 12; } else m -= 1;
  }
  return out.reverse();
}

/* ─── Frame ─────────────────────────────────────────────────────────────── */

export interface TableSpec { head: string[]; rows: (string | number)[][] }

export function ChartTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const tip = (payload[0]?.payload as { tip?: string } | undefined)?.tip;
  return (
    <div className="rounded-lg border border-line-strong bg-ink-800 px-3 py-2 text-xs shadow-float">
      <p className="mb-1 text-stone">{tip ?? label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2">
          <span className="h-0.5 w-3 rounded-full" style={{ background: p.color }} aria-hidden />
          <span className="font-medium tabular-nums text-ivory">{typeof p.value === 'number' ? fmt(p.value) : p.value}</span>
          <span className="text-stone">{p.name}</span>
        </p>
      ))}
    </div>
  );
}

/** A quiet placeholder where a chart would be, for honest zero states. */
export function EmptyNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('flex min-h-[7rem] items-center justify-center rounded-xl border border-dashed border-line px-5 py-6 text-center text-sm leading-relaxed text-stone', className)}>
      {children}
    </p>
  );
}

export function DataTable({ table, className }: { table: TableSpec; className?: string }) {
  return (
    <div className={cn('relative max-w-full overflow-x-auto', className)}>
      <table className="w-full text-left text-[0.8125rem]">
        <thead>
          <tr className="text-stone">{table.head.map((h, j) => <th key={h} scope="col" className={cn('pb-1.5 pr-4 font-normal', j > 0 && 'text-right')}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => (
                <td key={j} className={cn('py-1.5 pr-4', j > 0 ? 'text-right tabular-nums text-ivory' : 'text-sand')}>
                  {typeof c === 'number' ? fmt(c) : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Every chart sits in a figure with a caption and a "View as table" twin. */
export function ChartCard({ title, note, children, table, className, empty, footer }: {
  title: string; note?: React.ReactNode; children: React.ReactNode; table?: TableSpec; className?: string;
  /** When set, the chart is replaced by this message (the platform is new; zeros are shown honestly, not drawn). */
  empty?: React.ReactNode | null; footer?: React.ReactNode;
}) {
  return (
    <figure className={cn('panel flex min-w-0 flex-col gap-4 p-5 sm:p-6', className)}>
      <figcaption className="space-y-1">
        <h3 className="text-2xl leading-tight">{title}</h3>
        {note && <p className="text-sm leading-relaxed text-stone">{note}</p>}
      </figcaption>
      <div className="min-w-0 flex-1">{empty ? <EmptyNote>{empty}</EmptyNote> : children}</div>
      {footer}
      {!empty && table && table.rows.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-stone hover:text-sand">View as table</summary>
          <DataTable table={table} className="mt-3" />
        </details>
      )}
    </figure>
  );
}

export function Legend({ items, className }: { items: { label: string; color: string }[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-sand', className)}>
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/* ─── HTML bar forms (long labels sit above the bar, so they hold at 360 px) ─ */

export interface BarDatum { key?: string; label: string; value: number; color?: string; note?: React.ReactNode }

/** Horizontal bars, label above, value at the right. One hue unless each row is an entity with its own colour. */
export function RankedBars({ data, color = SERIES.neutral, emphasis, label, format = fmt }: {
  data: BarDatum[]; color?: string; emphasis?: string | null; label: string; format?: (n: number) => string;
}) {
  const top = Math.max(0, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3" aria-label={label}>
      {data.map((d) => {
        const id = d.key ?? d.label;
        const w = top > 0 ? (d.value / top) * 100 : 0;
        const dim = emphasis != null && emphasis !== id;
        return (
          <li key={id} className={cn('transition-opacity', dim && 'opacity-40')} title={`${d.label}: ${format(d.value)}`}>
            <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
              <span className="min-w-0 text-sand">
                {d.label}
                {d.note && <span className="ml-1.5 text-xs text-stone">{d.note}</span>}
              </span>
              <span className="shrink-0 tabular-nums text-ivory">{format(d.value)}</span>
            </div>
            <div className="mt-1.5 h-2 border-l border-line-strong" aria-hidden>
              {w > 0 && <div className="h-full rounded-r-[4px]" style={{ width: `max(${w}%, 3px)`, background: d.color ?? color }} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface SeriesSpec { name: string; color: string }

/** Two measures per row (e.g. responders needed vs available), each on its own thin bar. */
export function PairedBars({ data, a, b, label }: { data: { label: string; a: number; b: number }[]; a: SeriesSpec; b: SeriesSpec; label: string }) {
  const top = Math.max(0, ...data.flatMap((d) => [d.a, d.b]));
  const bar = (v: number, c: string) => (
    <div className="h-2 border-l border-line-strong" aria-hidden>
      {v > 0 && <div className="h-full rounded-r-[4px]" style={{ width: `max(${top ? (v / top) * 100 : 0}%, 3px)`, background: c }} />}
    </div>
  );
  return (
    <div className="space-y-4">
      <Legend items={[{ label: a.name, color: a.color }, { label: b.name, color: b.color }]} />
      <ul className="space-y-4" aria-label={label}>
        {data.map((d) => (
          <li key={d.label}>
            <p className="text-[0.8125rem] text-sand">{d.label}</p>
            <div className="mt-1.5 grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-xs">
              {bar(d.a, a.color)}
              <span className="tabular-nums text-ivory"><span className="sr-only">{a.name}: </span>{fmt(d.a)}</span>
              {bar(d.b, b.color)}
              <span className="tabular-nums text-ivory"><span className="sr-only">{b.name}: </span>{fmt(d.b)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ordered stages, each as a share of the first (a funnel drawn as aligned bars, one blue ramp). */
export function FunnelBars({ stages, label }: { stages: { label: string; value: number; note?: string }[]; label: string }) {
  const base = stages[0]?.value ?? 0;
  return (
    <ol className="space-y-3.5" aria-label={label}>
      {stages.map((s, i) => {
        const share = base > 0 ? s.value / base : 0;
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
              <span className="min-w-0 text-sand">{s.label}</span>
              <span className="shrink-0 tabular-nums text-ivory">
                {fmt(s.value)}
                {i > 0 && base > 0 && <span className="ml-1.5 text-xs text-stone">{Math.round(share * 100)}%</span>}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 border-l border-line-strong" aria-hidden>
              {s.value > 0 && <div className="h-full rounded-r-[4px]" style={{ width: `max(${share * 100}%, 3px)`, background: FUNNEL[Math.min(i, FUNNEL.length - 1)] }} />}
            </div>
            {s.note && <p className="mt-1 text-xs text-stone">{s.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/** Thin proportional bar with a labelled legend, so state colours never stand alone. */
export function StatusBar({ parts, label }: { parts: { label: string; value: number; color: string }[]; label?: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className="space-y-4">
      <div className="flex h-2 gap-[2px] overflow-hidden rounded-full" role="img"
        aria-label={`${label ? `${label}: ` : ''}${parts.map((p) => `${p.label} ${p.value}`).join(', ')}`}>
        {total === 0 ? <div className="h-full w-full bg-ink-700" /> : parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.label} className="h-full" style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden />
            <span className="text-stone">{p.label}</span>
            <span className="ml-auto tabular-nums text-ivory sm:ml-1">{fmt(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Recharts forms (time axes) ────────────────────────────────────────── */

export interface ColumnDatum { label: string; value: number; tip?: string }

/** Single-series columns over a time axis. */
export function Columns({ data, name, color = SERIES.neutral, height = 220 }: { data: ColumnDatum[]; name: string; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap={2}
        accessibilityLayer>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={8} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(244,241,234,0.04)' }} />
        <Bar dataKey="value" name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Two series side by side per period (never two y-axes). */
export function GroupedColumns({ data, a, b, height = 240 }: {
  data: { label: string; tip?: string; a: number; b: number }[]; a: SeriesSpec; b: SeriesSpec; height?: number;
}) {
  return (
    <div className="space-y-3">
      <Legend items={[{ label: a.name, color: a.color }, { label: b.name, color: b.color }]} />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barGap={2} barCategoryGap="22%"
          accessibilityLayer>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={8} />
          <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(244,241,234,0.04)' }} />
          <Bar dataKey="a" name={a.name} fill={a.color} radius={[4, 4, 0, 0]} maxBarSize={12} isAnimationActive={false} />
          <Bar dataKey="b" name={b.name} fill={b.color} radius={[4, 4, 0, 0]} maxBarSize={12} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
