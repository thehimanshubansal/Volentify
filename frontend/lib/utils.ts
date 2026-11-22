import type { Severity } from './types';

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

const rtf = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;

export function timeAgo(iso: string | Date, now: number = Date.now()): string {
  const t = typeof iso === 'string' ? Date.parse(iso) : iso.getTime();
  const s = Math.round((t - now) / 1000);
  const abs = Math.abs(s);
  if (!rtf) return new Date(t).toLocaleString();
  if (abs < 45) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatCoord(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return 'No GPS fix';
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
}

/** Percentage that never rounds a probability up to a false certainty. */
export function pct(v: number, digits = 0): string {
  if (digits === 0 && v > 0.995 && v < 1) return '>99%';
  if (digits === 0 && v > 0 && v < 0.005) return '<1%';
  return `${(v * 100).toFixed(digits)}%`;
}

export function titleCase(s: string): string {
  return s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const SEVERITY_ORDER: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** Approximate circle polygon for incidents without a mapped extent. */
export function circlePolygon(lat: number, lng: number, radiusKm: number, steps = 64): GeoJSON.Polygon {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const dLat = (radiusKm / 111.32) * Math.sin(t);
    const dLng = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.cos(t);
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: 'Polygon', coordinates: [coords] };
}
