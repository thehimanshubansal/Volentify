'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { MissionRoute } from '@/components/map/TacticalMap';
import MissionRoutePanel from '@/components/map/MissionRoutePanel';

const TacticalMap = dynamic(() => import('@/components/map/TacticalMap'), { ssr: false });

export default function MapScreen({ incident, imagery, radar, mission, from }: {
  incident?: string; imagery?: string; radar?: boolean; mission?: string; from?: string;
}) {
  const [route, setRoute] = useState<MissionRoute | null>(null);
  return (
    <main className="relative h-[calc(100dvh-4rem)] w-full">
      <h1 className="sr-only">{mission ? 'Route to your mission' : 'Tactical map'}</h1>
      <TacticalMap variant="full" focusDisasterId={mission ? undefined : incident} initialBasemap={imagery}
        radar={radar || undefined} route={route} className="h-full w-full" />
      {mission && <MissionRoutePanel taskId={mission} from={from} onRoute={setRoute} />}
    </main>
  );
}
