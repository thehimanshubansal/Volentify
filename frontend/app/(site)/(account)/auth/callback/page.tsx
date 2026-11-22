import type { Metadata } from 'next';
import Callback from './Callback';

export const metadata: Metadata = { title: 'Signing you in', robots: { index: false } };

export default function CallbackPage() {
  return <Callback />;
}
