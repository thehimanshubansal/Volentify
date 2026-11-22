/**
 * Browser-side OpenStreetMap (Overpass) access for the Resources page.
 *
 * The server (/api/resources) gives up on Overpass after ~11 s so it never hits Vercel's function limit. When that
 * happens it answers `mode: "OFFLINE"` with the Overpass `query` it would have run, and the browser runs it here
 * instead (Overpass allows CORS). The parsing mirrors api/_lib/engines/intel.py — `_facilities_query`,
 * `parse_facilities` and `_focus` — so results look the same whichever side fetched them. Keep them in step.
 */

import type { Disaster, Hospital, Shelter } from './types';
import { SEVERITY_ORDER, haversineKm } from './utils';

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
] as const;

export const OSM_ATTRIBUTION = 'Facility locations © OpenStreetMap contributors (ODbL)';

/** Client-side abort per Overpass mirror. */
const REQUEST_TIMEOUT_MS = 15_000;
/** Overpass's own server-side budget, kept just under the client abort. */
const QUERY_TIMEOUT_S = 14;
/** Reuse a successful answer for the same query within one visit. */
const CACHE_MS = 30 * 60_000;

/** Hazards that put hospitals and shelters at risk (intel.FACILITY_HAZARDS). */
export const FACILITY_HAZARDS = new Set(['Cyclone', 'Storm', 'Flood', 'Earthquake', 'Landslide', 'Wildfire', 'Volcano', 'Heatwave']);
const SEA_AREAS = new Set(['Bay of Bengal', 'Arabian Sea', 'Indian Ocean']);

export interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

/** What a facility is matched to: an incident (with its hazard radius) or a point (radius 0, never "inside"). */
export interface FacilityRef {
  id: string;
  title: string;
  lat: number;
  lng: number;
  radius_km?: number | null;
}

/** [lat, lng, search radius in km] */
export type Center = readonly [number, number, number];

export interface DirectFacilities {
  hospitals: Hospital[];
  shelters: Shelter[];
  fetched_at: string;
  /** Host of the Overpass mirror that answered. */
  endpoint: string;
}

/** Active incidents on land where facilities matter, most severe first (intel._focus). */
export function focusIncidents(incidents: readonly Disaster[]): Disaster[] {
  return incidents
    .filter((d) => (d.status ?? 'ACTIVE') === 'ACTIVE' && FACILITY_HAZARDS.has(d.category)
      && !String(d.location ?? '').endsWith('Sea') && !SEA_AREAS.has(d.state))
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4) || cmp(a.title, b.title));
}

/** Search radius the server uses around one incident (intel.facilities_for_incident). */
export const incidentSearchKm = (d: Pick<Disaster, 'radius_km'>) => Math.max(8, Math.min(25, Number(d.radius_km) || 20));
/** Search radius the server uses around each incident in the overview (intel.relief_facilities). */
export const overviewSearchKm = (d: Pick<Disaster, 'radius_km'>) => Math.max(5, Math.min(15, Number(d.radius_km) || 15));

/** Overpass QL for hospitals, shelters and assembly points around each centre (intel._facilities_query). */
export function facilitiesQuery(centers: readonly Center[], timeoutS = QUERY_TIMEOUT_S): string {
  const clauses: string[] = [];
  for (const [lat, lng, r] of centers) {
    const around = `(around:${Math.trunc(r * 1000)},${lat.toFixed(5)},${lng.toFixed(5)})`;
    clauses.push(
      `nwr["amenity"="hospital"]${around};`,
      `nwr["social_facility"="shelter"]${around};`,
      `nwr["emergency"="assembly_point"]${around};`,
      `nwr["amenity"="shelter"]["shelter_type"!~"public_transport|picnic_shelter|weather_shelter"]["name"]${around};`,
    );
  }
  return `[out:json][timeout:${timeoutS}];(${clauses.join('')});out center tags 300;`;
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

function centerOf(el: OverpassElement): [number | undefined, number | undefined] {
  return [el.lat || el.center?.lat, el.lon || el.center?.lon];
}

function address(tags: Record<string, string>): string {
  if (tags['addr:full']) return tags['addr:full'];
  return [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'],
    tags['addr:city'] || tags['addr:district'], tags['addr:postcode']].filter(Boolean).join(', ');
}

function toInt(value: string | undefined): number | null {
  if (value == null) return null;
  const first = String(value).split(';')[0].trim();
  return /^[+-]?\d+$/.test(first) ? parseInt(first, 10) : null;
}

const SHELTER_AMENITIES: [string, string][] = [
  ['drinking_water', 'Drinking water'], ['toilets', 'Toilets'], ['generator', 'Generator'], ['kitchen', 'Kitchen'],
];

/**
 * Hospitals and shelters, each matched to its nearest reference (incident or point) with the straight-line distance
 * to it. `inside_zone` marks facilities inside that incident's hazard radius (intel.parse_facilities).
 */
export function parseFacilities(elements: readonly OverpassElement[], refs: readonly FacilityRef[]): { hospitals: Hospital[]; shelters: Shelter[] } {
  const hospitals: Hospital[] = [];
  const shelters: Shelter[] = [];
  if (!refs.length) return { hospitals, shelters };
  const seen = new Set<string>();
  for (const el of elements) {
    const [lat, lng] = centerOf(el);
    const tags = el.tags ?? {};
    const name = tags['name:en'] || tags.name;
    if (lat == null || lng == null || !name) continue;
    const osmId = `${(el.type || 'n')[0]}${el.id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);

    let near = refs[0];
    let best = haversineKm(lat, lng, near.lat, near.lng);
    for (const ref of refs.slice(1)) {
      const d = haversineKm(lat, lng, ref.lat, ref.lng);
      if (d < best) { best = d; near = ref; }
    }
    const distance = round1(best);
    const radius = Number(near.radius_km) || 0;
    const common = {
      id: `osm_${osmId}`, name, address: address(tags), lat, lng,
      osm_url: `https://www.openstreetmap.org/${el.type ?? 'node'}/${el.id}`,
      incident_id: near.id, incident_title: near.title, distance_km: distance,
      inside_zone: radius > 0 && distance <= radius,
    };
    if (tags.amenity === 'hospital') {
      const emergency = tags.emergency === 'yes';
      const kind = emergency ? 'Emergency hospital'
        : tags['operator:type'] === 'government' || tags['operator:type'] === 'public' ? 'Government hospital' : 'Hospital';
      hospitals.push({
        ...common, kind, beds: toInt(tags.beds), phone: tags.phone || tags['contact:phone'] || '', emergency,
        icu_beds: null, icu_available: null, trauma_level: null,
      });
    } else {
      shelters.push({
        ...common, capacity: toInt(tags.capacity), occupancy: null,
        facilities: SHELTER_AMENITIES.filter(([key]) => tags[key] === 'yes').map(([, label]) => label),
        incharge: tags.operator || null,
        kind: tags.emergency === 'assembly_point' ? 'Assembly point' : 'Shelter',
      });
    }
  }
  const order = (a: { distance_km: number; name: string }, b: { distance_km: number; name: string }) =>
    a.distance_km - b.distance_km || cmp(a.name, b.name);
  hospitals.sort(order);
  shelters.sort(order);
  return { hospitals: hospitals.slice(0, 120), shelters: shelters.slice(0, 120) };
}

/** POST a query to each mirror in turn (form field `data`), each with its own 15 s abort. */
async function runOverpass(query: string): Promise<{ elements: OverpassElement[]; endpoint: string }> {
  const body = query.replace(/\[timeout:\d+\]/, `[timeout:${QUERY_TIMEOUT_S}]`);
  let lastError: unknown = null;
  for (const url of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: new URLSearchParams({ data: body }),
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = (await res.json()) as { elements?: OverpassElement[]; remark?: string };
      const elements = Array.isArray(json.elements) ? json.elements : [];
      // A busy server answers 200 with an empty result and a "runtime error" remark: treat it as a failure.
      if (!elements.length && json.remark && /error|timed out/i.test(json.remark)) throw new Error(json.remark);
      return { elements, endpoint: new URL(url).host };
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('OpenStreetMap could not be reached');
}

// One browser query at a time: Overpass limits concurrent requests per visitor.
let tail: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.catch(() => undefined);
  return run;
}

const cache = new Map<string, { at: number; result: Promise<{ elements: OverpassElement[]; endpoint: string; at: string }> }>();

function overpass(query: string) {
  const hit = cache.get(query);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.result;
  const result = enqueue(() => runOverpass(query)).then((r) => ({ ...r, at: new Date().toISOString() }));
  cache.set(query, { at: Date.now(), result });
  result.catch(() => { if (cache.get(query)?.result === result) cache.delete(query); });
  return result;
}

/** Run a facilities query straight from the browser and parse it like the server does. */
export async function fetchFacilitiesDirect(query: string, refs: readonly FacilityRef[]): Promise<DirectFacilities> {
  const { elements, endpoint, at } = await overpass(query);
  return { ...parseFacilities(elements, refs), fetched_at: at, endpoint };
}
