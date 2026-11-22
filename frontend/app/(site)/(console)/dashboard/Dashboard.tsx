'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { ROLE_META } from '@/lib/constants';
import { useSession } from '@/lib/session';
import { MusterPass } from '@/components/auth/MusterPass';
import { Pill } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/DataState';
import { PageHeader } from '@/components/ui/Page';
import { CitizenDesk } from './CitizenDesk';
import { VolunteerDesk } from './VolunteerDesk';

const DENIED: Record<string, string> = {
  admin: 'Administration is limited to verified incident command accounts.',
  agency: 'The command hub is limited to verified incident command and NGO accounts.',
};

export default function Dashboard() {
  const { user, status } = useSession();
  const denied = useSearchParams().get('denied');

  if (status === 'loading' || !user) {
    return <div className="page space-y-6 py-20"><Skeleton className="h-14 w-1/2" /><Skeleton className="h-72" /></div>;
  }

  const elevated = user.role === 'INCIDENT_ADMIN' || user.role === 'NGO_MEMBER';
  const links = [
    ...(elevated ? [{ href: '/agency', label: 'Open command hub', blurb: 'Review mesh reports, create missions and run dispatch.' }] : []),
    ...(user.role === 'INCIDENT_ADMIN' ? [{ href: '/admin', label: 'Administration', blurb: 'Verify accounts, manage roles and check system health.' }] : []),
    ...(user.role === 'RESEARCHER' || elevated ? [{ href: '/predictions', label: 'Forecasts', blurb: 'Storm-surge model and multilingual triage.' }] : []),
    ...(user.role === 'RESEARCHER' ? [{ href: '/analytics', label: 'Analytics', blurb: 'Operational picture across incidents.' }] : []),
    { href: '/map', label: 'Tactical map', blurb: 'Incidents, mesh reports and responders in one view.' },
  ];

  return (
    <>
      <PageHeader
        label={`${ROLE_META[user.role].label}${user.state_district ? ` in ${user.state_district}` : ''}`}
        title={`Good to see you, ${user.name.split(' ')[0]}.`}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            {user.is_verified ? <Pill tone="gold" dot>Verified</Pill> : <Pill tone="warn" dot>Awaiting verification</Pill>}
            <Pill>{user.email}</Pill>
          </div>
        }
        actions={<ButtonLink href="/onboarding" variant="secondary">Edit profile</ButtonLink>}
      />

      {denied && DENIED[denied] && (
        <div className="page">
          <div className="flex items-start gap-3 rounded-2xl border border-moderate/30 bg-moderate/[0.06] p-4 text-sm text-sand" role="alert">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-moderate" aria-hidden />
            <p>{DENIED[denied]} {!user.is_verified && elevated ? 'Your account is waiting for an administrator to verify it.' : ''}</p>
          </div>
        </div>
      )}

      <div className="page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-10">
          {user.role === 'VOLUNTEER' && <VolunteerDesk />}
          {user.role === 'CITIZEN' && <CitizenDesk user={user} />}
          {user.role !== 'VOLUNTEER' && user.role !== 'CITIZEN' && (
            <div>
              <h2 className="mb-5 text-[1.75rem]">Where to next</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="block h-full rounded-2xl border border-line p-5 transition-colors hover:border-line-strong hover:bg-ivory/[0.02]">
                      <span className="block font-serif text-2xl text-ivory">{l.label}</span>
                      <span className="mt-1 block text-sm text-stone">{l.blurb}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <aside className="space-y-4">
          <h2 className="text-[1.75rem]">Muster pass</h2>
          {user.muster
            ? <MusterPass pass={user.muster} phone={user.phone} bloodGroup={user.blood_group} district={user.state_district} />
            : <p className="text-sm text-stone">Finish <Link href="/onboarding" className="link">onboarding</Link> to receive your pass.</p>}
        </aside>
      </div>
    </>
  );
}
