'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { ROLE_META } from '@/lib/constants';
import { useSession } from '@/lib/session';
import type { AuthResponse, Role } from '@/lib/types';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/DataState';
import { Honeypot } from '@/components/ui/Honeypot';
import { Field, Input } from '@/components/ui/Field';

export default function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const roleParam = params.get('role')?.toUpperCase() as Role | undefined;
  const role = roleParam && roleParam in ROLE_META ? roleParam : undefined;
  const { setSession } = useSession();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [trap, setTrap] = useState('');
  const [error, setError] = useState<string | null>(null);

  const passwordShort = form.password.length > 0 && form.password.length < 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordShort) return;
    setBusy(true);
    setError(null);
    try {
      const auth = await api.post<AuthResponse>('/api/auth/register', { ...form, name: form.name.trim(), email: form.email.trim(), ...(trap ? { website: trap } : {}) });
      setSession(auth);
      const q = new URLSearchParams();
      if (role) q.set('role', role);
      if (next) q.set('next', next);
      router.replace(`/onboarding${q.size ? `?${q}` : ''}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach Volentify. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Join the network"
      lede={role ? `You’re signing up as ${ROLE_META[role].label.toLowerCase()}. Next, we’ll set up your muster pass.` : 'Create your account, then choose how you’ll help. It takes about two minutes.'}
      footer={<>Already registered? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="link">Sign in</Link></>}
    >
      <GoogleButton next={role ? `/onboarding?role=${role}` : next} />
      <OrDivider />
      <form onSubmit={submit} className="relative space-y-5" noValidate>
        <Honeypot value={trap} onChange={setTrap} />
        <Field label="Full name or unit name" htmlFor="name">
          <Input id="name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Asha Mohanty" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.org" />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters." error={passwordShort ? 'Use at least 8 characters.' : null}>
          <Input id="password" type="password" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {error && <ErrorState message={error} />}
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!form.name || !form.email || form.password.length < 8}>
          Create account
        </Button>
        <p className="text-xs leading-relaxed text-ash">
          By continuing you agree to the <Link href="/terms" className="underline underline-offset-2">terms</Link> and{' '}
          <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
        </p>
      </form>
    </AuthShell>
  );
}
