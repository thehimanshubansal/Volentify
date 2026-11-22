'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Crosshair, MapPin } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Triage } from '@/lib/types';
import { formatCoord, pct, titleCase } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Honeypot } from '@/components/ui/Honeypot';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Pill, SeverityBadge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/DataState';

interface ReportResult { reference: string; triage: Triage; linked_disaster_id: string | null; stored: boolean }

const FLAG_LABEL: Record<keyof Triage['flags'], string> = {
  trapped_civilians: 'People trapped', medical_emergency: 'Medical emergency', food_water_needed: 'Food or water needed', road_blocked: 'Road blocked',
};

export default function ReportForm() {
  const [text, setText] = useState('');
  const [trap, setTrap] = useState('');
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);

  const locate = () => {
    if (!navigator.geolocation) { setError('This browser cannot share location. Describe the place instead.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }); setLocating(false); },
      () => { setError('Location permission was denied. Describe the place instead.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (text.trim().length < 8) { setError('Describe what is happening in a sentence or two.'); return; }
    if (location.trim().length < 2) { setError('Add the village, town or landmark.'); return; }
    setBusy(true);
    try {
      setResult(await api.post<ReportResult>('/api/reports', {
        text: text.trim(), location: location.trim(), contact: contact.trim() || null, ...(coords ?? {}), ...(trap ? { website: trap } : {}),
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The report could not be sent. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const t = result.triage;
    const flags = (Object.keys(FLAG_LABEL) as (keyof Triage['flags'])[]).filter((k) => t.flags[k]);
    return (
      <div className="panel animate-fade-up space-y-6 p-6 sm:p-8" aria-live="polite">
        <div className="space-y-2">
          <p className="text-sm text-stone">Report received · reference <span className="code text-ivory">{result.reference}</span></p>
          <h2 className="text-[2rem] leading-tight">
            {result.stored ? 'Added to the incident record for responders to review.' : 'Received, but not linked to an active incident.'}
          </h2>
          <p className="max-w-[60ch] text-sm leading-relaxed text-stone">
            {result.stored
              ? 'Incident controllers will see it in the evidence timeline alongside official reports.'
              : 'No active incident covers this location, so it was triaged but not stored. If lives are at risk, call 112 now.'}
          </p>
        </div>
        <dl className="grid gap-5 border-y border-line py-5 sm:grid-cols-4">
          <div><dt className="text-xs text-stone">Hazard</dt><dd className="mt-1 text-ivory">{t.disaster_type}</dd></div>
          <div><dt className="text-xs text-stone">Severity</dt><dd className="mt-1"><SeverityBadge level={t.severity} /></dd></div>
          <div><dt className="text-xs text-stone">Urgency</dt><dd className="numeral mt-1 text-2xl">{t.urgency_score}<span className="font-sans text-sm text-stone"> / 5</span></dd></div>
          <div><dt className="text-xs text-stone">Confidence</dt><dd className="mt-1 text-ivory">{pct(t.confidence)}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          {flags.map((f) => <Pill key={f} tone="bad">{FLAG_LABEL[f]}</Pill>)}
          {t.needs.map((n) => <Pill key={n} tone="gold">{n}</Pill>)}
          {t.trapped_count != null && <Pill tone="bad">{t.trapped_count} people reported</Pill>}
        </div>
        <p className="text-xs text-stone">Triaged by Laya ({t.tier}) in <span className="code">{t.latency_ms} ms</span> · language {t.language.toUpperCase()}</p>
        <div className="flex flex-wrap gap-3">
          {result.linked_disaster_id && <Link href={`/disasters/${result.linked_disaster_id}`} className="inline-flex h-10 items-center rounded-[10px] bg-signal px-4 text-sm font-medium text-ink hover:bg-signal-soft">Open the incident</Link>}
          <Button variant="secondary" onClick={() => { setResult(null); setText(''); }}>Send another report</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="relative space-y-6" noValidate>
        <Honeypot value={trap} onChange={setTrap} />
      <Field label="What is happening?" hint="Write in any language. Include how many people, injuries and what is needed." htmlFor="report-text">
        <Textarea id="report-text" value={text} onChange={(e) => setText(e.target.value)} required maxLength={2000}
          placeholder="Water has entered houses near the school, 6 people on a rooftop, one elderly man needs insulin" className="min-h-[9rem]" />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Where?" hint="Village, town, landmark or district" htmlFor="report-location">
          <Input id="report-location" value={location} onChange={(e) => setLocation(e.target.value)} required maxLength={160} placeholder="Barpeta, Assam" />
        </Field>
        <Field label="Contact (optional)" hint="So responders can reach you" htmlFor="report-contact">
          <Input id="report-contact" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} placeholder="Name and phone" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
        <MapPin className="h-4 w-4 text-stone" aria-hidden />
        <span className="flex-1 text-sm text-sand">
          {coords ? <>Location attached <span className="code">{formatCoord(coords.lat, coords.lng)}</span></> : 'Attaching your location helps link the report to the right incident.'}
        </span>
        {coords
          ? <Button size="sm" variant="ghost" onClick={() => setCoords(null)}>Remove</Button>
          : <Button size="sm" variant="secondary" onClick={locate} loading={locating}><Crosshair className="h-3.5 w-3.5" />Use my location</Button>}
      </div>
      {error && <ErrorState message={error} />}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" loading={busy}>Send report</Button>
        <p className="text-xs text-stone">Reports are reviewed by responders. {titleCase('see our')} <Link href="/privacy" className="link">privacy notice</Link>.</p>
      </div>
    </form>
  );
}
