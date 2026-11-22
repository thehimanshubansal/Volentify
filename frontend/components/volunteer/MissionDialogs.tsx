'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crosshair, MapPin, Navigation, ShieldAlert } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { currentPosition, geocode, type Located } from '@/lib/geo';
import type { Task } from '@/lib/types';
import { formatCoord, haversineKm } from '@/lib/utils';
import { SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

export function missionMapHref(taskId: string, from?: { lat: number; lng: number } | null): string {
  const q = new URLSearchParams({ mission: taskId });
  if (from) q.set('from', `${from.lat.toFixed(5)},${from.lng.toFixed(5)}`);
  return `/map?${q.toString()}`;
}

/**
 * Start a mission: take the responder's position from the device (or let them type it), record it on the mission,
 * then open the tactical map with the route from there to the mission site.
 */
export function StartMissionDialog({ task, open, onClose, onStarted }: {
  task: Task | null; open: boolean; onClose: () => void; onStarted?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [position, setPosition] = useState<Located | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [resolving, setResolving] = useState(false);
  const [safe, setSafe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const locate = useCallback(async () => {
    setLocating(true); setError(null);
    try {
      setPosition({ ...(await currentPosition()), label: 'Your current location' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Location unavailable');
    } finally { setLocating(false); }
  }, []);

  useEffect(() => {
    if (!open) return;
    setPosition(null); setError(null); setTyped(''); setSafe(false);
    void locate();
  }, [open, locate]);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typed.trim()) return;
    setResolving(true); setError(null);
    const found = await geocode(typed);
    setResolving(false);
    if (found) setPosition(found);
    else setError('We could not find that place. Try a nearby landmark, town and district, or coordinates like 19.81, 85.83.');
  };

  const start = async (withPosition: boolean) => {
    if (!task) return;
    setSubmitting(true);
    const from = withPosition ? position : null;
    try {
      await api.patch<Task>(`/api/tasks/${task.id}`, {
        status: 'IN_PROGRESS',
        ...(from ? { lat: from.lat, lng: from.lng, location_name: from.label?.slice(0, 120) ?? null } : {}),
      });
      toast('Mission started — follow the route on the map');
      onStarted?.();
      onClose();
      router.push(missionMapHref(task.id, from));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not start the mission', 'error');
    } finally { setSubmitting(false); }
  };

  const distance = task && position ? haversineKm(position.lat, position.lng, task.lat, task.lng) : null;

  return (
    <Dialog open={open && Boolean(task)} onClose={onClose} title="Start mission"
      description="Tell us where you're setting off from and we'll show you the way."
      footer={<>
        <Button variant="ghost" size="sm" disabled={submitting} onClick={() => start(false)}>Start without location</Button>
        <Button size="sm" loading={submitting} disabled={!position || !safe} onClick={() => start(true)}>
          <Navigation className="h-3.5 w-3.5" aria-hidden />Start & show route
        </Button>
      </>}>
      {task && (
        <div className="rounded-xl border border-line bg-ivory/[0.02] p-4">
          <div className="flex flex-wrap items-center gap-2"><SeverityBadge level={task.urgency} /><span className="code">{task.code}</span></div>
          <p className="mt-2 text-[0.9375rem] text-ivory">{task.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-stone"><MapPin className="h-3.5 w-3.5" aria-hidden />{task.location_name} · {task.required_skill}</p>
        </div>
      )}

      <section className="space-y-3" aria-label="Your starting point">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.8125rem] font-medium text-sand">Your starting point</p>
          <Button variant="secondary" size="sm" loading={locating} onClick={locate}>
            <Crosshair className="h-3.5 w-3.5" aria-hidden />Use my current location
          </Button>
        </div>
        {position ? (
          <div className="rounded-xl border border-low/30 bg-low/[0.06] p-3 text-sm">
            <p className="text-ivory">{position.label ?? 'Selected location'}</p>
            <p className="code mt-0.5 text-xs text-stone">
              {formatCoord(position.lat, position.lng)}{position.accuracy_m ? ` · ±${position.accuracy_m} m` : ''}
              {distance != null ? ` · ${distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} straight-line to the mission` : ''}
            </p>
          </div>
        ) : locating ? <p className="text-sm text-stone">Finding your location…</p> : null}
        {error && <p className="text-sm text-high" role="alert">{error}</p>}
        <form onSubmit={lookup} className="flex gap-2">
          <Field label="Or type where you are" htmlFor="start-place" className="flex-1"
            hint="A landmark with town and district, or coordinates such as 19.81, 85.83.">
            <Input id="start-place" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="e.g. Puri bus stand, Puri" maxLength={160} />
          </Field>
          <Button type="submit" variant="secondary" size="sm" className="mt-[1.6rem] h-11" loading={resolving} disabled={!typed.trim()}>Find</Button>
        </form>
      </section>

      <label className="flex items-start gap-3 rounded-xl border border-high/25 bg-high/[0.05] p-4 text-sm text-sand">
        <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#ff6b00]" />
        <span>
          <span className="flex items-center gap-1.5 font-medium text-ivory"><ShieldAlert className="h-4 w-4 text-high" aria-hidden />I&apos;ll stay safe</span>
          I won&apos;t walk or drive through flood water, enter damaged buildings or zones command has closed, and I&apos;ll
          only do work I&apos;m trained for. If a life is in danger I call 112 first.
        </span>
      </label>
    </Dialog>
  );
}

/** Close a mission with its outcome; the number feeds the volunteer's profile and the public impact figures. */
export function CompleteMissionDialog({ task, open, onClose, onDone }: {
  task: Task | null; open: boolean; onClose: () => void; onDone?: () => void;
}) {
  const toast = useToast();
  const [people, setPeople] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setPeople(''); setNote(''); } }, [open]);

  const submit = async () => {
    if (!task) return;
    setBusy(true);
    try {
      const n = people.trim() === '' ? null : Math.max(0, Math.min(100000, Math.round(Number(people))));
      await api.patch<Task>(`/api/tasks/${task.id}`, { status: 'COMPLETED', people_helped: Number.isFinite(n as number) ? n : null,
        outcome_note: note.trim() || null });
      toast('Mission marked complete — thank you');
      onDone?.();
      onClose();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not complete the mission', 'error');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open && Boolean(task)} onClose={onClose} title="Mission complete"
      description={task ? `${task.code} · ${task.title}` : undefined}
      footer={<>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button size="sm" loading={busy} onClick={submit}>Mark complete</Button>
      </>}>
      <Field label="People helped" htmlFor="people-helped" hint="Rescued, treated, evacuated or supplied. Leave blank if it doesn't apply.">
        <Input id="people-helped" type="number" inputMode="numeric" min={0} max={100000} value={people}
          onChange={(e) => setPeople(e.target.value)} className="w-40" />
      </Field>
      <Field label="What happened (optional)" htmlFor="outcome-note"
        hint="For command and your history. Don't include names, phone or ID numbers — they're removed automatically.">
        <Textarea id="outcome-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </Field>
    </Dialog>
  );
}
