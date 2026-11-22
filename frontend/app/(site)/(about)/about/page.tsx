import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/Page';
import { ButtonLink } from '@/components/ui/Button';
import { Prose } from '../_components/Prose';

export const metadata: Metadata = { title: 'About' };

const PRINCIPLES = [
  { title: 'Offline first', body: 'Field reports are created and kept on the phone, relayed over Bluetooth and only marked confirmed once the server acknowledges them.' },
  { title: 'Provenance always visible', body: 'Every list says whether it comes from the live database or a cached dataset, and every mesh report stays marked unverified until command reviews it.' },
  { title: 'Deterministic where lives depend on it', body: 'Triage and dispatch run on classifiers and transparent scoring, not generated text. Language models only summarise, and only with a fallback.' },
  { title: 'Built to complement, not replace', body: 'Volentify supports NDRF, SDMAs and district control rooms. It never replaces 112 or the incident command system.' },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        label="About Volentify"
        title="Technology that keeps working when everything else stops."
        lede="Volentify is an open-source platform for disaster intelligence and volunteer coordination in India, built for the hours when cell towers are down and decisions cannot wait."
      />
      <section className="page grid gap-16 pb-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Prose>
          <p>
            In a major disaster the first reports rarely come from official channels. They come from neighbours, volunteers and
            passers-by — on WhatsApp, on radio, by word of mouth — and they arrive scattered, duplicated and often after the
            network has already failed. Meanwhile, spontaneous volunteers turn up at relief camps with skills nobody has time to
            match to the work.
          </p>
          <p>
            Volentify brings those threads together. The <strong>web platform</strong> gives incident commanders a live map of
            hazards, missions, responders, hospitals and shelters. <strong>Volentify Mesh</strong>, a companion Android app,
            lets volunteers file structured reports with no signal at all and relay them phone to phone until one reaches the
            internet. A set of <strong>forecasting and triage models</strong> estimates storm surge, reads distress messages in
            Indian languages and corroborates reports across sources. The <strong>dispatch engine</strong> then sends the right
            person to each mission, protecting scarce specialists from generic work.
          </p>
          <h2>Who it is for</h2>
          <ul>
            <li><strong>Volunteers</strong> — register skills and equipment once, see missions near you, report from the field offline.</li>
            <li><strong>Citizens</strong> — district alerts, priority evacuation for households with infants, elderly or medical dependencies.</li>
            <li><strong>NGOs</strong> — publish relief quotas and fleet assets, request volunteers, coordinate with command.</li>
            <li><strong>Incident command</strong> — broadcast alerts, review field reports, run dispatch and read situation briefings.</li>
            <li><strong>Researchers</strong> — analytical access to evidence and forecasts.</li>
          </ul>
          <h2>Open source</h2>
          <p>
            The platform is released under the MIT licence. The source, schema and API reference are public at{' '}
            <a href="https://github.com/Gyanvir/Volentify">github.com/Gyanvir/Volentify</a>.
          </p>
        </Prose>
        <aside className="space-y-8 lg:pt-1">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="border-t border-line pt-5">
              <h3 className="mb-2 text-2xl">{p.title}</h3>
              <p className="text-sm leading-relaxed text-stone">{p.body}</p>
            </div>
          ))}
          <div className="flex flex-wrap gap-3 pt-2">
            <ButtonLink href="/register">Join the network</ButtonLink>
            <ButtonLink href="/research" variant="secondary">Read the research</ButtonLink>
          </div>
        </aside>
      </section>
    </>
  );
}
