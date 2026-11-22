'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Search } from 'lucide-react';
import { useApi } from '@/lib/api';
import { SOURCE_LABEL } from '@/lib/constants';
import type { DisasterHistory, PastDisaster } from '@/lib/types';
import { SEVERITY_ORDER, cn, formatDateTime, timeAgo } from '@/lib/utils';
import { Section } from '@/components/ui/Page';
import { Pill, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { EmptyState, ErrorState, LoadingRows } from '@/components/ui/DataState';
import { ChartCard, Columns, RankedBars, SERIES, categoryColor, fmt, formatDay, lastMonths, monthAxis, monthLong } from './charts';
import MajorDisasters from './MajorDisasters';

type SortKey = 'date' | 'title' | 'category' | 'severity' | 'region' | 'source';
type Dir = 'asc' | 'desc';
const PAGE = 25;

const region = (d: PastDisaster) => d.state || d.location || '';
const sourceName = (d: PastDisaster) => d.source || 'Volentify';

const COMPARE: Record<SortKey, (a: PastDisaster, b: PastDisaster) => number> = {
  date: (a, b) => (a.started_at ?? '').localeCompare(b.started_at ?? ''),
  title: (a, b) => a.title.localeCompare(b.title),
  category: (a, b) => a.category.localeCompare(b.category),
  // Ascending puts the most severe first.
  severity: (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  region: (a, b) => region(a).localeCompare(region(b)),
  source: (a, b) => sourceName(a).localeCompare(sourceName(b)),
};

const COLUMNS: { key: SortKey; label: string; first: Dir; className?: string }[] = [
  { key: 'date', label: 'Date', first: 'desc', className: 'w-[7.5rem]' },
  { key: 'title', label: 'Event', first: 'asc' },
  { key: 'category', label: 'Hazard', first: 'asc' },
  { key: 'severity', label: 'Severity', first: 'asc' },
  { key: 'region', label: 'Region', first: 'asc' },
  { key: 'source', label: 'Source', first: 'asc' },
];

function archiveTone(v: string): { tone: 'good' | 'warn' | 'bad' | 'neutral'; text: string } {
  if (v === 'ok') return { tone: 'good', text: 'reached' };
  if (v === 'partial') return { tone: 'warn', text: 'partly reached' };
  if (v === 'offline') return { tone: 'neutral', text: 'not queried (offline mode)' };
  return { tone: 'bad', text: `unavailable (${v})` };
}

export default function PastDisasters() {
  return (
    <>
      <RecentArchive />
      <MajorDisasters />
    </>
  );
}

function RecentArchive() {
  const res = useApi<DisasterHistory>('/api/analytics/history?months=12');
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: 'date', dir: 'desc' });
  const [limit, setLimit] = useState(PAGE);

  const items = useMemo(() => res.data?.items ?? [], [res.data]);
  const categories = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((d) => m.set(d.category, (m.get(d.category) ?? 0) + 1));
    return [...m].map(([label, value]) => ({ key: label, label, value, color: categoryColor(label) }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((d) => (!category || d.category === category)
      && (!q || `${d.title} ${region(d)} ${d.location ?? ''} ${sourceName(d)}`.toLowerCase().includes(q)));
  }, [items, category, query]);

  const sorted = useMemo(() => {
    const cmp = COMPARE[sort.key];
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => sign * cmp(a, b) || (b.started_at ?? '').localeCompare(a.started_at ?? ''));
  }, [filtered, sort]);

  const months = useMemo(() => {
    const keys = lastMonths(12, res.data?.fetched_at ? new Date(res.data.fetched_at) : new Date());
    const counts = new Map<string, number>();
    filtered.forEach((d) => d.started_at && counts.set(d.started_at.slice(0, 7), (counts.get(d.started_at.slice(0, 7)) ?? 0) + 1));
    return keys.map((ym, i) => ({ label: monthAxis(ym, i), tip: monthLong(ym), value: counts.get(ym) ?? 0 }));
  }, [filtered, res.data?.fetched_at]);

  const header = (
    <>
      Incidents Volentify tracked and later closed, plus the public archives of GDACS and USGS for the region around India.
      Severity is Volentify’s reading of each source’s alert level, not an official classification.
    </>
  );

  if (res.loading && !res.data) {
    return (
      <Section title="Last 12 months in and around India" description={header}>
        <p className="mb-4 text-sm text-stone" role="status">
          Fetching the GDACS and USGS archives. The first load can take 10 to 15 seconds; the result is then kept for 12 hours.
        </p>
        <LoadingRows rows={3} />
      </Section>
    );
  }
  if (!res.data) {
    return (
      <Section title="Last 12 months in and around India" description={header}>
        <ErrorState message={res.error?.message ?? 'The disaster archive is unavailable.'} onRetry={res.reload} />
      </Section>
    );
  }

  const h = res.data;
  const statuses = Object.entries(h.archive_status);
  const failing = statuses.filter(([, v]) => v !== 'ok');
  const tracked = items.filter((d) => d.status === 'CLOSED').length;
  const toggleSort = (key: SortKey, first: Dir) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: first }));
  const pick = (c: string | null) => { setCategory(c); setLimit(PAGE); };

  return (
    <Section title="Last 12 months in and around India" description={header}>
      {failing.length > 0 && (
        <p className="mb-6 rounded-xl border border-moderate/25 bg-moderate/[0.05] px-4 py-3 text-sm text-sand" role="status">
          {failing.map(([k]) => k).join(' and ')} could not be fully reached, so this list may be incomplete.
          {h.fetched_at ? ` Showing what was last fetched ${timeAgo(h.fetched_at)}.` : ''}
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState title="No events to show"
          body={failing.length === statuses.length && statuses.length > 0
            ? 'The public archives could not be reached and Volentify has not closed any incidents yet. Try again later.'
            : 'Neither the public archives nor the Volentify register hold any qualifying events for the last 12 months.'}
          action={<Button size="sm" variant="secondary" onClick={res.reload}>Try again</Button>} />
      ) : (
        <>
          {/* One filter row scopes every chart and the table below it. */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div role="group" aria-label="Filter by hazard" className="flex flex-wrap gap-2">
              <Chip on={category === null} onClick={() => pick(null)}>All <span className="tabular-nums text-stone">{fmt(items.length)}</span></Chip>
              {categories.map((c) => (
                <Chip key={c.key} on={category === c.key} onClick={() => pick(category === c.key ? null : c.key)}>
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color }} aria-hidden />
                  {c.label} <span className="tabular-nums text-stone">{fmt(c.value)}</span>
                </Chip>
              ))}
            </div>
            <div className="relative w-full lg:w-72">
              <label htmlFor="history-search" className="sr-only">Search events, regions or sources</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" aria-hidden />
              <Input id="history-search" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
                placeholder="Search event, region or source" className="h-10 w-full pl-9" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <ChartCard title="Events by month" note={category ? `${category} events only.` : 'All hazards. Grouped by when each event began.'}
              empty={months.some((m) => m.value) ? null : 'No events in this selection fall within the last 12 months.'}
              table={{ head: ['Month', 'Events'], rows: months.map((m) => [m.tip, m.value]) }}>
              <Columns data={months} name="events" color={category ? categoryColor(category) : SERIES.neutral} />
            </ChartCard>
            <ChartCard title="Events by hazard" note={`${fmt(items.length)} events: ${fmt(tracked)} tracked and closed by Volentify, ${fmt(items.length - tracked)} from the public archives.`}
              table={{ head: ['Hazard', 'Events'], rows: categories.map((c) => [c.label, c.value]) }}>
              <RankedBars data={categories} emphasis={category} label="Events by hazard" />
            </ChartCard>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm text-stone" aria-live="polite">
              {filtered.length === items.length ? `${fmt(items.length)} events` : `${fmt(filtered.length)} of ${fmt(items.length)} events`}
              {sorted.length > limit ? `, showing the first ${fmt(limit)}` : ''}.
            </p>
            <div className="relative max-w-full overflow-x-auto rounded-2xl border border-line" role="region" aria-label="Past events table" tabIndex={0}>
              <table className="w-full min-w-[48rem] text-left text-[0.8125rem]">
                <thead className="bg-ink-900">
                  <tr>
                    {COLUMNS.map((c) => {
                      const active = sort.key === c.key;
                      return (
                        <th key={c.key} scope="col" className={cn('px-4 py-2.5 font-normal', c.className)}
                          aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                          <button type="button" onClick={() => toggleSort(c.key, c.first)}
                            className={cn('inline-flex items-center gap-1 rounded hover:text-ivory', active ? 'text-ivory' : 'text-stone')}>
                            {c.label}
                            {active && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />)}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, limit).map((d) => (
                    <tr key={d.id} className="border-t border-line align-top">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-sand">{formatDay(d.started_at)}</td>
                      <td className="px-4 py-3">
                        <p className="text-ivory">{d.title}</p>
                        {d.status !== 'PAST' && (
                          <Pill tone={d.status === 'ACTIVE' ? 'signal' : 'neutral'} className="mt-1">
                            {d.status === 'ACTIVE' ? 'Still active' : 'Tracked by Volentify, closed'}
                          </Pill>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sand">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(d.category) }} aria-hidden />{d.category}
                        </span>
                      </td>
                      <td className="px-4 py-3"><SeverityBadge level={d.severity} /></td>
                      <td className="px-4 py-3 text-sand">{region(d) || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {d.source_url ? (
                          <a href={d.source_url} target="_blank" rel="noreferrer" title={SOURCE_LABEL[sourceName(d)] ?? sourceName(d)}
                            className="inline-flex items-center gap-1 text-sand hover:text-ivory">
                            {sourceName(d)}<ExternalLink className="h-3 w-3" aria-hidden /><span className="sr-only">(opens source page)</span>
                          </a>
                        ) : <span className="text-stone">{sourceName(d)}</span>}
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-sm text-stone">No events match this filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {sorted.length > limit && (
              <div className="mt-4">
                <Button size="sm" variant="secondary" onClick={() => setLimit((n) => n + PAGE)}>
                  Show {fmt(Math.min(PAGE, sorted.length - limit))} more
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-8 space-y-3 border-t border-line pt-5 text-xs leading-relaxed text-stone">
        <p>
          Sources: {h.attribution}. GDACS lists every tropical cyclone and floods, droughts, wildfires and volcanic activity at
          Orange or Red alert; USGS lists earthquakes of magnitude 5.0 and above in the region. Each row links to the source’s
          own page. These feeds describe hazard intensity, not confirmed casualties, so no death tolls are shown here.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span>Archive status:</span>
          {statuses.length === 0 && <span>not reported</span>}
          {statuses.map(([k, v]) => {
            const s = archiveTone(v);
            return <Pill key={k} tone={s.tone} dot>{k} {s.text}</Pill>;
          })}
          {h.fetched_at && <span>· fetched <time dateTime={h.fetched_at} title={formatDateTime(h.fetched_at)}>{timeAgo(h.fetched_at)}</time>, refreshed every 12 hours</span>}
        </div>
      </div>
    </Section>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] ring-1 ring-inset transition-colors',
        on ? 'bg-signal/[0.12] text-ivory ring-signal/60' : 'text-sand ring-line-strong hover:text-ivory hover:ring-ivory/30')}>
      {children}
    </button>
  );
}
