'use client';

import { BadgeCheck, Mail, Phone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApi } from '@/lib/api';
import type { Organization } from '@/lib/types';
import { Section } from '@/components/ui/Page';
import { Segmented } from '@/components/ui/Field';
import { EmptyState, ErrorState, LoadingRows, SourceTag } from '@/components/ui/DataState';

const CATEGORY_LABEL: Record<string, string> = {
  NDRF: 'National force', SDRF: 'State authority', RED_CROSS: 'Red Cross', LOCAL_NGO: 'NGO', CIVIL_DEFENSE: 'Civil defence',
};

export default function PartnerDirectory() {
  const { data, error, loading, source, reload } = useApi<Organization[]>('/api/organizations');
  const [filter, setFilter] = useState<'all' | 'government' | 'ngo'>('all');
  const rows = useMemo(() => (data ?? []).filter((o) => filter === 'all'
    || (filter === 'government' ? ['NDRF', 'SDRF', 'CIVIL_DEFENSE'].includes(o.category) : ['RED_CROSS', 'LOCAL_NGO'].includes(o.category))), [data, filter]);

  return (
    <Section
      actions={<div className="flex items-center gap-4"><SourceTag source={source} />
        <Segmented ariaLabel="Organisation type" size="sm" value={filter} onChange={setFilter}
          options={[{ value: 'all', label: 'All' }, { value: 'ngo', label: 'NGOs' }, { value: 'government', label: 'Government' }]} /></div>}
    >
      {loading ? <LoadingRows rows={3} /> : error ? <ErrorState message={error.message} onRetry={reload} />
        : !rows.length ? <EmptyState title="No organisations match" /> : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((o) => (
              <li key={o.id} className="panel flex flex-col gap-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-2xl leading-snug">{o.name}</h3>
                  {o.verified && <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-gold" aria-label="Verified" />}
                </div>
                <p className="text-sm text-stone">{CATEGORY_LABEL[o.category] ?? o.category} · {o.district}, {o.state}</p>
                {o.registration_no && <p className="code">{o.registration_no}</p>}
                <div className="mt-auto flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
                  <a href={`tel:${o.contact_phone}`} className="inline-flex items-center gap-2 text-sand hover:text-ivory"><Phone className="h-3.5 w-3.5 text-stone" aria-hidden />{o.contact_phone}</a>
                  <a href={`mailto:${o.contact_email}`} className="inline-flex items-center gap-2 text-sand hover:text-ivory"><Mail className="h-3.5 w-3.5 text-stone" aria-hidden />{o.contact_email}</a>
                </div>
              </li>
            ))}
          </ul>
        )}
    </Section>
  );
}
