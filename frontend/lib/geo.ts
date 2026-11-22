/** Browser-side location helpers: the device's position, typed coordinates or a place name, and road routing. */

import { haversineKm } from './utils';

export interface LatLng { lat: number; lng: number }
export interface Located extends LatLng { accuracy_m?: number | null; label?: string }

/** The device's current position. Rejects with a readable message on denial or timeout. */
export function currentPosition(timeoutMs = 12_000): Promise<Located> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('This browser cannot share your location — type it instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy_m: Math.round(p.coords.accuracy) }),
      (err) => reject(new Error(
        err.code === err.PERMISSION_DENIED ? 'Location permission was denied — allow it in the browser, or type where you are.'
          : err.code === err.TIMEOUT ? 'Finding your location took too long — try again outdoors, or type where you are.'
          : 'Your location is unavailable right now — type where you are instead.')),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

/** "19.81, 85.83" (or with N/E suffixes) → coordinates; null when the text isn't a coordinate pair. */
export function parseLatLng(text: string): LatLng | null {
  const m = text.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*°?\s*[nN]?\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*[eE]?$/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/**
 * A typed place → coordinates, via OpenStreetMap Nominatim (India only). Called only when someone submits a place,
 * never as they type, in line with Nominatim's usage policy.
 */
export async function geocode(text: string): Promise<Located | null> {
  const coords = parseLatLng(text);
  if (coords) return { ...coords, label: text.trim() };
  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=1&q=${encodeURIComponent(text.trim())}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    if (!rows.length) return null;
    return { lat: Number(rows[0].lat), lng: Number(rows[0].lon), label: rows[0].display_name.split(',').slice(0, 3).join(',') };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface RouteResult { line: GeoJSON.LineString | null; distance_km: number; duration_min: number | null; road: boolean }

/** Road route from the public OSRM server; falls back to the straight line (marked road: false) when unavailable. */
export async function roadRoute(from: LatLng, to: LatLng): Promise<RouteResult> {
  const straight = { line: null, distance_km: haversineKm(from.lat, from.lng, to.lat, to.lng), duration_min: null, road: false };
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return straight;
    const body = (await res.json()) as { code: string; routes?: { geometry: GeoJSON.LineString; distance: number; duration: number }[] };
    const r = body.code === 'Ok' ? body.routes?.[0] : undefined;
    if (!r) return straight;
    return { line: r.geometry, distance_km: r.distance / 1000, duration_min: r.duration / 60, road: true };
  } catch {
    return straight;
  } finally {
    clearTimeout(timer);
  }
}

/** Turn-by-turn navigation in Google Maps (opens the app on phones). */
export function directionsUrl(to: LatLng, from?: LatLng | null, mode: 'driving' | 'walking' = 'driving'): string {
  const q = new URLSearchParams({ api: '1', destination: `${to.lat},${to.lng}`, travelmode: mode });
  if (from) q.set('origin', `${from.lat},${from.lng}`);
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}

export function formatDuration(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}
