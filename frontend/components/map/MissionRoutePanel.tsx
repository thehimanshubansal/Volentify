'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronDown, Crosshair, ExternalLink, MapPin, Navigation, ShieldAlert } from 'lucide-react';
import { useApi } from '@/lib/api';
import { currentPosition, directionsUrl, formatDuration, parseLatLng, roadRoute, type LatLng, type RouteResult } from '@/lib/geo';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SeverityBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import type { MissionRoute } from './TacticalMap';

/**
 * Overlay on /map?mission=…&from=lat,lng: the way from the responder's starting point to the mission site.
 * Road geometry from OSRM when it answers; otherwise a dashed straight line with the straight-line distance.
 */
export default function MissionRoutePanel({ taskId, from, onRoute }: {
  taskId: string; from?: string; onRoute: (route: MissionRoute | null) => void;
}) {
  const task = useApi<Task>(`/api/tasks/${encodeURIComponent(taskId)}`);
  const [origin, setOrigin] = useState<LatLng | null>(() => (from ? parseLatLng(from) : null));
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [open, setOpen] = useState(true);

  const t = task.data;
  // Fall back to where the responder said they started when the link carries no position.
  useEffect(() => {
    if (!origin && t?.start_lat != null && t.start_lng != null) setOrigin({ lat: t.start_lat, lng: t.start_lng });
  }, [origin, t]);

  useEffect(() => {
    if (!t || !origin) return;
    let alive = true;
    const to = { lat: t.lat, lng: t.lng };
    void roadRoute(origin, to).then((r) => {
      if (!alive) return;
      setResult(r);
      onRoute({ from: origin, to, line: r.line });
    });
    return () => { alive = false; };
  }, [t, origin, onRoute]);

  const locate = async () => {
    setLocating(true); setLocError(null);
    try {
      const p = await currentPosition();
      setOrigin({ lat: p.lat, lng: p.lng });
    } catch (e) {
      setLocError(e instanceof Error ? e.message : 'Location unavailable');
    } finally { setLocating(false); }
  };

  return (
    <section aria-label="Route to your mission"
      className="glass absolute inset-x-3 bottom-3 z-30 max-h-[70%] overflow-y-auto rounded-2xl p-4 shadow-float sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[4.25rem] sm:w-[22rem]">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left">
        <span className="eyebrow text-signal">Route to mission</span>
        <ChevronDown className={cn('h-4 w-4 text-stone transition-transform sm:hidden', open && 'rotate-180')} aria-hidden />
      </button>

      {task.loading && !t ? <p className="mt-3 text-sm text-stone">Loading mission…</p>
        : task.error ? <p className="mt-3 text-sm text-critical">{task.error.status === 404 ? 'This mission no longer exists.' : task.error.message}</p>
        : t && (
          <div className={cn('mt-3 space-y-4', !open && 'hidden sm:block')}>
            <div>
              <div className="flex flex-wrap items-center gap-2"><SeverityBadge level={t.urgency} /><span className="code">{t.code}</span></div>
              <p className="mt-1.5 text-[0.9375rem] leading-snug text-ivory">{t.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-stone"><MapPin className="h-3.5 w-3.5" aria-hidden />{t.location_name}</p>
            </div>

            {!origin ? (
              <div className="space-y-2">
                <p className="text-sm text-sand">Share your location to see the way there.</p>
                <Button size="sm" loading={locating} onClick={locate}><Crosshair className="h-3.5 w-3.5" aria-hidden />Use my location</Button>
                {locError && <p className="text-xs text-high">{locError}</p>}
              </div>
            ) : !result ? <p className="text-sm text-stone">Working out the route…</p> : (
              <dl className="grid grid-cols-2 gap-3 border-y border-line py-3">
                <div>
                  <dt className="text-xs text-stone">{result.road ? 'By road' : 'Straight line'}</dt>
                  <dd className="numeral text-2xl">{result.distance_km < 1 ? `${Math.round(result.distance_km * 1000)} m` : `${result.distance_km.toFixed(1)} km`}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone">Driving time</dt>
                  <dd className="numeral text-2xl">{formatDuration(result.duration_min)}</dd>
                </div>
                {!result.road && <p className="col-span-2 text-xs text-stone">Road routing is unavailable here, so the dashed line shows direction only. Use turn-by-turn navigation below.</p>}
              </dl>
            )}

            <div className="flex flex-wrap gap-2">
              <ButtonLink href={directionsUrl({ lat: t.lat, lng: t.lng }, origin)} size="sm" target="_blank" rel="noreferrer">
                <Navigation className="h-3.5 w-3.5" aria-hidden />Navigate <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
              </ButtonLink>
              <ButtonLink href={directionsUrl({ lat: t.lat, lng: t.lng }, origin, 'walking')} size="sm" variant="secondary" target="_blank" rel="noreferrer">
                Walking
              </ButtonLink>
              {origin && <Button size="sm" variant="ghost" loading={locating} onClick={locate}>Update my position</Button>}
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-high/[0.07] p-3 text-xs leading-relaxed text-sand">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-high" aria-hidden />
              Roads may be flooded or blocked even if the route shows them open. Never drive or walk through moving water; turn back and tell command.
            </p>
            <div className="flex items-center justify-between text-[0.8125rem]">
              <Link href="/volunteer#my-missions" className="link">Back to my missions</Link>
              <Link href={`/disasters/${t.disaster_id}`} className="text-stone hover:text-ivory">Incident</Link>
            </div>
          </div>
        )}
    </section>
  );
}
