'use client';

import { useEffect, useMemo } from 'react';
import { Hospital as HospitalIcon, Tent } from 'lucide-react';
import { overviewSearchKm } from '@/lib/overpass';
import type { Disaster, Hospital, Shelter } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/DataState';
import { Provenance } from './FacilityResults';
import { km } from './shared';
import { useFacilities } from './useFacilities';

function PickLine({ icon, label, name, distance, flagged }: { icon: React.ReactNode; label: string; name?: string; distance?: number; flagged?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-stone">{label}</p>
        <p className={cn('break-words text-sm', name ? 'text-ivory' : 'text-stone')}>
          {name ?? 'None mapped nearby'}
          {flagged && <span className="text-moderate"> · inside hazard area</span>}
        </p>
      </div>
      {distance != null && <span className="data shrink-0 pt-4 text-xs text-sand">{km(distance)}</span>}
    </div>
  );
}

/**
 * The default /api/resources view: up to four of the most severe incidents on land, each with its nearest emergency
 * hospital and safest shelter. Choosing one opens its full list in "Find the nearest help" above, so no list is shown twice.
 */
export default function IncidentOverview({ focus, activeId, onOpen, onHotlines }: {
  focus: Disaster[]; activeId: string | null; onOpen: (id: string) => void; onHotlines: (h: { label: string; number: string }[]) => void;
}) {
  const top = useMemo(() => focus.slice(0, 4), [focus]);
  const plan = useMemo(() => ({
    refs: top.map((d) => ({ id: d.id, title: d.title, lat: d.lat, lng: d.lng, radius_km: d.radius_km })),
    centers: top.map((d) => [d.lat, d.lng, overviewSearchKm(d)] as const),
  }), [top]);
  const feed = useFacilities(top.length ? '/api/resources' : null, plan);

  useEffect(() => {
    if (feed.data?.hotlines?.length) onHotlines(feed.data.hotlines);
  }, [feed.data, onHotlines]);

  const groups = useMemo(() => {
    const hospitals: Hospital[] = feed.data?.hospitals ?? [];
    const shelters: Shelter[] = feed.data?.shelters ?? [];
    return top.map((d) => {
      const hs = hospitals.filter((h) => h.incident_id === d.id);
      const ss = shelters.filter((s) => s.incident_id === d.id);
      const anyInside = ss.some((s) => s.inside_zone);
      return {
        d, hs, ss,
        hospital: hs.find((h) => h.emergency) ?? hs[0],
        er: hs.some((h) => h.emergency),
        shelter: (anyInside ? ss.find((s) => s.inside_zone === false) : undefined) ?? ss[0],
        safe: anyInside && ss.some((s) => s.inside_zone === false),
      };
    });
  }, [feed.data, top]);

  const busy = feed.status === 'loading' || feed.status === 'direct' || feed.status === 'idle';

  return (
    <section id="overview" aria-labelledby="overview-title" className="page scroll-mt-24 py-10">
      <div className="mb-6 space-y-1.5">
        <h2 id="overview-title" className="text-[1.75rem] leading-tight sm:text-[2rem]">Help near all active incidents</h2>
        <p className="max-w-2xl text-sm text-stone">
          The most severe incidents on land, each with the nearest emergency hospital and shelter mapped around it. Open one to see every facility and get directions.
        </p>
      </div>

      {feed.status === 'error' ? <ErrorState message={feed.error ?? 'Something went wrong'} onRetry={feed.reload} /> : (
        <>
          {busy && (
            <p className="mb-4 text-sm text-stone" role="status">
              {feed.status === 'direct' ? 'Our server could not reach OpenStreetMap in time, so your browser is asking it directly…' : 'Looking up facilities around each incident…'}
            </p>
          )}
          {feed.unreachable && !busy && (
            <p className="mb-4 text-sm text-moderate" role="status">
              OpenStreetMap could not be reached, so facilities are not shown. <button type="button" onClick={feed.reload} className="link">Try again</button>
            </p>
          )}
          <ul className="grid gap-4 md:grid-cols-2">
            {groups.map(({ d, hs, ss, hospital, er, shelter, safe }) => (
              <li key={d.id} className={cn('panel flex flex-col gap-4 p-5', activeId === d.id && 'ring-1 ring-inset ring-signal/40')}>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone">
                    <SeverityBadge level={d.severity} /><span>{d.category}</span>{d.state && <span>· {d.state}</span>}
                  </div>
                  <h3 className="font-serif text-xl leading-snug text-ivory">{d.title}</h3>
                  {!busy && !feed.unreachable && (
                    <p className="text-xs text-stone">{hs.length} hospitals · {ss.length} shelters within {overviewSearchKm(d)} km of the centre</p>
                  )}
                </div>
                {busy ? (
                  <div className="space-y-2" aria-hidden><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
                ) : !feed.unreachable && (
                  <div className="divide-y divide-line border-y border-line">
                    <PickLine icon={<HospitalIcon className="h-4 w-4 text-signal" aria-hidden />} label={er ? 'Nearest emergency hospital' : 'Nearest hospital'}
                      name={hospital?.name} distance={hospital?.distance_km} flagged={hospital?.inside_zone} />
                    <PickLine icon={<Tent className="h-4 w-4 text-info" aria-hidden />} label={safe ? 'Nearest shelter outside the hazard zone' : 'Nearest shelter'}
                      name={shelter?.name} distance={shelter?.distance_km} flagged={shelter?.inside_zone} />
                  </div>
                )}
                <Button variant={activeId === d.id ? 'quiet' : 'secondary'} size="sm" className="mt-auto w-fit" onClick={() => onOpen(d.id)}
                  aria-current={activeId === d.id ? 'true' : undefined}>
                  {activeId === d.id ? 'Shown above' : 'See all and get directions'}
                </Button>
              </li>
            ))}
          </ul>
          <Provenance feed={feed} className="mt-6" />
        </>
      )}
    </section>
  );
}
