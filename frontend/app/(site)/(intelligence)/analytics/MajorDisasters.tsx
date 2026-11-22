'use client';

import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import reference from '@/lib/reference-data.json';
import { Section } from '@/components/ui/Page';
import { Segmented } from '@/components/ui/Field';
import { ChartCard, RankedBars, categoryColor, fmt, formatDay } from './charts';

interface MajorDisaster {
  name: string; category: string; start: string; end: string | null; states: string[]; deaths: number;
  deaths_note: string; affected: string | null; source: string; source_url: string;
}

const MAJOR = reference.past_disasters as MajorDisaster[];

/** A short qualifier taken from the curated note: the reported range, or whether the toll is provisional. */
function qualifier(d: MajorDisaster): string | null {
  const range = /^Range ([^.]+?)\./.exec(d.deaths_note);
  if (range) return `reported range ${range[1].replace(/\s*–\s*~/, ' to about ')}`;
  if (/^Snapshot only/i.test(d.deaths_note)) return 'early count, not final';
  if (/provisional/i.test(d.deaths_note)) return 'provisional';
  return null;
}

const year = (d: MajorDisaster) => d.start.slice(0, 4);
const withYear = (d: MajorDisaster) => (d.name.includes(year(d)) ? d.name : `${d.name}, ${year(d)}`);

function dates(d: MajorDisaster): string {
  if (!d.end) return formatDay(d.start);
  const sameYear = d.start.slice(0, 4) === d.end.slice(0, 4);
  return `${formatDay(d.start, !sameYear)} – ${formatDay(d.end)}`;
}

function Toll({ d, q, className }: { d: MajorDisaster; q: string | null; className?: string }) {
  return (
    <div className={className}>
      <p className="numeral text-4xl leading-none">{fmt(d.deaths)}</p>
      <p className="mt-1 max-w-[10rem] text-xs text-stone sm:ml-auto">confirmed deaths{q ? `; ${q}` : ''}</p>
    </div>
  );
}

type Order = 'newest' | 'oldest' | 'deaths';
const ORDERS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'deaths', label: 'Most deaths' },
] as const;

export default function MajorDisasters() {
  const [order, setOrder] = useState<Order>('newest');
  const byDeaths = useMemo(() => [...MAJOR].sort((a, b) => b.deaths - a.deaths || a.start.localeCompare(b.start)), []);
  const list = useMemo(() => (order === 'deaths' ? byDeaths
    : [...MAJOR].sort((a, b) => (order === 'newest' ? b.start.localeCompare(a.start) : a.start.localeCompare(b.start)))), [order, byDeaths]);
  const first = MAJOR.reduce((y, d) => (year(d) < y ? year(d) : y), '9999');

  return (
    <Section title={`Major disasters in India since ${first}`}
      description={<>
        {MAJOR.length} of the deadliest or most disruptive events, each with the death toll published or reported by the authority
        named in its source. These are confirmed deaths as officially counted, not estimates: several exclude missing people or
        were revised later, so open a row to see exactly what the figure covers.
      </>}>
      <ChartCard title="Confirmed deaths by event"
        note="Official or officially reported tolls, largest first. A qualifier next to a name means the count is a range, provisional or an early snapshot."
        table={{ head: ['Event', 'Deaths (official)', 'Qualifier'], rows: byDeaths.map((d) => [withYear(d), d.deaths, qualifier(d) ?? '']) }}>
        <RankedBars label="Confirmed deaths by event" data={byDeaths.map((d) => ({
          key: d.name, label: withYear(d), value: d.deaths, note: qualifier(d) ?? undefined,
        }))} />
      </ChartCard>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <h3 className="text-2xl leading-tight">Every event, with its source</h3>
        <Segmented ariaLabel="Order events" size="sm" options={ORDERS} value={order} onChange={(v) => setOrder(v)} />
      </div>
      <ol className="mt-4 divide-y divide-line border-y border-line">
        {list.map((d) => {
          const q = qualifier(d);
          return (
            <li key={d.name} className="grid gap-x-8 gap-y-3 py-6 sm:grid-cols-[8.5rem_1fr_9rem]">
              <div className="flex items-start justify-between gap-4 sm:block">
                <div>
                  <p className="numeral text-3xl leading-none">{year(d)}</p>
                  <p className="code mt-1.5">{dates(d)}</p>
                </div>
                <Toll d={d} q={q} className="text-right sm:hidden" />
              </div>
              <div className="min-w-0 space-y-2">
                <h4 className="font-sans text-base font-medium text-ivory">{d.name}</h4>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone">
                  <span className="inline-flex items-center gap-1.5 text-sand">
                    <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(d.category) }} aria-hidden />
                    {d.category === 'GLOF' ? 'Glacial lake outburst flood' : d.category}
                  </span>
                  <span>{d.states.join(', ')}</span>
                </p>
                {d.affected && <p className="text-sm leading-relaxed text-sand">{d.affected}</p>}
                <details className="group text-sm">
                  <summary className="cursor-pointer text-stone hover:text-sand">How the death toll was counted</summary>
                  <p className="mt-2 max-w-[68ch] leading-relaxed text-sand">{d.deaths_note}</p>
                </details>
                <p className="text-xs">
                  <a href={d.source_url} target="_blank" rel="noreferrer" className="text-stone hover:text-ivory">
                    Source: {d.source}<ExternalLink className="ml-1 inline h-3 w-3 align-[-1px]" aria-hidden /><span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </p>
              </div>
              <Toll d={d} q={q} className="hidden text-right sm:block" />
            </li>
          );
        })}
      </ol>
      <p className="mt-5 max-w-[68ch] text-xs leading-relaxed text-stone">
        Compiled by Volentify from the government statements, parliamentary replies and agency reports linked above. Where sources
        disagree, the headline figure is the one the linked source gives and the note records the range. Official tolls often change
        after the event; check the source for the latest figure.
      </p>
    </Section>
  );
}
