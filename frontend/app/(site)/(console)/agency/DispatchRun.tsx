'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import type { Assignment, DataSource, DispatchResult } from '@/lib/types';
import { pct } from '@/lib/utils';
import { Pill, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingRows, SourceTag } from '@/components/ui/DataState';
import { Stat } from '@/components/ui/Page';

const TIER_TONE = { EXACT: 'good', ADJACENT: 'info', GENERIC: 'warn' } as const;
const TIER_LABEL = { EXACT: 'Exact skill', ADJACENT: 'Adjacent skill', GENERIC: 'General help' } as const;

/** One Sperling (2026) dispatch cycle over all open missions and available volunteers. */
export function DispatchRun() {
  const [result, setResult] = useState<DispatchResult | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch<DispatchResult>('/api/match/dispatch-batch', { method: 'POST', json: {} });
      setResult(r.data);
      setSource(r.source);
      setRanAt(new Date());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Dispatch could not run.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void run(); }, [run]);

  const byTask = useMemo(() => {
    const groups = new Map<string, Assignment[]>();
    for (const a of result?.assignments ?? []) groups.set(a.task_id, [...(groups.get(a.task_id) ?? []), a]);
    return [...groups.values()];
  }, [result]);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[1.75rem]">Dispatch recommendations</h2>
          <p className="max-w-2xl text-sm text-stone">
            Missions are filled in urgency order. Each responder is scored on skill match, skill scarcity, distance and current
            workload; rare specialists are held back from routine tasks.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SourceTag source={source} />
          <Button onClick={run} loading={busy}><Play className="h-3.5 w-3.5" aria-hidden />Run dispatch</Button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={run} />}
      {!result && !error && <LoadingRows rows={3} />}

      {result && (
        <>
          <div className="grid grid-cols-2 gap-6 rounded-2xl border border-line p-6 sm:grid-cols-4">
            <Stat label="Slots filled" value={pct(result.completeness)} note={`${result.assignments.length} assignments`} />
            <Stat label="Engine time" value={<>{result.latency_ms.toFixed(2)}<span className="ml-1 font-sans text-sm text-stone">ms</span></>}
              note={ranAt ? `Measured ${ranAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : undefined} />
            <Stat label="Open missions" value={result.tasks_evaluated} />
            <Stat label="Available responders" value={result.volunteers_evaluated} />
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-4">
              <h3 className="font-serif text-2xl text-ivory">Assignments</h3>
              {byTask.length === 0 ? <EmptyState title="Nothing to assign" body="There are no open missions with an eligible responder. Create a mission or check volunteer availability." />
                : byTask.map((group) => (
                  <article key={group[0].task_id} className="rounded-2xl border border-line p-5">
                    <div className="flex flex-wrap items-center gap-2"><SeverityBadge level={group[0].urgency} /><span className="code">{group[0].task_code}</span></div>
                    <h4 className="mt-2 font-serif text-xl text-ivory">{group[0].task_title}</h4>
                    <ul className="mt-4 divide-y divide-line">
                      {group.map((a) => (
                        <li key={`${a.task_id}-${a.slot}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm text-ivory">{a.volunteer_name}</p>
                            <p className="text-xs text-stone">{a.reason}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <Pill tone={TIER_TONE[a.tier]}>{TIER_LABEL[a.tier]}</Pill>
                            <span className="numeral w-14 text-right text-lg">{a.score.toFixed(2)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
            </div>

            <aside className="space-y-8">
              <div>
                <h3 className="font-serif text-2xl text-ivory">Shortfalls</h3>
                {result.bottlenecks.length === 0 ? <p className="mt-2 text-sm text-stone">Every open mission is fully staffed.</p> : (
                  <ul className="mt-3 space-y-2">
                    {result.bottlenecks.map((b) => (
                      <li key={b.task_id} className="rounded-xl border border-critical/25 bg-critical/[0.04] p-3 text-sm">
                        <p className="text-ivory">{b.skill}</p>
                        <p className="text-xs text-stone"><span className="code">{b.task_code}</span> — {b.filled} of {b.requested} filled, short by {b.deficit}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="font-serif text-2xl text-ivory">Skill scarcity</h3>
                <p className="mt-1 text-xs text-stone">1 ÷ √(responders holding the skill). Higher means rarer.</p>
                <ul className="mt-3 space-y-2.5">
                  {Object.entries(result.scarcity).sort((a, b) => b[1] - a[1]).map(([skill, s]) => (
                    <li key={skill}>
                      <div className="flex justify-between text-sm"><span className="text-sand">{skill}</span><span className="code">{s.toFixed(2)}</span></div>
                      <div className="mt-1 h-1 rounded-full bg-ink-700"><div className="h-1 rounded-full bg-gold" style={{ width: `${Math.min(100, s * 100)}%` }} /></div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-xs text-stone">
                Match tiers this cycle: {result.tiers.EXACT} exact, {result.tiers.ADJACENT} adjacent, {result.tiers.GENERIC} general.
              </div>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
