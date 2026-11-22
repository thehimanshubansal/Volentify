'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import LiveOperations from './LiveOperations';
import ImpactPanel from './ImpactPanel';
import PastDisasters from './PastDisasters';

const VIEWS = [
  { value: 'live', label: 'Live operations', blurb: 'What is happening now, from the live register. Refreshes every minute.' },
  { value: 'impact', label: 'Response & impact', blurb: 'What the platform and its volunteers have done since records began: missions, people helped, hours given and how field reports were handled.' },
  { value: 'history', label: 'Past disasters', blurb: 'What has happened before: the last 12 months from public archives, and major disasters in India since 2013 with their official death tolls.' },
] as const;
type View = (typeof VIEWS)[number]['value'];

const isView = (v: string | null): v is View => VIEWS.some((x) => x.value === v);

export default function AnalyticsBoard() {
  const params = useSearchParams();
  const fromUrl = params.get('view');
  const [view, setView] = useState<View>(isView(fromUrl) ? fromUrl : 'live');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // Back/forward or a link to ?view= updates the tab.
  useEffect(() => { if (isView(fromUrl)) setView(fromUrl); else if (!fromUrl) setView('live'); }, [fromUrl]);

  const select = (v: View, focus = false) => {
    setView(v);
    const next = new URLSearchParams(window.location.search);
    if (v === 'live') next.delete('view'); else next.set('view', v);
    const qs = next.toString();
    // Native history calls stay in sync with useSearchParams (Next 14.1+) without a server round trip.
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
    if (focus) tabs.current[VIEWS.findIndex((x) => x.value === v)]?.focus();
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = VIEWS.length;
    const to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n
      : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    select(VIEWS[to].value, true);
  };

  const current = VIEWS.find((x) => x.value === view)!;

  return (
    <>
      <div className="page pb-8">
        <div role="tablist" aria-label="Analytics views"
          className="grid w-full grid-cols-3 rounded-[10px] border border-line bg-ink-800 p-0.5 sm:inline-grid sm:w-auto sm:auto-cols-max sm:grid-flow-col sm:grid-cols-none">
          {VIEWS.map((v, i) => {
            const on = v.value === view;
            return (
              <button key={v.value} ref={(el) => { tabs.current[i] = el; }} type="button" role="tab" id={`tab-${v.value}`}
                aria-selected={on} aria-controls={`panel-${v.value}`} tabIndex={on ? 0 : -1}
                onClick={() => select(v.value)} onKeyDown={(e) => onKey(e, i)}
                className={cn('min-h-10 rounded-lg px-2 py-1.5 text-center text-[0.8125rem] font-medium leading-tight transition-colors sm:px-4',
                  on ? 'bg-ivory/[0.1] text-ivory' : 'text-stone hover:text-sand')}>
                {v.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 max-w-2xl text-sm text-stone">{current.blurb}</p>
      </div>

      <div role="tabpanel" id={`panel-${view}`} aria-labelledby={`tab-${view}`}>
        {view === 'live' && <LiveOperations />}
        {view === 'impact' && <ImpactPanel />}
        {view === 'history' && <PastDisasters />}
      </div>
    </>
  );
}
