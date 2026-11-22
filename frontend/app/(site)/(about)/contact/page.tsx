import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/Page';
import ReportForm from './ReportForm';

export const metadata: Metadata = { title: 'Report an incident' };

const HOTLINES = [
  { label: 'National emergency', number: '112' }, { label: 'Ambulance', number: '108' },
  { label: 'Fire', number: '101' }, { label: 'Police', number: '100' },
  { label: 'NDMA control room', number: '1078' }, { label: 'NDRF control room', number: '011-24363260' },
  { label: 'State emergency operations', number: '1070' }, { label: 'District control room', number: '1077' },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        label="Report an incident"
        title="Tell us what you are seeing."
        lede="Reports are triaged instantly in any major Indian language and attached to the nearest active incident for responders to review."
      />
      <div className="page grid gap-14 pb-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ReportForm />
        <aside className="space-y-6">
          <div className="rounded-2xl border border-critical/30 bg-critical/[0.06] p-5">
            <p className="font-serif text-2xl text-ivory">Someone in danger right now?</p>
            <p className="mt-2 text-sm leading-relaxed text-sand">Call emergency services first. This form does not dispatch help.</p>
            <a href="tel:112" className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-critical px-4 text-sm font-medium text-ink hover:bg-critical/85">Call 112</a>
          </div>
          <div>
            <h2 className="mb-3 text-2xl">Helplines</h2>
            <ul className="divide-y divide-line border-y border-line text-sm">
              {HOTLINES.map((h) => (
                <li key={h.number} className="flex items-center justify-between py-2.5">
                  <span className="text-stone">{h.label}</span>
                  <a href={`tel:${h.number}`} className="data text-ivory hover:text-signal">{h.number}</a>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm leading-relaxed text-stone">
            Agencies and NGOs wanting to onboard teams can write to <a href="mailto:gyanvirsingh09@gmail.com" className="link">gyanvirsingh09@gmail.com</a>.
          </p>
        </aside>
      </div>
    </>
  );
}
