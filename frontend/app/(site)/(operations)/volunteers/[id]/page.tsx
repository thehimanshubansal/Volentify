import type { Metadata } from 'next';
import VolunteerProfile from './VolunteerProfile';

export const metadata: Metadata = { title: 'Volunteer profile' };

export default async function VolunteerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VolunteerProfile id={decodeURIComponent(id)} />;
}
