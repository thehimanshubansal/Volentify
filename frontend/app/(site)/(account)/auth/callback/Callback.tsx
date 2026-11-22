'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { postAuthPath, useSession } from '@/lib/session';
import type { AuthResponse } from '@/lib/types';
import { ButtonLink } from '@/components/ui/Button';

export default function Callback() {
  const router = useRouter();
  const { setSession } = useSession();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Remove the token from the address bar and history straight away.
    window.history.replaceState(null, '', window.location.pathname);
    const idToken = hash.get('id_token');
    const state = hash.get('state') ?? '';
    if (hash.get('error')) {
      setError(hash.get('error') === 'access_denied' ? 'You cancelled Google sign-in.' : 'Google returned an error during sign-in.');
      return;
    }
    if (!idToken) {
      setError('This sign-in link is incomplete or has already been used.');
      return;
    }
    const dot = state.indexOf('.');
    const next = dot >= 0 ? state.slice(dot + 1) : null;
    api.post<AuthResponse>('/api/auth/google', { id_token: idToken, state })
      .then((auth) => {
        setSession(auth);
        router.replace(postAuthPath(auth, next));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not reach Volentify to finish signing in.'));
  }, [router, setSession]);

  return (
    <div className="page flex min-h-[60vh] flex-col items-start justify-center gap-5 py-24">
      {error ? (
        <>
          <p className="eyebrow">Google sign-in</p>
          <h1 className="display text-5xl">We couldn’t sign you in.</h1>
          <p className="max-w-md text-stone" role="alert">{error}</p>
          <div className="flex gap-3">
            <ButtonLink href="/api/auth/google/start">Try Google again</ButtonLink>
            <ButtonLink href="/login" variant="secondary">Use email instead</ButtonLink>
          </div>
        </>
      ) : (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-signal" aria-hidden />
          <h1 className="display text-5xl">Signing you in</h1>
          <p className="text-stone" role="status">Verifying your Google account with Volentify.</p>
        </>
      )}
    </div>
  );
}
