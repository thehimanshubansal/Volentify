'use client';

import Link from 'next/link';
import { Download } from 'lucide-react';
import { useApi } from '@/lib/api';
import type { TransparencyReport } from '@/lib/types';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { Stat } from '@/components/ui/Page';
import { Pill } from '@/components/ui/Badge';
import { ErrorState, LoadingRows, SourceTag } from '@/components/ui/DataState';
import { ChartCard, Columns, FunnelBars, GroupedColumns, SERIES, fmt, formatMinutes, monthAxis, monthLong } from './charts';

const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;

/** What the platform and its volunteers have done, from GET /api/transparency (aggregates only). */
export default function ImpactPanel() {
  const res = useApi<TransparencyReport>('/api/transparency', { refreshMs: 120_000 });

  if (res.loading && !res.data) return <div className="page py-6"><LoadingRows rows={4} /></div>;
  if (!res.data) return <div className="page py-6"><ErrorState message={res.error?.message ?? 'Figures are unavailable.'} onRetry={res.reload} /></div>;

  const r = res.data;
  const m = r.missions, mesh = r.mesh, v = r.volunteers, p = r.people;
  const reviewed = mesh.reviewed + mesh.promoted + mesh.rejected;
  const monthly = r.months.map((ym, i) => ({ label: monthAxis(ym, i), tip: monthLong(ym), a: m.created_monthly[i] ?? 0, b: m.completed_monthly[i] ?? 0 }));
  const meshMonthly = r.months.map((ym, i) => ({ label: monthAxis(ym, i), tip: monthLong(ym), value: mesh.monthly[i] ?? 0 }));
  const incidentMonthly = r.months.map((ym, i) => ({ label: monthAxis(ym, i), tip: monthLong(ym), value: r.incidents.monthly[i] ?? 0 }));
  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
  const period = `${monthLong(r.months[0])} to ${monthLong(r.months[r.months.length - 1])}`;

  return (
    <>
      <section className="page pb-6" aria-label="Headline figures">
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone">
          <span>Generated <time dateTime={r.generated_at} title={formatDateTime(r.generated_at)}>{timeAgo(r.generated_at)}</time> from the platform’s own records.</span>
          <SourceTag source={res.source ?? r.data_source} />
          <a href="/api/transparency" className="inline-flex items-center gap-1.5 text-sand hover:text-ivory" download="volentify-transparency.json">
            <Download className="h-3.5 w-3.5" aria-hidden />Download figures (JSON)
          </a>
          {res.error && <span className="text-moderate">Last refresh failed; showing the previous figures.</span>}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-y border-line py-8 lg:grid-cols-4">
          <Stat label="Missions completed" value={fmt(m.completed)}
            note={m.total ? `of ${plural(m.total, 'mission')} created` : 'No missions created yet'} />
          <Stat label="People helped by missions" value={fmt(p.helped_by_missions)}
            note={m.completed ? 'as recorded by responders on completion' : 'No missions completed yet'} />
          <Stat label="Volunteer hours" value={fmt(m.volunteer_hours)}
            note={m.completed ? 'start to completion, completed missions only' : 'Counted once a mission is completed'} />
          <Stat label="Responders engaged" value={fmt(m.responders_engaged)}
            note={m.responders_engaged ? 'accepted at least one mission' : 'No missions accepted yet'} />
        </dl>
      </section>

      <section className="page grid gap-4 py-6 lg:grid-cols-2" aria-label="Missions and responders">
        <ChartCard title="Missions, from request to result"
          note="Every mission posted by incident command or created from a field report, and how far it got."
          empty={m.total ? null : 'No missions have been created yet. Figures appear here as soon as incident command posts one.'}
          table={{ head: ['Stage', 'Missions'], rows: [
            ['Created', m.total], ['Dispatched (accepted by a responder)', m.dispatched], ['Completed', m.completed],
            ['Open, waiting for a responder', m.open], ['Accepted, not yet started', m.assigned], ['In progress', m.in_progress], ['Cancelled', m.cancelled],
          ] }}
          footer={m.total ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
              {([['Waiting', m.open], ['Accepted', m.assigned], ['In progress', m.in_progress], ['Cancelled', m.cancelled]] as const).map(([k, n]) => (
                <div key={k}><dt className="text-xs text-stone">{k}</dt><dd className="tabular-nums text-ivory">{fmt(n)}</dd></div>
              ))}
            </dl>
          ) : undefined}>
          <FunnelBars label="Missions by stage" stages={[
            { label: 'Created', value: m.total },
            { label: 'Dispatched — accepted by a responder', value: m.dispatched },
            { label: 'Completed', value: m.completed },
          ]} />
        </ChartCard>

        <figure className="panel flex flex-col gap-5 p-5 sm:p-6">
          <figcaption className="space-y-1">
            <h3 className="text-2xl leading-tight">How quickly missions move</h3>
            <p className="text-sm leading-relaxed text-stone">
              Median times, so one unusually slow or fast mission does not skew the figure. A mission accepted but not started
              within {r.governance.mission_start_limit_minutes} minutes goes back to the open pool.
            </p>
          </figcaption>
          <dl className="divide-y divide-line border-y border-line">
            {([
              ['Posted to accepted', m.median_minutes_to_accept, 'No mission has been accepted yet.'],
              ['Accepted to started', m.median_minutes_to_start, 'No mission has been started yet.'],
              ['Started to completed', m.median_minutes_to_complete, 'No mission has been completed yet.'],
            ] as const).map(([k, val, none]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 py-3.5">
                <dt className="text-sm text-sand">{k}</dt>
                <dd className="text-right">
                  {val == null ? <span className="text-sm text-stone">{none}</span> : <span className="numeral text-3xl leading-none">{formatMinutes(val)}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </figure>

        <section className="panel p-5 sm:p-6 lg:col-span-2" aria-labelledby="people-heading">
          <h3 id="people-heading" className="text-2xl leading-tight">People helped: two different counts</h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-stone">
            These measure different things and must not be added together. The same rescue can appear in both, and several phones
            can report the same rescue.
          </p>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <Pill tone="gold">Confirmed by responders</Pill>
              <p className="numeral text-5xl leading-none">{fmt(p.helped_by_missions)}</p>
              <p className="text-sm leading-relaxed text-sand">
                People helped, as entered by the responder who closed each completed mission.
                {m.completed ? ` Across ${plural(m.completed, 'completed mission')}.` : ' No missions have been completed yet, so nothing has been confirmed.'}
              </p>
            </div>
            <div className="space-y-3">
              <Pill tone="warn">Unverified field reports</Pill>
              <p className="numeral text-5xl leading-none">{fmt(p.rescues_reported)}</p>
              <p className="text-sm leading-relaxed text-sand">
                People reported rescued in mesh and website field reports. Nobody has checked these individually.
                {mesh.events ? '' : ' No field reports have been received yet.'}
              </p>
              {p.trapped_reported + p.missing_reported > 0 && (
                <p className="text-xs text-stone">
                  Field reports also mention {plural(p.trapped_reported, 'person', 'people')} trapped and {plural(p.missing_reported, 'person', 'people')} missing (unverified).
                </p>
              )}
            </div>
          </div>
        </section>

        <ChartCard title="Field reports: from phone to mission"
          note="Reports and situation updates that reached the server over the Volentify Mesh relay or the website."
          empty={mesh.events ? null : 'No field reports have reached the server yet.'}
          table={{ head: ['Stage', 'Reports'], rows: [
            ['Received', mesh.events], ['Looked at by a person', reviewed], ['Turned into missions', mesh.promoted],
            ['Rejected as false or duplicate', mesh.rejected], ['Waiting for review', mesh.unreviewed],
          ] }}
          footer={mesh.events ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-sm">
              <div><dt className="text-xs text-stone">Rejected as false</dt><dd className="tabular-nums text-ivory">{fmt(mesh.rejected)}</dd></div>
              <div><dt className="text-xs text-stone">Waiting for review</dt><dd className="tabular-nums text-ivory">{fmt(mesh.unreviewed)}</dd></div>
              <div><dt className="text-xs text-stone">Median relay delay</dt><dd className="text-ivory">{formatMinutes(mesh.median_relay_minutes)}</dd></div>
              <div><dt className="text-xs text-stone">Phones that reported</dt><dd className="tabular-nums text-ivory">{fmt(mesh.phones_reporting)}</dd></div>
            </dl>
          ) : undefined}>
          <FunnelBars label="Field reports by review stage" stages={[
            { label: 'Received', value: mesh.events, note: mesh.messages ? `Includes ${plural(mesh.messages, 'situation update')}.` : undefined },
            { label: 'Looked at by a person', value: reviewed },
            { label: 'Turned into missions', value: mesh.promoted },
          ]} />
          <p className="mt-4 text-xs leading-relaxed text-stone">
            Relay delay is the time between the observation on the ground and its arrival at the server, which can be long when
            phones carry a report hop by hop until one finds a signal.
          </p>
        </ChartCard>

        <figure className="panel flex flex-col gap-5 p-5 sm:p-6">
          <figcaption className="space-y-1">
            <h3 className="text-2xl leading-tight">Volunteers</h3>
            <p className="text-sm leading-relaxed text-stone">Responder profiles on the platform. Verified means an administrator has checked the account.</p>
          </figcaption>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6">
            <Stat label="Registered" value={fmt(v.registered)} note={v.registered ? `${fmt(v.verified)} verified` : 'None yet'} />
            <Stat label="Available now" value={fmt(v.available)} note={`${fmt(v.busy)} busy · ${fmt(v.off_duty)} off duty`} />
            <Stat label="Average rating" value={v.average_rating == null ? '—' : v.average_rating.toFixed(1)}
              note={v.reviews ? `out of 5, from ${plural(v.reviews, 'review')}` : 'No reviews yet'} />
            <Stat label="Mesh phones active" value={fmt(mesh.nodes_active)} note={`seen in the last 30 min, of ${fmt(mesh.nodes)} known`} />
          </dl>
        </figure>

        <ChartCard className="lg:col-span-2" title="Missions created and completed, by month"
          note={`${period}. Completed missions are counted in the month they were closed.`}
          empty={sum(m.created_monthly) + sum(m.completed_monthly) ? null : 'No missions were created or completed in the last 12 months.'}
          table={{ head: ['Month', 'Created', 'Completed'], rows: monthly.map((x) => [x.tip, x.a, x.b]) }}>
          <GroupedColumns data={monthly} a={{ name: 'Created', color: SERIES.a }} b={{ name: 'Completed', color: SERIES.b }} />
        </ChartCard>

        <ChartCard title="Field reports observed, by month" note="By the time of the observation on the ground."
          empty={sum(mesh.monthly) ? null : 'No field reports in the last 12 months.'}
          table={{ head: ['Month', 'Reports'], rows: meshMonthly.map((x) => [x.tip!, x.value]) }}>
          <Columns data={meshMonthly} name="field reports" />
        </ChartCard>

        <ChartCard title="Incidents tracked, by month" note="By when the incident entered the register, from live feeds or incident command."
          empty={sum(r.incidents.monthly) ? null : 'No incidents entered the register in the last 12 months.'}
          table={{ head: ['Month', 'Incidents'], rows: incidentMonthly.map((x) => [x.tip!, x.value]) }}>
          <Columns data={incidentMonthly} name="incidents" />
        </ChartCard>
      </section>

      <p className="page pb-10 text-sm text-stone">
        How these figures are counted, what data Volentify keeps and how to ask for more is set out on the{' '}
        <Link href="/transparency" className="link">transparency page</Link>.
      </p>
    </>
  );
}
