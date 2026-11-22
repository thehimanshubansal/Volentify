import type { Metadata } from 'next';
import Dossier from './Dossier';

export const metadata: Metadata = { title: 'Incident dossier' };

export default async function DisasterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Dossier id={decodeURIComponent(id)} />;
}
