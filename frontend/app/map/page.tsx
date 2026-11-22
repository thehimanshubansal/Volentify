import type { Metadata } from 'next';
import MapScreen from './MapScreen';

export const metadata: Metadata = { title: 'Tactical map' };

type Params = { incident?: string; imagery?: string; radar?: string; mission?: string; from?: string };

export default async function MapPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { incident, imagery, radar, mission, from } = await searchParams;
  return <MapScreen incident={incident} imagery={imagery} radar={radar === '1'} mission={mission} from={from} />;
}
