import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/Page';
import ImageryCatalogue from './ImageryCatalogue';
import Bulletins from './Bulletins';
import DedupTool from './DedupTool';

export const metadata: Metadata = { title: 'Satellite & bulletins' };

export default function DisasterIntelligencePage() {
  return (
    <>
      <PageHeader
        label="Intelligence"
        title="Satellite imagery, official bulletins and report corroboration."
        lede="See the ground from orbit with live incidents and field reports on top, read the warnings authorities have in force, and collapse overlapping reports into the incidents behind them."
      />
      <ImageryCatalogue />
      <Bulletins />
      <DedupTool />
    </>
  );
}
