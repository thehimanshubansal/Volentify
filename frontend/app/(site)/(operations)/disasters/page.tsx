import type { Metadata } from 'next';
import IncidentsIndex from './IncidentsIndex';

export const metadata: Metadata = { title: 'Active incidents' };

export default function DisastersPage() {
  return <IncidentsIndex />;
}
