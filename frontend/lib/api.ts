'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataSource } from './types';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export interface ApiResult<T> { data: T; source: DataSource | null; raw: string }

/** Fetch a Volentify API route. Same-origin: the session cookie travels automatically. */
export async function apiFetch<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<ApiResult<T>> {
  const { json, headers, ...rest } = init;
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...rest,
    headers: { Accept: 'application/json', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const source = res.headers.get('X-Data-Source') as DataSource | null;
  if (res.status === 204) return { data: undefined as T, source, raw: '' };
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const detail = (body as { detail?: unknown } | null)?.detail;
    const message = typeof detail === 'string' ? detail
      : res.status >= 500 ? 'The service is temporarily unavailable. Please try again.'
      : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return { data: body as T, source, raw: text };
}

export const api = {
  get: <T,>(path: string) => apiFetch<T>(path).then((r) => r.data),
  post: <T,>(path: string, json?: unknown) => apiFetch<T>(path, { method: 'POST', json: json ?? {} }).then((r) => r.data),
  patch: <T,>(path: string, json: unknown) => apiFetch<T>(path, { method: 'PATCH', json }).then((r) => r.data),
};

interface UseApi<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  source: DataSource | null;
  reload: () => void;
  mutate: (updater: (prev: T | undefined) => T | undefined) => void;
}

/** Client-side data hook with optional polling. Pass null to skip. */
export function useApi<T>(path: string | null, { refreshMs }: { refreshMs?: number } = {}): UseApi<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(path));
  const [source, setSource] = useState<DataSource | null>(null);
  const [nonce, setNonce] = useState(0);
  const alive = useRef(true);
  const lastRaw = useRef<string | null>(null);

  useEffect(() => {
    alive.current = true;
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading((prev) => prev || data === undefined);
    apiFetch<T>(path)
      .then((r) => {
        if (!alive.current) return;
        // Polling: keep the same object when nothing changed, so maps and charts don't redraw every tick.
        if (r.raw !== lastRaw.current) {
          lastRaw.current = r.raw;
          setData(r.data);
        }
        setSource(r.source);
        setError(null);
      })
      .catch((e: unknown) => alive.current && setError(e instanceof ApiError ? e : new ApiError('Network unavailable', 0)))
      .finally(() => alive.current && setLoading(false));
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce]);

  useEffect(() => {
    if (!path || !refreshMs) return;
    const id = setInterval(() => setNonce((n) => n + 1), refreshMs);
    return () => clearInterval(id);
  }, [path, refreshMs]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const mutate = useCallback((updater: (prev: T | undefined) => T | undefined) => { lastRaw.current = null; setData(updater); }, []);
  return { data, error, loading, source, reload, mutate };
}
