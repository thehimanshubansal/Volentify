'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { BulletinFeed } from '@/lib/types';
import { cn, formatCoord, pct } from '@/lib/utils';
import { Section } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Field';
import { Pill } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/DataState';

interface Cluster {
  event_id: string; disaster_type: string; location: string; lat: number; lng: number; report_count: number;
  report_ids: string[]; status: string; last_update: string; severity: string; confidence: number;
  corroborated_facts: string[]; engine: 'gemini' | 'heuristic';
}

const PLACEHOLDER = 'One report per line — source | minutes ago | text\ne.g. District control room | 20 | Water entering houses near the river embankment';

/** Each line: "source | minutes ago | text" (source and minutes optional). */
function parse(text: string) {
  const now = Date.now();
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line, i) => {
    const parts = line.split('|').map((p) => p.trim());
    const [source, mins, body] = parts.length >= 3 ? parts : parts.length === 2 ? [parts[0], '0', parts[1]] : ['Unattributed', '0', parts[0]];
    const minutes = Number.parseInt(mins, 10);
    return {
      id: `R-${String(i + 1).padStart(3, '0')}`,
      source: source || 'Unattributed',
      text: body,
      timestamp: new Date(now - (Number.isFinite(minutes) ? minutes : 0) * 60_000).toISOString(),
    };
  });
}

export default function DedupTool() {
  const [text, setText] = useState('');
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [result, setResult] = useState<{ clusters: Cluster[]; input: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Fill the box with the official warnings currently in force, so corroboration runs on real reports. */
  const loadOfficial = async () => {
    setLoadingFeed(true); setError(null);
    try {
      const feed = await api.get<BulletinFeed>('/api/bhuvan/bulletins?limit=60');
      if (!feed.items.length) { setError('No official warnings are in force right now.'); return; }
      const now = Date.now();
      setText(feed.items.map((b) => {
        const mins = Math.max(0, Math.round((now - Date.parse(b.published_at)) / 60_000));
        return `${b.source.replace(/\|/g, '/')} | ${mins} | ${b.title.replace(/\s+/g, ' ').replace(/\|/g, '/')}`;
      }).join('\n'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load official warnings.');
    } finally {
      setLoadingFeed(false);
    }
  };

  const run = async () => {
    const reports = parse(text);
    if (!reports.length) { setError('Add at least one report.'); return; }
    if (reports.length > 200) { setError('Paste 200 reports or fewer at a time.'); return; }
    setBusy(true); setError(null);
    try {
      setResult({ clusters: await api.post<Cluster[]>('/api/events/ingest', reports), input: reports.length });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the deduplication service.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Corroborate incoming reports"
      description="Reports describing the same hazard within 15 km and two hours of each other are merged into one incident. With a Gemini key configured, merged clusters are summarised into corroborated facts."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <Field label="Reports, one per line" hint="Format: source | minutes ago | report text" htmlFor="dedup-input">
            <Textarea id="dedup-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={PLACEHOLDER}
              className="min-h-[15rem] font-mono text-[0.8125rem]" spellCheck={false} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button onClick={run} loading={busy} disabled={!text.trim()}>Cluster reports</Button>
            <Button variant="ghost" onClick={() => { void loadOfficial(); setResult(null); }} loading={loadingFeed}>Load warnings in force</Button>
          </div>
        </div>

        <div aria-live="polite" className="space-y-3">
          {error && <ErrorState message={error} />}
          {!result && !error && (
            <div className="flex h-full min-h-[15rem] items-center justify-center rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-stone">
              Clustered incidents will appear here.
            </div>
          )}
          {result && (
            <>
              <p className="text-sm text-sand">
                {result.input} report{result.input === 1 ? '' : 's'} resolved into <span className="text-ivory">{result.clusters.length} incident{result.clusters.length === 1 ? '' : 's'}</span>.
              </p>
              {result.clusters.map((c) => (
                <article key={c.event_id} className="panel space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-serif text-2xl">{c.disaster_type} · {c.location}</h3>
                    <div className="flex gap-2">
                      <Pill tone={c.severity === 'CRITICAL' ? 'bad' : c.severity === 'HIGH' ? 'warn' : 'neutral'}>{c.severity.toLowerCase()}</Pill>
                      <Pill tone={c.engine === 'gemini' ? 'gold' : 'neutral'}>{c.engine === 'gemini' ? 'Gemini merge' : 'Heuristic merge'}</Pill>
                    </div>
                  </div>
                  <p className="text-xs text-stone">
                    {c.report_count} report{c.report_count === 1 ? '' : 's'} ({c.report_ids.join(', ')}) · confidence {pct(c.confidence)} · {c.status.toLowerCase()} · <span className="code">{formatCoord(c.lat, c.lng)}</span>
                  </p>
                  <ul className="space-y-1.5">
                    {c.corroborated_facts.map((f) => (
                      <li key={f} className={cn('border-l-2 pl-3 text-sm leading-relaxed text-sand', c.report_count > 1 ? 'border-gold/60' : 'border-line')}>{f}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
