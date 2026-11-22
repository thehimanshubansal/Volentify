'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import { useApi } from '@/lib/api';
import { focusIncidents } from '@/lib/overpass';
import type { Disaster } from '@/lib/types';
import { SEVERITY_ORDER, cn } from '@/lib/utils';
import IncidentOverview from './IncidentOverview';
import NearestHelp, { type Mode } from './NearestHelp';
import { HOTLINES, dial } from './shared';

type Hotline = { label: string; number: string };

/** 112 and long landline numbers take two cells, so 10 helplines tile evenly at 2, 4 and 6 columns. */
const wide = (h: Hotline) => h.number === '112' || h.number.length > 6;

function Helplines({ hotlines }: { hotlines: Hotline[] }) {
  return (
    <section id="helplines" aria-labelledby="helplines-title" className="page scroll-mt-24 pb-10">
      <h2 id="helplines-title" className="sr-only">Emergency helplines</h2>
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4 lg:grid-cols-6">
        {hotlines.map((h) => {
          const primary = h.number === '112';
          return (
            <li key={h.number} className={cn('bg-ink', wide(h) && 'col-span-2')}>
              <a href={`tel:${dial(h.number)}`} aria-label={`Call ${h.label}, ${h.number}`}
                className={cn('group flex h-full flex-col justify-between gap-3 p-4 transition-colors hover:bg-ink-900 focus-visible:bg-ink-900 sm:p-5',
                  primary && 'bg-critical/[0.07] hover:bg-critical/[0.12]')}>
                <span className={cn('text-[0.8125rem]', primary ? 'text-ivory' : 'text-stone')}>
                  {h.label}{primary && <span className="text-stone"> · police, fire and ambulance</span>}
                </span>
                <span className={cn('numeral flex items-center gap-2 leading-none',
                  primary ? 'text-5xl text-critical' : h.number.length > 6 ? 'text-2xl' : 'text-3xl')}>
                  {h.number}
                  <Phone className={cn('h-4 w-4 shrink-0 transition-colors group-hover:text-signal', primary ? 'text-critical' : 'text-ash')} aria-hidden />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-stone">Tap a number to call. If you are not sure which one to dial, call 112.</p>
    </section>
  );
}

/** Helplines, the nearest-help finder and the all-incidents overview: everything on /resources that reads live data. */
export default function ResourceDirectory() {
  const disasters = useApi<Disaster[]>('/api/disasters');
  const incidents = useMemo(() => disasters.data ?? [], [disasters.data]);
  const focus = useMemo(() => focusIncidents(incidents), [incidents]);

  const [mode, setMode] = useState<Mode>('incident');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hotlines, setHotlines] = useState<Hotline[]>(HOTLINES);
  const requested = useRef<string | null>(null);
  const finderHeading = useRef<HTMLHeadingElement>(null);

  // Deep links: /resources?incident=<id> or /resources?near=1
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    requested.current = p.get('incident');
    if (p.has('near')) setMode('near');
  }, []);

  // Default to the requested incident, else the most severe one on land.
  useEffect(() => {
    if (!incidents.length || (selectedId && incidents.some((d) => d.id === selectedId))) return;
    const wanted = requested.current && incidents.find((d) => d.id === requested.current || d.code === requested.current);
    const bySeverity = [...incidents].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    setSelectedId((wanted || focus[0] || bySeverity[0]).id);
  }, [incidents, focus, selectedId]);

  const syncUrl = useCallback((m: Mode, id: string | null) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('near');
    url.searchParams.delete('incident');
    if (m === 'near') url.searchParams.set('near', '1');
    else if (id) url.searchParams.set('incident', id);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, []);

  const changeMode = useCallback((m: Mode) => { setMode(m); syncUrl(m, selectedId); }, [selectedId, syncUrl]);
  const select = useCallback((id: string) => { setSelectedId(id); syncUrl('incident', id); }, [syncUrl]);
  const open = useCallback((id: string) => {
    setMode('incident');
    select(id);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('nearest')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    finderHeading.current?.focus({ preventScroll: true });
  }, [select]);
  const onHotlines = useCallback((h: Hotline[]) => setHotlines(h), []);

  return (
    <>
      <Helplines hotlines={hotlines} />
      <NearestHelp
        mode={mode} onMode={changeMode} incidents={incidents} incidentsLoading={disasters.loading}
        incidentsError={disasters.error?.message ?? null} reloadIncidents={disasters.reload}
        selectedId={selectedId} onSelect={select} headingRef={finderHeading} onHotlines={onHotlines}
      />
      {focus.length > 1 && (
        <IncidentOverview focus={focus} activeId={mode === 'incident' ? selectedId : null} onOpen={open} onHotlines={onHotlines} />
      )}
    </>
  );
}
