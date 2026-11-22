'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Phone } from 'lucide-react';
import { useApi } from '@/lib/api';
import type { Disaster, MeshEvent, Volunteer } from '@/lib/types';
import { ButtonLink } from '@/components/ui/Button';
import { SourceTag } from '@/components/ui/DataState';
import { LiveDot } from '@/components/ui/Badge';

const HeroGlobe = dynamic(() => import('@/components/globe/HeroGlobe'), { ssr: false });

function Figure({ label, value, loading }: { label: string; value: number | undefined; loading: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.8125rem] text-stone">{label}</dt>
      <dd className="numeral mt-1 text-4xl leading-none sm:text-5xl">
        {loading || value === undefined ? <span className="inline-block h-9 w-12 animate-pulse rounded-md bg-ivory/[0.06] align-middle" /> : value}
      </dd>
    </div>
  );
}

export default function HomeHero() {
  const disasters = useApi<Disaster[]>('/api/disasters', { refreshMs: 120_000 });
  const mesh = useApi<MeshEvent[]>('/api/mesh/events?max_age_minutes=1440&limit=500', { refreshMs: 60_000 });
  const responders = useApi<Volunteer[]>('/api/volunteers?availability=AVAILABLE', { refreshMs: 120_000 });

  const active = useMemo(() => (disasters.data ?? []).filter((d) => d.status === 'ACTIVE'), [disasters.data]);
  const hotspots = useMemo(() => active.map((d) => ({ lat: d.lat, lng: d.lng, critical: d.severity === 'CRITICAL' })), [active]);

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute inset-y-0 right-[-30%] w-[110%] opacity-35 sm:opacity-90 sm:right-[-12%] sm:w-[78%] lg:right-[-6%] lg:w-[62%]" aria-hidden>
        <HeroGlobe hotspots={hotspots} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent lg:via-ink/55" aria-hidden />

      <div className="page relative flex min-h-[calc(100svh-4rem)] flex-col justify-between gap-16 pb-10 pt-20 sm:pt-28">
        <div className="max-w-[46rem] animate-fade-up space-y-8">
          <p className="flex items-center gap-2.5 text-sm text-sand">
            <LiveDot /> {disasters.data
              ? active.length ? `Tracking ${active.length} active incident${active.length === 1 ? '' : 's'} in and around India` : 'No major hazards active in and around India right now'
              : 'Connecting to live hazard feeds'}
          </p>
          <h1 className="display text-balance text-[3.25rem] sm:text-[5.25rem] lg:text-[6.5rem]">
            Intelligence for every disaster. Humanity for every response.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-stone">
            Volentify maps incidents as they unfold, carries field reports across phones when the cell network is gone,
            and sends the right responder to the right mission first.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/map" size="lg">Open the live map</ButtonLink>
            <ButtonLink href="/register" size="lg" variant="secondary">Join as a volunteer</ButtonLink>
            <a href="tel:112" className="ml-1 inline-flex items-center gap-1.5 text-sm text-stone hover:text-ivory">
              <Phone className="h-3.5 w-3.5" aria-hidden /> In danger now? Call 112
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-8 border-t border-line pt-8 sm:grid-cols-4">
            <Figure label="Active incidents" value={disasters.data ? active.length : undefined} loading={disasters.loading} />
            <Figure label="Critical severity" value={disasters.data ? active.filter((d) => d.severity === 'CRITICAL').length : undefined} loading={disasters.loading} />
            <Figure label="Mesh field reports, last 24 h" value={mesh.data?.length} loading={mesh.loading} />
            <Figure label="Responders available now" value={responders.data?.length} loading={responders.loading} />
          </dl>
          <div className="flex items-center justify-between text-xs text-stone">
            <SourceTag source={disasters.source} />
            {disasters.error && <span>Live figures are unavailable right now.</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
