import type { Metadata } from 'next';
import CommandHub from './CommandHub';

export const metadata: Metadata = { title: 'Command hub' };

export default function AgencyPage() {
  return <CommandHub />;
}
