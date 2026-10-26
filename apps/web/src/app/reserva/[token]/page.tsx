import type { Metadata } from 'next';
import { ManageBooking } from '@/components/manage-booking';
export const metadata: Metadata = {
  title: 'Gestionar mi cita',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main id="contenido" className="page-wrap content-page narrow">
      <ManageBooking token={token} />
    </main>
  );
}
