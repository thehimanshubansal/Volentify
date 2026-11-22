'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  MessageSquare,
  Navigation,
  Radio,
  RotateCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Timer,
} from 'lucide-react';
import { api, ApiError, apiFetch, useApi } from '@/lib/api';
import { MESH_PRIORITY_HEX, MESH_TYPE_LABEL } from '@/lib/constants';
import { useSession } from '@/lib/session';
import type {
  Assignment,
  Availability,
  DataSource,
  DispatchResult,
  MeshEvent,
  MeshNode,
  MeshPriority,
  Recommendation,
  Recommendations,
  Task,
  Volunteer,
} from '@/lib/types';
import { cn, formatCoord, pct, SEVERITY_ORDER, timeAgo, titleCase } from '@/lib/utils';
import { Pill, SeverityBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingRows, SourceTag } from '@/components/ui/DataState';
import { Segmented } from '@/components/ui/Field';
import { PageHeader, Panel, Section, Stat } from '@/components/ui/Page';
import { useToast } from '@/components/ui/Toast';
import { FilterChips } from '@/components/operations/FilterChips';
import { CompleteMissionDialog, missionMapHref, StartMissionDialog } from '@/components/volunteer/MissionDialogs';

/** Mirrors rules.MISSION_START_MINUTES on the server: accepted missions not started in time return to the pool. */
const START_LIMIT_MIN = 45;

const FACTORS = [
  { name: 'Urgency', body: 'Critical missions are filled first and weigh ten times a low-priority request.' },
  { name: 'Scarcity', body: 'Skills held by few responders count for more, so the pool is spent where it is thinnest.' },
  { name: 'Skill match', body: 'An exact certification beats a neighbouring skill; specialist missions never go to untrained hands.' },
  { name: 'Specialist protection', body: 'Paramedics, boat crews and drone pilots are held back from generic work while others can do it.' },
  { name: 'Distance', body: 'Closer responders score higher, halving at fifteen kilometres.' },
  { name: 'Fatigue', body: 'Each active mission lowers a responder’s score so the load spreads across the team.' },
];

const TIER_TONE = { EXACT: 'good', ADJACENT: 'warn', GENERIC: 'neutral' } as const;
const TIER_LABEL = { EXACT: 'Exact skill', ADJACENT: 'Related skill', GENERIC: 'General help' } as const;

function Formula() {
  return (
    <figure className="overflow-x-auto rounded-2xl border border-line bg-ink-900 px-6 py-7">
      <div className="min-w-[34rem] font-serif text-[1.35rem] italic text-ivory sm:text-2xl" aria-label="Composite score equals urgency times scarcity times skill match times squander penalty, divided by one plus distance over d-zero, divided by one plus beta times workload">
        C<sub className="text-[0.6em]">i,j</sub>
        <span className="mx-2 not-italic text-stone">=</span>
        W<sub className="text-[0.6em]">urgency</sub> · S<sub className="text-[0.6em]">k</sub> · Sim(v, T) · Π<sub className="text-[0.6em]">squander</sub>
        <span className="mx-2 not-italic text-stone">×</span>
        <span className="inline-flex flex-col items-center align-middle text-[0.8em] leading-tight"><span>1</span><span className="border-t border-stone px-1">1 + d / d<sub className="text-[0.6em]">0</sub></span></span>
        <span className="mx-2 not-italic text-stone">×</span>
        <span className="inline-flex flex-col items-center align-middle text-[0.8em] leading-tight"><span>1</span><span className="border-t border-stone px-1">1 + β H<sub className="text-[0.6em]">work</sub></span></span>
      </div>
      <figcaption className="mt-4 text-xs text-stone">
        Sperling (2026) priority-driven heuristic · d<sub>0</sub> = 15 km · β = 0.15 · Π<sub>squander</sub> = 0.12 · O(T log T + T·V)
      </figcaption>
    </figure>
  );
}

/** Text search across the fields people actually look for: what, where, needs, notes, who. */
function matches(term: string, ...parts: unknown[]): boolean {
  if (!term) return true;
  return parts.flat().filter((p) => p != null && p !== '').join(' ').toLowerCase().includes(term);
}

function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-line bg-ink-800 px-3 focus-within:border-signal/60 sm:max-w-sm">
      <Search className="h-4 w-4 shrink-0 text-stone" aria-hidden />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label}
        className="h-full w-full bg-transparent text-sm text-ivory placeholder:text-ash focus:outline-none" />
      {value && <button type="button" onClick={() => onChange('')} className="text-xs text-stone hover:text-ivory">Clear</button>}
    </div>
  );
}

type Show = 'ALL' | 'RECOMMENDED';

function RecommendedNote({ rec }: { rec: Recommendation | undefined }) {
  if (!rec) return null;
  return rec.recommended ? (
    <p className="flex items-center gap-1.5 text-xs text-gold"><Sparkles className="h-3.5 w-3.5" aria-hidden />Recommended for you · {rec.reason}</p>
  ) : !rec.qualified ? (
    <p className="text-xs text-ash">Needs {rec.skill} — outside your listed skills</p>
  ) : null;
}

const minutesLeft = (t: Task) => {
  if (t.status !== 'ASSIGNED' || !t.accepted_at) return null;
  return Math.round(START_LIMIT_MIN - (Date.now() - Date.parse(t.accepted_at)) / 60_000);
};

function MyQueue({ onChange }: { onChange: () => void }) {
  const toast = useToast();
  const me = useApi<Volunteer>('/api/volunteers/me');
  const mine = useApi<Task[]>('/api/tasks?mine=true', { refreshMs: 60_000 });
  const [busy, setBusy] = useState<string | null>(null);
  const [starting, setStarting] = useState<Task | null>(null);
  const [completing, setCompleting] = useState<Task | null>(null);

  const setAvailability = async (availability: Availability) => {
    if (!me.data) return;
    setBusy('availability');
    try {
      const v = await api.post<Volunteer>('/api/volunteer/availability', { volunteer_id: me.data.id, availability });
      me.mutate(() => v);
      toast(`You are now ${availability === 'OFFLINE' ? 'off duty' : availability.toLowerCase()}`);
      onChange();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not update availability', 'error');
    } finally { setBusy(null); }
  };

  const release = async (task: Task) => {
    setBusy(task.id);
    try {
      await api.patch<Task>(`/api/tasks/${task.id}`, { status: 'OPEN' });
      toast('Mission released back to the board');
      mine.reload(); onChange();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not update the mission', 'error');
    } finally { setBusy(null); }
  };
  const refresh = () => { mine.reload(); me.reload(); onChange(); };

  if (me.error?.status === 404) {
    return (
      <Panel className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-sand">Your account has no volunteer profile yet. Add your skills to receive missions.</p>
        <ButtonLink href="/onboarding" size="sm">Complete volunteer profile</ButtonLink>
      </Panel>
    );
  }
  const active = (mine.data ?? []).filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS');
  const offDuty = me.data?.availability === 'OFFLINE';

  return (
    <Panel className="space-y-6">
      <div id="my-missions" className="flex scroll-mt-24 flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl">Your mission queue</h2>
          {me.data && (
            <p className="mt-1 text-sm text-stone">
              {me.data.skills.join(', ') || 'No skills listed'} · based in {me.data.location_name} ·{' '}
              <Link href={`/volunteers/${me.data.id}`} className="link">your profile</Link>
            </p>
          )}
        </div>
        {me.data && (
          <Segmented<Availability> ariaLabel="Your availability" value={me.data.availability} onChange={setAvailability}
            options={[{ value: 'AVAILABLE', label: 'Available' }, { value: 'BUSY', label: 'Busy' }, { value: 'OFFLINE', label: 'Off duty' }]} />
        )}
      </div>
      {mine.loading && !mine.data ? <LoadingRows rows={1} />
        : mine.error ? <ErrorState message={mine.error.message} onRetry={mine.reload} />
        : active.length === 0 ? <p className="text-sm text-stone">No active missions. Accept one from the open missions below — the recommended ones match your skills and location.</p>
        : (
          <ul className="divide-y divide-line">
            {active.map((t) => {
              const left = minutesLeft(t);
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><SeverityBadge level={t.urgency} /><Pill>{t.status === 'ASSIGNED' ? 'Accepted' : 'In progress'}</Pill><span className="code">{t.code}</span></div>
                    <p className="mt-1.5 text-[0.9375rem] text-ivory">{t.title}</p>
                    <p className="text-xs text-stone">{t.location_name} · {t.required_skill}</p>
                    {left != null && (
                      <p className={cn('mt-1 flex items-center gap-1.5 text-xs', left <= 10 ? 'text-high' : 'text-stone')}>
                        <Timer className="h-3.5 w-3.5" aria-hidden />
                        {left > 0 ? `Start within ${left} min or it returns to the board for someone else` : 'Returning to the board — start now to keep it'}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.status === 'ASSIGNED' && (
                      <Button size="sm" disabled={offDuty} title={offDuty ? 'Set yourself available to start' : undefined} onClick={() => setStarting(t)}>
                        <Navigation className="h-3.5 w-3.5" aria-hidden />Start mission
                      </Button>
                    )}
                    {t.status === 'IN_PROGRESS' && (
                      <>
                        <ButtonLink size="sm" variant="secondary" href={missionMapHref(t.id, t.start_lat != null && t.start_lng != null ? { lat: t.start_lat, lng: t.start_lng } : null)}>
                          <MapPin className="h-3.5 w-3.5" aria-hidden />Route
                        </ButtonLink>
                        <Button size="sm" onClick={() => setCompleting(t)}>Mark complete</Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" disabled={busy === t.id} onClick={() => release(t)}>Release</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      {offDuty && active.some((t) => t.status === 'ASSIGNED') && <p className="text-xs text-stone">You are off duty — set yourself available to start a mission.</p>}
      <StartMissionDialog task={starting} open={Boolean(starting)} onClose={() => setStarting(null)} onStarted={refresh} />
      <CompleteMissionDialog task={completing} open={Boolean(completing)} onClose={() => setCompleting(null)} onDone={refresh} />
    </Panel>
  );
}

type MeshTab = 'REPORTS' | 'MESSAGES' | 'ALL';
const isMessage = (e: MeshEvent) => e.type === 'DISASTER_STATUS' && Boolean((e.payload as Record<string, unknown>)?.message);

function MeshTelemetryFeed({ onPromoted, recs }: { onPromoted: () => void; recs: Recommendations | undefined }) {
  const toast = useToast();
  const { user } = useSession();
  const [tab, setTab] = useState<MeshTab>('REPORTS');
  const [show, setShow] = useState<Show>('ALL');
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState<MeshPriority | ''>('');
  const [busy, setBusy] = useState<string | null>(null);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastUrgent, setBroadcastUrgent] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const eventsApi = useApi<MeshEvent[]>('/api/mesh/events?limit=200', { refreshMs: 15_000 });
  const nodesApi = useApi<MeshNode[]>('/api/mesh/nodes', { refreshMs: 30_000 });

  const all = useMemo(() => (eventsApi.data ?? []).filter((e) => e.review_status !== 'REJECTED'), [eventsApi.data]);
  const activeNodes = useMemo(() => (nodesApi.data ?? []).filter((n) => n.active).length, [nodesApi.data]);
  const recBy = useMemo(() => new Map((recs?.reports ?? []).map((r) => [r.event_id, r])), [recs]);
  const isVolunteer = user?.role === 'VOLUNTEER';
  const canBroadcast = Boolean(user && ['VOLUNTEER', 'NGO_MEMBER', 'INCIDENT_ADMIN'].includes(user.role)
    && (user.role === 'VOLUNTEER' || user.is_verified));
  const isCommand = user?.role === 'INCIDENT_ADMIN' && user.is_verified;

  const reports = useMemo(() => all.filter((e) => !isMessage(e)), [all]);
  const messages = useMemo(() => all.filter(isMessage), [all]);
  const term = q.trim().toLowerCase();
  const displayed = useMemo(() => {
    let rows = tab === 'REPORTS' ? reports : tab === 'MESSAGES' ? messages : all;
    rows = rows.filter((e) => {
      const p = (e.payload ?? {}) as Record<string, unknown>;
      return (!priority || e.priority === priority)
        && matches(term, MESH_TYPE_LABEL[e.type], e.type, p.notes, p.note, p.message, p.from, p.needs, p.location_text, e.origin_node_id.slice(0, 8));
    });
    if (show === 'RECOMMENDED') {
      rows = rows.filter((e) => recBy.get(e.event_id)?.recommended)
        .sort((a, b) => (recBy.get(b.event_id)?.score ?? 0) - (recBy.get(a.event_id)?.score ?? 0));
    }
    return rows;
  }, [tab, reports, messages, all, priority, term, show, recBy]);
  const recommendedCount = useMemo(() => reports.filter((e) => recBy.get(e.event_id)?.recommended).length, [reports, recBy]);

  const promoteToMission = async (e: MeshEvent) => {
    setBusy(e.event_id);
    try {
      await api.patch<MeshEvent>(`/api/mesh/events/${e.event_id}`, { action: 'PROMOTE' });
      toast('Field report converted to an open mission on the board');
      eventsApi.reload();
      onPromoted();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not convert the report to a mission', 'error');
    } finally {
      setBusy(null);
    }
  };

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = broadcastText.trim();
    if (!message) return;
    setBroadcasting(true);
    try {
      await api.post('/api/mesh/broadcast', { message, priority: broadcastUrgent && isCommand ? 'CRITICAL' : 'MEDIUM' });
      toast('Message queued — phones collect it the next time any of them is online, then relay it over Bluetooth');
      setBroadcastText('');
      setBroadcastUrgent(false);
      eventsApi.reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to send the message', 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <Panel className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="h-5 w-5 animate-pulse text-signal" aria-hidden />
            <h2 className="text-2xl">Live field mesh & responder telemetry</h2>
          </div>
          <p className="mt-1 text-sm text-stone">
            Reports and messages relayed over Bluetooth from the Volentify Mesh app, and reports filed on this website. All are unverified until command reviews them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={activeNodes > 0 ? 'good' : 'neutral'} dot>
            {activeNodes} field phone{activeNodes === 1 ? '' : 's'} online
          </Pill>
          <SourceTag source={eventsApi.source} />
        </div>
      </div>

      <div className="space-y-3 border-b border-line pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented<MeshTab> size="sm" ariaLabel="Telemetry type" value={tab} onChange={setTab} options={[
            { value: 'REPORTS', label: `Field requests (${reports.length})` },
            { value: 'MESSAGES', label: `Mesh radio (${messages.length})` },
            { value: 'ALL', label: `All (${all.length})` },
          ]} />
          <span className="text-xs text-stone">Refreshes every 15 s</span>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchBox value={q} onChange={setQ} label="Search field telemetry" placeholder="Search needs, notes, type, sender…" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <FilterChips<Show> label="Show" value={show} onChange={setShow} options={[
              { value: 'ALL', label: 'All' },
              ...(isVolunteer ? [{ value: 'RECOMMENDED' as Show, label: 'Recommended', count: recommendedCount }] : []),
            ]} />
            <FilterChips<MeshPriority | ''> label="Priority" value={priority} onChange={setPriority} options={[
              { value: '', label: 'Any' },
              ...(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => ({ value: p, label: titleCase(p) })),
            ]} />
          </div>
        </div>
        {!isVolunteer && <p className="text-xs text-ash">Sign in as a volunteer to see the reports recommended for your skills and location.</p>}
        {isVolunteer && recs && !recs.located && (
          <p className="text-xs text-stone">Recommendations use your skills only until you share a location — starting a mission records where you are.</p>
        )}
      </div>

      {tab === 'MESSAGES' && (canBroadcast ? (
        <form onSubmit={sendBroadcast} className="space-y-3 rounded-xl border border-line bg-ink-800/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-ivory">
              <MessageSquare className="h-3.5 w-3.5 text-signal" aria-hidden /> Message the field mesh as {user?.name}
              {isCommand ? <Pill tone="gold">Official</Pill> : <Pill>Unverified</Pill>}
            </span>
            {isCommand && (
              <button type="button" onClick={() => setBroadcastUrgent(!broadcastUrgent)} aria-pressed={broadcastUrgent}
                className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                  broadcastUrgent ? 'border border-critical/40 bg-critical/20 text-critical' : 'bg-ivory/[0.05] text-stone hover:text-ivory')}>
                {broadcastUrgent ? 'Priority: Urgent' : 'Priority: Normal'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input type="text" value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)} maxLength={240}
              placeholder="Short operational update for phones in the field…" aria-label="Message"
              className="flex-1 rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-ivory placeholder:text-stone focus:border-signal focus:outline-none" />
            <Button size="sm" type="submit" loading={broadcasting} disabled={!broadcastText.trim()}>
              <Send className="h-3.5 w-3.5" aria-hidden /> Send
            </Button>
          </div>
          <p className="text-xs text-stone">Phones pick it up the next time any of them is online and relay it up to three hops. Never send rumours or unconfirmed warnings — false alarms are an offence (DM Act 2005, s.54).</p>
        </form>
      ) : (
        <p className="rounded-xl border border-dashed border-line-strong p-4 text-sm text-stone">
          Signed-in volunteers and verified command can send short messages into the field mesh. <Link href="/login?next=/volunteer" className="link">Sign in</Link>
        </p>
      ))}

      {eventsApi.loading && !eventsApi.data ? (
        <LoadingRows rows={3} />
      ) : eventsApi.error ? (
        <ErrorState message={eventsApi.error.message} onRetry={eventsApi.reload} />
      ) : displayed.length === 0 ? (
        <EmptyState
          title={term || priority || show === 'RECOMMENDED' ? 'Nothing matches these filters'
            : tab === 'REPORTS' ? 'No field reports awaiting dispatch' : tab === 'MESSAGES' ? 'No radio messages yet' : 'No mesh events found'}
          body={term || priority || show === 'RECOMMENDED' ? 'Clear the search or choose “All” to see every report.'
            : 'Field reports from the Volentify Mesh app stream here as soon as any phone carrying them reaches the internet.'}
        />
      ) : (
        <ul className="divide-y divide-line">
          {displayed.map((e) => {
            const isMsg = isMessage(e);
            const payload = (e.payload ?? {}) as Record<string, unknown>;
            const msgText = typeof payload.message === 'string' ? payload.message : undefined;
            const fromName = (typeof payload.from === 'string' && payload.from) || `Phone ${e.origin_node_id.slice(0, 8)}`;
            const official = payload.official === true;
            const isPromoted = e.review_status === 'PROMOTED';
            const rawNeeds = payload.needs;
            const needs = Array.isArray(rawNeeds) ? rawNeeds : rawNeeds ? [rawNeeds] : [];
            const notes = typeof payload.notes === 'string' ? payload.notes : typeof payload.note === 'string' ? payload.note : undefined;
            const peopleCount = typeof payload.count === 'number' ? payload.count : undefined;
            const fromWeb = payload.source === 'web';
            const rec = recBy.get(e.event_id);

            return (
              <li key={e.event_id} className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-line-strong"
                      style={{ color: MESH_PRIORITY_HEX[e.priority] }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                      {titleCase(e.priority)}
                    </span>
                    {isMsg ? (
                      official ? <Pill tone="gold">Official · Volentify command</Pill> : <Pill tone="info">Unverified message</Pill>
                    ) : (
                      <Pill tone={isPromoted ? 'gold' : e.review_status === 'UNREVIEWED' ? 'warn' : 'good'}>
                        {isPromoted ? 'Converted to mission' : e.review_status === 'UNREVIEWED' ? 'Unverified report' : 'Reviewed'}
                      </Pill>
                    )}
                    {fromWeb && <Pill>Website report</Pill>}
                    <span className="text-xs text-stone">
                      observed {timeAgo(e.observed_at)}{fromWeb ? '' : ` · ${e.hop_count} hop${e.hop_count === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  {isMsg ? (
                    <div>
                      <p className="font-serif text-[1.0625rem] leading-snug text-ivory">“{msgText}”</p>
                      <p className="mt-1 text-xs text-stone">From: <span className="text-sand">{fromName}</span></p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[1.0625rem] font-medium text-ivory">{MESH_TYPE_LABEL[e.type] || titleCase(e.type)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone">
                        {needs.length > 0 && <span className="text-signal">Needs: <strong className="text-ivory">{needs.join(', ')}</strong></span>}
                        {notes && <span>Notes: <span className="text-sand">“{notes}”</span></span>}
                        {typeof payload.location_text === 'string' && <span>{payload.location_text}</span>}
                        {peopleCount != null && <span>People: <strong className="text-ivory">{peopleCount}</strong></span>}
                        {payload.redacted === true && <span>Details visible to verified command{typeof payload.count_band === 'string' ? ` · ${payload.count_band} people` : ''}</span>}
                        {e.lat != null && e.lng != null ? (
                          <span className="code flex items-center gap-1"><MapPin className="h-3 w-3 text-stone" aria-hidden /> {formatCoord(e.lat, e.lng)}</span>
                        ) : <span className="text-stone">No GPS fix / location masked</span>}
                        {rec?.distance_km != null && <span>{rec.distance_km} km from you</span>}
                      </div>
                      <div className="mt-1"><RecommendedNote rec={rec} /></div>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {!isMsg && !isPromoted && user && ['VOLUNTEER', 'NGO_MEMBER', 'INCIDENT_ADMIN'].includes(user.role) && (
                    <Button size="sm" loading={busy === e.event_id} onClick={() => promoteToMission(e)}
                      title="Convert this field report into an open mission so the dispatch engine can assign responders">
                      <Sparkles className="h-3.5 w-3.5 text-sand" aria-hidden />Convert to mission
                    </Button>
                  )}
                  {isPromoted && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gold"><CheckCircle2 className="h-4 w-4" aria-hidden />Live on board</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function OpenMissions({ isVolunteer, tasks, recs, onAccepted }: {
  isVolunteer: boolean; tasks: ReturnType<typeof useApi<Task[]>>; recs: Recommendations | undefined; onAccepted: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [show, setShowState] = useState<Show>(isVolunteer ? 'RECOMMENDED' : 'ALL');
  const [chosen, setChosen] = useState(false);
  const setShow = (v: Show) => { setChosen(true); setShowState(v); };
  const [skill, setSkill] = useState('');
  // The session loads after first render: volunteers start on their recommendations unless they picked a view.
  useEffect(() => { if (!chosen) setShowState(isVolunteer ? 'RECOMMENDED' : 'ALL'); }, [isVolunteer, chosen]);
  const recBy = useMemo(() => new Map((recs?.tasks ?? []).map((r) => [r.task_id, r])), [recs]);

  const accept = async (t: Task) => {
    setBusy(t.id);
    try {
      await api.post<Task>(`/api/tasks/${t.id}/accept`);
      toast(`Mission accepted: ${t.title} — start it within ${START_LIMIT_MIN} minutes`);
      onAccepted();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not accept the mission', 'error');
      tasks.reload();
    } finally { setBusy(null); }
  };
  const all = useMemo(() => tasks.data ?? [], [tasks.data]);
  const skills = useMemo(() => Array.from(new Set(all.map((t) => t.required_skill))).sort(), [all]);
  const term = q.trim().toLowerCase();
  const rows = useMemo(() => {
    let r = all.filter((t) => (!skill || t.required_skill === skill)
      && matches(term, t.title, t.description, t.location_name, t.required_skill, t.code));
    if (show === 'RECOMMENDED') {
      r = r.filter((t) => recBy.get(t.id)?.recommended).sort((a, b) => (recBy.get(b.id)?.score ?? 0) - (recBy.get(a.id)?.score ?? 0));
    } else {
      r = [...r].sort((a, b) => SEVERITY_ORDER[a.urgency] - SEVERITY_ORDER[b.urgency]);
    }
    return r;
  }, [all, skill, term, show, recBy]);
  const recommendedCount = all.filter((t) => recBy.get(t.id)?.recommended).length;

  if (tasks.loading && !tasks.data) return <LoadingRows rows={3} />;
  if (tasks.error) return <ErrorState message={tasks.error.message} onRetry={tasks.reload} />;
  if (!all.length) return <EmptyState title="Every mission is staffed" body="New requests from incident command or converted field reports will appear here." />;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBox value={q} onChange={setQ} label="Search open missions" placeholder="Search title, place, skill, code…" />
        <FilterChips<Show> label="Show" value={show} onChange={setShow} options={[
          { value: 'ALL', label: 'All', count: all.length },
          ...(isVolunteer ? [{ value: 'RECOMMENDED' as Show, label: 'Recommended for you', count: recommendedCount }] : []),
        ]} />
      </div>
      {skills.length > 1 && (
        <FilterChips label="Skill" value={skill} onChange={setSkill}
          options={[{ value: '', label: 'Any' }, ...skills.map((s) => ({ value: s, label: s, count: all.filter((t) => t.required_skill === s).length }))]} />
      )}
      {!rows.length ? (
        <EmptyState title={show === 'RECOMMENDED' ? 'No recommended missions right now' : 'Nothing matches these filters'}
          body={show === 'RECOMMENDED' ? `None of the open missions match your skills within ${recs?.radius_km ?? 150} km. Choose “All” to see everything.` : 'Clear the search or filters.'}
          action={<button type="button" className="link text-sm" onClick={() => { setShow('ALL'); setQ(''); setSkill(''); }}>Show all missions</button>} />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map((t) => {
            const rec = recBy.get(t.id);
            return (
              <li key={t.id} className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2"><SeverityBadge level={t.urgency} /><span className="code">{t.code}</span></div>
                  <p className="text-[1.0625rem] text-ivory">{t.title}</p>
                  {t.description && <p className="line-clamp-2 text-xs text-sand">{t.description}</p>}
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-stone">
                    <span>{t.required_skill}</span>
                    <span>{t.quantity_needed} responder{t.quantity_needed === 1 ? '' : 's'}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{t.location_name}</span>
                    {rec?.distance_km != null && <span>{rec.distance_km} km from you</span>}
                    <span>Raised {timeAgo(t.created_at)}</span>
                  </p>
                  <RecommendedNote rec={rec} />
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/disasters/${t.disaster_id}`} className="link text-[0.8125rem]">Incident</Link>
                  {isVolunteer && <Button size="sm" loading={busy === t.id} disabled={rec ? !rec.qualified : false}
                    title={rec && !rec.qualified ? `Needs ${t.required_skill}` : undefined} onClick={() => accept(t)}>Accept mission</Button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DispatchCycle({ refreshKey }: { refreshKey: number }) {
  const [result, setResult] = useState<DispatchResult | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setRunning(true); setError(null);
    try {
      const r = await apiFetch<DispatchResult>('/api/match/dispatch-batch', { method: 'POST', json: {} });
      setSource(r.source);
      setResult(r.data);
      setRanAt(new Date());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Dispatch engine unavailable');
    } finally { setRunning(false); }
  }, []);

  useEffect(() => { void run(); }, [run, refreshKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of result?.assignments ?? []) map.set(a.task_id, [...(map.get(a.task_id) ?? []), a]);
    return Array.from(map.values());
  }, [result]);
  const maxScarcity = Math.max(1, ...Object.values(result?.scarcity ?? {}));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SourceTag source={source} />
          {ranAt && <span className="text-xs text-stone">Last cycle {timeAgo(ranAt)}</span>}
        </div>
        <Button variant="secondary" size="sm" onClick={run} loading={running}><RotateCw className="h-3.5 w-3.5" aria-hidden />Run dispatch cycle</Button>
      </div>

      {error ? <ErrorState message={error} onRetry={run} />
        : !result ? <LoadingRows rows={3} />
        : (
          <>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-line py-6 md:grid-cols-4">
              <Stat label="Slots filled" value={pct(result.completeness)} note={`${result.assignments.length} assignments`} />
              <Stat label="Solve time" value={<>{result.latency_ms.toFixed(2)}<span className="font-sans text-base text-stone"> ms</span></>} note="Measured on the server" />
              <Stat label="Missions evaluated" value={result.tasks_evaluated} note={`${result.volunteers_evaluated} available responders`} />
              <Stat label="Exact skill matches" value={result.tiers.EXACT} note={`${result.tiers.ADJACENT} related · ${result.tiers.GENERIC} general`} />
            </div>

            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <section aria-labelledby="assignments">
                <h3 id="assignments" className="mb-4 text-2xl">Recommended assignments</h3>
                {grouped.length === 0 ? <p className="text-sm text-stone">No eligible responders for the open missions.</p> : (
                  <ol className="space-y-6">
                    {grouped.map((group) => (
                      <li key={group[0].task_id} className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <SeverityBadge level={group[0].urgency} />
                          <p className="text-[0.9375rem] text-ivory">{group[0].task_title}</p>
                          <span className="code">{group[0].task_code}</span>
                        </div>
                        <ul className="divide-y divide-line rounded-xl border border-line">
                          {group.map((a) => (
                            <li key={`${a.task_id}-${a.slot}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                              <div className="min-w-0">
                                <Link href={`/volunteers/${a.volunteer_id}`} className="text-sm text-ivory hover:text-signal">{a.volunteer_name}</Link>
                                <p className="text-xs text-stone">{a.reason}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Pill tone={TIER_TONE[a.tier]}>{TIER_LABEL[a.tier]}</Pill>
                                <span className="data text-xs text-sand">{a.score.toFixed(3)}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <div className="space-y-10">
                <section aria-labelledby="bottlenecks">
                  <h3 id="bottlenecks" className="mb-4 text-2xl">Shortfalls</h3>
                  {result.bottlenecks.length === 0
                    ? <p className="flex items-center gap-2 text-sm text-low"><ShieldCheck className="h-4 w-4" aria-hidden />Every open mission is fully staffed.</p>
                    : (
                      <ul className="space-y-3">
                        {result.bottlenecks.map((b) => (
                          <li key={b.task_id} className="flex items-start gap-3 rounded-xl border border-high/25 bg-high/[0.05] p-3.5">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-high" aria-hidden />
                            <div className="text-sm">
                              <p className="text-ivory">{b.deficit} more {b.skill} needed</p>
                              <p className="text-xs text-stone">{b.task_code} · {b.filled} of {b.requested} filled</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                </section>

                <section aria-labelledby="scarcity">
                  <h3 id="scarcity" className="mb-4 text-2xl">Skill scarcity</h3>
                  <p className="mb-4 text-xs text-stone">S<sub>k</sub> = 1 / √N<sub>k</sub> — longer bars mean fewer available responders hold the skill.</p>
                  <ul className="space-y-3">
                    {Object.entries(result.scarcity).sort((a, b) => b[1] - a[1]).map(([skill, s]) => (
                      <li key={skill}>
                        <div className="mb-1 flex justify-between text-[0.8125rem]"><span className="text-sand">{skill}</span><span className="data text-stone">{s.toFixed(2)}</span></div>
                        <div className="h-1.5 rounded-full bg-ink-700"><div className={cn('h-full rounded-full', s >= 0.99 ? 'bg-signal' : 'bg-gold/70')} style={{ width: `${(s / maxScarcity) * 100}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </>
        )}
    </div>
  );
}

function PoolSummary() {
  const { data, error, loading, reload } = useApi<Volunteer[]>('/api/volunteers?availability=ALL', { refreshMs: 60_000 });
  if (loading && !data) return <LoadingRows rows={1} />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  const pool = data ?? [];
  const by = (a: Availability) => pool.filter((v) => v.availability === a).length;
  const skills = new Map<string, number>();
  pool.filter((v) => v.availability === 'AVAILABLE').forEach((v) => v.skills.forEach((s) => skills.set(s, (skills.get(s) ?? 0) + 1)));
  return (
    <div className="grid gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:gap-16">
      <div className="grid grid-cols-3 gap-8">
        <Stat label="Available" value={by('AVAILABLE')} />
        <Stat label="On mission" value={by('BUSY')} />
        <Stat label="Off duty" value={by('OFFLINE')} />
      </div>
      <div>
        <p className="mb-3 text-[0.8125rem] text-stone">Skills ready to deploy</p>
        <div className="flex flex-wrap gap-2">
          {Array.from(skills.entries()).sort((a, b) => b[1] - a[1]).map(([s, n]) => (
            <Pill key={s} tone={n <= 1 ? 'warn' : 'neutral'}>{s} <span className="text-stone">{n}</span></Pill>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DispatchBoard() {
  const { user, status } = useSession();
  const isVolunteer = user?.role === 'VOLUNTEER';
  const tasks = useApi<Task[]>('/api/tasks?status=OPEN', { refreshMs: 45_000 });
  const recs = useApi<Recommendations>(isVolunteer ? '/api/volunteers/me/recommendations' : null, { refreshMs: 60_000 });
  const [cycle, setCycle] = useState(0);
  const refreshAll = useCallback(() => { tasks.reload(); recs.reload(); setCycle((n) => n + 1); }, [tasks, recs]);

  return (
    <>
      <PageHeader
        label="Volunteer dispatch"
        title="The right responder, to the right mission, first."
        lede="Volentify allocates open missions in priority order and protects rare specialists from routine work. Every recommendation shows why it was made."
        actions={status === 'authenticated'
          ? (isVolunteer ? <ButtonLink href="/volunteers/me" variant="secondary">My profile</ButtonLink> : <ButtonLink href="/map" variant="secondary">See missions on the map</ButtonLink>)
          : <><ButtonLink href="/register?role=VOLUNTEER">Join as a volunteer</ButtonLink><ButtonLink href="/login?next=/volunteer" variant="secondary">Sign in</ButtonLink></>}
      />

      {isVolunteer && <Section className="pt-0"><MyQueue onChange={refreshAll} /></Section>}

      <Section title="Open missions" className={isVolunteer ? '' : 'pt-0'}
        description={isVolunteer ? `Recommended missions match your skills and are within ${recs.data?.radius_km ?? 150} km. Accept one, then start it within ${START_LIMIT_MIN} minutes.` : undefined}
        actions={!isVolunteer && status !== 'loading' ? <ButtonLink href={user ? '/onboarding' : '/register?role=VOLUNTEER'} size="sm" variant="secondary">Volunteer to take missions</ButtonLink> : undefined}>
        <OpenMissions isVolunteer={isVolunteer} tasks={tasks} recs={recs.data} onAccepted={refreshAll} />
      </Section>

      <Section>
        <MeshTelemetryFeed onPromoted={refreshAll} recs={recs.data} />
      </Section>

      <Section title="Live dispatch board" description="One allocation cycle over every open mission and available responder. Recommendations are advisory — responders accept missions themselves.">
        <DispatchCycle refreshKey={cycle} />
      </Section>

      <Section title="How missions are allocated">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {FACTORS.map((f) => (
              <div key={f.name}>
                <dt className="text-[0.9375rem] text-ivory">{f.name}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-stone">{f.body}</dd>
              </div>
            ))}
          </dl>
          <Formula />
        </div>
      </Section>

      <Section title="Responder pool">
        <PoolSummary />
      </Section>
    </>
  );
}
