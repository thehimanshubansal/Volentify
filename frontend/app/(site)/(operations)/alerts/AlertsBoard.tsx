'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ExternalLink, MapPin, Megaphone } from 'lucide-react';
import { useApi } from '@/lib/api';
import { SEVERITY_META } from '@/lib/constants';
import { useSession } from '@/lib/session';
import type { Alert, Severity } from '@/lib/types';
import { cn, formatDateTime, SEVERITY_ORDER, timeAgo } from '@/lib/utils';
import { Pill, SeverityBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingRows, SourceTag } from '@/components/ui/DataState';
import { PageHeader, Section } from '@/components/ui/Page';
import { FilterChips } from '@/components/operations/FilterChips';
import { FeedPill, OfficialWarnings, useOfficialWarnings } from '@/components/operations/OfficialWarnings';

export default function AlertsBoard() {
  const { user } = useSession();
  const { data, error, loading, source, reload } = useApi<Alert[]>('/api/alerts', { refreshMs: 60_000 });
  const official = useOfficialWarnings(60);
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState<Severity | ''>('');
  const [kind, setKind] = useState<'' | 'BROADCAST' | 'AUTO'>('');

  const everything = useMemo(() => data ?? [], [data]);
  const all = useMemo(() => everything.filter((a) => !kind || (a.kind ?? 'BROADCAST') === kind), [everything, kind]);
  const broadcasts = everything.filter((a) => (a.kind ?? 'BROADCAST') === 'BROADCAST').length;
  const categories = useMemo(() => Array.from(new Set(all.map((a) => a.category))).sort(), [all]);
  const alerts = useMemo(() => all
    .filter((a) => (!category || a.category === category) && (!level || a.level === level))
    .sort((a, b) => SEVERITY_ORDER[a.level] - SEVERITY_ORDER[b.level] || Date.parse(b.created_at) - Date.parse(a.created_at)),
  [all, category, level]);
  const canBroadcast = user?.role === 'INCIDENT_ADMIN' && user.is_verified;

  return (
    <>
      <PageHeader
        label="Public alerts"
        title="What to do, where, right now"
        lede="Advisories broadcast by Volentify incident command, and the official warnings in force from IMD, CWC, INCOIS and state authorities. If one covers your area, follow its advice first and call 112 if anyone is in danger."
        actions={canBroadcast
          ? <ButtonLink href="/agency"><Megaphone className="h-4 w-4" aria-hidden />Broadcast an alert</ButtonLink>
          : <ButtonLink href="tel:112" variant="danger">Call 112</ButtonLink>}
        meta={<SourceTag source={source} />}
      />
      <Section className="pt-0" title="Volentify advisories"
        description="Alerts broadcast by verified incident commanders on this platform, and automated safety advice for every live incident affecting India. Automated advisories are guidance generated from GDACS, USGS and NASA data — never an official warning.">
        <div className="mb-8 flex flex-col gap-3 border-y border-line py-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8">
          <FilterChips<'' | 'BROADCAST' | 'AUTO'> label="From" value={kind} onChange={setKind} options={[
            { value: '', label: 'All', count: everything.length },
            { value: 'BROADCAST', label: 'Incident command', count: broadcasts },
            { value: 'AUTO', label: 'Automated', count: everything.length - broadcasts },
          ]} />
          <FilterChips<Severity | ''> label="Level" value={level} onChange={setLevel} options={[
            { value: '', label: 'All' },
            ...(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const)
              .map((s) => ({ value: s, label: SEVERITY_META[s].label, count: all.filter((a) => a.level === s).length }))
              .filter((o) => o.count > 0),
          ]} />
          <FilterChips label="Hazard" value={category} onChange={setCategory}
            options={[{ value: '', label: 'All' }, ...categories.map((c) => ({ value: c, label: c }))]} />
        </div>

        {loading && !data ? <LoadingRows rows={4} />
          : error ? <ErrorState message={error.message} onRetry={reload} />
          : all.length === 0 ? (
            <EmptyState title={kind === 'BROADCAST' ? 'No command broadcasts in force' : 'No advisories right now'}
              body={kind === 'BROADCAST' ? 'Incident command has not broadcast an alert. Automated advisories and official warnings are still listed.'
                : 'No live incident is affecting India at the moment, and command has not broadcast an alert. Check the official warnings below.'} />
          ) : alerts.length === 0 ? (
            <EmptyState title="No alerts match these filters" body="There are no advisories at this level or for this hazard right now." />
          ) : (
            <ul className="space-y-5">
              {alerts.map((a) => (
                <li key={a.id} className={cn('grid gap-6 rounded-2xl border bg-ink-900 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]',
                  a.level === 'CRITICAL' ? 'border-critical/30' : 'border-line')}>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <SeverityBadge level={a.level} />
                      {a.kind === 'AUTO' ? <Pill>Automated · {a.source ?? 'live feed'}</Pill> : <Pill tone="gold">Volentify command</Pill>}
                      <span className="text-[0.8125rem] text-sand">{a.category}</span>
                      <time className="text-xs text-stone" dateTime={a.created_at} title={formatDateTime(a.created_at)}>{timeAgo(a.created_at)}</time>
                    </div>
                    <h2 className="text-[1.85rem] leading-tight">{a.title}</h2>
                    <p className="flex items-center gap-1.5 text-sm text-sand"><MapPin className="h-4 w-4 text-stone" aria-hidden />{a.location}, {a.state}</p>
                    <p className="text-sm leading-relaxed text-stone">{a.description}</p>
                    <div className="flex items-center gap-4 pt-1 text-xs">
                      <span className="code">{a.code}</span>
                      {a.disaster_id && <Link href={`/disasters/${a.disaster_id}`} className="link text-[0.8125rem]">Incident dossier</Link>}
                      {a.source_url && <a href={a.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[0.8125rem] text-stone hover:text-ivory">Source <ExternalLink className="h-3 w-3" aria-hidden /></a>}
                    </div>
                  </div>
                  <div className={cn('flex flex-col justify-center rounded-xl p-5 sm:p-6',
                    a.level === 'CRITICAL' ? 'bg-critical/[0.07]' : 'bg-ivory/[0.03]')}>
                    <p className={cn('mb-2 text-[0.8125rem] font-medium', SEVERITY_META[a.level].text)}>{a.kind === 'AUTO' ? 'What to do (general guidance)' : 'What to do'}</p>
                    <p className="font-serif text-[1.5rem] leading-snug text-ivory sm:text-[1.65rem]">{a.advisory}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Section>
      <Section title="Official warnings in force" description="Common Alerting Protocol messages published through NDMA SACHET. Expired warnings are removed automatically."
        actions={<FeedPill feed={official.data} />}>
        <OfficialWarnings feed={official} limit={30} />
      </Section>
    </>
  );
}
