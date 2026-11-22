'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Globe, MapPin, Newspaper, ShieldAlert, X } from 'lucide-react';
import { useApi } from '@/lib/api';
import type { Bulletin, BulletinFeed } from '@/lib/types';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { Pill, SeverityBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, LoadingRows } from '@/components/ui/DataState';

export function useOfficialWarnings(limit = 40) {
  return useApi<BulletinFeed>(`/api/bhuvan/bulletins?limit=${limit}`, { refreshMs: 300_000 });
}

export function FeedPill({ feed }: { feed: BulletinFeed | undefined }) {
  if (!feed) return null;
  if (feed.mode === 'LIVE') return <Pill tone="good" dot>Live from NDMA SACHET</Pill>;
  if (feed.mode === 'CACHED') return <Pill tone="warn" dot>SACHET unreachable — last copies received</Pill>;
  return <Pill tone="bad" dot>SACHET unreachable</Pill>;
}

const strip = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Generates a targeted Google News search URL for the specific disaster warning and region.
 * Enables users to read real-time journalistic reports, press briefings, and local articles.
 */
export function getNewsSearchUrl(b: {
  title: string;
  event?: string | null;
  area?: string | null;
  source?: string;
  category?: string;
}): string {
  const cleanTitle = b.title
    .replace(/Please follow (?:SDMA|IMD|NDMA) guidelines\.?/gi, '')
    .replace(/[^\w\s-]/g, ' ')
    .trim();
  const raw = [b.event, b.area, cleanTitle].filter(Boolean).join(' ');
  const stopwords = new Set([
    'and', 'the', 'for', 'over', 'with', 'likely', 'very', 'occur', 'next', 'hours',
    'places', 'isolated', 'please', 'follow', 'sdma', 'guidelines', 'weather', 'alert', 'warning', 'mandals',
  ]);
  const words: string[] = [];
  const seen = new Set<string>();
  for (const w of raw.split(/\s+/)) {
    const lower = w.toLowerCase();
    if (w.length > 2 && !stopwords.has(lower) && !seen.has(lower)) {
      seen.add(lower);
      words.push(w);
      if (words.length >= 6) break;
    }
  }
  const query = words.join(' ') || cleanTitle.slice(0, 50) || 'India weather disaster';
  return `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN%3Aen`;
}

/**
 * Modal displaying complete, human-readable bulletin details with safety advice,
 * location coordinates, timeline, live news search, and official government portal links.
 */
export function BulletinModal({
  bulletin,
  onClose,
}: {
  bulletin: Bulletin;
  onClose: () => void;
}) {
  const b = bulletin;
  const newsUrl = getNewsSearchUrl(b);
  const cleanDesc = b.description ? strip(b.description) : null;
  const showDesc = cleanDesc && cleanDesc !== strip(b.title) && cleanDesc !== strip(b.instruction ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulletin-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-ink-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge level={b.severity} />
            {b.event && <Pill tone="info">{b.event}</Pill>}
            {b.category && b.category !== b.event && <Pill>{b.category}</Pill>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bulletin details"
            className="rounded-lg p-1.5 text-stone transition-colors hover:bg-ivory/[0.08] hover:text-ivory"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <div>
            <h2 id="bulletin-title" className="font-serif text-xl sm:text-2xl leading-snug text-ivory">
              {b.title}
            </h2>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone">
              <span className="font-medium text-sand">{b.source}</span>
              <span>Published: <time dateTime={b.published_at} className="code">{formatDateTime(b.published_at)}</time></span>
              {b.expires_at && (
                <span>In force until: <time dateTime={b.expires_at} className="code">{formatDateTime(b.expires_at)}</time> ({timeAgo(b.expires_at)})</span>
              )}
            </div>
          </div>

          {/* Affected Area */}
          {b.area && (
            <div className="flex items-start gap-2.5 rounded-xl border border-line bg-ivory/[0.02] p-3 text-sm text-sand">
              <MapPin className="h-4 w-4 shrink-0 text-signal mt-0.5" aria-hidden />
              <div>
                <p className="text-xs font-medium text-stone">Targeted area / mandals</p>
                <p className="mt-0.5 text-ivory">{b.area}</p>
              </div>
            </div>
          )}

          {/* Actionable Advice */}
          {b.instruction && (
            <div className="rounded-xl border border-signal/30 bg-signal/[0.07] p-4 text-sm">
              <div className="flex items-center gap-2 text-signal font-medium">
                <ShieldAlert className="h-4 w-4" aria-hidden />
                <span>What to do / Official advice</span>
              </div>
              <p className="mt-1.5 leading-relaxed text-ivory font-serif text-[1.125rem]">
                {b.instruction}
              </p>
            </div>
          )}

          {/* Description */}
          {showDesc && (
            <div className="space-y-1.5 text-sm">
              <p className="text-xs font-medium text-stone">Bulletin text</p>
              <p className="leading-relaxed text-sand">{cleanDesc}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-3 border-t border-line bg-ink-950/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={newsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-signal px-3.5 py-2 text-xs sm:text-sm font-medium text-ink-950 transition-colors hover:bg-signal/90"
            >
              <Newspaper className="h-4 w-4" aria-hidden />
              Search live news <ExternalLink className="h-3 w-3 opacity-75" aria-hidden />
            </a>

            <a
              href="https://sachet.ndma.gov.in/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ivory/[0.04] px-3.5 py-2 text-xs sm:text-sm font-medium text-ivory transition-colors hover:bg-ivory/[0.08]"
            >
              <Globe className="h-4 w-4 text-stone" aria-hidden />
              SACHET portal <ExternalLink className="h-3 w-3 text-stone" aria-hidden />
            </a>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-3.5 py-1.5 text-xs sm:text-sm text-stone transition-colors hover:bg-ivory/[0.06] hover:text-ivory"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Warnings in force, as issued through NDMA's SACHET Common Alerting Protocol system (expired ones are dropped). */
export function OfficialWarnings({ limit = 15, feed }: { limit?: number; feed: ReturnType<typeof useOfficialWarnings> }) {
  const { data, error, loading, reload } = feed;
  const [selected, setSelected] = useState<Bulletin | null>(null);

  if (loading && !data) return <LoadingRows rows={4} />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data?.items.length) {
    return data?.mode === 'OFFLINE'
      ? <EmptyState title="Official warnings are unavailable right now" body="NDMA SACHET could not be reached. Check sachet.ndma.gov.in or your state SDMA." action={<button onClick={reload} className="link text-sm">Try again</button>} />
      : <EmptyState title="No warnings in force" body="Nothing is currently issued in the national CAP feed." />;
  }

  return (
    <>
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {data.items.slice(0, limit).map((b, i) => (
          <li
            key={`${b.link ?? b.title}-${i}`}
            className="group grid gap-3 px-5 py-4 transition-colors hover:bg-ivory/[0.02] sm:grid-cols-[7rem_1fr_auto] sm:items-start sm:gap-6"
          >
            <SeverityBadge level={b.severity} className="w-fit" />
            <div
              className="min-w-0 space-y-1 cursor-pointer"
              onClick={() => setSelected(b)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(b);
                }
              }}
              aria-label={`Open details for: ${b.title}`}
            >
              <p className="text-[0.9375rem] font-medium leading-snug text-ivory transition-colors group-hover:text-signal">
                {b.title}
              </p>
              {b.description && <p className="line-clamp-2 max-w-[75ch] text-sm leading-relaxed text-stone">{strip(b.description)}</p>}
              {b.instruction && <p className="max-w-[75ch] text-sm text-sand"><span className="text-ivory font-medium">Advice:</span> {b.instruction}</p>}
              <p className="text-xs text-stone">
                {[b.event, b.source].filter(Boolean).join(' · ')} · <span className="code">{formatDateTime(b.published_at)}</span>
                {b.expires_at && <> · in force until <span className="code">{formatDateTime(b.expires_at)}</span> ({timeAgo(b.expires_at)})</>}
              </p>
            </div>
            <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end sm:gap-1.5">
              <button
                type="button"
                onClick={() => setSelected(b)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ivory/[0.06] px-3 py-1.5 text-xs font-medium text-ivory transition-colors hover:bg-ivory/[0.12] hover:text-signal"
              >
                <FileText className="h-3.5 w-3.5 text-sand" aria-hidden />
                Read bulletin
              </button>
              <a
                href={getNewsSearchUrl(b)}
                target="_blank"
                rel="noreferrer"
                title="Search live news stories covering this warning on Google News"
                className="inline-flex items-center gap-1 text-xs text-sand transition-colors hover:text-ivory"
              >
                <Newspaper className="h-3.5 w-3.5" aria-hidden />
                Live news <ExternalLink className="h-3 w-3 opacity-80" aria-hidden />
              </a>
            </div>
          </li>
        ))}
      </ul>

      {selected && (
        <BulletinModal bulletin={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
