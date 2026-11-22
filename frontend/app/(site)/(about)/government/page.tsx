import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/ui/Page';

export const metadata: Metadata = { title: 'Government agencies' };

const AGENCIES = [
  { name: 'National Disaster Management Authority', short: 'NDMA', site: 'https://ndma.gov.in', phone: '1078',
    role: 'Apex body chaired by the Prime Minister. Sets national disaster-management policy and guidelines, and runs the SACHET Common Alerting Protocol system that Volentify reads for official bulletins.' },
  { name: 'National Disaster Response Force', short: 'NDRF', site: 'https://ndrf.gov.in', phone: '011-24363260',
    role: 'Specialist response force of battalions pre-positioned across India for search and rescue, flood water rescue, collapsed-structure and CBRN response.' },
  { name: 'India Meteorological Department', short: 'IMD', site: 'https://mausam.imd.gov.in', phone: null,
    role: 'Forecasts weather and issues cyclone, heavy-rainfall and heatwave warnings, including Doppler weather radar observations and cyclone track bulletins.' },
  { name: 'Indian National Centre for Ocean Information Services', short: 'INCOIS', site: 'https://incois.gov.in', phone: null,
    role: 'Operates the Indian Tsunami Early Warning Centre and issues storm-surge, high-wave and swell-surge alerts for the coast.' },
  { name: 'Central Water Commission', short: 'CWC', site: 'https://cwc.gov.in', phone: null,
    role: 'Monitors river levels at gauge stations across major basins and issues flood forecasts when rivers approach warning and danger levels.' },
  { name: 'National Remote Sensing Centre, ISRO', short: 'NRSC', site: 'https://www.nrsc.gov.in', phone: null,
    role: 'Provides satellite-based flood inundation maps and damage assessment through the Disaster Management Support programme and the Bhuvan geoportal.' },
  { name: 'State Disaster Management Authorities', short: 'SDMAs', site: 'https://ndma.gov.in', phone: '1070',
    role: 'Lead disaster management in each state, run State Emergency Operation Centres and command State Disaster Response Forces. District Emergency Operation Centres answer on 1077.' },
];

export default function GovernmentPage() {
  return (
    <>
      <PageHeader
        label="Government agencies"
        title="The institutions Volentify works alongside."
        lede="India’s disaster-management system is led by government. Volentify supports these agencies with field data and coordination tools — it does not replace them."
      />
      <section className="page pb-10">
        <div className="divide-y divide-line border-y border-line">
          {AGENCIES.map((a) => (
            <article key={a.short} className="grid gap-4 py-8 md:grid-cols-[18rem_1fr_12rem] md:gap-10">
              <div>
                <h2 className="text-[1.75rem] leading-tight">{a.short}</h2>
                <p className="mt-1 text-sm text-stone">{a.name}</p>
              </div>
              <p className="max-w-[68ch] leading-[1.75] text-sand">{a.role}</p>
              <div className="flex flex-col gap-2 text-sm md:items-end">
                {a.phone && <a href={`tel:${a.phone}`} className="text-ivory hover:text-signal">Helpline <span className="data">{a.phone}</span></a>}
                <a href={a.site} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-stone hover:text-ivory">
                  {a.site.replace(/^https?:\/\/(www\.)?/, '')} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-8 max-w-[68ch] text-sm leading-relaxed text-stone">
          For any emergency, call <a href="tel:112" className="link">112</a>. State emergency operation centres answer on 1070 and
          district control rooms on 1077 in most states.
        </p>
      </section>
    </>
  );
}
