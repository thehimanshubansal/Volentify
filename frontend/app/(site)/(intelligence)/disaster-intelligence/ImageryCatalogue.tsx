'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useApi } from '@/lib/api';
import type { ImageryLayer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Section } from '@/components/ui/Page';
import { Skeleton } from '@/components/ui/DataState';
import { defaultImagery } from '@/components/map/mapStyle';

const TacticalMap = dynamic(() => import('@/components/map/TacticalMap'), {
  ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-ink-800" aria-hidden />,
});

/**
 * Satellite imagery shown on the tactical map itself — incidents, mesh reports, missions, hospitals and shelters
 * stay on top of whichever layer is chosen, so the ground picture and the operational picture are one view.
 */
export default function ImageryCatalogue() {
  const { data, loading } = useApi<ImageryLayer[]>('/api/bhuvan/layers');
  const layers = data?.length ? data : defaultImagery();
  const [activeId, setActiveId] = useState<string>('esri-imagery');
  const active = activeId === 'dark' ? undefined : layers.find((l) => l.id === activeId) ?? layers[0];
  const isRadar = Boolean(active?.dynamic);
  const basemap = !active || isRadar ? 'dark' : active.id;

  return (
    <Section
      title="Satellite imagery on the tactical map"
      description="Pick a layer: it becomes the base of the live tactical map, under every incident zone, field report, mission and facility. The same switcher is on the full map."
    >
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <ul className="space-y-2" aria-label="Imagery layers">
          {loading && !data && Array.from({ length: 4 }).map((_, i) => <li key={i}><Skeleton className="h-[4.5rem]" /></li>)}
          {(!loading || data) && layers.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => setActiveId(l.id)}
                aria-pressed={active?.id === l.id}
                className={cn('w-full rounded-xl border px-4 py-3 text-left transition-colors',
                  active?.id === l.id ? 'border-signal/50 bg-ivory/[0.04]' : 'border-line hover:border-line-strong')}
              >
                <span className="block text-[0.9375rem] text-ivory">{l.label}</span>
                <span className="block text-xs text-stone">{l.provider} · {l.cadence}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          <div className="h-[26rem] overflow-hidden rounded-2xl border border-line sm:h-[34rem]">
            <TacticalMap
              variant="embed"
              className="h-full w-full"
              basemap={basemap}
              onBasemapChange={setActiveId}
              radar={isRadar}
            />
          </div>
          <p className="text-xs text-stone">
            {!active
              ? 'Cartographic base map — pick an imagery layer to see the ground from orbit.'
              : isRadar
              ? 'Latest RainViewer radar frame over the cartographic map. Coverage over India depends on contributing stations.'
              : active.max_zoom < 12
                ? `Daily composite for ${active.date ?? 'yesterday'} (UTC) — maximum detail at zoom ${active.max_zoom}; cloud and swath gaps are normal.`
                : 'High-resolution mosaic; acquisition dates vary by area. Use the layer list to compare with yesterday’s daily composites.'}
          </p>
        </div>
      </div>
    </Section>
  );
}
