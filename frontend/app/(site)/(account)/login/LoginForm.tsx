'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { postAuthPath, useSession } from '@/lib/session';
import type { AuthResponse } from '@/lib/types';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/DataState';
import { Field, Input } from '@/components/ui/Field';

const QUERY_ERRORS: Record<string, string> = {
  google_unconfigured: 'Google sign-in is not set up on this deployment yet. Sign in with your email and password instead.',
  google_failed: 'Google sign-in could not be completed. Try again, or use your email and password.',
};

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const { setSession } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(QUERY_ERRORS[params.get('error') ?? ''] ?? null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const auth = await api.post<AuthResponse>('/api/auth/login', { email: email.trim(), password });
      setSession(auth);
      router.replace(postAuthPath(auth, next));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach Volentify. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      lede="Welcome back. Your missions, alerts and muster pass are waiting."
      footer={<>New to Volentify? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="link">Create an account</Link></>}
    >
      <GoogleButton next={next} />
      <OrDivider />
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@agency.gov.in" />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <ErrorState message={error} />}
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email || !password}>Sign in</Button>
      </form>
    </AuthShell>
  );
}
