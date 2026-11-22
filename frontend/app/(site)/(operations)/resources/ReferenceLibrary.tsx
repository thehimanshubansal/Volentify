'use client';

import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Paper { title: string; authors: string; year: number; venue: string; url: string; topic: string; why: string }
export interface Guideline { title: string; publisher: string; year: number | null; url: string; why: string }

function TitleLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group text-[0.9375rem] leading-snug text-ivory transition-colors hover:text-signal">
      {children}
      <ExternalLink className="ml-1.5 inline h-3.5 w-3.5 -translate-y-px text-ash transition-colors group-hover:text-signal" aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Entry({ year, title, href, byline, venue, why }: { year: string; title: string; href: string; byline: string; venue?: string; why: string }) {
  return (
    <li className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3 py-5 sm:grid-cols-[4rem_minmax(0,1fr)]">
      <span className="code pt-1">{year}</span>
      <div className="space-y-1.5">
        <TitleLink href={href}>{title}</TitleLink>
        <p className="text-xs text-stone">{byline}{venue && <> · <span className="italic">{venue}</span></>}</p>
        <p className="text-sm leading-relaxed text-sand">{why}</p>
      </div>
    </li>
  );
}

/** Official guidelines and law, then peer-reviewed research grouped by topic (lib/reference-data.json). */
export default function ReferenceLibrary({ guidelines, papers }: { guidelines: Guideline[]; papers: Paper[] }) {
  const topics = useMemo(() => {
    const order: string[] = [];
    for (const p of papers) if (!order.includes(p.topic)) order.push(p.topic);
    return order.map((t) => ({ topic: t, items: papers.filter((p) => p.topic === t).sort((a, b) => b.year - a.year) }));
  }, [papers]);
  const [topic, setTopic] = useState<string | null>(null);
  const shown = topic ? topics.filter((t) => t.topic === topic) : topics;

  const chip = (on: boolean) => cn('rounded-full px-3 py-1.5 text-[0.8125rem] ring-1 ring-inset transition-colors',
    on ? 'bg-signal/[0.12] text-ivory ring-signal/60' : 'text-sand ring-line-strong hover:text-ivory hover:ring-ivory/30');

  return (
    <section id="research" aria-labelledby="research-title" className="page scroll-mt-24 py-10">
      <div className="mb-8 space-y-1.5">
        <h2 id="research-title" className="text-[1.75rem] leading-tight sm:text-[2rem]">Research and guidelines</h2>
        <p className="max-w-2xl text-sm text-stone">
          The laws, plans and standards Indian disaster response runs on, and the peer-reviewed research behind how Volentify works.
          Every link opens the publisher’s own copy.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h3 className="mb-1 text-2xl">Official guidelines and law <span className="font-sans text-sm text-stone">{guidelines.length}</span></h3>
          <p className="mb-3 text-xs text-stone">NDMA plans and guidelines, the acts that govern response, alerting and data, and humanitarian standards.</p>
          <ul className="divide-y divide-line border-y border-line">
            {guidelines.map((g) => (
              <Entry key={g.url} year={g.year != null ? String(g.year) : 'Current'} title={g.title} href={g.url} byline={g.publisher} why={g.why} />
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-1 text-2xl">Research papers <span className="font-sans text-sm text-stone">{papers.length}</span></h3>
          <p className="mb-4 text-xs text-stone">Grouped by topic, newest first.</p>
          <div role="group" aria-label="Filter papers by topic" className="mb-2 flex flex-wrap gap-2">
            <button type="button" aria-pressed={topic === null} onClick={() => setTopic(null)} className={chip(topic === null)}>
              All <span className="text-stone">{papers.length}</span>
            </button>
            {topics.map((t) => (
              <button key={t.topic} type="button" aria-pressed={topic === t.topic} onClick={() => setTopic(topic === t.topic ? null : t.topic)} className={chip(topic === t.topic)}>
                {t.topic} <span className="text-stone">{t.items.length}</span>
              </button>
            ))}
          </div>
          {shown.map((t) => (
            <div key={t.topic} className="pt-6">
              <h4 className="eyebrow mb-1">{t.topic}</h4>
              <ul className="divide-y divide-line border-y border-line">
                {t.items.map((p) => (
                  <Entry key={p.url} year={String(p.year)} title={p.title} href={p.url} byline={p.authors} venue={p.venue} why={p.why} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
