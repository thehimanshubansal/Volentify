'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useApi } from '@/lib/api';
import { CATEGORY_HEX } from '@/lib/constants';
import type { Disaster, Severity } from '@/lib/types';
import { SEVERITY_ORDER, timeAgo } from '@/lib/utils';
import { SeverityBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingRows, SourceTag } from '@/components/ui/DataState';
import { PageHeader, Section } from '@/components/ui/Page';
import { FilterChips } from '@/components/operations/FilterChips';

function Telemetry({ d }: { d: Disaster }) {
  const items = [
    d.wind_speed_kmh != null && d.wind_speed_kmh > 0 ? `${d.wind_speed_kmh} km/h wind` : null,
    d.rainfall_mm != null && d.rainfall_mm > 0 ? `${d.rainfall_mm} mm rain` : null,
    d.surge_meters != null ? `${d.surge_meters} m surge` : null,
  ].filter(Boolean) as string[];
  if (!items.length) return <span className="text-ash">No sensor telemetry</span>;
  return <span className="data text-sand">{items.join(' / ')}</span>;
}

export default function IncidentsIndex() {
  const { data, error, loading, source, reload } = useApi<Disaster[]>('/api/disasters');
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [category, setCategory] = useState('');

  const all = data ?? [];
  const categories = useMemo(() => Array.from(new Set(all.map((d) => d.category))).sort(), [all]);
  const rows = useMemo(() => all
    .filter((d) => (!severity || d.severity === severity) && (!category || d.category === category))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || Date.parse(b.updated_at) - Date.parse(a.updated_at)),
  [all, severity, category]);
  const critical = all.filter((d) => d.severity === 'CRITICAL').length;

  return (
    <>
      <PageHeader
        label="Incidents"
        title="Active incidents"
        lede="Cyclones, floods, earthquakes, wildfires and other hazards in and around India, pulled every 15 minutes from GDACS, USGS and NASA EONET and ordered by severity. Open a dossier for the evidence timeline, missions and a situation briefing."
        actions={<ButtonLink href="/map" variant="secondary">View on map</ButtonLink>}
        meta={!loading && data ? (
          <p className="text-sm text-stone">
            <span className="numeral mr-1 text-2xl">{all.length}</span> active, of which
            <span className="numeral mx-1 text-2xl text-critical">{critical}</span> critical
            <SourceTag source={source} className="ml-4 align-middle" />
          </p>
        ) : null}
      />

      <Section className="pt-0">
        <div className="mb-6 flex flex-col gap-3 border-y border-line py-4 lg:flex-row lg:items-center lg:gap-8">
          <FilterChips<Severity | ''> label="Severity" value={severity} onChange={setSeverity} options={[
            { value: '', label: 'All' },
            ...(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((s) => ({
              value: s, label: s.charAt(0) + s.slice(1).toLowerCase(), count: all.filter((d) => d.severity === s).length,
            })).filter((o) => o.count > 0),
          ]} />
          <FilterChips label="Type" value={category} onChange={setCategory}
            options={[{ value: '', label: 'All' }, ...categories.map((c) => ({ value: c, label: c }))]} />
        </div>

        {loading && !data ? <LoadingRows rows={4} />
          : error ? <ErrorState message={error.message} onRetry={reload} />
          : all.length === 0 ? (
            <EmptyState title="No active incidents" body="None of the live hazard feeds (GDACS, USGS, NASA EONET) report an active event in and around India right now." />
          ) : rows.length === 0 ? (
            <EmptyState title="No incidents match these filters" body="Clear a filter to see every active incident."
              action={<button className="link text-sm" onClick={() => { setSeverity(''); setCategory(''); }}>Clear filters</button>} />
          ) : (
            <ol className="divide-y divide-line">
              {rows.map((d) => (
                <li key={d.id}>
                  <Link href={`/disasters/${d.id}`}
                    className="group grid gap-x-8 gap-y-3 py-6 transition-colors hover:bg-ivory/[0.02] sm:px-2 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <SeverityBadge level={d.severity} />
                        <span className="flex items-center gap-1.5 text-[0.8125rem] text-sand">
                          <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_HEX[d.category] ?? '#8d887e' }} aria-hidden />
                          {d.category}
                        </span>
                        <span className="code">{d.code}</span>
                        {d.source && <span className="text-xs text-stone">via {d.source}</span>}
                      </div>
                      <h2 className="font-serif text-[1.75rem] leading-tight group-hover:text-ivory">{d.title}</h2>
                      <p className="text-sm text-stone">{d.location}, {d.state}</p>
                    </div>
                    <div className="space-y-1.5 text-[0.8125rem]">
                      <Telemetry d={d} />
                      <p className="text-stone">{d.affected_pop ? `${d.affected_pop} people affected` : 'Affected population not yet estimated'}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                      <span className="text-xs text-stone">Updated {timeAgo(d.updated_at)}</span>
                      <span className="flex items-center gap-1 text-[0.8125rem] text-ivory">
                        Dossier <ArrowUpRight className="h-3.5 w-3.5 text-stone transition-colors group-hover:text-signal" aria-hidden />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
      </Section>
    </>
  );
}
