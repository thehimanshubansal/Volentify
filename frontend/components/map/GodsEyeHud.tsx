'use client';

import { X } from 'lucide-react';
import type { Disaster } from '@/lib/types';
import { haversineKm } from '@/lib/utils';
import { SeverityBadge } from '@/components/ui/Badge';
import type { MapData } from './useMapData';

/** Executive atmospheric read-out for the sector being orbited (PRD §7.2). */
export function GodsEyeHUD({ target, data, onClose }: { target: Disaster; data: MapData; onClose: () => void }) {
  const inSector = (lat: number | null, lng: number | null) =>
    lat != null && lng != null && haversineKm(target.lat, target.lng, lat, lng) <= target.radius_km * 1.5;
  const reports = data.mesh.filter((e) => e.disaster_id === target.id || inSector(e.lat, e.lng));
  const critical = reports.filter((e) => e.priority === 'CRITICAL').length;
  const responders = data.volunteers.filter((v) => v.availability === 'AVAILABLE' && inSector(v.lat, v.lng)).length;

  const metrics = [
    { label: 'Peak sustained wind', value: target.wind_speed_kmh, unit: 'km/h' },
    { label: 'Storm surge', value: target.surge_meters, unit: 'm' },
    { label: '24-hour rainfall', value: target.rainfall_mm, unit: 'mm' },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-24 z-10 sm:inset-x-auto sm:bottom-auto sm:left-4 sm:top-[4.25rem] sm:w-[21rem]">
      <div className="glass pointer-events-auto animate-fade-up rounded-2xl p-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-stone">God’s Eye · sector {target.code}</p>
            <p className="font-serif text-[1.65rem] leading-tight text-ivory">{target.title}</p>
          </div>
          <button onClick={onClose} aria-label="Leave God's Eye view" className="rounded-lg p-1 text-stone hover:text-ivory"><X className="h-4 w-4" /></button>
        </div>
        <SeverityBadge level={target.severity} />
        <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-line py-4">
          {metrics.map((m) => (
            <div key={m.label}>
              <dt className="text-[0.6875rem] leading-tight text-stone">{m.label}</dt>
              <dd className="numeral mt-1 text-2xl">{m.value != null ? m.value : '—'}<span className="ml-0.5 font-sans text-xs text-stone">{m.value != null ? m.unit : ''}</span></dd>
            </div>
          ))}
        </dl>
        <dl className="mt-4 grid grid-cols-3 gap-3">
          <div><dt className="text-[0.6875rem] text-stone">People affected</dt><dd className="mt-1 text-sm text-ivory">{target.affected_pop ?? '—'}</dd></div>
          <div><dt className="text-[0.6875rem] text-stone">Field reports</dt><dd className="mt-1 text-sm text-ivory">{reports.length}{critical ? <span className="text-critical"> · {critical} critical</span> : ''}</dd></div>
          <div><dt className="text-[0.6875rem] text-stone">Responders free</dt><dd className="mt-1 text-sm text-ivory">{responders}</dd></div>
        </dl>
      </div>
    </div>
  );
}
