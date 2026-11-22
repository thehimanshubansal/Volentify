'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { SKILLS } from '@/lib/constants';
import type { Disaster, Severity, Task } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/DataState';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

const EMPTY = { title: '', description: '', disaster_id: '', required_skill: SKILLS[0] as string, quantity_needed: 1,
  location_name: '', lat: '', lng: '' };

export function MissionForm({ disasters, onCreated }: { disasters: Disaster[]; onCreated: () => void }) {
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [urgency, setUrgency] = useState<Severity>('HIGH');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const incident = disasters.find((d) => d.id === f.disaster_id);

  const set = (k: keyof typeof EMPTY, v: string | number) => { setF((p) => ({ ...p, [k]: v })); setError(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) { setError('Choose the incident this mission belongs to.'); return; }
    const lat = f.lat === '' ? incident.lat : Number(f.lat);
    const lng = f.lng === '' ? incident.lng : Number(f.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) { setError('Coordinates must be decimal degrees, e.g. 20.2644 and 86.6705.'); return; }
    setBusy(true);
    try {
      const task = await api.post<Task>('/api/tasks', {
        title: f.title.trim(), description: f.description.trim() || null, urgency, required_skill: f.required_skill,
        quantity_needed: Number(f.quantity_needed), disaster_id: incident.id, lat, lng,
        location_name: f.location_name.trim() || incident.location,
      });
      toast(`Mission ${task.code} created — run dispatch to assign responders`);
      setF(EMPTY);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the mission.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6 rounded-2xl border border-line bg-ink-900 p-5 sm:p-8" noValidate>
      <div>
        <h2 className="text-[1.75rem]">Create a mission</h2>
        <p className="text-sm text-stone">Missions enter the dispatch queue immediately and are offered to matching volunteers.</p>
      </div>
      <Field label="Incident" htmlFor="m-incident">
        <Select id="m-incident" value={f.disaster_id} onChange={(e) => set('disaster_id', e.target.value)}>
          <option value="">Choose an incident…</option>
          {disasters.map((d) => <option key={d.id} value={d.id}>{d.title} — {d.location}</option>)}
        </Select>
      </Field>
      <Field label="What needs doing" htmlFor="m-title">
        <Input id="m-title" required minLength={4} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Evacuate stranded families by boat" />
      </Field>
      <Field label="Details for responders" htmlFor="m-desc" hint="Optional. Access routes, hazards, who to report to.">
        <Textarea id="m-desc" value={f.description} onChange={(e) => set('description', e.target.value)} />
      </Field>
      <div className="space-y-2">
        <p className="text-[0.8125rem] font-medium text-sand">Urgency</p>
        <Segmented<Severity> ariaLabel="Urgency" value={urgency} onChange={setUrgency}
          options={[{ value: 'CRITICAL', label: 'Critical' }, { value: 'HIGH', label: 'High' }, { value: 'MODERATE', label: 'Moderate' }, { value: 'LOW', label: 'Low' }]} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Skill required" htmlFor="m-skill">
          <Select id="m-skill" value={f.required_skill} onChange={(e) => set('required_skill', e.target.value)}>
            {SKILLS.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Responders needed" htmlFor="m-qty">
          <Input id="m-qty" type="number" min={1} max={500} value={f.quantity_needed} onChange={(e) => set('quantity_needed', Math.max(1, Number(e.target.value) || 1))} />
        </Field>
        <Field label="Site name" htmlFor="m-site" hint={incident ? `Defaults to ${incident.location}` : undefined}>
          <Input id="m-site" value={f.location_name} onChange={(e) => set('location_name', e.target.value)} placeholder="Paradip Port Shelter #4" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" htmlFor="m-lat"><Input id="m-lat" inputMode="decimal" className="font-mono" value={f.lat} onChange={(e) => set('lat', e.target.value)} placeholder={incident ? String(incident.lat) : '20.2644'} /></Field>
          <Field label="Longitude" htmlFor="m-lng"><Input id="m-lng" inputMode="decimal" className="font-mono" value={f.lng} onChange={(e) => set('lng', e.target.value)} placeholder={incident ? String(incident.lng) : '86.6705'} /></Field>
        </div>
      </div>
      {error && <ErrorState message={error} />}
      <div className="flex justify-end border-t border-line pt-6">
        <Button type="submit" loading={busy} disabled={f.title.trim().length < 4}>Create mission</Button>
      </div>
    </form>
  );
}
