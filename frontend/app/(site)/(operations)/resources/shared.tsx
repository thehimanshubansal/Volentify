import Link from 'next/link';
import { ExternalLink, MapPinned, Navigation, Phone } from 'lucide-react';
import type { Hospital, Shelter } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Mirror of api/_lib/data/reference.py HOTLINES, so helplines render instantly and survive an API outage. */
export const HOTLINES: { label: string; number: string }[] = [
  { label: 'National emergency', number: '112' },
  { label: 'Ambulance', number: '108' },
  { label: 'Fire', number: '101' },
  { label: 'Police', number: '100' },
  { label: 'Disaster management (NDMA)', number: '1078' },
  { label: 'State emergency operations', number: '1070' },
  { label: 'District control room', number: '1077' },
  { label: 'NDRF control room', number: '011-24363260' },
  { label: 'Women helpline', number: '1091' },
  { label: 'Child helpline', number: '1098' },
];

export type AnyFacility = Hospital | Shelter;
export const isHospital = (f: AnyFacility): f is Hospital => 'emergency' in f;

/** Where distances are measured from in "Near me" mode. */
export interface Origin {
  lat: number;
  lng: number;
  label: string;
  source: 'gps' | 'coords' | 'place';
  accuracy?: number | null;
}

/** First number of an OSM phone tag ("+91 …; +91 …"). */
export const firstPhone = (raw: string) => raw.split(/[;,/]/)[0].trim();
export const dial = (n: string) => n.replace(/[^\d+]/g, '');
export const km = (d: number) => `${d.toFixed(1)} km`;

export function directionsUrl(lat: number, lng: number, origin?: Origin | null): string {
  const from = origin ? `&origin=${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}` : '';
  return `https://www.google.com/maps/dir/?api=1${from}&destination=${lat},${lng}`;
}

const linkCls = 'inline-flex min-h-[2rem] items-center gap-1.5 rounded text-[0.8125rem] transition-colors';

/** Call · Directions · OpenStreetMap, the actions every facility offers. */
export function FacilityActions({ f, origin, mapHref, className }: { f: AnyFacility; origin?: Origin | null; mapHref?: string; className?: string }) {
  const phone = isHospital(f) && f.phone ? firstPhone(f.phone) : '';
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-1', className)}>
      {phone && (
        <a href={`tel:${dial(phone)}`} className={cn(linkCls, 'text-ivory hover:text-signal')}>
          <Phone className="h-3.5 w-3.5" aria-hidden />{phone}
        </a>
      )}
      <a href={directionsUrl(f.lat, f.lng, origin)} target="_blank" rel="noreferrer" className={cn(linkCls, 'text-sand hover:text-ivory')}>
        <Navigation className="h-3.5 w-3.5" aria-hidden />Directions<span className="sr-only"> to {f.name} (opens Google Maps)</span>
      </a>
      <a href={f.osm_url} target="_blank" rel="noreferrer" className={cn(linkCls, 'text-stone hover:text-ivory')}>
        OpenStreetMap<ExternalLink className="h-3 w-3" aria-hidden /><span className="sr-only"> entry for {f.name}</span>
      </a>
      {mapHref && (
        <Link href={mapHref} className={cn(linkCls, 'text-stone hover:text-ivory')}>
          <MapPinned className="h-3.5 w-3.5" aria-hidden />View on map
        </Link>
      )}
    </div>
  );
}

/** A facility's type line: kind, mapped beds or places, operator. */
export function facilityMeta(f: AnyFacility): string {
  const parts = isHospital(f)
    ? [f.kind, f.beds != null ? `${f.beds} beds mapped` : null]
    : [f.kind, f.capacity != null ? `${f.capacity} places mapped` : null, f.incharge];
  return parts.filter(Boolean).join(' · ');
}

export function ZoneNote({ f, className }: { f: AnyFacility; className?: string }) {
  if (!f.inside_zone) return null;
  return (
    <p className={cn('text-xs text-moderate', className)}>
      Inside the hazard area of {f.incident_title}. It may be affected: call ahead before travelling.
    </p>
  );
}
