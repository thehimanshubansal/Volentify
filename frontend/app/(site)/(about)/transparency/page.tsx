import type { Metadata } from 'next';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/Page';
import { LegalMeta } from '../_components/Prose';
import TransparencyView from './TransparencyView';

export const metadata: Metadata = {
  title: 'Transparency',
  description: 'Volentify’s voluntary proactive disclosure, modelled on RTI Act 2005 s.4(1)(b): live accountability figures, how decisions are made, what data is kept and for how long, and how to request information.',
};

export default function TransparencyPage() {
  return (
    <>
      <PageHeader
        label="Transparency"
        title="What we do, what we hold, and how to ask."
        lede="A proactive disclosure modelled on Section 4(1)(b) of the Right to Information Act, 2005. Volentify is an independent platform, not a public authority under the Act, so it publishes this voluntarily and keeps the figures current from its own records."
        actions={
          <>
            <a href="/api/transparency" download="volentify-transparency.json"
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-line-strong px-4 text-sm font-medium text-ivory transition-colors hover:border-ivory/40 hover:bg-ivory/[0.04]">
              <Download className="h-4 w-4" aria-hidden />Download figures (JSON)
            </a>
            <a href="#request"
              className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-[10px] bg-ivory/[0.06] px-4 text-sm font-medium text-ivory transition-colors hover:bg-ivory/[0.1]">
              Request information
            </a>
          </>
        }
        meta={<LegalMeta updated="2026-11-04" />}
      />
      <TransparencyView />
    </>
  );
}
