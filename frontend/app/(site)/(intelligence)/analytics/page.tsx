import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/Page';
import { LoadingRows } from '@/components/ui/DataState';
import AnalyticsBoard from './AnalyticsBoard';

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Live operations, missions and people helped, and past disasters in India, computed from Volentify’s own records and public hazard feeds.',
};

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        label="Analytics"
        title="The operational picture, in numbers."
        lede={
          <>
            Every figure is computed from the platform’s own records (incidents, missions, responders and field reports) or taken
            from named public feeds. Nothing is projected or estimated, and unverified reports are labelled as such. How we count,
            what we keep and how to ask for more is on the <Link href="/transparency" className="link">transparency page</Link>.
          </>
        }
      />
      <Suspense fallback={<div className="page pb-10"><LoadingRows rows={3} /></div>}>
        <AnalyticsBoard />
      </Suspense>
    </>
  );
}
