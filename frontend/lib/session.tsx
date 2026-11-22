'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from './api';
import type { AuthResponse, Role, User } from './types';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface SessionValue {
  user: User | null;
  status: Status;
  requiresOnboarding: boolean;
  setSession: (auth: AuthResponse | null) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const setSession = useCallback((next: AuthResponse | null) => {
    setAuth(next);
    setStatus(next ? 'authenticated' : 'anonymous');
  }, []);

  const refresh = useCallback(async () => {
    try {
      setSession(await api.get<AuthResponse>('/api/auth/me'));
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 404)) setSession(null);
      else setStatus((s) => (s === 'loading' ? 'anonymous' : s));
    }
  }, [setSession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => undefined);
    setSession(null);
    window.location.assign('/');
  }, [setSession]);

  const value = useMemo<SessionValue>(() => ({
    user: auth?.user ?? null,
    status,
    requiresOnboarding: auth?.requiresOnboarding ?? false,
    setSession,
    refresh,
    signOut,
    hasRole: (...roles) => Boolean(auth?.user && roles.includes(auth.user.role)),
  }), [auth, status, setSession, refresh, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

/** Where to send someone after they authenticate. */
export function postAuthPath(auth: AuthResponse, next?: string | null): string {
  if (auth.requiresOnboarding) return `/onboarding${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return auth.user.role === 'INCIDENT_ADMIN' ? '/agency' : auth.user.role === 'NGO_MEMBER' ? '/agency' : '/dashboard';
}
