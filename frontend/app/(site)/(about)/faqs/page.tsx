import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/Page';

export const metadata: Metadata = { title: 'Questions' };

const GROUPS: { title: string; items: { q: string; a: React.ReactNode }[] }[] = [
  { title: 'Using Volentify in an emergency', items: [
    { q: 'Is Volentify an emergency service?', a: <>No. If someone is in danger, call <a href="tel:112" className="link">112</a>. Volentify helps responders coordinate; it does not dispatch police, fire or ambulance.</> },
    { q: 'How do I report something I can see?', a: <>Use the <Link href="/contact" className="link">incident report form</Link>, or the Volentify Mesh app if you have no signal. Reports are triaged automatically and linked to the nearest active incident.</> },
    { q: 'What does the dashed ring on a map marker mean?', a: 'It is a field report that no incident controller has reviewed yet. Treat it as an unverified observation until the ring turns solid.' },
  ] },
  { title: 'Volentify Mesh and offline use', items: [
    { q: 'How does a report travel without internet?', a: 'The app saves it on your phone, then passes it to nearby phones running Volentify Mesh over Bluetooth Low Energy. Each phone stores and forwards it, up to five hops, until one with internet uploads it.' },
    { q: 'How do I know command has received my report?', a: 'Each report shows its status: Saved locally, Relayed, Syncing, Server-confirmed or Failed. Only Server-confirmed means it is stored on the platform. Until then it stays in your outbox and keeps retrying.' },
    { q: 'Can the same report be counted twice?', a: 'No. Every report carries a unique ID created on the original phone. Relays and the server discard copies with an ID they have already seen.' },
    { q: 'Does it drain my battery or use my contacts?', a: 'Relaying uses Bluetooth scanning at conservative intervals. The app never reads contacts and identifies your phone by a random ID, not its hardware address.' },
  ] },
  { title: 'Accounts, roles and verification', items: [
    { q: 'Why do you need my mobile number?', a: 'A 10-digit mobile is required so district authorities can reach you with emergency broadcasts and, for volunteers, mission call-outs.' },
    { q: 'What is a muster pass?', a: 'A signed digital credential issued when you finish onboarding. Field teams can check the code and signature to confirm who you are and what role you hold.' },
    { q: 'Why is my NGO or command account “awaiting verification”?', a: 'NGO and incident-command roles can see sensitive casualty details and create missions, so an administrator verifies them before those tools unlock.' },
    { q: 'Who can see details about trapped or missing people?', a: 'Only verified NGO and incident-command accounts. Everyone else sees that a report exists, its type and location, but not the casualty details.' },
  ] },
  { title: 'Data and models', items: [
    { q: 'Where does the map data come from?', a: 'Incidents, missions and reports come from the Volentify database. Imagery comes from NASA GIBS and Esri, radar from RainViewer, bulletins from NDMA SACHET, and infrastructure from OpenStreetMap.' },
    { q: 'What happens if the database is unreachable?', a: 'Reading pages switch to a cached dataset and say so. Field-report uploads are refused rather than accepted into temporary memory, so phones keep them and retry.' },
    { q: 'Do language models make decisions?', a: 'No. Triage and dispatch are deterministic. Gemini, when configured, only summarises corroborated evidence and always has a non-AI fallback.' },
  ] },
];

export default function FaqsPage() {
  return (
    <>
      <PageHeader label="Questions" title="How Volentify works, plainly." />
      <div className="page grid gap-14 pb-10 lg:grid-cols-[14rem_1fr]">
        <nav className="hidden lg:block" aria-label="Question topics">
          <ul className="sticky top-28 space-y-2 text-sm">
            {GROUPS.map((g, i) => <li key={g.title}><a href={`#topic-${i}`} className="text-stone hover:text-ivory">{g.title}</a></li>)}
          </ul>
        </nav>
        <div className="space-y-14">
          {GROUPS.map((g, i) => (
            <section key={g.title} id={`topic-${i}`} className="scroll-mt-28">
              <h2 className="mb-4 text-[2rem]">{g.title}</h2>
              <div className="divide-y divide-line border-y border-line">
                {g.items.map((item) => (
                  <details key={item.q} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[1.0625rem] text-ivory">
                      {item.q}
                      <span className="mt-1 text-stone transition-transform group-open:rotate-45" aria-hidden>+</span>
                    </summary>
                    <p className="mt-3 max-w-[68ch] leading-[1.75] text-stone">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
