import type { Metadata } from 'next';
import { Account } from '@/components/account';
export const metadata: Metadata = { title: 'Mi cuenta', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <main id="contenido" className="page-wrap content-page">
      <Account />
    </main>
  );
}
