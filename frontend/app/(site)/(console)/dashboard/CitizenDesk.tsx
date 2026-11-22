'use client';

import { Phone } from 'lucide-react';
import { useApi } from '@/lib/api';
import type { Alert, User } from '@/lib/types';
import { timeAgo } from '@/lib/utils';
import { SeverityBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingRows } from '@/components/ui/DataState';
import { Stat } from '@/components/ui/Page';

export function CitizenDesk({ user }: { user: User }) {
  const alerts = useApi<Alert[]>('/api/alerts?limit=50', { refreshMs: 60_000 });
  const state = user.state_district?.split(',').at(-1)?.trim().toLowerCase() ?? '';
  const mine = (alerts.data ?? []).filter((a) => !state || a.state.toLowerCase() === state);
  const p = user.profile_data as Record<string, unknown>;
  const deps = Array.isArray(p.medical_dependencies) ? (p.medical_dependencies as string[]) : [];
  const urgent = p.evacuation_status && p.evacuation_status !== 'Safe';

  return (
    <div className="space-y-12">
      <section className={urgent ? 'rounded-2xl border border-critical/40 bg-critical/[0.06] p-6' : 'rounded-2xl border border-line p-6'}>
        <h2 className="text-[1.75rem]">{urgent ? 'You told us you need help.' : 'Need help or seeing danger?'}</h2>
        <p className="mt-2 max-w-xl text-sm text-stone">
          {urgent ? 'Call 112 now if you can. Then report your exact location so nearby responders can be routed to you.'
            : 'Call 112 for any life-threatening emergency. To flag flooding, blocked roads or people in need, send a report.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="tel:112" variant="danger"><Phone className="h-4 w-4" aria-hidden />Call 112</ButtonLink>
          <ButtonLink href="/contact" variant="secondary">Report an incident</ButtonLink>
          <ButtonLink href="/resources" variant="ghost">Find a shelter</ButtonLink>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-[1.75rem]">Your household</h2>
        <div className="grid grid-cols-2 gap-6 rounded-2xl border border-line p-6 sm:grid-cols-4">
          <Stat label="People" value={String(p.household_size ?? '—')} />
          <Stat label="Infants" value={String(p.infants ?? 0)} />
          <Stat label="Elderly" value={String(p.elderly ?? 0)} />
          <Stat label="Status" value={<span className="text-2xl">{String(p.evacuation_status ?? 'Safe')}</span>} />
        </div>
        <p className="text-sm text-stone">Medical dependencies: <span className="text-sand">{deps.length ? deps.join(', ') : 'none recorded'}</span></p>
      </section>

      <section className="space-y-4">
        <h2 className="text-[1.75rem]">Alerts{state ? ` for ${user.state_district?.split(',').at(-1)?.trim()}` : ''}</h2>
        {alerts.loading && !alerts.data ? <LoadingRows rows={2} />
          : alerts.error ? <ErrorState message={alerts.error.message} onRetry={alerts.reload} />
          : mine.length === 0 ? <EmptyState title="No active alerts for your state" body="We’ll show official advisories here as soon as they’re issued." action={<ButtonLink href="/alerts" size="sm" variant="secondary">See all national alerts</ButtonLink>} />
          : (
            <ul className="space-y-3">
              {mine.map((a) => (
                <li key={a.id} className="rounded-2xl border border-line p-5">
                  <div className="flex flex-wrap items-center gap-2"><SeverityBadge level={a.level} /><span className="text-xs text-stone">{a.category} · {timeAgo(a.created_at)}</span></div>
                  <h3 className="mt-2 font-serif text-2xl text-ivory">{a.title}</h3>
                  <p className="mt-1 text-sm text-stone">{a.location}</p>
                  <p className="mt-3 text-sm leading-relaxed text-sand">{a.advisory}</p>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}
