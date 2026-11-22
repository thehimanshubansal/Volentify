'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Check, Crosshair } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { BLOOD_GROUPS, INDIAN_STATES, ROLE_META } from '@/lib/constants';
import { postAuthPath, useSession } from '@/lib/session';
import type { AuthResponse, Role } from '@/lib/types';
import { cn, formatCoord, titleCase } from '@/lib/utils';
import { MusterPass } from '@/components/auth/MusterPass';
import { type Profile, ROLE_DEFAULTS, RoleFields, roleStepError } from '@/components/auth/RoleFields';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/DataState';
import { Field, Input, Select } from '@/components/ui/Field';

const STEPS = ['Mobile number', 'Your role', 'Role details', 'Safety profile', 'Review'] as const;
const DRAFT_KEY = 'volentify.onboarding.draft';
const ROLES = Object.keys(ROLE_META) as Role[];

interface Draft {
  step: number; phone: string; role: Role | null; profile: Profile; skills: string[]; equipment: string[];
  state: string; district: string; bloodGroup: string; emergencyContact: string; lat: number | null; lng: number | null;
}

const EMPTY: Draft = {
  step: 0, phone: '', role: null, profile: {}, skills: [], equipment: [], state: '', district: '',
  bloodGroup: '', emergencyContact: '', lat: null, lng: null,
};

function normalisePhone(v: string): string {
  let d = v.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  return d;
}
const phoneValid = (v: string) => /^[6-9]\d{9}$/.test(normalisePhone(v));

function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) } : null;
  } catch {
    return null;
  }
}

export default function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const { user, status, setSession } = useSession();
  const [d, setD] = useState<Draft>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [done, setDone] = useState<AuthResponse | null>(null);

  // Initialise from a saved draft, else from the account, else from ?role=.
  useEffect(() => {
    if (status === 'loading' || hydrated) return;
    const draft = readDraft();
    if (draft) setD(draft);
    else {
      const fromNext = next?.match(/role=([A-Z_]+)/)?.[1];
      const preset = (params.get('role') ?? fromNext ?? '').toUpperCase() as Role;
      const role = user?.onboarded ? user.role : ROLES.includes(preset) ? preset : null;
      const [district = '', state = ''] = (user?.state_district ?? '').split(',').map((s) => s.trim());
      setD({
        ...EMPTY, phone: user?.phone ?? '', role,
        profile: role ? { ...ROLE_DEFAULTS[role], ...(user?.profile_data as Profile) } : {},
        state, district, bloodGroup: user?.blood_group ?? '', emergencyContact: user?.emergency_contact ?? '',
        lat: user?.lat ?? null, lng: user?.lng ?? null,
      });
    }
    setHydrated(true);
  }, [status, user, hydrated, next, params]);

  useEffect(() => {
    if (!hydrated || done) return;
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* storage unavailable — draft simply isn't kept */ }
  }, [d, hydrated, done]);

  const patch = (p: Partial<Draft>) => { setD((prev) => ({ ...prev, ...p })); setError(null); };

  const stepError = useMemo((): string | null => {
    switch (d.step) {
      case 0: return phoneValid(d.phone) ? null : 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.';
      case 1: return d.role ? null : 'Choose how you’ll take part.';
      case 2: return d.role ? roleStepError(d.role, d.profile, d.skills) : 'Choose a role first.';
      case 3: return d.state && d.district.trim().length >= 2 ? null : 'Choose your state and enter your district.';
      default: return null;
    }
  }, [d]);

  const goNext = () => {
    if (stepError) { setError(stepError); return; }
    patch({ step: Math.min(4, d.step + 1) });
  };

  const chooseRole = (role: Role) =>
    patch({ role, profile: d.role === role ? d.profile : { ...ROLE_DEFAULTS[role] } });

  const locate = () => {
    if (!navigator.geolocation) { setError('This browser cannot share your location. Enter your district instead.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { patch({ lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }); setLocating(false); },
      () => { setError('Location permission was denied. Your district is enough to get started.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const submit = async () => {
    if (!d.role) return;
    setBusy(true);
    setError(null);
    try {
      const auth = await api.post<AuthResponse>('/api/auth/onboard', {
        phone: normalisePhone(d.phone), role: d.role, state_district: `${d.district.trim()}, ${d.state}`,
        lat: d.lat, lng: d.lng, blood_group: d.bloodGroup || null, emergency_contact: d.emergencyContact.trim() || null,
        skills: d.role === 'VOLUNTEER' ? d.skills : [], equipment: d.role === 'VOLUNTEER' ? d.equipment : [],
        profile: d.profile,
      });
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setSession(auth);
      setDone(auth);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach Volentify. Your answers are saved — try again.');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading' || !hydrated) {
    return <div className="page max-w-3xl space-y-4 py-20"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-64" /></div>;
  }

  if (done?.user.muster) {
    const u = done.user;
    const pending = !u.is_verified && (u.role === 'NGO_MEMBER' || u.role === 'INCIDENT_ADMIN');
    return (
      <div className="page grid gap-12 py-14 sm:py-20 lg:grid-cols-[1fr_minmax(0,32rem)] lg:items-center">
        <div className="space-y-5">
          <p className="eyebrow">Onboarding complete</p>
          <h1 className="display text-5xl sm:text-6xl">Your muster pass is issued.</h1>
          <p className="max-w-md leading-relaxed text-stone">
            Show this pass at check-in points and relief camps. Command scans the code to confirm who you are and what you can do.
          </p>
          {pending && (
            <p className="max-w-md rounded-xl border border-moderate/30 bg-moderate/[0.06] p-4 text-sm text-sand">
              {ROLE_META[u.role].label} tools unlock once an administrator verifies your account. You can use the rest of Volentify meanwhile.
            </p>
          )}
          <Button size="lg" onClick={() => router.replace(postAuthPath({ ...done, requiresOnboarding: false }, next?.startsWith('/onboarding') ? null : next))}>
            Continue to Volentify
          </Button>
        </div>
        <MusterPass pass={u.muster!} phone={u.phone} bloodGroup={u.blood_group} district={u.state_district} />
      </div>
    );
  }

  const role = d.role;
  return (
    <div className="page max-w-3xl py-14 sm:py-20">
      <p className="eyebrow">{user?.onboarded ? 'Update your profile' : `Welcome${user ? `, ${user.name.split(' ')[0]}` : ''}`}</p>
      <h1 className="display mt-3 text-[2.5rem] sm:text-5xl">Set up your muster pass</h1>
      <p className="mt-3 max-w-xl text-stone">Five short steps. Responders and command rely on these details to reach and account for you.</p>

      <ol className="mt-10 grid grid-cols-5 gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === d.step ? 'step' : undefined}>
            <button
              type="button"
              disabled={i > d.step}
              onClick={() => patch({ step: i })}
              className="group w-full text-left disabled:cursor-default"
            >
              <span className={cn('block h-0.5 rounded-full transition-colors', i <= d.step ? 'bg-signal' : 'bg-line-strong')} />
              <span className={cn('mt-2 flex items-center gap-1.5 text-xs', i === d.step ? 'text-ivory' : i < d.step ? 'text-sand' : 'text-ash')}>
                <span className="font-mono">{i < d.step ? <Check className="h-3 w-3" aria-hidden /> : i + 1}</span>
                <span className="hidden sm:inline">{label}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <form
        className="mt-10 rounded-2xl border border-line bg-ink-900 p-5 sm:p-8"
        onSubmit={(e) => { e.preventDefault(); if (d.step < 4) goNext(); else void submit(); }}
        noValidate
      >
        <h2 className="text-[1.75rem] leading-tight">{STEPS[d.step]}</h2>
        <div className="mt-6">
          {d.step === 0 && (
            <Field label="Mobile number" htmlFor="phone" hint="Used for emergency SMS broadcasts and by responders to reach you. Never shown publicly.">
              <div className="flex">
                <span className="flex h-11 items-center rounded-l-[10px] border border-r-0 border-line bg-ink-700 px-3 font-mono text-sm text-stone">+91</span>
                <Input id="phone" inputMode="numeric" autoComplete="tel-national" autoFocus value={d.phone}
                  onChange={(e) => patch({ phone: e.target.value })} placeholder="98765 43210" className="rounded-l-none font-mono" />
              </div>
            </Field>
          )}

          {d.step === 1 && (
            <div role="radiogroup" aria-label="Role" className="grid gap-3 sm:grid-cols-2">
              {ROLES.map((r) => (
                <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => chooseRole(r)}
                  className={cn('rounded-xl p-4 text-left ring-1 ring-inset transition-colors',
                    role === r ? 'bg-signal/[0.08] ring-signal/60' : 'ring-line hover:ring-line-strong')}>
                  <span className="block font-serif text-xl text-ivory">{ROLE_META[r].label}</span>
                  <span className="mt-1 block text-[0.8125rem] leading-relaxed text-stone">{ROLE_META[r].blurb}</span>
                </button>
              ))}
              {(role === 'NGO_MEMBER' || role === 'INCIDENT_ADMIN') && !user?.is_verified && (
                <p className="text-sm text-moderate sm:col-span-2">
                  {ROLE_META[role].label} accounts are verified by an administrator before command tools unlock.
                </p>
              )}
            </div>
          )}

          {d.step === 2 && role && (
            <RoleFields role={role} profile={d.profile} onProfile={(profile) => patch({ profile })}
              skills={d.skills} onSkills={(skills) => patch({ skills })} equipment={d.equipment} onEquipment={(equipment) => patch({ equipment })} />
          )}

          {d.step === 3 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="State or union territory" htmlFor="state">
                <Select id="state" value={d.state} onChange={(e) => patch({ state: e.target.value })}>
                  <option value="">Choose…</option>
                  {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="District" htmlFor="district">
                <Input id="district" value={d.district} onChange={(e) => patch({ district: e.target.value })} placeholder="Puri" />
              </Field>
              <Field label="Blood group" htmlFor="blood" hint="Optional — helps match emergency donors.">
                <Select id="blood" value={d.bloodGroup} onChange={(e) => patch({ bloodGroup: e.target.value })}>
                  <option value="">Prefer not to say</option>
                  {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
                </Select>
              </Field>
              <Field label="Emergency contact" htmlFor="ec" hint="Name and phone of someone to notify.">
                <Input id="ec" value={d.emergencyContact} onChange={(e) => patch({ emergencyContact: e.target.value })} placeholder="Ravi Mohanty, 94370 12345" />
              </Field>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <Button variant="secondary" size="sm" onClick={locate} loading={locating}>
                  <Crosshair className="h-3.5 w-3.5" aria-hidden />{d.lat != null ? 'Update my location' : 'Use my location'}
                </Button>
                <span className="code">{d.lat != null && d.lng != null ? formatCoord(d.lat, d.lng) : 'Optional — improves mission matching'}</span>
              </div>
            </div>
          )}

          {d.step === 4 && role && (
            <dl className="divide-y divide-line text-sm">
              {[
                ['Mobile', <span key="p" className="font-mono">+91 {normalisePhone(d.phone)}</span>],
                ['Role', ROLE_META[role].label],
                ...(role === 'VOLUNTEER' ? [['Skills', d.skills.join(', ')], ['Equipment', d.equipment.join(', ') || 'None listed']] : []),
                ...Object.entries(d.profile).filter(([, v]) => v !== '' && v !== undefined && !(Array.isArray(v) && !v.length))
                  .map(([k, v]) => [titleCase(k), Array.isArray(v) ? v.join(', ') : String(v)]),
                ['Location', `${d.district}, ${d.state}`],
                ['Blood group', d.bloodGroup || 'Not shared'],
                ['Emergency contact', d.emergencyContact || 'Not provided'],
                ['Pass issued', ROLE_META[role].pass],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-6 py-2.5">
                  <dt className="text-stone">{k}</dt><dd className="text-right text-ivory">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {error && <ErrorState message={error} className="mt-6" />}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
          <Button variant="ghost" onClick={() => patch({ step: Math.max(0, d.step - 1) })} disabled={d.step === 0}>Back</Button>
          {d.step < 4
            ? <Button type="submit">Continue</Button>
            : <Button type="submit" loading={busy}>Issue my muster pass</Button>}
        </div>
      </form>
    </div>
  );
}
