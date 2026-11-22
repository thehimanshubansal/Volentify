'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { api, ApiError, useApi } from '@/lib/api';
import type { Availability, RankedMatch, Task, TaskStatus, Volunteer } from '@/lib/types';
import { SEVERITY_ORDER, timeAgo, titleCase } from '@/lib/utils';
import { Pill, SeverityBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingRows } from '@/components/ui/DataState';
import { Segmented } from '@/components/ui/Field';
import { Stat } from '@/components/ui/Page';
import { useToast } from '@/components/ui/Toast';
import { CompleteMissionDialog, missionMapHref, StartMissionDialog } from '@/components/volunteer/MissionDialogs';
import { GatewayToken } from './GatewayToken';

const NEXT_STEP: Partial<Record<TaskStatus, { to: TaskStatus; label: string }>> = {
  ASSIGNED: { to: 'IN_PROGRESS', label: 'Start mission' },
  IN_PROGRESS: { to: 'COMPLETED', label: 'Mark complete' },
};

interface Recommendation { task: Task; match: RankedMatch }

export function VolunteerDesk() {
  const toast = useToast();
  const me = useApi<Volunteer>('/api/volunteers/me');
  const mine = useApi<Task[]>('/api/tasks?mine=true');
  const open = useApi<Task[]>('/api/tasks?status=OPEN');
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [starting, setStarting] = useState<Task | null>(null);
  const [completing, setCompleting] = useState<Task | null>(null);

  // Rank up to 12 open missions for this responder with the dispatch engine.
  useEffect(() => {
    if (!me.data || !open.data) return;
    let alive = true;
    const self = { ...me.data, availability: 'AVAILABLE' as const };
    const candidates = [...open.data].sort((a, b) => SEVERITY_ORDER[a.urgency] - SEVERITY_ORDER[b.urgency]).slice(0, 12);
    Promise.all(candidates.map((task) =>
      api.post<RankedMatch[]>('/api/match', { task, volunteers: [self] }).then((r) => (r[0] ? { task, match: r[0] } : null)).catch(() => null),
    )).then((rows) => {
      if (alive) setRecs(rows.filter((r): r is Recommendation => r !== null).sort((a, b) => b.match.score - a.match.score));
    });
    return () => { alive = false; };
  }, [me.data, open.data]);

  const setAvailability = async (availability: Availability) => {
    if (!me.data) return;
    const prev = me.data.availability;
    me.mutate((v) => (v ? { ...v, availability } : v));
    try {
      await api.post('/api/volunteer/availability', { volunteer_id: me.data.id, availability });
      toast(`You’re now ${availability === 'AVAILABLE' ? 'available for dispatch' : availability === 'BUSY' ? 'marked busy' : 'offline'}`);
    } catch (e) {
      me.mutate((v) => (v ? { ...v, availability: prev } : v));
      toast(e instanceof ApiError ? e.message : 'Could not update availability.', 'error');
    }
  };

  const act = async (id: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(id);
    try {
      await fn();
      toast(done);
      mine.reload();
      open.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'That didn’t go through. Try again.', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (me.error?.status === 404) {
    return <EmptyState title="No volunteer profile yet" body="Add your certified skills in onboarding so dispatch can match you to missions."
      action={<ButtonLink href="/onboarding" size="sm">Add my skills</ButtonLink>} />;
  }
  if (me.error) return <ErrorState message={me.error.message} onRetry={me.reload} />;
  if (!me.data) return <LoadingRows rows={3} />;

  const v = me.data;
  const active = (mine.data ?? []).filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS');
  const history = (mine.data ?? []).filter((t) => t.status === 'COMPLETED');

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[1.75rem]">Dispatch status</h2>
          <Segmented ariaLabel="Availability" value={v.availability} onChange={setAvailability}
            options={[{ value: 'AVAILABLE', label: 'Available' }, { value: 'BUSY', label: 'Busy' }, { value: 'OFFLINE', label: 'Offline' }]} />
        </div>
        <div className="grid grid-cols-2 gap-6 rounded-2xl border border-line p-5 sm:grid-cols-4 sm:p-6">
          <Stat label="Missions completed" value={Math.max(v.missions_done, history.length)} />
          <Stat label="Service hours" value={Math.round(v.total_hours)} />
          <Stat label="People helped" value={history.reduce((n, t) => n + (t.people_helped ?? 0), 0)} />
          <Stat label="Badge" value={<span className="text-xl">{v.badge_level}</span>} />
        </div>
        <p className="text-sm text-stone">Skills on file: <span className="text-sand">{v.skills.join(', ') || 'none'}</span> · base {v.location_name} · <Link href={`/volunteers/${v.id}`} className="link">public profile & reviews</Link></p>
      </section>

      <section className="space-y-4">
        <h2 className="text-[1.75rem]">Your missions</h2>
        {mine.loading && !mine.data ? <LoadingRows rows={2} />
          : mine.error ? <ErrorState message={mine.error.message} onRetry={mine.reload} />
          : active.length === 0 ? <EmptyState title="No active missions" body="Accept a recommended mission below, or browse the dispatch board." action={<ButtonLink href="/volunteer" size="sm" variant="secondary">Open dispatch board</ButtonLink>} />
          : (
            <ul className="space-y-3">
              {active.map((t) => {
                const step = NEXT_STEP[t.status];
                return (
                  <li key={t.id} className="rounded-2xl border border-line p-5">
                    <div className="flex flex-wrap items-center gap-2"><SeverityBadge level={t.urgency} /><Pill tone={t.status === 'IN_PROGRESS' ? 'signal' : 'neutral'}>{titleCase(t.status)}</Pill><span className="code">{t.code}</span></div>
                    <h3 className="mt-3 font-serif text-2xl text-ivory">{t.title}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-stone"><MapPin className="h-3.5 w-3.5" aria-hidden />{t.location_name}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {step && <Button size="sm" loading={busy === t.id} disabled={step.to === 'IN_PROGRESS' && v.availability === 'OFFLINE'}
                        onClick={() => (step.to === 'IN_PROGRESS' ? setStarting(t) : setCompleting(t))}>{step.label}</Button>}
                      {t.status === 'IN_PROGRESS' && <ButtonLink size="sm" variant="secondary" href={missionMapHref(t.id, t.start_lat != null && t.start_lng != null ? { lat: t.start_lat, lng: t.start_lng } : null)}>Route</ButtonLink>}
                      <Button size="sm" variant="ghost" disabled={busy === t.id} onClick={() => act(t.id, () => api.patch(`/api/tasks/${t.id}`, { status: 'OPEN' }), 'Mission released for another responder')}>Release</Button>
                      <ButtonLink size="sm" variant="ghost" href={`/disasters/${t.disaster_id}`}>Incident dossier</ButtonLink>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[1.75rem]">Recommended for you</h2>
            <p className="text-sm text-stone">Ranked by urgency, your skill match, distance and current workload.</p>
          </div>
          <Link href="/volunteer" className="link text-sm">Full dispatch board</Link>
        </div>
        {recs === null ? <LoadingRows rows={3} />
          : recs.length === 0 ? <EmptyState title="No missions match your skills right now" body="We’ll rank new missions here as command creates them. Keep your availability up to date." />
          : (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {recs.map(({ task: t, match: m }) => (
                <li key={t.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2"><SeverityBadge level={t.urgency} />{m.squander_penalised && <Pill tone="gold">Specialist protected</Pill>}</div>
                    <p className="text-[0.9375rem] text-ivory">{t.title}</p>
                    <p className="text-xs text-stone">{t.required_skill} · {m.distance_km.toFixed(1)} km · {t.quantity_needed} needed · posted {timeAgo(t.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="numeral text-2xl" title="Dispatch score">{m.score.toFixed(2)}</span>
                    <Button size="sm" loading={busy === t.id} disabled={v.availability !== 'AVAILABLE'}
                      onClick={() => act(t.id, () => api.post(`/api/tasks/${t.id}/accept`), 'Mission accepted — it’s in your missions')}>
                      Accept
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        {v.availability !== 'AVAILABLE' && recs && recs.length > 0 && <p className="text-xs text-stone">Set yourself available to accept missions.</p>}
      </section>

      <GatewayToken />
      <StartMissionDialog task={starting} open={Boolean(starting)} onClose={() => setStarting(null)} onStarted={() => { mine.reload(); me.reload(); }} />
      <CompleteMissionDialog task={completing} open={Boolean(completing)} onClose={() => setCompleting(null)} onDone={() => { mine.reload(); me.reload(); }} />
    </div>
  );
}
