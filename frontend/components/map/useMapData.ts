'use client';

import { useApi } from '@/lib/api';
import type { DataSource, Disaster, ImageryLayer, MeshEvent, MeshNode, Resources, Task, Volunteer } from '@/lib/types';

const REFRESH_MS = 10_000;

/** Everything the tactical map renders. Mesh reports and nodes refresh every 10 s (unchanged responses don't redraw). */
export function useMapData() {
  const disasters = useApi<Disaster[]>('/api/disasters', { refreshMs: 120_000 });
  const mesh = useApi<MeshEvent[]>('/api/mesh/events?limit=500', { refreshMs: REFRESH_MS });
  const nodes = useApi<MeshNode[]>('/api/mesh/nodes', { refreshMs: REFRESH_MS });
  const volunteers = useApi<Volunteer[]>('/api/volunteers?availability=ALL', { refreshMs: 60_000 });
  const tasks = useApi<Task[]>('/api/tasks?status=OPEN', { refreshMs: 60_000 });
  const resources = useApi<Resources>('/api/resources');
  const imagery = useApi<ImageryLayer[]>('/api/bhuvan/layers');

  const source: DataSource | null = disasters.source;
  return {
    disasters: disasters.data ?? [],
    mesh: mesh.data ?? [],
    nodes: nodes.data ?? [],
    // Volunteers who never shared a location are stored at the onboarding placeholder (India's centroid); don't
    // plot them there as if they were really in Madhya Pradesh.
    volunteers: (volunteers.data ?? []).filter((v) => !(v.lat === 20.59 && v.lng === 78.96)),
    tasks: tasks.data ?? [],
    hospitals: resources.data?.hospitals ?? [],
    shelters: resources.data?.shelters ?? [],
    imagery: imagery.data ?? [],
    source,
    loading: disasters.loading,
    error: disasters.error,
    reload: () => { disasters.reload(); mesh.reload(); nodes.reload(); tasks.reload(); },
  };
}

export type MapData = ReturnType<typeof useMapData>;
