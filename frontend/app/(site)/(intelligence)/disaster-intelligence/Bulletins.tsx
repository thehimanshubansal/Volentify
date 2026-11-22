'use client';

import { Section } from '@/components/ui/Page';
import { FeedPill, OfficialWarnings, useOfficialWarnings } from '@/components/operations/OfficialWarnings';

export default function Bulletins() {
  const feed = useOfficialWarnings(40);
  return (
    <Section
      title="Official bulletins"
      description="Common Alerting Protocol warnings in force, published through NDMA’s SACHET system by IMD, CWC, INCOIS and state authorities. Expired warnings are removed."
      actions={<FeedPill feed={feed.data} />}
    >
      <OfficialWarnings feed={feed} limit={15} />
    </Section>
  );
}
