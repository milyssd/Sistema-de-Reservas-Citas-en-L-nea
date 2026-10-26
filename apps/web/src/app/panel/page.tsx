import type { Metadata } from 'next';
import { AdminPanel } from '@/components/admin-panel';
export const metadata: Metadata = {
  title: 'Mi agenda y administración',
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <main id="contenido" className="page-wrap content-page">
      <AdminPanel />
    </main>
  );
}
