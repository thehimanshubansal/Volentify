import type { Metadata } from 'next';
import { PageHeader, Section } from '@/components/ui/Page';
import { ButtonLink } from '@/components/ui/Button';
import PartnerDirectory from './PartnerDirectory';

export const metadata: Metadata = { title: 'NGO partners' };

const ROLE = [
  { title: 'Publish relief capacity', body: 'Declare daily quotas — meals, drinking water, shelter beds, mobile medical vans — and the fleet behind them, so command can plan around real numbers.' },
  { title: 'Request volunteers', body: 'Create missions against an active incident. The dispatch engine fills them with the closest qualified, available responders.' },
  { title: 'See the full field picture', body: 'Verified NGO accounts see casualty details in mesh reports and can mark reports reviewed or promote them to missions.' },
];

export default function NgoPartnersPage() {
  return (
    <>
      <PageHeader
        label="NGO partners"
        title="Relief organisations working on the platform."
        lede="Verified agencies and NGOs coordinating through Volentify, and what partnership involves."
        actions={<ButtonLink href="/register">Register your organisation</ButtonLink>}
      />
      <PartnerDirectory />
      <Section title="What partners do here">
        <div className="grid gap-10 border-t border-line pt-8 md:grid-cols-3">
          {ROLE.map((r) => (
            <div key={r.title} className="space-y-2">
              <h3 className="text-2xl">{r.title}</h3>
              <p className="text-sm leading-relaxed text-stone">{r.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 max-w-[68ch] text-sm leading-relaxed text-stone">
          Sign up and choose “NGO partner” during onboarding with your NGO Darpan registration ID. An administrator verifies the
          account before mission creation and casualty details unlock.
        </p>
      </Section>
    </>
  );
}
