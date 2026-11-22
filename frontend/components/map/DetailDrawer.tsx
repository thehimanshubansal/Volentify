'use client';

import Link from 'next/link';
import { ExternalLink, Navigation, Phone, X } from 'lucide-react';
import { MESH_PRIORITY_HEX, MESH_TYPE_LABEL } from '@/lib/constants';
import type { Disaster, Hospital, MeshEvent, MeshNode, Shelter, Task, Volunteer } from '@/lib/types';
import { cn, formatCoord, timeAgo, titleCase } from '@/lib/utils';
import { Pill, SeverityBadge } from '@/components/ui/Badge';

export type Selection =
  | { kind: 'incident'; item: Disaster }
  | { kind: 'mesh'; item: MeshEvent }
  | { kind: 'node'; item: MeshNode }
  | { kind: 'volunteer'; item: Volunteer }
  | { kind: 'mission'; item: Task }
  | { kind: 'hospital'; item: Hospital }
  | { kind: 'shelter'; item: Shelter };

const KIND_LABEL: Record<Selection['kind'], string> = {
  incident: 'Incident', mesh: 'Mesh field report', node: 'Mesh node', volunteer: 'Volunteer', mission: 'Open mission',
  hospital: 'Hospital', shelter: 'Relief shelter',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 text-[0.8125rem] last:border-0">
      <span className="text-stone">{label}</span>
      <span className="text-right text-ivory">{children}</span>
    </div>
  );
}

const directions = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export function DetailDrawer({ selection, disasters, onClose, compact }: {
  selection: Selection; disasters: Disaster[]; onClose: () => void; compact?: boolean;
}) {
  const s = selection;
  const disasterName = (id: string | null) => disasters.find((d) => d.id === id)?.title ?? 'Unlinked';
  let title = '', body: React.ReactNode = null, actions: React.ReactNode = null, lat = 0, lng = 0;

  switch (s.kind) {
    case 'incident': {
      const d = s.item; title = d.title; lat = d.lat; lng = d.lng;
      body = (<>
        <div className="mb-3 flex flex-wrap items-center gap-2"><SeverityBadge level={d.severity} /><Pill>{d.category}</Pill></div>
        <p className="mb-3 text-[0.8125rem] leading-relaxed text-sand">{d.summary}</p>
        <Row label="Location">{d.location}, {d.state}</Row>
        {d.source && <Row label="Source">{d.source_url
          ? <a href={d.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-signal">{d.source}<ExternalLink className="h-3 w-3" aria-hidden /></a>
          : d.source}</Row>}
        {d.wind_speed_kmh != null && <Row label="Sustained wind"><span className="data">{d.wind_speed_kmh} km/h</span></Row>}
        {d.rainfall_mm != null && <Row label="24 h rainfall"><span className="data">{d.rainfall_mm} mm</span></Row>}
        {d.surge_meters != null && <Row label="Storm surge"><span className="data">{d.surge_meters} m</span></Row>}
        {d.affected_pop && <Row label="People affected">{d.affected_pop}</Row>}
        <Row label="Updated">{timeAgo(d.updated_at)}</Row>
      </>);
      actions = <Link href={`/disasters/${d.id}`} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-signal text-[0.8125rem] font-medium text-ink hover:bg-signal-soft">Open dossier <ExternalLink className="h-3.5 w-3.5" aria-hidden /></Link>;
      break;
    }
    case 'mesh': {
      const e = s.item; title = MESH_TYPE_LABEL[e.type]; lat = e.lat ?? 0; lng = e.lng ?? 0;
      const payload = Object.entries(e.payload ?? {}).filter(([k]) => k !== 'redacted');
      body = (<>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ring-line-strong" style={{ color: MESH_PRIORITY_HEX[e.priority] }}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />{titleCase(e.priority)} priority
          </span>
          <Pill tone={e.review_status === 'UNREVIEWED' ? 'warn' : e.review_status === 'PROMOTED' ? 'gold' : 'good'}>
            {e.review_status === 'UNREVIEWED' ? 'Unverified' : titleCase(e.review_status)}
          </Pill>
        </div>
        <Row label="Incident">{disasterName(e.disaster_id)}</Row>
        <Row label="Observed">{timeAgo(e.observed_at)}</Row>
        <Row label="Reached server">{timeAgo(e.received_at)}</Row>
        <Row label="Relay path"><span className="data">{e.hop_count} hop{e.hop_count === 1 ? '' : 's'} · TTL {e.ttl}</span></Row>
        <Row label="Origin node"><span className="data">{e.origin_node_id.slice(0, 8)}</span></Row>
        {e.payload?.redacted ? (
          <p className="mt-3 text-xs text-stone">Casualty details are visible to verified command and NGO accounts.</p>
        ) : payload.length > 0 && (
          <div className="mt-3 rounded-lg bg-ink-800 p-3 text-xs">
            {payload.map(([k, v]) => <p key={k} className="text-sand"><span className="text-stone">{titleCase(k)}:</span> {Array.isArray(v) ? v.join(', ') : String(v)}</p>)}
          </div>
        )}
      </>);
      break;
    }
    case 'node': {
      const n = s.item; title = `Node ${n.node_uuid.slice(0, 8)}`; lat = n.last_lat ?? 0; lng = n.last_lng ?? 0;
      body = (<>
        <div className="mb-3"><Pill tone={n.active ? 'good' : 'neutral'} dot>{n.active ? 'Active' : 'Inactive > 30 min'}</Pill></div>
        <Row label="Last seen">{timeAgo(n.last_seen_at)}</Row>
        <Row label="Battery"><span className="data">{n.battery_level != null ? `${Math.round(n.battery_level)}%` : 'Unknown'}</span></Row>
      </>);
      break;
    }
    case 'volunteer': {
      const v = s.item; title = v.name; lat = v.lat; lng = v.lng;
      body = (<>
        <div className="mb-3 flex flex-wrap gap-2">
          <Pill tone={v.availability === 'AVAILABLE' ? 'good' : 'neutral'} dot>{titleCase(v.availability)}</Pill>
          {v.verified && <Pill tone="gold">Verified</Pill>}
        </div>
        <Row label="Skills">{v.skills.join(', ')}</Row>
        <Row label="Base">{v.location_name}</Row>
        <Row label="Missions completed"><span className="data">{v.missions_done}</span></Row>
        <Row label="Badge">{v.badge_level}</Row>
      </>);
      break;
    }
    case 'mission': {
      const t = s.item; title = t.title; lat = t.lat; lng = t.lng;
      body = (<>
        <div className="mb-3 flex gap-2"><SeverityBadge level={t.urgency} /><Pill>{t.code}</Pill></div>
        {t.description && <p className="mb-3 text-[0.8125rem] leading-relaxed text-sand">{t.description}</p>}
        <Row label="Skill needed">{t.required_skill}</Row>
        <Row label="Responders needed"><span className="data">{t.quantity_needed}</span></Row>
        <Row label="Where">{t.location_name}</Row>
        <Row label="Incident">{disasterName(t.disaster_id)}</Row>
      </>);
      actions = <Link href="/volunteer" className="flex h-9 flex-1 items-center justify-center rounded-lg bg-signal text-[0.8125rem] font-medium text-ink hover:bg-signal-soft">See in dispatch board</Link>;
      break;
    }
    case 'hospital': {
      const h = s.item; title = h.name; lat = h.lat; lng = h.lng;
      body = (<>
        <p className="mb-3 text-[0.8125rem] text-stone">{h.kind}{h.emergency ? ' · emergency department' : ''}</p>
        {h.icu_available != null && h.icu_beds != null
          ? <Row label="ICU beds free"><span className={cn('data', h.icu_available < 10 ? 'text-high' : 'text-low')}>{h.icu_available} / {h.icu_beds}</span></Row>
          : h.beds != null && <Row label="Beds (mapped)"><span className="data">{h.beds}</span></Row>}
        {h.address && <Row label="Address">{h.address}</Row>}
        <Row label="Near">{h.incident_title} · <span className="data">{h.distance_km} km</span></Row>
        <Row label="Data"><a href={h.osm_url} target="_blank" rel="noreferrer" className="hover:text-signal">OpenStreetMap</a></Row>
      </>);
      actions = h.phone
        ? <a href={`tel:${h.phone.replace(/[^\d+]/g, '')}`} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-ivory/[0.08] text-[0.8125rem] text-ivory hover:bg-ivory/[0.12]"><Phone className="h-3.5 w-3.5" aria-hidden />{h.phone}</a>
        : null;
      break;
    }
    case 'shelter': {
      const sh = s.item; title = sh.name; lat = sh.lat; lng = sh.lng;
      const full = sh.occupancy != null && sh.capacity ? sh.occupancy / sh.capacity : null;
      body = (<>
        <p className="mb-3 text-[0.8125rem] text-stone">{sh.kind}</p>
        {full != null && <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-ink-700"><div className={cn('h-full rounded-full', full > 0.85 ? 'bg-high' : 'bg-info')} style={{ width: `${Math.min(100, full * 100)}%` }} /></div>}
        {sh.capacity != null && <Row label={full != null ? 'Occupancy' : 'Capacity (mapped)'}><span className="data">{full != null ? `${sh.occupancy} / ${sh.capacity}` : sh.capacity}</span></Row>}
        {sh.facilities.length > 0 && <Row label="Facilities">{sh.facilities.join(', ')}</Row>}
        {sh.incharge && <Row label="Operator">{sh.incharge}</Row>}
        {sh.address && <Row label="Address">{sh.address}</Row>}
        <Row label="Near">{sh.incident_title} · <span className="data">{sh.distance_km} km</span></Row>
        <Row label="Data"><a href={sh.osm_url} target="_blank" rel="noreferrer" className="hover:text-signal">OpenStreetMap</a></Row>
      </>);
      break;
    }
  }

  const hasCoords = !(s.kind === 'mesh' && s.item.lat == null);
  return (
    <aside className={cn('glass absolute z-20 flex animate-slide-in flex-col rounded-2xl',
      compact ? 'bottom-3 right-3 max-h-[70%] w-[min(22rem,calc(100%-1.5rem))]'
        : 'bottom-3 right-3 top-[7.25rem] w-[min(23rem,calc(100%-1.5rem))] sm:top-4 max-sm:top-auto max-sm:max-h-[60%]')}
      aria-label={`${KIND_LABEL[s.kind]} details`}>
      <div className="flex items-start justify-between gap-3 border-b border-line p-4">
        <div className="min-w-0">
          <p className="text-xs text-stone">{KIND_LABEL[s.kind]}</p>
          <h2 className="truncate font-serif text-2xl leading-tight">{title}</h2>
          {hasCoords && <p className="code mt-1">{formatCoord(lat, lng)}</p>}
        </div>
        <button onClick={onClose} aria-label="Close details" className="rounded-lg p-1.5 text-stone hover:bg-ivory/[0.06] hover:text-ivory"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{body}</div>
      <div className="flex gap-2 border-t border-line p-3">
        {actions}
        {hasCoords && (
          <a href={directions(lat, lng)} target="_blank" rel="noreferrer"
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg ring-1 ring-inset ring-line-strong text-[0.8125rem] text-ivory hover:bg-ivory/[0.05]">
            <Navigation className="h-3.5 w-3.5" aria-hidden />Directions
          </a>
        )}
      </div>
    </aside>
  );
}
