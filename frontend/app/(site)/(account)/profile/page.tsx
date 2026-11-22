import type { Metadata } from 'next';
import VolunteerProfile from '../../(operations)/volunteers/[id]/VolunteerProfile';

export const metadata: Metadata = { title: 'My profile' };

/** The signed-in member's own responder profile (the API resolves "me" from the session). */
export default function MyProfilePage() {
  return <VolunteerProfile id="me" />;
}
