import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, ChevronRight, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/Page';
import reference from '@/lib/reference-data.json';
import ReferenceLibrary, { type Guideline, type Paper } from './ReferenceLibrary';
import ResourceDirectory from './ResourceDirectory';

export const metadata: Metadata = {
  title: 'Emergency resources',
  description: 'National helplines, the nearest hospitals and relief shelters to an active incident or to you, and the guidelines and research behind disaster response in India.',
};

const JUMPS = [
  { href: '#helplines', label: 'Helplines' },
  { href: '#nearest', label: 'Nearest help' },
  { href: '#research', label: 'Research and guidelines' },
  { href: '#prepare', label: 'Prepare' },
];

const PREPARE = [
  { href: '/knowledge', icon: BookOpen, title: 'Prepare your household',
    body: 'Before, during and after checklists for cyclones, floods, landslides, heatwaves, earthquakes and fire.' },
  { href: '/safety', icon: ShieldCheck, title: 'Platform safety rules',
    body: 'How reports are checked, what volunteers should and should not do, and how to stay safe while helping.' },
];

export default function ResourcesPage() {
  // Only the two lists the page renders go to the client, not the whole reference file.
  const guidelines: Guideline[] = reference.guidelines;
  const papers: Paper[] = reference.papers;

  return (
    <>
      <PageHeader
        label="Emergency resources"
        title="Help, close at hand"
        lede="National helplines, the nearest hospitals and relief shelters to an active incident or to you, and the guidelines and research behind disaster response in India."
        meta={
          <nav aria-label="On this page" className="flex flex-wrap gap-2">
            {JUMPS.map((j) => (
              <a key={j.href} href={j.href} className="rounded-full px-3 py-1.5 text-[0.8125rem] text-sand ring-1 ring-inset ring-line-strong transition-colors hover:text-ivory hover:ring-ivory/30">
                {j.label}
              </a>
            ))}
          </nav>
        }
      />

      <ResourceDirectory />
      <ReferenceLibrary guidelines={guidelines} papers={papers} />

      <section id="prepare" aria-labelledby="prepare-title" className="page scroll-mt-24 pb-20 pt-6">
        <h2 id="prepare-title" className="sr-only">Prepare</h2>
        <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {PREPARE.map(({ href, icon: Icon, title, body }) => (
            <li key={href} className="bg-ink">
              <Link href={href} className="group flex h-full items-center gap-4 p-5 transition-colors hover:bg-ink-900 focus-visible:bg-ink-900 sm:p-6">
                <Icon className="h-5 w-5 shrink-0 text-stone transition-colors group-hover:text-ivory" aria-hidden />
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block font-serif text-xl text-ivory">{title}</span>
                  <span className="block text-sm text-stone">{body}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ash transition-colors group-hover:text-signal" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
