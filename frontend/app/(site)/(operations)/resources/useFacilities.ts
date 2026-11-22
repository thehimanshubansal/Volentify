'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { type Center, type FacilityRef, OSM_ATTRIBUTION, facilitiesQuery, fetchFacilitiesDirect } from '@/lib/overpass';
import type { Resources } from '@/lib/types';
import { HOTLINES } from './shared';

/** What the browser needs to ask OpenStreetMap itself: the points to match against and the areas to search. */
export interface DirectPlan { refs: FacilityRef[]; centers: Center[] }

export type FacilityStatus = 'idle' | 'loading' | 'direct' | 'ready' | 'error';

export interface FacilityState {
  status: FacilityStatus;
  data: Resources | null;
  /** Who reached OpenStreetMap: our server, or this browser after the server timed out. */
  via: 'server' | 'browser' | null;
  /** Overpass host that answered a browser request. */
  endpoint: string | null;
  /** Both our server and the browser failed to reach OpenStreetMap. */
  unreachable: boolean;
  error: string | null;
}

const IDLE: FacilityState = { status: 'idle', data: null, via: null, endpoint: null, unreachable: false, error: null };

/**
 * Facilities from /api/resources(...). When the server answers OFFLINE with a query, or fails outright (5xx, network),
 * the browser asks OpenStreetMap directly with that query (or one built from `plan`) and parses it the same way.
 */
export function useFacilities(path: string | null, plan: DirectPlan | null): FacilityState & { reload: () => void } {
  const [state, setState] = useState<FacilityState>(IDLE);
  const [nonce, setNonce] = useState(0);
  const planRef = useRef(plan);
  // Declared before the fetch effect so it runs first in the same commit.
  useEffect(() => { planRef.current = plan; }, [plan]);

  useEffect(() => {
    if (!path) {
      setState(IDLE);
      return;
    }
    let cancelled = false;
    setState({ ...IDLE, status: 'loading' });

    (async () => {
      let res: Resources | null = null;
      let failure: ApiError | null = null;
      try {
        res = (await apiFetch<Resources>(path)).data;
      } catch (e) {
        failure = e instanceof ApiError ? e : new ApiError('Network unavailable', 0);
      }
      if (cancelled) return;

      const empty = !res || (res.hospitals.length === 0 && res.shelters.length === 0);
      if (res && (res.mode !== 'OFFLINE' || !empty)) {
        setState({ ...IDLE, status: 'ready', data: res, via: 'server' });
        return;
      }

      const p = planRef.current;
      const serverDown = failure != null && (failure.status === 0 || failure.status >= 500);
      const query = res?.query || (serverDown && p?.centers.length ? facilitiesQuery(p.centers) : null);
      if (!query || !p?.refs.length) {
        setState(res ? { ...IDLE, status: 'ready', data: res, via: 'server', unreachable: true }
          : { ...IDLE, status: 'error', error: failure?.message ?? 'Something went wrong' });
        return;
      }

      setState({ ...IDLE, status: 'direct', data: res });
      try {
        const direct = await fetchFacilitiesDirect(query, p.refs);
        if (cancelled) return;
        setState({
          ...IDLE, status: 'ready', via: 'browser', endpoint: direct.endpoint,
          data: {
            hotlines: res?.hotlines ?? HOTLINES, hospitals: direct.hospitals, shelters: direct.shelters, mode: 'LIVE',
            fetched_at: direct.fetched_at, attribution: res?.attribution ?? OSM_ATTRIBUTION, query: null,
          },
        });
      } catch {
        if (cancelled) return;
        setState(res ? { ...IDLE, status: 'ready', data: res, via: 'server', unreachable: true }
          : { ...IDLE, status: 'error', error: 'Neither Volentify nor your browser could reach OpenStreetMap right now.' });
      }
    })();

    return () => { cancelled = true; };
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
