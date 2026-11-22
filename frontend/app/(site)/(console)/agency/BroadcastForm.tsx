'use client';

import { useState } from 'react';
import { Radio } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { INDIAN_STATES } from '@/lib/constants';
import type { Alert, Disaster, Severity } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/DataState';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

const CATEGORIES = ['Cyclone', 'Flood', 'Landslide', 'Wildfire', 'Heatwave', 'Earthquake', 'Tsunami', 'Other'];
const EMPTY = { title: '', category: 'Cyclone', location: '', state: '', description: '', advisory: '', disaster_id: '' };

export function BroadcastForm({ disasters, canBroadcast }: { disasters: Disaster[]; canBroadcast: boolean }) {
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [level, setLevel] = useState<Severity>('HIGH');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canBroadcast) {
    return <EmptyState title="Broadcasts are issued by incident command"
      body="Public CAP alerts can only be sent by verified NDRF, SDMA or district command accounts. Ask your liaison officer to broadcast, or create a mission instead." />;
  }

  const set = (k: keyof typeof EMPTY, v: string) => { setF((p) => ({ ...p, [k]: v })); setConfirm(false); setError(null); };
  const linkIncident = (id: string) => {
    const d = disasters.find((x) => x.id === id);
    setF((p) => ({ ...p, disaster_id: id, ...(d ? { category: CATEGORIES.includes(d.category) ? d.category : 'Other', location: d.location, state: d.state } : {}) }));
    setConfirm(false);
  };
  const ready = f.title.trim().length >= 4 && f.location.trim().length >= 2 && f.state && f.description.trim().length >= 8 && f.advisory.trim().length >= 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm) { setConfirm(true); return; }
    setBusy(true);
    try {
      const alert = await api.post<Alert>('/api/alerts', { ...f, level, disaster_id: f.disaster_id || null });
      toast(`Alert ${alert.code} broadcast to ${alert.state}`);
      setF(EMPTY);
      setConfirm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The alert was not sent.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6 rounded-2xl border border-line bg-ink-900 p-5 sm:p-8" noValidate>
      <div>
        <h2 className="text-[1.75rem]">Broadcast a public alert</h2>
        <p className="text-sm text-stone">Published immediately on the alerts page and to citizens in the affected state.</p>
      </div>
      <Field label="Linked incident" htmlFor="b-incident" hint="Optional. Pre-fills category and location.">
        <Select id="b-incident" value={f.disaster_id} onChange={(e) => linkIncident(e.target.value)}>
          <option value="">No linked incident</option>
          {disasters.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </Select>
      </Field>
      <Field label="Headline" htmlFor="b-title"><Input id="b-title" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Evacuate low-lying coastal villages now" /></Field>
      <div className="space-y-2">
        <p className="text-[0.8125rem] font-medium text-sand">Alert level</p>
        <Segmented<Severity> ariaLabel="Alert level" value={level} onChange={(v) => { setLevel(v); setConfirm(false); }}
          options={[{ value: 'CRITICAL', label: 'Critical' }, { value: 'HIGH', label: 'High' }, { value: 'MODERATE', label: 'Moderate' }, { value: 'LOW', label: 'Low' }]} />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Hazard" htmlFor="b-cat"><Select id="b-cat" value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Area" htmlFor="b-loc"><Input id="b-loc" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="Puri & Paradip coast" /></Field>
        <Field label="State" htmlFor="b-state"><Select id="b-state" value={f.state} onChange={(e) => set('state', e.target.value)}><option value="">Choose…</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
      </div>
      <Field label="What is happening" htmlFor="b-desc"><Textarea id="b-desc" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Severe cyclonic storm 120 km from the coast, landfall expected tonight." /></Field>
      <Field label="What people should do" htmlFor="b-adv"><Textarea id="b-adv" value={f.advisory} onChange={(e) => set('advisory', e.target.value)} placeholder="Move to the nearest cyclone shelter. Carry water, medicines and documents." /></Field>
      {error && <ErrorState message={error} />}
      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-end">
        {confirm && <p className="text-sm text-moderate sm:mr-auto" role="status">This goes out publicly. Press again to confirm.</p>}
        <Button type="submit" variant={confirm ? 'danger' : 'primary'} loading={busy} disabled={!ready}>
          <Radio className="h-4 w-4" aria-hidden />{confirm ? 'Confirm broadcast' : 'Broadcast alert'}
        </Button>
      </div>
    </form>
  );
}
