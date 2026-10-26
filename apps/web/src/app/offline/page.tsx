import { OfflineAppointments } from '@/components/offline-appointments';
export const metadata = { title: 'Sin conexión', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <main id="contenido" className="page-wrap content-page narrow">
      <OfflineAppointments />
    </main>
  );
}
