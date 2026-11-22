import type { Metadata } from 'next';
import { Suspense } from 'react';
import Dashboard from './Dashboard';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return <Suspense><Dashboard /></Suspense>;
}
