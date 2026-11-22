'use client';

import { useApi } from '@/lib/api';
import { Panel } from '@/components/ui/Page';
import { EmptyState, Skeleton } from '@/components/ui/DataState';

interface MethodResult {
  latency_ms_median: number; timeout_rate: number; score_vs_optimum: number | null; completeness: number | null;
  critical_fill: number | null; weighted_fill: number | null; mean_distance_km: number | null;
  specialists_on_generic: number | null;
}
interface Bench {
  generated_at: string;
  design: { seeds_per_size: number; milp_time_limit_s: number };
  results: { responders: number; missions: number; slots: number; methods: Record<string, MethodResult> }[];
}

const METHODS: [string, string][] = [
  ['sperling', 'Volentify (Sperling)'],
  ['nearest', 'Nearest responder'],
  ['optimum', 'Exact optimum'],
  ['milp_lex', 'Exact priority MILP'],
];
const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v.toFixed(v < 10 ? 1 : 0)} ms`);

/** Measured, not claimed: the production dispatch engine against exact optimisation and a manual baseline. */
export default function DispatchBenchmark() {
  const { data, loading } = useApi<{ dispatch: Bench | null }>('/api/ml/models');
  if (loading) return <Skeleton className="h-72" />;
  const bench = data?.dispatch;
  if (!bench) {
    return <EmptyState title="Benchmark not run yet" body="The weekly “Train cyclone models” workflow runs the dispatch benchmark and publishes it here." />;
  }
  return (
    <Panel className="space-y-5">
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-[0.8125rem] text-stone">
            <tr className="border-b border-line">
              <th className="px-2 py-2 font-normal">Scale</th>
              <th className="px-2 py-2 font-normal">Method</th>
              <th className="px-2 py-2 text-right font-normal">Time per cycle</th>
              <th className="px-2 py-2 text-right font-normal">Critical filled</th>
              <th className="px-2 py-2 text-right font-normal">Urgency-weighted fill</th>
              <th className="px-2 py-2 text-right font-normal">Score vs optimum</th>
              <th className="px-2 py-2 text-right font-normal">Mean distance</th>
              <th className="px-2 py-2 text-right font-normal">Timed out</th>
            </tr>
          </thead>
          <tbody>
            {bench.results.map((row) =>
              METHODS.map(([key, label], i) => {
                const m = row.methods[key];
                if (!m) return null;
                return (
                  <tr key={`${row.responders}-${key}`} className={i === METHODS.length - 1 ? 'border-b border-line' : ''}>
                    <td className="px-2 py-1.5 text-sand">{i === 0 ? `${row.responders.toLocaleString('en-IN')} responders · ${row.slots.toLocaleString('en-IN')} slots` : ''}</td>
                    <td className={`px-2 py-1.5 ${key === 'sperling' ? 'text-ivory' : 'text-sand'}`}>{label}</td>
                    <td className="numeral px-2 py-1.5 text-right">{ms(m.latency_ms_median)}</td>
                    <td className="numeral px-2 py-1.5 text-right">{pct(m.critical_fill)}</td>
                    <td className="numeral px-2 py-1.5 text-right">{pct(m.weighted_fill)}</td>
                    <td className="numeral px-2 py-1.5 text-right">{pct(m.score_vs_optimum)}</td>
                    <td className="numeral px-2 py-1.5 text-right">{m.mean_distance_km == null ? '—' : `${m.mean_distance_km.toFixed(1)} km`}</td>
                    <td className="numeral px-2 py-1.5 text-right">{pct(m.timeout_rate)}</td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
      <p className="max-w-3xl text-xs leading-relaxed text-stone">
        Synthetic musters with more demand than responders and scarce specialists; {bench.design.seeds_per_size} scenarios
        per scale, median time on one CPU core. “Exact optimum” maximises total match score without regard to urgency;
        the priority MILP fills critical missions first, then high, then the rest, with a {bench.design.milp_time_limit_s} s
        limit. Rerun weekly · {new Date(bench.generated_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}.
      </p>
    </Panel>
  );
}
