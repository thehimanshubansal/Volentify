import type { Metadata } from 'next';
import AdminConsole from './AdminConsole';

export const metadata: Metadata = { title: 'Administration' };

export default function AdminPage() {
  return <AdminConsole />;
}
