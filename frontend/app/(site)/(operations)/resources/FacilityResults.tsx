'use client';

import { useId, useMemo, useState } from 'react';
import { Building2, Hospital as HospitalIcon, Search, Tent } from 'lucide-react';
import type { Hospital, Shelter } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/DataState';
import { type AnyFacility, FacilityActions, type Origin, ZoneNote, facilityMeta, isHospital, km } from './shared';
import type { FacilityState } from './useFacilities';

const STALE_MS = 6 * 3600_000;
const PAGE = 8;

type Kind = 'Emergency dept.' | 'Government' | 'Shelter' | 'Assembly point';
const HOSPITAL_KINDS: Kind[] = ['Emergency dept.', 'Government'];
const SHELTER_KINDS: Kind[] = ['Shelter', 'Assembly point'];
const KIND_TEST: Record<Kind, (f: AnyFacility) => boolean> = {
  'Emergency dept.': (f) => isHospital(f) && f.emergency,
  Government: (f) => isHospital(f) && f.kind === 'Government hospital',
  Shelter: (f) => !isHospital(f) && f.kind === 'Shelter',
  'Assembly point': (f) => !isHospital(f) && f.kind === 'Assembly point',
};

/** Where the facility list came from and how fresh it is. */
export function Provenance({ feed, className }: { feed: FacilityState; className?: string }) {
  const d = feed.data;
  if (!d || feed.status !== 'ready') return null;
  const stale = d.fetched_at ? Date.now() - Date.parse(d.fetched_at) > STALE_MS : false;
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone', className)}>
      {feed.unreachable || d.mode === 'OFFLINE' ? <Pill tone="bad" dot>Offline</Pill>
        : feed.via === 'browser' ? <Pill tone="info" dot>Fetched directly from OpenStreetMap</Pill>
        : stale ? <Pill tone="warn" dot>Cached copy</Pill>
        : <Pill tone="good" dot>Live</Pill>}
      {d.fetched_at && <span>Updated {timeAgo(d.fetched_at)}</span>}
      {feed.via === 'browser' && feed.endpoint && <span className="code">via {feed.endpoint}</span>}
      <span>{d.attribution}</span>
    </p>
  );
}

export function ResultsSkeleton({ direct }: { direct?: boolean }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <p className="text-sm text-stone">
        {direct
          ? 'Our server could not reach OpenStreetMap in time, so your browser is asking it directly. This can take up to 15 seconds.'
          : 'Looking up hospitals and shelters in OpenStreetMap…'}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

function TopPick({ label, icon, f, note, empty, origin, mapHref }: {
  label: string; icon: React.ReactNode; f: AnyFacility | undefined; note?: string | null; empty: string;
  origin?: Origin | null; mapHref: string;
}) {
  return (
    <article className="panel flex flex-col gap-3 p-5 sm:p-6">
      <p className="eyebrow flex items-center gap-2">{icon}{label}</p>
      {f ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <h4 className="min-w-0 break-words font-serif text-2xl leading-tight text-ivory">{f.name}</h4>
            <p className="shrink-0"><span className="numeral text-3xl">{f.distance_km.toFixed(1)}</span><span className="ml-1 text-sm text-stone">km</span></p>
          </div>
          <p className="text-xs text-stone">{facilityMeta(f)}{f.address ? ` · ${f.address}` : ''}</p>
          {(note || f.inside_zone) && (
            <div className="space-y-1">
              {note && <p className="text-xs text-sand">{note}</p>}
              <ZoneNote f={f} />
            </div>
          )}
          <FacilityActions f={f} origin={origin} mapHref={mapHref} className="mt-auto pt-1" />
        </>
      ) : <p className="text-sm text-stone">{empty}</p>}
    </article>
  );
}

function FacilityRow({ f, origin }: { f: AnyFacility; origin?: Origin | null }) {
  const extra = !isHospital(f) && f.facilities.length ? f.facilities.join(', ') : '';
  return (
    <li className="space-y-2 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-0.5">
          <p className="break-words text-[0.9375rem] text-ivory">{f.name}</p>
          <p className="text-xs text-stone">{facilityMeta(f)}</p>
        </div>
        <p className="shrink-0 text-right"><span className="numeral text-2xl">{f.distance_km.toFixed(1)}</span><span className="ml-1 text-xs text-stone">km</span></p>
      </div>
      {(f.address || extra) && <p className="text-[0.8125rem] text-sand">{[f.address, extra].filter(Boolean).join(' · ')}</p>}
      {(isHospital(f) && f.emergency) || f.inside_zone ? (
        <div className="flex flex-wrap gap-2">
          {isHospital(f) && f.emergency && <Pill tone="good">Emergency dept.</Pill>}
          {f.inside_zone && <Pill tone="warn" className="whitespace-nowrap">Inside hazard area · call ahead</Pill>}
        </div>
      ) : null}
      <FacilityActions f={f} origin={origin} />
    </li>
  );
}

function FacilityList({ title, icon, items, total, empty, origin }: {
  title: string; icon: React.ReactNode; items: AnyFacility[]; total: number; empty: string; origin?: Origin | null;
}) {
  const [all, setAll] = useState(false);
  const id = useId();
  const shown = all ? items : items.slice(0, PAGE);
  return (
    <section aria-labelledby={id}>
      <h4 id={id} className="mb-3 flex items-baseline gap-2 text-2xl">
        <span className="self-center text-stone">{icon}</span>{title}
        <span className="font-sans text-sm text-stone">{items.length === total ? total : `${items.length} of ${total}`}</span>
      </h4>
      <ul className="divide-y divide-line border-y border-line">
        {shown.map((f) => <FacilityRow key={f.id} f={f} origin={origin} />)}
        {!items.length && <li className="py-6 text-sm text-stone">{empty}</li>}
      </ul>
      {items.length > PAGE && (
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? 'Show fewer' : `Show all ${items.length}`}
        </Button>
      )}
    </section>
  );
}

/**
 * Results for one reference point: provenance, how matching works, the two top picks, then every hospital and
 * shelter sorted by distance with search and type filters.
 */
export default function FacilityResults({ feed, reload, hospitals, shelters, searchKm, matching, mapHref, origin, fromLabel }: {
  feed: FacilityState; reload: () => void; hospitals: Hospital[]; shelters: Shelter[]; searchKm: number;
  matching: React.ReactNode; mapHref: string; origin?: Origin | null; fromLabel: string;
}) {
  const [q, setQ] = useState('');
  const [kinds, setKinds] = useState<Kind[]>([]);
  const searchId = useId();

  const counts = useMemo(() => {
    const all: AnyFacility[] = [...hospitals, ...shelters];
    return Object.fromEntries((Object.keys(KIND_TEST) as Kind[]).map((k) => [k, all.filter(KIND_TEST[k]).length])) as Record<Kind, number>;
  }, [hospitals, shelters]);

  if (feed.status === 'loading' || feed.status === 'direct' || feed.status === 'idle') return <ResultsSkeleton direct={feed.status === 'direct'} />;
  if (feed.status === 'error') return <ErrorState message={feed.error ?? 'Something went wrong'} onRetry={reload} />;
  if (feed.unreachable) {
    return (
      <div className="space-y-4">
        <Provenance feed={feed} />
        <EmptyState
          title="Facility data is unavailable right now"
          body="Neither Volentify nor your browser could reach OpenStreetMap. The helplines above always work: 108 for an ambulance, 1077 for your district control room."
          action={<Button variant="secondary" size="sm" onClick={reload}>Try again</Button>}
        />
      </div>
    );
  }

  const term = q.trim().toLowerCase();
  const hit = (f: AnyFacility) => !term || [f.name, f.kind, f.address, f.incident_title, ...(isHospital(f) ? [] : [f.incharge, ...f.facilities])]
    .filter(Boolean).join(' ').toLowerCase().includes(term);
  const hospitalKinds = kinds.filter((k) => HOSPITAL_KINDS.includes(k));
  const shelterKinds = kinds.filter((k) => SHELTER_KINDS.includes(k));
  const showHospitals = !kinds.length || hospitalKinds.length > 0;
  const showShelters = !kinds.length || shelterKinds.length > 0;
  const hList = hospitals.filter((h) => hit(h) && (!hospitalKinds.length || hospitalKinds.some((k) => KIND_TEST[k](h))));
  const sList = shelters.filter((s) => hit(s) && (!shelterKinds.length || shelterKinds.some((k) => KIND_TEST[k](s))));

  // Top picks: an emergency department first; a shelter outside the hazard area when the data can tell.
  const er = hospitals.find((h) => h.emergency);
  const hospitalPick = er ?? hospitals[0];
  const anyInside = shelters.some((s) => s.inside_zone);
  const outside = shelters.find((s) => s.inside_zone === false);
  const shelterPick = anyInside ? outside ?? shelters[0] : shelters[0];
  const nothing = !hospitals.length && !shelters.length;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Provenance feed={feed} />
        <p className="max-w-3xl text-sm leading-relaxed text-stone">{matching}</p>
      </div>

      {nothing ? (
        <EmptyState
          title={`Nothing mapped within ${searchKm} km`}
          body="No hospital, relief shelter or assembly point is mapped in OpenStreetMap here. Call 108 for an ambulance or 1077 for the district control room, and follow district announcements for relief camps."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TopPick
              label={er || !hospitals.length ? 'Nearest emergency hospital' : 'Nearest hospital'}
              icon={<HospitalIcon className="h-4 w-4 text-signal" aria-hidden />}
              f={hospitalPick} origin={origin} mapHref={mapHref}
              note={!er && hospitals.length ? `No hospital within ${searchKm} km is tagged with an emergency department in OpenStreetMap; this is the nearest one.` : null}
              empty={`No hospital is mapped within ${searchKm} km. Call 108 for an ambulance.`}
            />
            <TopPick
              label={anyInside && outside ? 'Nearest shelter outside the hazard zone' : 'Nearest shelter'}
              icon={<Tent className="h-4 w-4 text-info" aria-hidden />}
              f={shelterPick} origin={origin} mapHref={mapHref}
              note={anyInside && !outside ? `Every shelter mapped within ${searchKm} km is inside the hazard area. Confirm it is open and safe before going.` : null}
              empty={`No relief shelter or assembly point is mapped within ${searchKm} km. Follow district announcements for relief camps, or call 1077.`}
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex h-11 w-full items-center gap-2.5 rounded-[10px] border border-line bg-ink-800 px-3.5 focus-within:border-signal/70 focus-within:ring-2 focus-within:ring-signal/20 lg:max-w-md">
                <Search className="h-4 w-4 shrink-0 text-stone" aria-hidden />
                <label htmlFor={searchId} className="sr-only">Search hospitals and shelters</label>
                <input id={searchId} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, area or operator"
                  className="h-full w-full min-w-0 bg-transparent text-[0.9375rem] text-ivory placeholder:text-ash focus:outline-none" />
              </div>
              <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
                {(Object.keys(KIND_TEST) as Kind[]).map((k) => {
                  const on = kinds.includes(k);
                  return (
                    <button key={k} type="button" aria-pressed={on}
                      onClick={() => setKinds(on ? kinds.filter((x) => x !== k) : [...kinds, k])}
                      className={cn('rounded-full px-3 py-1.5 text-[0.8125rem] ring-1 ring-inset transition-colors',
                        on ? 'bg-signal/[0.12] text-ivory ring-signal/60' : 'text-sand ring-line-strong hover:text-ivory hover:ring-ivory/30')}>
                      {k} <span className="text-stone">{counts[k]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-stone">Sorted by distance {fromLabel}, nearest first.</p>
          </div>

          <div className={cn('grid gap-12', showHospitals && showShelters && 'lg:grid-cols-2')}>
            {showHospitals && (
              <FacilityList title="Hospitals" icon={<HospitalIcon className="h-5 w-5" aria-hidden />} items={hList} total={hospitals.length} origin={origin}
                empty={term || hospitalKinds.length ? 'No hospital matches this search or filter.' : `No hospital is mapped within ${searchKm} km.`} />
            )}
            {showShelters && (
              <FacilityList title="Shelters and assembly points" icon={<Building2 className="h-5 w-5" aria-hidden />} items={sList} total={shelters.length} origin={origin}
                empty={term || shelterKinds.length ? 'No shelter matches this search or filter.' : `No relief shelter or assembly point is mapped within ${searchKm} km. Follow district announcements for relief camps.`} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
