'use client';

import { useMemo } from 'react';
import { useApi } from '@/lib/api';
import { MESH_PRIORITY_HEX, SEVERITY_META } from '@/lib/constants';
import type { Disaster, MeshEvent, MeshPriority, Severity, Task, TaskStatus, Volunteer } from '@/lib/types';
import { timeAgo, titleCase } from '@/lib/utils';
import { Stat } from '@/components/ui/Page';
import { ErrorState, LoadingRows, SourceTag } from '@/components/ui/DataState';
import { ChartCard, Columns, PairedBars, RankedBars, SERIES, StatusBar, categoryColor, fmt } from './charts';

const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
const PRIORITIES: MeshPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUSES: { key: TaskStatus; label: string }[] = [
  { key: 'OPEN', label: 'Open, waiting for a responder' },
  { key: 'ASSIGNED', label: 'Accepted, not yet started' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

function countBy<T>(items: T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + 1);
  return m;
}

/** What is happening now: computed in the browser from the live register, refreshed every minute. */
export default function LiveOperations() {
  const disasters = useApi<Disaster[]>('/api/disasters', { refreshMs: 120_000 });
  const tasks = useApi<Task[]>('/api/tasks', { refreshMs: 60_000 });
  const volunteers = useApi<Volunteer[]>('/api/volunteers?availability=ALL', { refreshMs: 60_000 });
  const mesh = useApi<MeshEvent[]>('/api/mesh/events?limit=500', { refreshMs: 60_000 });

  const view = useMemo(() => {
    const d = disasters.data ?? [], t = tasks.data ?? [], v = volunteers.data ?? [], m = mesh.data ?? [];
    const byCategory = [...countBy(d, (x) => x.category)]
      .map(([label, value]) => ({ label, value, color: categoryColor(label) }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
    const bySeverity = countBy(d, (x) => x.severity);
    const byStatus = countBy(t, (x) => x.status);

    const open = t.filter((x) => x.status === 'OPEN');
    const available = v.filter((x) => x.availability === 'AVAILABLE');
    const skills = [...new Set(open.map((x) => x.required_skill))];
    const demand = skills.map((skill) => ({
      label: skill,
      a: open.filter((x) => x.required_skill === skill).reduce((s, x) => s + x.quantity_needed, 0),
      b: available.filter((x) => x.skills.includes(skill)).length,
    })).sort((x, y) => (y.a - y.b) - (x.a - x.b));

    const now = Date.now();
    const hours = Array.from({ length: 24 }, (_, i) => {
      const start = now - (24 - i) * 3_600_000;
      const end = new Date(start + 3_600_000);
      const hh = end.toLocaleTimeString('en-IN', { hour: '2-digit', hour12: false });
      return {
        label: `${hh}h`,
        tip: `Hour ending ${hh}:00`,
        value: m.filter((e) => { const ts = Date.parse(e.observed_at); return ts >= start && ts < start + 3_600_000; }).length,
      };
    });
    const byPriority = countBy(m, (x) => x.priority);
    const unreviewed = m.filter((x) => x.review_status === 'UNREVIEWED');
    const oldest = unreviewed.reduce<string | null>((o, e) => (!o || e.received_at < o ? e.received_at : o), null);
    const last24 = hours.reduce((s, h) => s + h.value, 0);
    return { byCategory, bySeverity, byStatus, demand, hours, last24, byPriority, unreviewed, oldest, m, d, t, v, available, open };
  }, [disasters.data, tasks.data, volunteers.data, mesh.data]);

  const first = disasters.data === undefined || tasks.data === undefined || volunteers.data === undefined || mesh.data === undefined;
  const loading = first && (disasters.loading || tasks.loading || volunteers.loading || mesh.loading);
  const error = disasters.error || tasks.error || volunteers.error || mesh.error;
  if (loading) return <div className="page py-6"><LoadingRows rows={4} /></div>;
  if (error && first) {
    return (
      <div className="page py-6">
        <ErrorState message={error.message} onRetry={() => { disasters.reload(); tasks.reload(); volunteers.reload(); mesh.reload(); }} />
      </div>
    );
  }

  const shortfall = view.demand.reduce((s, x) => s + Math.max(0, x.a - x.b), 0);

  return (
    <>
      <section className="page pb-6" aria-label="Current figures">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-y border-line py-8 lg:grid-cols-4">
          <Stat label="Incidents tracked" value={fmt(view.d.length)} note={`${view.bySeverity.get('CRITICAL') ?? 0} critical`} />
          <Stat label="Open missions" value={fmt(view.open.length)}
            note={view.open.length ? `${fmt(view.open.reduce((s, x) => s + x.quantity_needed, 0))} responder slots` : 'none waiting'} />
          <Stat label="Responders available" value={fmt(view.available.length)} note={`of ${fmt(view.v.length)} registered`} />
          <Stat label="Unreviewed field reports" value={fmt(view.unreviewed.length)} note={view.oldest ? `oldest received ${timeAgo(view.oldest)}` : 'backlog clear'} />
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone">
          <SourceTag source={disasters.source} />
          <span>Refreshes every minute.</span>
          {error && <span className="text-moderate">Last refresh failed; showing the previous figures.</span>}
        </div>
      </section>

      <section className="page grid gap-4 py-6 lg:grid-cols-2" aria-label="Live charts">
        <ChartCard title="Incidents by hazard" note="Incidents currently in the register, from live feeds and incident command."
          empty={view.byCategory.length ? null : 'No incidents in the register right now.'}
          table={{ head: ['Hazard', 'Incidents'], rows: view.byCategory.map((x) => [x.label, x.value]) }}>
          <RankedBars data={view.byCategory} label="Incidents by hazard" />
        </ChartCard>

        <ChartCard title="Incidents by severity" note="Highest declared severity for each incident."
          table={{ head: ['Severity', 'Incidents'], rows: SEVERITIES.map((s) => [SEVERITY_META[s].label, view.bySeverity.get(s) ?? 0]) }}>
          <div className="flex h-full flex-col justify-center py-2">
            <StatusBar label="Incidents by severity"
              parts={SEVERITIES.map((s) => ({ label: SEVERITY_META[s].label, value: view.bySeverity.get(s) ?? 0, color: SEVERITY_META[s].hex }))} />
          </div>
        </ChartCard>

        <ChartCard className="lg:col-span-2" title="Skills needed against responders available"
          note={!view.demand.length ? undefined : shortfall > 0
            ? `Open missions are short of ${fmt(shortfall)} qualified responder${shortfall === 1 ? '' : 's'} across all skills.`
            : 'Every open mission has enough available, qualified responders.'}
          empty={view.demand.length ? null : 'No open missions, so no skills are in demand right now.'}
          table={{ head: ['Skill', 'Slots needed', 'Available with skill'], rows: view.demand.map((x) => [x.label, x.a, x.b]) }}>
          <PairedBars data={view.demand} label="Responder slots needed and available, by skill"
            a={{ name: 'Responder slots needed', color: SERIES.b }} b={{ name: 'Available with this skill', color: SERIES.a }} />
        </ChartCard>

        <ChartCard title="Missions by status" note="Every mission in the register, by where it is now."
          empty={view.t.length ? null : 'No missions have been created yet.'}
          table={{ head: ['Status', 'Missions'], rows: STATUSES.map((s) => [s.label, view.byStatus.get(s.key) ?? 0]) }}>
          <RankedBars label="Missions by status" data={STATUSES.map((s) => ({ key: s.key, label: s.label, value: view.byStatus.get(s.key) ?? 0 }))} />
        </ChartCard>

        <ChartCard title="Field reports by priority" note={`${fmt(view.m.length)} mesh and website reports held. Priority is set on the phone and capped by server rules.`}
          table={{ head: ['Priority', 'Reports'], rows: PRIORITIES.map((p) => [titleCase(p), view.byPriority.get(p) ?? 0]) }}>
          <div className="flex h-full flex-col justify-center py-2">
            <StatusBar label="Field reports by priority"
              parts={PRIORITIES.map((p) => ({ label: titleCase(p), value: view.byPriority.get(p) ?? 0, color: MESH_PRIORITY_HEX[p] }))} />
          </div>
        </ChartCard>

        <ChartCard className="lg:col-span-2" title="Field reports observed per hour, last 24 hours"
          note="Grouped by when the observation was made on the ground, not when it reached the server. Relayed reports can arrive hours later."
          empty={view.last24 ? null : 'No field observations in the last 24 hours.'}
          table={{ head: ['Hour ending', 'Reports'], rows: view.hours.map((h) => [h.label, h.value]) }}>
          <Columns data={view.hours} name="reports" color={SERIES.live} />
        </ChartCard>
      </section>
    </>
  );
}
