'use client';

import { useState } from 'react';
import { useApi } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Disaster } from '@/lib/types';
import { Segmented } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/Page';
import { BroadcastForm } from './BroadcastForm';
import { DispatchRun } from './DispatchRun';
import { MeshReviewQueue } from './MeshReviewQueue';
import { MissionForm } from './MissionForm';

type Tab = 'reports' | 'missions' | 'dispatch' | 'broadcast';

export default function CommandHub() {
  const { user } = useSession();
  const disasters = useApi<Disaster[]>('/api/disasters');
  const [tab, setTab] = useState<Tab>('reports');
  const [dispatchKey, setDispatchKey] = useState(0);

  return (
    <>
      <PageHeader
        label={user?.role === 'NGO_MEMBER' ? 'NGO partner console' : 'Incident command'}
        title="Command hub"
        lede="Verify what the field is reporting, turn it into missions, and dispatch the right responders."
        meta={
          <Segmented<Tab> ariaLabel="Command hub section" value={tab} onChange={setTab} options={[
            { value: 'reports', label: 'Field reports' }, { value: 'missions', label: 'New mission' },
            { value: 'dispatch', label: 'Dispatch' }, { value: 'broadcast', label: 'Broadcast' },
          ]} />
        }
      />
      <div className="page pb-10">
        {tab === 'reports' && <MeshReviewQueue disasters={disasters.data ?? []} onPromoted={() => setDispatchKey((k) => k + 1)} />}
        {tab === 'missions' && <MissionForm disasters={disasters.data ?? []} onCreated={() => { setDispatchKey((k) => k + 1); setTab('dispatch'); }} />}
        {tab === 'dispatch' && <DispatchRun key={dispatchKey} />}
        {tab === 'broadcast' && <BroadcastForm disasters={disasters.data ?? []} canBroadcast={user?.role === 'INCIDENT_ADMIN'} />}
      </div>
    </>
  );
}
