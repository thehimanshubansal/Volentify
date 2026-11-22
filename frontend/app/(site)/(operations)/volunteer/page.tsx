import type { Metadata } from 'next';
import DispatchBoard from './DispatchBoard';

export const metadata: Metadata = { title: 'Volunteer dispatch' };

export default function VolunteerPage() {
  return <DispatchBoard />;
}
