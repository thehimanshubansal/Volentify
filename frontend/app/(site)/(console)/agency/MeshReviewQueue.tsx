'use client';

import { useMemo, useState } from 'react';
import { api, ApiError, useApi } from '@/lib/api';
import { MESH_PRIORITY_HEX, MESH_TYPE_LABEL } from '@/lib/constants';
import type { Disaster, MeshEvent, MeshPriority, ReviewStatus } from '@/lib/types';
import { formatCoord, timeAgo, titleCase } from '@/lib/utils';
import { Pill } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingRows, SourceTag } from '@/components/ui/DataState';
import { Segmented, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

type ReviewFilter = 'UNREVIEWED' | 'ALL';
const PRIORITY_RANK: Record<MeshPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function MeshReviewQueue({ disasters, onPromoted }: { disasters: Disaster[]; onPromoted: () => void }) {
  const toast = useToast();
  const [disaster, setDisaster] = useState('');
  const [priority, setPriority] = useState<MeshPriority | ''>('');
  const [review, setReview] = useState<ReviewFilter>('UNREVIEWED');
  const [busy, setBusy] = useState<string | null>(null);
  const q = new URLSearchParams({ limit: '200', ...(disaster && { disaster_id: disaster }), ...(priority && { priority }) });
  const events = useApi<MeshEvent[]>(`/api/mesh/events?${q}`, { refreshMs: 10_000 });

  const rows = useMemo(() => (events.data ?? [])
    .filter((e) => review === 'ALL' || e.review_status === 'UNREVIEWED')
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || Date.parse(b.observed_at) - Date.parse(a.observed_at)),
  [events.data, review]);
  const unreviewed = (events.data ?? []).filter((e) => e.review_status === 'UNREVIEWED').length;
  const name = (id: string | null) => disasters.find((d) => d.id === id)?.title ?? 'Not linked to an incident';

  const decide = async (e: MeshEvent, action: 'REVIEWED' | 'PROMOTE' | 'REJECT', blockNode = false) => {
    if (blockNode && !window.confirm('Quarantine this phone? Every future report or message it sends will be dropped. Use only for deliberate false or abusive reports.')) return;
    setBusy(e.event_id);
    try {
      const updated = await api.patch<MeshEvent>(`/api/mesh/events/${e.event_id}`, { action, block_node: blockNode });
      events.mutate((list) => list?.map((x) => (x.event_id === e.event_id ? updated : x)));
      if (action === 'PROMOTE') { toast('Report promoted to an open mission'); onPromoted(); }
      else if (action === 'REJECT') toast(blockNode ? 'Report rejected and the phone quarantined' : 'Report rejected as false — hidden from public views');
      else toast('Report marked reviewed');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not update the report.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[1.75rem]">Mesh field reports</h2>
          <p className="text-sm text-stone">
            {unreviewed ? <><span className="text-moderate">{unreviewed} unverified</span> — treat as unconfirmed until reviewed.</> : 'Every report in view has been reviewed.'}
          </p>
        </div>
        <SourceTag source={events.source} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented<ReviewFilter> size="sm" ariaLabel="Review state" value={review} onChange={setReview}
          options={[{ value: 'UNREVIEWED', label: 'Needs review' }, { value: 'ALL', label: 'All reports' }]} />
        <Select aria-label="Incident" value={disaster} onChange={(e) => setDisaster(e.target.value)} className="h-9 w-auto min-w-[12rem] text-sm">
          <option value="">All incidents</option>
          {disasters.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </Select>
        <Select aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as MeshPriority | '')} className="h-9 w-auto text-sm">
          <option value="">Any priority</option>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
        </Select>
      </div>

      {events.loading && !events.data ? <LoadingRows rows={4} />
        : events.error ? <ErrorState message={events.error.message} onRetry={events.reload} />
        : rows.length === 0 ? <EmptyState title={review === 'UNREVIEWED' ? 'Review queue is clear' : 'No reports match these filters'}
            body="New mesh and website reports appear here within 30 seconds of a gateway syncing." />
        : (
          <ul className="space-y-3">
            {rows.map((e) => {
              const payload = Object.entries(e.payload ?? {}).filter(([k]) => k !== 'redacted');
              return (
                <li key={e.event_id} className={e.review_status === 'UNREVIEWED' ? 'rounded-2xl border border-dashed border-line-strong p-5' : 'rounded-2xl border border-line p-5'}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ring-line-strong" style={{ color: MESH_PRIORITY_HEX[e.priority] }}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />{titleCase(e.priority)}
                        </span>
                        <Pill tone={e.review_status === 'UNREVIEWED' ? 'warn' : e.review_status === 'PROMOTED' ? 'gold' : e.review_status === 'REJECTED' ? 'bad' : 'good'}>
                          {e.review_status === 'UNREVIEWED' ? 'Unverified' : e.review_status === 'REJECTED' ? 'Rejected as false' : titleCase(e.review_status)}
                        </Pill>
                        <span className="text-xs text-stone">observed {timeAgo(e.observed_at)} · {e.hop_count} hop{e.hop_count === 1 ? '' : 's'}</span>
                      </div>
                      <h3 className="font-serif text-2xl text-ivory">{MESH_TYPE_LABEL[e.type]}</h3>
                      <p className="text-sm text-stone">{name(e.disaster_id)}</p>
                      <p className="code">{formatCoord(e.lat, e.lng)} · node {e.origin_node_id.slice(0, 8)}</p>
                      {payload.length > 0 && (
                        <p className="text-sm text-sand">{payload.map(([k, v]) => `${titleCase(k)}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(' · ')}</p>
                      )}
                    </div>
                    {e.review_status !== 'PROMOTED' && e.review_status !== 'REJECTED' && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {e.review_status === 'UNREVIEWED' && (
                          <Button size="sm" variant="secondary" disabled={busy === e.event_id} onClick={() => decide(e, 'REVIEWED')}>Mark reviewed</Button>
                        )}
                        <Button size="sm" loading={busy === e.event_id} disabled={!e.disaster_id} onClick={() => decide(e, 'PROMOTE')}
                          title={e.disaster_id ? undefined : 'Only reports linked to an incident can become missions'}>
                          Promote to mission
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy === e.event_id} onClick={() => decide(e, 'REJECT')}
                          title="False, duplicate-spam or prank report: hide it from public views">Reject</Button>
                        <Button size="sm" variant="ghost" className="text-critical" disabled={busy === e.event_id} onClick={() => decide(e, 'REJECT', true)}
                          title="Reject and quarantine the phone that sent it">Reject & quarantine phone</Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
    </section>
  );
}
