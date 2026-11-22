'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Crosshair, MapPin, X } from 'lucide-react';
import { type FacilityRef, focusIncidents, incidentSearchKm } from '@/lib/overpass';
import type { Disaster, Hospital, Shelter } from '@/lib/types';
import { haversineKm, SEVERITY_ORDER } from '@/lib/utils';
import { SEVERITY_META } from '@/lib/constants';
import { SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/DataState';
import { Input, Segmented, Select } from '@/components/ui/Field';
import FacilityResults from './FacilityResults';
import type { Origin } from './shared';
import { type DirectPlan, useFacilities } from './useFacilities';

export type Mode = 'incident' | 'near';
const MODES = [{ value: 'incident', label: 'Near a disaster' }, { value: 'near', label: 'Near me' }] as const;
const RADII = [{ value: '5', label: '5 km' }, { value: '15', label: '15 km' }, { value: '30', label: '30 km' }] as const;
type Radius = (typeof RADII)[number]['value'];

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** "19.81, 85.83", "19.81 85.83" or "19.8135° N, 85.8312° E". null when the text isn't coordinates. */
function parseCoords(text: string): { lat: number; lng: number } | 'out-of-range' | null {
  const m = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?\s*$/i);
  if (!m) return null;
  const lat = parseFloat(m[1]) * (m[2]?.toUpperCase() === 'S' ? -1 : 1);
  const lng = parseFloat(m[3]) * (m[4]?.toUpperCase() === 'W' ? -1 : 1);
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return 'out-of-range';
  return { lat, lng };
}

// Nominatim usage policy: one request per second at most, only on an explicit search, results reused.
const placeCache = new Map<string, Origin | null>();
let lastPlaceLookup = 0;

async function geocode(q: string): Promise<Origin | null> {
  const key = q.toLowerCase();
  if (placeCache.has(key)) return placeCache.get(key) ?? null;
  const wait = 1000 - (Date.now() - lastPlaceLookup);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastPlaceLookup = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=1&q=${encodeURIComponent(q)}`,
      { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const hits = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const hit = hits[0];
    const origin: Origin | null = hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon), label: hit.display_name, source: 'place' } : null;
    placeCache.set(key, origin);
    return origin;
  } finally {
    clearTimeout(timer);
  }
}

type Geo = { kind: 'idle' } | { kind: 'locating' } | { kind: 'error'; reason: 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'insecure' };
const GEO_ERROR: Record<Extract<Geo, { kind: 'error' }>['reason'], string> = {
  denied: 'Location permission is blocked for this site. Allow it in your browser’s site settings, or type a place or coordinates below.',
  unavailable: 'Your device could not work out where you are. Check that location services are on, or type a place below.',
  timeout: 'Finding your position took too long. Try again, or type a place or coordinates below.',
  unsupported: 'This browser cannot share its location. Type a place or coordinates below.',
  insecure: 'Location only works over a secure (https) connection. Type a place or coordinates below.',
};

function Locator({ origin, onOrigin, radius, onRadius }: {
  origin: Origin | null; onOrigin: (o: Origin | null) => void; radius: Radius; onRadius: (r: Radius) => void;
}) {
  const [geo, setGeo] = useState<Geo>({ kind: 'idle' });
  const [place, setPlace] = useState('');
  const [lookup, setLookup] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const alive = useRef(true);
  const inputId = useId();
  const hintId = useId();
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const locate = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return setGeo({ kind: 'error', reason: 'unsupported' });
    if (!window.isSecureContext) return setGeo({ kind: 'error', reason: 'insecure' });
    setGeo({ kind: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!alive.current) return;
        setGeo({ kind: 'idle' });
        onOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'your location', source: 'gps', accuracy: pos.coords.accuracy });
      },
      (err) => alive.current && setGeo({ kind: 'error', reason: err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable' }),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = place.trim();
    if (!text) return setLookup({ busy: false, error: 'Type a town, district or landmark, or coordinates such as 19.81, 85.83.' });
    const coords = parseCoords(text);
    if (coords === 'out-of-range') return setLookup({ busy: false, error: 'Latitude must be between −90 and 90 and longitude between −180 and 180.' });
    if (coords) {
      setLookup({ busy: false, error: null });
      return onOrigin({ ...coords, label: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`, source: 'coords' });
    }
    setLookup({ busy: true, error: null });
    try {
      const found = await geocode(text);
      if (!alive.current) return;
      if (!found) return setLookup({ busy: false, error: `No place in India matched “${text}”. Add the district or state, or enter coordinates.` });
      setLookup({ busy: false, error: null });
      onOrigin(found);
    } catch {
      if (alive.current) setLookup({ busy: false, error: 'Place search is unavailable right now. Enter coordinates instead, such as 19.81, 85.83.' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Button onClick={locate} loading={geo.kind === 'locating'} size="md">
            {geo.kind !== 'locating' && <Crosshair className="h-4 w-4" aria-hidden />}
            {geo.kind === 'locating' ? 'Finding your location…' : 'Use my location'}
          </Button>
          {geo.kind === 'locating' && <p className="text-xs text-stone" role="status">If your browser asks, choose Allow. This can take up to 15 seconds.</p>}
        </div>
        <div className="space-y-1.5">
          <p className="text-[0.8125rem] font-medium text-sand" aria-hidden>Search radius</p>
          <Segmented ariaLabel="Search radius" options={RADII} value={radius} onChange={onRadius} />
        </div>
      </div>
      {geo.kind === 'error' && <p className="text-sm text-moderate" role="alert">{GEO_ERROR[geo.reason]}</p>}

      <form onSubmit={submit} className="space-y-1.5" noValidate>
        <label htmlFor={inputId} className="block text-[0.8125rem] font-medium text-sand">Or enter a place or coordinates</label>
        <div className="flex gap-2">
          <Input id={inputId} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Puri, Odisha or 19.81, 85.83"
            autoComplete="off" aria-describedby={hintId} aria-invalid={Boolean(lookup.error)} className="min-w-0 flex-1" />
          <Button type="submit" variant="secondary" loading={lookup.busy} className="h-11 shrink-0">Search</Button>
        </div>
        {lookup.error
          ? <p id={hintId} className="text-xs text-critical" role="alert">{lookup.error}</p>
          : <p id={hintId} className="text-xs text-stone">Place names are looked up with OpenStreetMap Nominatim only when you press Search.</p>}
      </form>

      {origin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-ink-800 px-4 py-3">
          <p className="flex min-w-0 items-start gap-2 text-sm text-sand">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
            <span className="min-w-0 break-words">
              Within {radius} km of <span className="text-ivory">{origin.label}</span>
              {origin.source === 'gps' && origin.accuracy ? <span className="text-stone"> (accurate to about {Math.round(origin.accuracy)} m)</span> : null}
            </span>
          </p>
          <Button variant="ghost" size="sm" onClick={() => onOrigin(null)}><X className="h-3.5 w-3.5" aria-hidden />Clear</Button>
        </div>
      )}
      <p className="text-xs text-stone">
        Only a position rounded to about 1 km is sent to Volentify, and it is not saved to your account. Exact distances are worked out in your browser.
      </p>
    </div>
  );
}

function IncidentSummary({ d }: { d: Disaster }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone">
      <SeverityBadge level={d.severity} />
      <span>{d.category}</span>
      {(d.location || d.state) && <span>{[d.location, d.state].filter((x, i, a) => x && a.indexOf(x) === i).join(', ')}</span>}
      {d.radius_km ? <span>Mapped hazard area: {Math.round(d.radius_km)} km radius</span> : null}
      <Link href={`/disasters/${d.id}`} className="link">Incident dossier</Link>
    </div>
  );
}

export default function NearestHelp({ mode, onMode, incidents, incidentsLoading, incidentsError, reloadIncidents, selectedId, onSelect, headingRef, onHotlines }: {
  mode: Mode; onMode: (m: Mode) => void; incidents: Disaster[]; incidentsLoading: boolean; incidentsError: string | null;
  reloadIncidents: () => void; selectedId: string | null; onSelect: (id: string) => void;
  headingRef: React.Ref<HTMLHeadingElement>; onHotlines: (h: { label: string; number: string }[]) => void;
}) {
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [radius, setRadius] = useState<Radius>('15');
  const selectId = useId();
  const radiusKm = Number(radius);

  const sorted = useMemo(() => [...incidents].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.title.localeCompare(b.title)), [incidents]);
  const zones = useMemo(() => focusIncidents(incidents), [incidents]);
  const onLand = useMemo(() => new Set(zones.map((d) => d.id)), [zones]);
  const incident = sorted.find((d) => d.id === selectedId) ?? null;

  // One request at a time: the selected incident, or the point the person chose.
  const request = useMemo((): { path: string | null; plan: DirectPlan | null; searchKm: number } => {
    if (mode === 'incident') {
      if (!incident) return { path: null, plan: null, searchKm: 0 };
      const searchKm = incidentSearchKm(incident);
      const ref: FacilityRef = { id: incident.id, title: incident.title, lat: incident.lat, lng: incident.lng, radius_km: incident.radius_km };
      return { path: `/api/resources?disaster_id=${encodeURIComponent(incident.id)}`, plan: { refs: [ref], centers: [[incident.lat, incident.lng, searchKm]] }, searchKm };
    }
    if (!origin) return { path: null, plan: null, searchKm: radiusKm };
    const lat = round2(origin.lat);
    const lng = round2(origin.lng);
    return {
      path: `/api/resources/nearby?lat=${lat.toFixed(2)}&lng=${lng.toFixed(2)}&radius_km=${radiusKm}`,
      plan: { refs: [{ id: 'here', title: 'your location', lat, lng, radius_km: 0 }], centers: [[lat, lng, radiusKm]] },
      searchKm: radiusKm,
    };
  }, [mode, incident, origin, radiusKm]);

  const feed = useFacilities(request.path, request.plan);

  useEffect(() => {
    if (feed.data?.hotlines?.length) onHotlines(feed.data.hotlines);
  }, [feed.data, onHotlines]);

  // Near me: exact distance from the person (not the rounded point), and flag anything inside an active hazard area.
  const { hospitals, shelters } = useMemo(() => {
    const h: Hospital[] = feed.data?.hospitals ?? [];
    const s: Shelter[] = feed.data?.shelters ?? [];
    if (mode !== 'near' || !origin) return { hospitals: h, shelters: s };
    const relocate = <T extends Hospital | Shelter>(f: T): T => {
      const zone = zones.find((z) => z.radius_km > 0 && haversineKm(f.lat, f.lng, z.lat, z.lng) <= z.radius_km);
      return {
        ...f, distance_km: round1(haversineKm(origin.lat, origin.lng, f.lat, f.lng)), inside_zone: Boolean(zone),
        incident_id: zone?.id ?? f.incident_id, incident_title: zone?.title ?? f.incident_title,
      };
    };
    const order = (a: { distance_km: number; name: string }, b: { distance_km: number; name: string }) => a.distance_km - b.distance_km || a.name.localeCompare(b.name);
    return { hospitals: h.map(relocate).sort(order), shelters: s.map(relocate).sort(order) };
  }, [feed.data, mode, origin, zones]);

  const where = !origin ? 'the point you chose' : origin.source === 'gps' ? 'you' : origin.source === 'place' ? origin.label.split(',')[0] : origin.label;

  return (
    <section id="nearest" aria-labelledby="nearest-title" className="page scroll-mt-24 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h2 id="nearest-title" ref={headingRef} tabIndex={-1} className="text-[1.75rem] leading-tight focus:outline-none sm:text-[2rem]">Find the nearest help</h2>
          <p className="max-w-2xl text-sm text-stone">Hospitals, relief shelters and assembly points mapped in OpenStreetMap, matched to an active incident or to where you are.</p>
        </div>
        <Segmented ariaLabel="Find help" options={MODES} value={mode} onChange={onMode} />
      </div>

      <div className="panel mb-8 space-y-4 p-5 sm:p-6">
        {mode === 'incident' ? (
          incidentsLoading && !incidents.length ? (
            <div className="space-y-3" role="status" aria-label="Loading incidents"><Skeleton className="h-4 w-24" /><Skeleton className="h-11 max-w-xl" /></div>
          ) : incidentsError && !incidents.length ? (
            <ErrorState message={`Active incidents could not be loaded: ${incidentsError}`} onRetry={reloadIncidents} />
          ) : !incidents.length ? (
            <EmptyState className="py-8" title="No active incidents right now"
              body="When an incident is declared, the hospitals and shelters around it appear here. You can still find help near you."
              action={<Button variant="secondary" size="sm" onClick={() => onMode('near')}>Find help near me</Button>} />
          ) : (
            <>
              <div className="max-w-xl space-y-1.5">
                <label htmlFor={selectId} className="block text-[0.8125rem] font-medium text-sand">Incident</label>
                <Select id={selectId} value={selectedId ?? ''} onChange={(e) => onSelect(e.target.value)}>
                  {sorted.some((d) => onLand.has(d.id)) && (
                    <optgroup label="On land">
                      {sorted.filter((d) => onLand.has(d.id)).map((d) => <option key={d.id} value={d.id}>{SEVERITY_META[d.severity].label} · {d.title}</option>)}
                    </optgroup>
                  )}
                  {sorted.some((d) => !onLand.has(d.id)) && (
                    <optgroup label="At sea or region-wide">
                      {sorted.filter((d) => !onLand.has(d.id)).map((d) => <option key={d.id} value={d.id}>{SEVERITY_META[d.severity].label} · {d.title}</option>)}
                    </optgroup>
                  )}
                </Select>
              </div>
              {incident && <IncidentSummary d={incident} />}
            </>
          )
        ) : (
          <Locator origin={origin} onOrigin={setOrigin} radius={radius} onRadius={setRadius} />
        )}
      </div>

      {request.path && (
        <div aria-busy={feed.status === 'loading' || feed.status === 'direct'}>
          <h3 className="sr-only">{mode === 'incident' ? `Help near ${incident?.title ?? 'the incident'}` : `Help near ${where}`}</h3>
          <FacilityResults
            feed={feed} reload={feed.reload} hospitals={hospitals} shelters={shelters} searchKm={request.searchKm}
            mapHref={mode === 'incident' && incident ? `/map?incident=${encodeURIComponent(incident.id)}` : '/map'}
            origin={mode === 'near' ? origin : null}
            fromLabel={mode === 'incident' ? 'from the incident centre' : `from ${where}`}
            matching={mode === 'incident' ? (
              <>Nearest by straight-line distance from the incident centre, searching {request.searchKm} km around it. Facilities inside the mapped hazard area
                {incident?.radius_km ? ` (${Math.round(incident.radius_km)} km radius)` : ''} are flagged because they may be affected: call ahead before travelling.</>
            ) : (
              <>Nearest by straight-line distance from {where}, within {request.searchKm} km; the road route will be longer. Facilities inside an active incident’s
                hazard area are flagged because they may be affected: call ahead before travelling.</>
            )}
          />
        </div>
      )}
    </section>
  );
}
