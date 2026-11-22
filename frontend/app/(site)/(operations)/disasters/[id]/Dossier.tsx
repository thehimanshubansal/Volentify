'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Copy, ExternalLink, MapPin } from 'lucide-react';
import { api, ApiError, useApi } from '@/lib/api';
import { CATEGORY_HEX, SOURCE_LABEL } from '@/lib/constants';
import type { Alert, Briefing, Dossier as DossierData, Evidence, Facility, Prediction, Task } from '@/lib/types';
import { cn, formatCoord, formatDateTime, pct, timeAgo, titleCase } from '@/lib/utils';
import { Pill, SeverityBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingRows, Skeleton, SourceTag } from '@/components/ui/DataState';
import { Panel, Stat } from '@/components/ui/Page';

const TacticalMap = dynamic(() => import('@/components/map/TacticalMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

const SOURCE_TYPE_LABEL: Record<Evidence['source_type'], string> = {
  OFFICIAL: 'Official', SENSOR: 'Sensor', NEWS: 'News', SOCIAL: 'Social media', CITIZEN: 'Citizen',
};

function BriefingPanel({ id }: { id: string }) {
  const { data, error, loading, reload } = useApi<Briefing>(`/api/disasters/${encodeURIComponent(id)}/briefing`);
  return (
    <Panel className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl">Situation briefing</h2>
        {data && <Pill tone={data.engine === 'gemini' ? 'info' : 'neutral'}>{data.engine === 'gemini' ? 'Synthesised by Gemini' : 'Rule-based corroboration'}</Pill>}
      </div>
      {loading && !data ? <LoadingRows rows={2} />
        : error ? <ErrorState message={error.status === 422 ? 'No evidence has been recorded for this incident yet.' : error.message} onRetry={error.status === 422 ? undefined : reload} />
        : data && (
          <>
            <p className="font-serif text-[1.3rem] leading-relaxed text-ivory">{data.brief}</p>
            <dl className="grid grid-cols-2 gap-4 border-y border-line py-4 sm:grid-cols-4">
              <div><dt className="text-xs text-stone">Confidence</dt><dd className="numeral mt-1 text-3xl">{pct(data.confidence)}</dd></div>
              <div><dt className="text-xs text-stone">Supporting</dt><dd className="numeral mt-1 text-3xl text-low">{data.supporting_count}</dd></div>
              <div><dt className="text-xs text-stone">Conflicting</dt><dd className={cn('numeral mt-1 text-3xl', data.conflicting_count ? 'text-high' : '')}>{data.conflicting_count}</dd></div>
              <div><dt className="text-xs text-stone">Duplicates merged</dt><dd className="numeral mt-1 text-3xl">{data.duplicate_count}</dd></div>
            </dl>
            <div>
              <h3 className="mb-3 font-sans text-sm font-medium text-ivory">Immediate life-safety needs</h3>
              <ul className="space-y-2">
                {data.checklist.map((c) => (
                  <li key={c} className="flex gap-2.5 text-sm text-sand">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />{c}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
    </Panel>
  );
}

function EvidenceTimeline({ evidence }: { evidence: Evidence[] }) {
  if (!evidence.length) return <EmptyState title="No evidence yet" body="Official bulletins, sensor readings and verified field reports will appear here." />;
  return (
    <ol className="relative space-y-6 border-l border-line pl-6">
      {evidence.map((e) => {
        const conflicting = e.relation === 'CONFLICTING';
        return (
          <li key={e.id} className="relative">
            <span className={cn('absolute -left-[1.85rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-ink',
              conflicting ? 'bg-high' : 'bg-low')} aria-hidden />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm text-ivory">{e.source}</span>
              <span className="text-xs text-stone">{SOURCE_TYPE_LABEL[e.source_type]}</span>
              {conflicting
                ? <Pill tone="warn"><CircleAlert className="h-3 w-3" aria-hidden />Conflicts with other reports</Pill>
                : <Pill tone="good">Supporting</Pill>}
            </div>
            <p className={cn('mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed', conflicting ? 'text-stone' : 'text-sand')}>{e.claim_text}</p>
            <p className="mt-1 text-xs text-ash">
              <time dateTime={e.created_at} title={formatDateTime(e.created_at)}>{timeAgo(e.created_at)}</time>
              <span className="ml-3">Source confidence {pct(e.confidence)}</span>
              {e.language !== 'en' && <span className="ml-3">Language: {e.language}</span>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function Missions({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return <p className="text-sm text-stone">No missions have been raised for this incident.</p>;
  return (
    <ul className="divide-y divide-line">
      {tasks.map((t) => (
        <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
          <div className="min-w-0">
            <p className="text-sm text-ivory">{t.title}</p>
            <p className="mt-0.5 text-xs text-stone">{t.required_skill} · {t.quantity_needed} needed · {t.location_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <SeverityBadge level={t.urgency} />
            <Pill tone={t.status === 'OPEN' ? 'signal' : t.status === 'COMPLETED' ? 'good' : 'neutral'}>{titleCase(t.status)}</Pill>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RelatedAlerts({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return <p className="text-sm text-stone">No public alerts linked to this incident.</p>;
  return (
    <ul className="space-y-4">
      {alerts.map((a) => (
        <li key={a.id} className="space-y-1.5">
          <div className="flex items-center gap-2"><SeverityBadge level={a.level} /><span className="text-xs text-stone">{timeAgo(a.created_at)}</span></div>
          <p className="text-sm text-ivory">{a.title}</p>
          <p className="text-sm text-sand">{a.advisory}</p>
        </li>
      ))}
    </ul>
  );
}

function Infrastructure({ lat, lng }: { lat: number; lng: number }) {
  const [state, setState] = useState<{ facilities: Facility[]; data_mode: 'LIVE' | 'DEMO' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    api.post<{ facilities: Facility[]; data_mode: 'LIVE' | 'DEMO' }>('/api/infrastructure/nearby', { lat, lng, radius_km: 10 })
      .then((r) => alive && setState(r))
      .catch((e: unknown) => alive && setError(e instanceof ApiError ? e.message : 'Could not reach the infrastructure service'));
    return () => { alive = false; };
  }, [lat, lng, attempt]);

  return (
    <Panel className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl">Infrastructure within 10 km</h2>
        {state && (state.data_mode === 'LIVE'
          ? <Pill tone="good" dot>Live from OpenStreetMap</Pill>
          : <Pill tone="warn" dot>Cached directory — live lookup unavailable</Pill>)}
      </div>
      {error ? <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />
        : !state ? <LoadingRows rows={2} />
        : state.facilities.length === 0 ? <p className="text-sm text-stone">No mapped hospitals, shelters, police or fire stations in range.</p>
        : (
          <ul className="max-h-80 divide-y divide-line overflow-y-auto pr-1">
            {state.facilities.slice(0, 25).map((f) => (
              <li key={`${f.name}-${f.lat}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ivory">{f.name}</p>
                  <p className="text-xs text-stone">{f.type}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="data text-sand">{f.distance_km.toFixed(1)} km</p>
                  <p className={cn('text-xs', f.status === 'Potentially affected' ? 'text-high' : 'text-stone')}>{f.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
    </Panel>
  );
}

function SurgeForecast({ lat, lng, wind, rain, district, state }: { lat: number; lng: number; wind: number; rain: number; district: string; state: string }) {
  const [result, setResult] = useState<Prediction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setError(null);
    try {
      setResult(await api.post<Prediction>('/api/predict', { lat, lng, district, state, wind_speed: wind, rainfall_mm: rain }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Forecast service unavailable');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl">Hazard forecast</h2>
        <p className="text-sm text-stone">Runs the storm-surge and hazard model on this incident’s current wind ({wind} km/h) and rainfall ({rain} mm).</p>
      </div>
      {result ? (
        <dl className="grid grid-cols-3 gap-4">
          <div><dt className="text-xs text-stone">Hazard probability</dt><dd className="numeral mt-1 text-3xl">{pct(result.hazard_probability)}</dd></div>
          <div><dt className="text-xs text-stone">Storm surge</dt><dd className="numeral mt-1 text-3xl">{result.predicted_surge_m}<span className="font-sans text-sm text-stone"> m</span></dd></div>
          <div><dt className="text-xs text-stone">Risk level</dt><dd className="mt-2"><SeverityBadge level={result.risk_level} /></dd></div>
        </dl>
      ) : null}
      {error && <ErrorState message={error} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} loading={busy} variant={result ? 'secondary' : 'primary'}>{result ? 'Run again' : 'Run forecast'}</Button>
        {result && <span className="code">{result.model} · {result.latency_ms} ms</span>}
        <Link href="/predictions" className="link text-sm">Open the forecasting sandbox</Link>
      </div>
    </Panel>
  );
}

export default function Dossier({ id }: { id: string }) {
  const { data, error, loading, source, reload } = useApi<DossierData>(`/api/disasters/${encodeURIComponent(id)}`, { refreshMs: 60_000 });
  const [copied, setCopied] = useState(false);

  if (loading && !data) {
    return (
      <div className="page space-y-6 py-20">
        <Skeleton className="h-6 w-40" /><Skeleton className="h-16 w-2/3" /><Skeleton className="h-[420px]" />
      </div>
    );
  }
  if (error?.status === 404) {
    return (
      <div className="page flex flex-col items-start gap-5 py-28">
        <p className="eyebrow">Incident not found</p>
        <h1 className="display text-5xl">We couldn’t find incident “{id}”.</h1>
        <p className="max-w-lg text-stone">It may have been closed or the link is mistyped. The incidents index lists everything currently active.</p>
        <ButtonLink href="/disasters">See active incidents</ButtonLink>
      </div>
    );
  }
  if (error || !data) {
    return <div className="page py-20"><ErrorState message={error?.message ?? 'Unable to load this incident.'} onRetry={reload} /></div>;
  }

  const { disaster: d, evidence, tasks, alerts } = data;
  const openMissions = tasks.filter((t) => t.status === 'OPEN').length;
  const copyCoords = async () => {
    await navigator.clipboard?.writeText(`${d.lat}, ${d.lng}`).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <article>
      <header className="page pb-10 pt-12 sm:pt-16">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-stone">
          <Link href="/disasters" className="hover:text-ivory">Incidents</Link>
          <span className="mx-2 text-ash">/</span>
          <span className="code">{d.code}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <SeverityBadge level={d.severity} />
          <span className="flex items-center gap-1.5 text-sm text-sand">
            <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_HEX[d.category] ?? '#8d887e' }} aria-hidden />{d.category}
          </span>
          <Pill tone={d.status === 'ACTIVE' ? 'signal' : 'neutral'}>{titleCase(d.status)}</Pill>
          <SourceTag source={source} />
        </div>
        <h1 className="display mt-5 text-balance text-5xl sm:text-7xl">{d.title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-stone">
          <span className="flex items-center gap-1.5 text-sand"><MapPin className="h-4 w-4" aria-hidden />{d.location}, {d.state}</span>
          <button onClick={copyCoords} className="code flex items-center gap-1.5 hover:text-ivory" title="Copy coordinates">
            {formatCoord(d.lat, d.lng)} <Copy className="h-3 w-3" aria-hidden />{copied && <span className="font-sans text-low">Copied</span>}
          </button>
          <span>Updated {timeAgo(d.updated_at)}</span>
        </div>
        <p className="mt-8 max-w-3xl text-[1.0625rem] leading-relaxed text-sand">{d.summary}</p>
        {d.source && (
          <p className="mt-3 text-sm text-stone">
            Source: {d.source_url
              ? <a href={d.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sand hover:text-ivory">{SOURCE_LABEL[d.source] ?? d.source}<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
              : SOURCE_LABEL[d.source] ?? d.source}
            {' '}· first reported {formatDateTime(d.created_at)}
          </p>
        )}

        <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-line pt-8 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Sustained wind" value={d.wind_speed_kmh != null ? <>{d.wind_speed_kmh}<span className="font-sans text-base text-stone"> km/h</span></> : '—'} />
          <Stat label="24-hour rainfall" value={d.rainfall_mm != null ? <>{d.rainfall_mm}<span className="font-sans text-base text-stone"> mm</span></> : '—'} />
          <Stat label="Storm surge" value={d.surge_meters != null ? <>{d.surge_meters}<span className="font-sans text-base text-stone"> m</span></> : '—'} />
          <Stat label="People affected" value={d.affected_pop ?? '—'} />
          <Stat label="Open missions" value={openMissions} note={`${tasks.length} total · ${d.radius_km} km impact radius`} />
        </div>
      </header>

      <div className="page">
        <div className="h-[420px] overflow-hidden rounded-2xl border border-line sm:h-[480px]">
          <TacticalMap variant="embed" focusDisasterId={d.id} className="h-full w-full" />
        </div>
      </div>

      <div className="page grid gap-8 py-12 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <BriefingPanel id={d.id} />
          <section aria-labelledby="timeline" className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <h2 id="timeline" className="text-3xl">Evidence timeline</h2>
              <p className="text-sm text-stone">{evidence.length} records, newest first</p>
            </div>
            <EvidenceTimeline evidence={evidence} />
          </section>
        </div>
        <aside className="space-y-8">
          <SurgeForecast lat={d.lat} lng={d.lng} wind={d.wind_speed_kmh ?? 0} rain={d.rainfall_mm ?? 0} district={d.location} state={d.state} />
          <Panel className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-2xl">Missions</h2>
              <Link href="/volunteer" className="link text-sm">Dispatch board</Link>
            </div>
            <Missions tasks={tasks} />
          </Panel>
          <Panel className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-2xl">Public alerts</h2>
              <Link href="/alerts" className="link text-sm">All alerts</Link>
            </div>
            <RelatedAlerts alerts={alerts} />
          </Panel>
          <Infrastructure lat={d.lat} lng={d.lng} />
        </aside>
      </div>
    </article>
  );
}
