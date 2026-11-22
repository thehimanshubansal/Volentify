'use client';

import { useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Triage } from '@/lib/types';
import { cn, pct } from '@/lib/utils';
import { Pill, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/DataState';
import { Field, Input, Textarea } from '@/components/ui/Field';

const SAMPLES = [
  { lang: 'Hindi', text: 'बाढ़ से 12 लोग फंसे हैं, नाव चाहिए', location: 'Barpeta, Assam', hint: 'hi' },
  { lang: 'Odia', text: 'ବନ୍ୟା ପାଣି ବଢୁଛି, ଲୋକମାନେ ଫସି ରହିଛନ୍ତି, ଖାଦ୍ୟ ଦରକାର', location: 'Kendrapara, Odisha', hint: 'or' },
  { lang: 'Bengali', text: 'ঘূর্ণিঝড়ে বাড়ি ভেঙে পড়েছে, দুজন আহত, ডাক্তার দরকার', location: 'Sagar Island, West Bengal', hint: 'bn' },
  { lang: 'Tamil', text: 'வெள்ளம் காரணமாக சாலை மூடப்பட்டுள்ளது, உணவு மற்றும் தண்ணீர் தேவை', location: 'Cuddalore, Tamil Nadu', hint: 'ta' },
  { lang: 'English', text: 'Landslide blocked the ghat road, 5 people trapped in a car, one bleeding', location: 'Meppadi, Kerala', hint: 'en' },
];

const LANG_NAME: Record<string, string> = {
  hi: 'Hindi / Marathi (Devanagari)', mr: 'Marathi', bn: 'Bengali', as: 'Assamese', or: 'Odia', ta: 'Tamil',
  te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', gu: 'Gujarati', pa: 'Punjabi', en: 'English / Latin script',
};
const TIER_LABEL: Record<Triage['tier'], string> = {
  'laya-local': 'Tier 1 · local Laya router', 'impossibl-hosted': 'Tier 2 · hosted endpoint', deterministic: 'Tier 3 · deterministic matcher',
};
const FLAG_LABEL: Record<keyof Triage['flags'], string> = {
  trapped_civilians: 'People trapped', medical_emergency: 'Medical emergency', food_water_needed: 'Food or water needed', road_blocked: 'Road blocked',
};

export default function TriagePlayground() {
  const [text, setText] = useState(SAMPLES[0].text);
  const [location, setLocation] = useState(SAMPLES[0].location);
  const [hint, setHint] = useState<string | undefined>(SAMPLES[0].hint);
  const [result, setResult] = useState<Triage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true); setError(null);
    try {
      setResult(await api.post<Triage>('/api/triage/laya', { text, location: location || undefined, language_hint: hint }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Triage service unavailable');
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={run} className="space-y-5">
        <div className="flex flex-wrap gap-2" aria-label="Sample messages">
          {SAMPLES.map((s) => (
            <button key={s.lang} type="button" onClick={() => { setText(s.text); setLocation(s.location); setHint(s.hint); setResult(null); }}
              className={cn('rounded-full px-3 py-1 text-[0.8125rem] ring-1 ring-inset transition-colors',
                text === s.text ? 'bg-ivory/[0.1] text-ivory ring-ivory/30' : 'text-stone ring-line hover:text-sand')}>
              {s.lang}
            </button>
          ))}
        </div>
        <Field label="Field message" htmlFor="triage-text">
          <Textarea id="triage-text" value={text} onChange={(e) => { setText(e.target.value); setHint(undefined); }} maxLength={4000} required className="min-h-[140px] text-base" />
        </Field>
        <Field label="Location (optional)" htmlFor="triage-loc">
          <Input id="triage-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="District or village" />
        </Field>
        <Button type="submit" loading={busy} disabled={text.trim().length < 2}>Triage message</Button>
      </form>

      <div aria-live="polite">
        {error ? <ErrorState message={error} />
          : !result ? (
            <div className="flex h-full min-h-[16rem] items-center justify-center rounded-2xl border border-dashed border-line-strong p-8 text-center text-sm text-stone">
              Choose a sample or write your own message, then triage it.
            </div>
          ) : (
            <div className="space-y-6 rounded-2xl border border-line bg-ink-900 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[0.8125rem] text-stone">Classified as</p>
                  <p className="font-serif text-4xl text-ivory">{result.disaster_type === 'Unspecified' ? 'No hazard named' : result.disaster_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-[0.8125rem] text-stone">Urgency</p>
                  <p className="numeral text-4xl">{result.urgency_score}<span className="font-sans text-base text-stone"> / 5</span></p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge level={result.severity} />
                <Pill>Confidence {pct(result.confidence)}</Pill>
                {result.trapped_count != null && <Pill tone="bad">{result.trapped_count} reported trapped</Pill>}
              </div>
              <ul className="grid grid-cols-2 gap-2">
                {(Object.keys(FLAG_LABEL) as (keyof Triage['flags'])[]).map((k) => (
                  <li key={k} className={cn('flex items-center gap-2 text-[0.8125rem]', result.flags[k] ? 'text-ivory' : 'text-ash')}>
                    {result.flags[k] ? <Check className="h-4 w-4 text-signal" aria-hidden /> : <Minus className="h-4 w-4" aria-hidden />}
                    {FLAG_LABEL[k]}<span className="sr-only">{result.flags[k] ? ': yes' : ': no'}</span>
                  </li>
                ))}
              </ul>
              <div>
                <p className="mb-2 text-[0.8125rem] text-stone">Needs extracted</p>
                {result.needs.length
                  ? <div className="flex flex-wrap gap-2">{result.needs.map((n) => <Pill key={n} tone="signal">{n}</Pill>)}</div>
                  : <p className="text-sm text-ash">None named in the message</p>}
              </div>
              <dl className="grid grid-cols-3 gap-4 border-t border-line pt-4 text-[0.8125rem]">
                <div><dt className="text-stone">Language</dt><dd className="mt-1 text-sand">{LANG_NAME[result.language] ?? result.language}</dd></div>
                <div><dt className="text-stone">Engine</dt><dd className="mt-1 text-sand">{TIER_LABEL[result.tier]}</dd></div>
                <div><dt className="text-stone">Latency</dt><dd className="data mt-1 text-sand">{result.latency_ms.toFixed(2)} ms</dd></div>
              </dl>
            </div>
          )}
      </div>
    </div>
  );
}
