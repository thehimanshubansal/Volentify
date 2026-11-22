import type { Metadata } from 'next';
import AlertsBoard from './AlertsBoard';

export const metadata: Metadata = { title: 'Alerts' };

export default function AlertsPage() {
  return <AlertsBoard />;
}
